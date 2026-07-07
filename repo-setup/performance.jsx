// Performance panel — landing page metrics per approved piece.
//
// Data flow:
//   1. Sheet URL lives in project.performance.sheet_url (admin-editable via a
//      compact setup card the first time or when Jason sends a new sheet).
//   2. /api/performance?url=... fetches the CSV, returns { headers, rows,
//      url_col, trend_col, fetched_at }.
//   3. Rows are joined to approved pieces by URL — we normalise both sides
//      (strip protocol/host/trailing slash) so a slug like "/blog/foo" from the
//      sheet matches "https://www.jaggaer.com/blog/foo" from publishing.live_url.
//   4. Anything unmatched (rows without a piece, or approved pieces without a
//      row) is collapsed at the bottom rather than dropped.
//
// Layout is visual-first: each approved piece with data becomes a card
// showing the first numeric column as its hero metric, secondary metrics in a
// compact strip, and a trend arrow when the sheet provides one. Full metric
// list lives in a slide-in drawer.
//
// Columns are entirely sheet-driven — Jason is still finalising the metric
// template, so nothing about column names is hardcoded.

const { useState: usePerfState, useEffect: usePerfEffect, useMemo: usePerfMemo, useRef: usePerfRef } = React;

// ─── Utilities ──────────────────────────────────────────────────────────────

// Normalise a URL / slug for join-key comparison.
// "https://www.jaggaer.com/blog/foo/" → "/blog/foo"
// "/blog/foo"                          → "/blog/foo"
// "blog/foo"                           → "/blog/foo"
function normUrl(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // Strip protocol + host
  s = s.replace(/^https?:\/\/[^/]+/, "");
  // Strip trailing slash (but keep root "/")
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  // Ensure leading slash if it's a path-like fragment
  if (s && !s.startsWith("/") && !s.startsWith("http")) s = "/" + s;
  return s || null;
}

// Which columns hold numeric data (ignoring the URL column)? First numeric
// column becomes the hero metric on each card; the next 2-3 fill the strip.
function classifyColumns(headers, rows, urlCol, trendCol) {
  const numeric = [];
  const text = [];
  for (const h of headers) {
    if (h === urlCol) continue;
    if (h === trendCol) continue;
    // Sample the first 5 non-empty values in this column.
    const sample = rows.slice(0, 5).map(r => r[h]).filter(v => v !== "" && v != null);
    const numericHit = sample.filter(v => typeof v === "number").length;
    if (numericHit >= Math.ceil(sample.length / 2) && sample.length > 0) numeric.push(h);
    else text.push(h);
  }
  return { numeric, text };
}

// Format a number for hero display — 1,248 not 1248.
function formatNum(v) {
  if (typeof v !== "number") return v == null || v === "" ? "—" : String(v);
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US");
  return String(v);
}

// Trend cell rendering — sheet convention is expected to be "▲ 14%", "▼ 5%",
// "—". We colour up/down but pass the string through as-is.
function parseTrend(v) {
  if (v == null || v === "" || v === "—") return { dir: "flat", label: "—" };
  const s = String(v);
  if (/[▲↑+]/.test(s) || (typeof v === "number" && v > 0)) return { dir: "up", label: s };
  if (/[▼↓\-−]/.test(s) || (typeof v === "number" && v < 0)) return { dir: "down", label: s };
  return { dir: "flat", label: s };
}

// Small helper — the two hero displays live in tracker.jsx, borrow the same
// EST formatter it exports.
function fmtSyncTime(iso) {
  if (!iso) return "never";
  try {
    return formatEST(iso, { hour: "2-digit", minute: "2-digit" }) + " EST";
  } catch { return iso; }
}

// ─── Root panel ─────────────────────────────────────────────────────────────
function PerformancePanel({ project, setProject, currentUser, adminMode }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const sheetUrl = project.performance?.sheet_url || "";

  const [status, setStatus] = usePerfState(sheetUrl ? "idle" : "no-url"); // idle | loading | ok | error | no-url
  const [error, setError] = usePerfState(null);
  const [data, setData] = usePerfState(null); // { headers, rows, url_col, trend_col, fetched_at }
  const [filter, setFilter] = usePerfState("all"); // all | matched | unmatched-rows | missing-data
  const [selected, setSelected] = usePerfState(null); // piece.id of open drawer
  const [showSetup, setShowSetup] = usePerfState(!sheetUrl);
  const [sortBy, setSortBy] = usePerfState(null); // header name to sort desc by

  // ── Fetch on mount / URL change ────────────────────────────────────────
  usePerfEffect(() => {
    if (!sheetUrl) { setStatus("no-url"); return; }
    let cancelled = false;
    setStatus("loading"); setError(null);
    fetch(`/api/performance?url=${encodeURIComponent(sheetUrl)}`)
      .then(r => r.json().then(j => ({ ok: r.ok, body: j })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setStatus("error"); setError(body.error || "Fetch failed"); return; }
        setData(body); setStatus("ok");
      })
      .catch(e => { if (!cancelled) { setStatus("error"); setError(e.message); } });
    return () => { cancelled = true; };
  }, [sheetUrl]);

  // ── Approved pieces (join target) ──────────────────────────────────────
  const approvedPieces = usePerfMemo(() => {
    const out = [];
    for (const pillar of project.pillars || []) {
      for (const cluster of pillar.clusters || []) {
        for (const piece of cluster.pieces || []) {
          if (piece.status !== "approved") continue;
          const url = piece.publishing?.live_url || piece.url || null;
          out.push({ piece, cluster, pillar, urlKey: normUrl(url) });
        }
      }
    }
    return out;
  }, [project]);

  // ── Join sheet rows to approved pieces ─────────────────────────────────
  const joined = usePerfMemo(() => {
    if (!data || !data.rows.length) return { matched: [], unmatchedRows: [], missingData: approvedPieces };

    const urlCol = data.url_col;
    const rowByKey = new Map();
    const unmatchedRows = [];

    for (const row of data.rows) {
      const key = normUrl(row[urlCol]);
      if (!key) { unmatchedRows.push(row); continue; }
      if (!rowByKey.has(key)) rowByKey.set(key, row);
    }

    const matched = [];
    const missingData = [];
    const usedKeys = new Set();

    for (const p of approvedPieces) {
      if (p.urlKey && rowByKey.has(p.urlKey)) {
        matched.push({ ...p, row: rowByKey.get(p.urlKey) });
        usedKeys.add(p.urlKey);
      } else {
        missingData.push(p);
      }
    }

    // Rows whose URL didn't hit any approved piece → unmatched.
    const unmatched = [];
    for (const [key, row] of rowByKey.entries()) {
      if (!usedKeys.has(key)) unmatched.push(row);
    }
    return { matched, unmatchedRows: [...unmatched, ...unmatchedRows], missingData };
  }, [data, approvedPieces]);

  // ── Column classification ──────────────────────────────────────────────
  const cols = usePerfMemo(() => {
    if (!data) return { numeric: [], text: [] };
    return classifyColumns(data.headers, data.rows, data.url_col, data.trend_col);
  }, [data]);

  const heroMetric = cols.numeric[0] || null;
  const stripMetrics = cols.numeric.slice(1, 4);

  // ── KPI strip — totals across matched pieces ───────────────────────────
  // Only include columns that actually contained numeric data — text-shaped
  // columns like "2m 48s" would otherwise show as "Total: 0 across 0 pieces".
  const kpis = usePerfMemo(() => {
    if (!joined.matched.length) return null;
    const totals = {};
    for (const m of cols.numeric.slice(0, 4)) {
      let sum = 0, count = 0;
      for (const j of joined.matched) {
        const v = j.row[m];
        if (typeof v === "number") { sum += v; count++; }
      }
      if (count > 0) totals[m] = { sum, count };
    }
    return totals;
  }, [joined, cols]);

  // ── Filter + sort visible cards ────────────────────────────────────────
  const visibleCards = usePerfMemo(() => {
    let list = joined.matched;
    if (sortBy) {
      list = [...list].sort((a, b) => {
        const va = a.row[sortBy], vb = b.row[sortBy];
        if (typeof va === "number" && typeof vb === "number") return vb - va;
        return String(vb || "").localeCompare(String(va || ""));
      });
    } else if (heroMetric) {
      // Default sort: hero metric descending.
      list = [...list].sort((a, b) => {
        const va = a.row[heroMetric], vb = b.row[heroMetric];
        if (typeof va === "number" && typeof vb === "number") return vb - va;
        return 0;
      });
    }
    return list;
  }, [joined, sortBy, heroMetric]);

  // ── Save sheet URL to project.json ─────────────────────────────────────
  function saveSheetUrl(newUrl) {
    setProject(p => ({
      ...p,
      performance: { ...(p.performance || {}), sheet_url: newUrl, last_configured_by: currentUser?.id, last_configured_at: new Date().toISOString() },
    }));
    setShowSetup(false);
  }

  const selectedPiece = selected ? joined.matched.find(m => m.piece.id === selected) : null;

  return (
    <main className="ns-tracker" style={{ padding: "28px 32px", maxWidth: "1240px" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
            Landing Page Performance
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#1a2535", margin: 0 }}>
            How the pieces we shipped are doing.
          </h1>
          <p style={{ ...FONT, fontSize: "0.8rem", color: "#888", marginTop: "8px", maxWidth: "640px", lineHeight: 1.5 }}>
            Metrics pulled from Jaggaer's Google Analytics sheet and joined to approved pieces by URL. Column set follows the sheet — Jason iterates the template there, this view adapts.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {sheetUrl && (
            <>
              <div style={{ ...FONT, fontSize: "0.7rem", color: "#999" }}>
                {status === "loading" && "Syncing…"}
                {status === "ok" && data && <>Synced {fmtSyncTime(data.fetched_at)}</>}
                {status === "error" && <span style={{ color: "#c8401a" }}>Sync failed</span>}
              </div>
              <button
                onClick={() => { setStatus("loading"); fetch(`/api/performance?url=${encodeURIComponent(sheetUrl)}`).then(r => r.json()).then(j => { setData(j); setStatus("ok"); }).catch(e => { setStatus("error"); setError(e.message); }); }}
                style={{
                  ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "6px 12px", border: "1px solid #d7d1c8", background: "#fff", color: "#444",
                  borderRadius: "3px", cursor: "pointer",
                }}
                title="Re-fetch sheet"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setShowSetup(true)}
                style={{
                  ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "6px 12px", border: "1px solid #d7d1c8", background: "#fff", color: "#444",
                  borderRadius: "3px", cursor: "pointer",
                }}
                title="Change sheet URL"
              >
                Sheet
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Setup card (first-run or change sheet URL) ─────────────────── */}
      {showSetup && (
        <SetupCard
          currentUrl={sheetUrl}
          onSave={saveSheetUrl}
          onCancel={() => setShowSetup(false)}
          canCancel={!!sheetUrl}
        />
      )}

      {/* ── Loading / error / no-url states ─────────────────────────────── */}
      {status === "no-url" && !showSetup && (
        <EmptyState
          title="No sheet connected yet."
          body="Ask Jason for the shared Google Analytics sheet, then paste the URL to start pulling metrics."
          cta="Connect sheet"
          onCta={() => setShowSetup(true)}
        />
      )}

      {status === "loading" && (
        <div style={{ ...FONT, padding: "40px", textAlign: "center", color: "#aaa", fontSize: "0.8rem" }}>
          Fetching sheet…
        </div>
      )}

      {status === "error" && (
        <div style={{
          ...FONT, padding: "20px 24px", background: "#fff", border: "1px solid #f0d0c0", borderLeft: "3px solid #c8401a",
          borderRadius: "3px", marginBottom: "20px",
        }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
            Sync error
          </div>
          <div style={{ fontSize: "0.82rem", color: "#333", lineHeight: 1.5 }}>{error}</div>
          <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "8px" }}>
            Confirm the sheet is shared "anyone with the link can view", or paste a fresh URL below.
          </div>
          <button onClick={() => setShowSetup(true)} style={{
            marginTop: "12px", ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "6px 12px", border: "1px solid #d7d1c8", background: "#faf8f4", color: "#444", borderRadius: "3px", cursor: "pointer",
          }}>Update sheet URL</button>
        </div>
      )}

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      {status === "ok" && kpis && Object.keys(kpis).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Object.keys(kpis).length)}, 1fr)`, gap: "12px", marginBottom: "24px" }}>
          {Object.keys(kpis).map(m => (
            <div key={m} style={{
              background: "#fff", border: "1px solid #e8e3da", borderLeft: "3px solid #1a2f4e",
              padding: "14px 16px", borderRadius: "3px",
            }}>
              <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
                Total {m}
              </div>
              <div style={{ ...FONT, fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 600, color: "#1a2535", marginTop: "4px", lineHeight: 1 }}>
                {formatNum(kpis[m].sum)}
              </div>
              <div style={{ ...FONT, fontSize: "0.68rem", color: "#aaa", marginTop: "4px" }}>
                across {kpis[m].count} {kpis[m].count === 1 ? "piece" : "pieces"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter / sort chips ──────────────────────────────────────────── */}
      {status === "ok" && joined.matched.length > 0 && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Live pieces" count={joined.matched.length} />
            {joined.missingData.length > 0 && (
              <FilterChip active={filter === "missing-data"} onClick={() => setFilter("missing-data")} label="No data yet" count={joined.missingData.length} />
            )}
            {joined.unmatchedRows.length > 0 && (
              <FilterChip active={filter === "unmatched-rows"} onClick={() => setFilter("unmatched-rows")} label="Unmatched rows" count={joined.unmatchedRows.length} />
            )}
          </div>
          {cols.numeric.length > 0 && filter === "all" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ ...FONT, fontSize: "0.68rem", color: "#999", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>Sort by</span>
              <select
                value={sortBy || heroMetric || ""}
                onChange={e => setSortBy(e.target.value)}
                style={{ ...FONT, fontSize: "0.72rem", padding: "5px 8px", border: "1px solid #d7d1c8", background: "#fff", borderRadius: "3px", color: "#333" }}
              >
                {cols.numeric.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Main content: cards / missing / unmatched ────────────────────── */}
      {status === "ok" && filter === "all" && (
        joined.matched.length === 0 ? (
          <EmptyState
            title="Sheet loaded, but no rows match approved pieces yet."
            body="The sheet columns look fine — we just couldn't find any of its URLs among your approved pieces. Check the URL column matches piece publishing.live_url values, or approve a piece with a live URL that's in the sheet."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
            {visibleCards.map(j => (
              <PieceCard
                key={j.piece.id}
                piece={j.piece} cluster={j.cluster} pillar={j.pillar}
                row={j.row}
                heroMetric={heroMetric}
                stripMetrics={stripMetrics}
                trendCol={data.trend_col}
                onClick={() => setSelected(j.piece.id)}
              />
            ))}
          </div>
        )
      )}

      {status === "ok" && filter === "missing-data" && (
        <MissingDataList items={joined.missingData} />
      )}

      {status === "ok" && filter === "unmatched-rows" && (
        <UnmatchedRowsList rows={joined.unmatchedRows} urlCol={data.url_col} heroMetric={heroMetric} />
      )}

      {/* ── Detail drawer ────────────────────────────────────────────────── */}
      {selectedPiece && (
        <DetailDrawer
          match={selectedPiece}
          headers={data.headers}
          urlCol={data.url_col}
          trendCol={data.trend_col}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

// ─── Setup card ─────────────────────────────────────────────────────────────
function SetupCard({ currentUrl, onSave, onCancel, canCancel }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [draft, setDraft] = usePerfState(currentUrl || "");
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e3da", borderLeft: "3px solid #1a2f4e",
      padding: "20px 24px", borderRadius: "3px", marginBottom: "20px",
    }}>
      <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a2f4e", marginBottom: "8px" }}>
        {currentUrl ? "Change sheet" : "Connect Google Analytics sheet"}
      </div>
      <div style={{ ...FONT, fontSize: "0.78rem", color: "#666", marginBottom: "12px", lineHeight: 1.5 }}>
        Paste the share URL from Jason's sheet. Sheet must be shared "anyone with the link can view".
      </div>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
        style={{
          ...FONT, width: "100%", padding: "9px 12px", border: "1px solid #d7d1c8",
          borderRadius: "3px", fontSize: "0.78rem", color: "#333", marginBottom: "12px",
        }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => draft.trim() && onSave(draft.trim())}
          disabled={!draft.trim()}
          style={{
            ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "8px 16px", border: "none", background: draft.trim() ? "#1a2f4e" : "#c8c0b4",
            color: "#fff", borderRadius: "3px", cursor: draft.trim() ? "pointer" : "not-allowed",
          }}
        >
          Save & Sync
        </button>
        {canCancel && (
          <button
            onClick={onCancel}
            style={{
              ...FONT, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "8px 16px", border: "1px solid #d7d1c8", background: "#fff", color: "#666",
              borderRadius: "3px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Piece card ─────────────────────────────────────────────────────────────
function PieceCard({ piece, cluster, pillar, row, heroMetric, stripMetrics, trendCol, onClick }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const heroValue = heroMetric ? row[heroMetric] : null;
  const trend = trendCol ? parseTrend(row[trendCol]) : null;

  const trendColor = trend?.dir === "up" ? "#1e7a45" : trend?.dir === "down" ? "#c8401a" : "#999";
  const trendBg = trend?.dir === "up" ? "#e6f5ec" : trend?.dir === "down" ? "#fbe8e2" : "#f0ede6";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px",
        padding: "16px 18px 14px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column", minHeight: "170px",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a2f4e"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,47,78,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e3da"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Header — title + pillar/cluster + trend badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "3px" }}>
            {pillar.label}
          </div>
          <div style={{ ...FONT, fontSize: "0.86rem", fontWeight: 600, color: "#1a2535", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {piece.title}
          </div>
        </div>
        {trend && (
          <span style={{
            ...FONT, fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: "2px",
            color: trendColor, background: trendBg, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {trend.label}
          </span>
        )}
      </div>

      {/* Hero metric */}
      {heroMetric && (
        <div style={{ marginTop: "auto", marginBottom: "10px" }}>
          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
            {heroMetric}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 600, color: "#1a2535", lineHeight: 1, marginTop: "2px" }}>
            {formatNum(heroValue)}
          </div>
        </div>
      )}

      {/* Secondary metrics strip */}
      {stripMetrics.length > 0 && (
        <div style={{ display: "flex", gap: "14px", borderTop: "1px solid #f0ede6", paddingTop: "10px" }}>
          {stripMetrics.map(m => (
            <div key={m} style={{ minWidth: 0 }}>
              <div style={{ ...FONT, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>
                {m}
              </div>
              <div style={{ ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#333", marginTop: "1px" }}>
                {formatNum(row[m])}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail drawer ──────────────────────────────────────────────────────────
function DetailDrawer({ match, headers, urlCol, trendCol, onClose }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const { piece, cluster, pillar, row } = match;
  const liveUrl = piece.publishing?.live_url;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,25,35,0.35)", zIndex: 100, animation: "fadeIn 0.15s ease-out" }}
      />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: "min(440px, 90vw)",
        background: "#fff", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", zIndex: 101,
        overflowY: "auto", padding: "24px 28px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", gap: "10px" }}>
          <div>
            <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>
              {pillar.label} · {cluster.label}
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#1a2535", margin: 0, lineHeight: 1.3 }}>
              {piece.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ ...FONT, fontSize: "1.2rem", color: "#888", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* All metrics */}
        <div style={{ borderTop: "1px solid #e8e3da", marginTop: "8px" }}>
          {headers.filter(h => h !== urlCol).map(h => (
            <div key={h} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px",
              padding: "10px 0", borderBottom: "1px solid #f0ede6",
            }}>
              <span style={{ ...FONT, fontSize: "0.74rem", color: "#666" }}>{h}</span>
              <span style={{ ...FONT, fontSize: "0.86rem", fontWeight: 600, color: "#1a2535" }}>
                {h === trendCol ? parseTrend(row[h]).label : formatNum(row[h])}
              </span>
            </div>
          ))}
        </div>

        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", textAlign: "center", marginTop: "20px",
              ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "10px 16px", background: "#1a2f4e", color: "#fff", borderRadius: "3px", textDecoration: "none",
            }}
          >
            Open landing page ↗
          </a>
        )}
      </div>
    </>
  );
}

// ─── Filter chip ────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, label, count }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <button
      onClick={onClick}
      style={{
        ...FONT, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.02em",
        padding: "6px 12px", borderRadius: "3px", cursor: "pointer",
        border: active ? "1px solid #1a2f4e" : "1px solid #d7d1c8",
        background: active ? "#e8f2fa" : "#fff",
        color: active ? "#1a2f4e" : "#666",
      }}
    >
      {label} <span style={{ opacity: 0.6, marginLeft: "4px", fontWeight: 500 }}>· {count}</span>
    </button>
  );
}

// ─── Missing data (approved pieces without sheet row) ───────────────────────
function MissingDataList({ items }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (items.length === 0) {
    return <EmptyState title="Every approved piece has performance data." body="" />;
  }
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e3da", background: "#faf8f4", ...FONT, fontSize: "0.72rem", color: "#666" }}>
        Approved pieces that aren't in the sheet yet. Ask Jason to add rows for these URLs.
      </div>
      {items.map(({ piece, cluster, pillar, urlKey }) => (
        <div key={piece.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
          borderBottom: "1px solid #f0ede6", gap: "12px",
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#1a2535", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{piece.title}</div>
            <div style={{ ...FONT, fontSize: "0.7rem", color: "#999", marginTop: "2px" }}>{pillar.label} · {cluster.label}</div>
          </div>
          <code style={{ ...FONT, fontSize: "0.7rem", color: "#888", background: "#f5f2ec", padding: "3px 6px", borderRadius: "2px" }}>
            {urlKey || "no url set"}
          </code>
        </div>
      ))}
    </div>
  );
}

// ─── Unmatched sheet rows ───────────────────────────────────────────────────
function UnmatchedRowsList({ rows, urlCol, heroMetric }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (rows.length === 0) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e3da", background: "#faf8f4", ...FONT, fontSize: "0.72rem", color: "#666" }}>
        Sheet rows whose URL doesn't match any approved piece. Either the piece isn't approved yet, or the URLs don't line up.
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
          borderBottom: "1px solid #f0ede6", gap: "12px",
        }}>
          <code style={{ ...FONT, fontSize: "0.74rem", color: "#333", background: "#f5f2ec", padding: "4px 8px", borderRadius: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {String(row[urlCol] ?? "(no url)")}
          </code>
          {heroMetric && (
            <div style={{ ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#666", flexShrink: 0 }}>
              {heroMetric}: {formatNum(row[heroMetric])}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Generic empty state ────────────────────────────────────────────────────
function EmptyState({ title, body, cta, onCta }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{
      background: "#fff", border: "1px dashed #d7d1c8", borderRadius: "3px",
      padding: "40px 32px", textAlign: "center",
    }}>
      <div style={{ ...FONT, fontSize: "0.9rem", fontWeight: 600, color: "#1a2535", marginBottom: "6px" }}>{title}</div>
      {body && <div style={{ ...FONT, fontSize: "0.78rem", color: "#888", maxWidth: "480px", margin: "0 auto", lineHeight: 1.5 }}>{body}</div>}
      {cta && (
        <button onClick={onCta} style={{
          marginTop: "18px", ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "8px 16px", background: "#1a2f4e", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer",
        }}>
          {cta}
        </button>
      )}
    </div>
  );
}

window.PerformancePanel = PerformancePanel;
