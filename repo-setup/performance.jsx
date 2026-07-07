// Performance panel — landing page metrics per approved piece.
//
// Default view: all approved pieces as cards, empty-metric state until a sheet
// is connected. Card click opens a drawer — if no sheet yet, the drawer shows
// the connection prompt inline. Once connected, the drawer shows metrics.
//
// Data flow:
//   1. Sheet URL lives in project.performance.sheet_url.
//   2. /api/performance?url=... fetches CSV → { headers, rows, url_col, trend_col }.
//   3. Rows joined to approved pieces by URL (normalised both sides).
//   4. Unmatched rows surfaced via filter chip; never silently dropped.

const { useState: usePerfState, useEffect: usePerfEffect, useMemo: usePerfMemo } = React;

// ─── Utilities ──────────────────────────────────────────────────────────────

function normUrl(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\/[^/]+/, "");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  if (s && !s.startsWith("/") && !s.startsWith("http")) s = "/" + s;
  return s || null;
}

function classifyColumns(headers, rows, urlCol, trendCol) {
  const numeric = [], text = [];
  for (const h of headers) {
    if (h === urlCol || h === trendCol) continue;
    const sample = rows.slice(0, 5).map(r => r[h]).filter(v => v !== "" && v != null);
    const hits = sample.filter(v => typeof v === "number").length;
    if (hits >= Math.ceil(sample.length / 2) && sample.length > 0) numeric.push(h);
    else text.push(h);
  }
  return { numeric, text };
}

function formatNum(v) {
  if (typeof v !== "number") return v == null || v === "" ? "—" : String(v);
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US");
  return String(v);
}

function parseTrend(v) {
  if (v == null || v === "" || v === "—") return { dir: "flat", label: "—" };
  const s = String(v);
  if (/[▲↑+]/.test(s) || (typeof v === "number" && v > 0)) return { dir: "up", label: s };
  if (/[▼↓\-−]/.test(s) || (typeof v === "number" && v < 0)) return { dir: "down", label: s };
  return { dir: "flat", label: s };
}

function fmtSyncTime(iso) {
  if (!iso) return "never";
  try { return formatEST(iso, { hour: "2-digit", minute: "2-digit" }) + " EST"; }
  catch { return iso; }
}

// ─── Root panel ─────────────────────────────────────────────────────────────
function PerformancePanel({ project, setProject, currentUser }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const sheetUrl = project.performance?.sheet_url || "";

  const [sheetStatus, setSheetStatus] = usePerfState(sheetUrl ? "idle" : "no-url");
  const [sheetError, setSheetError] = usePerfState(null);
  const [data, setData] = usePerfState(null);
  const [selected, setSelected] = usePerfState(null); // piece.id of open drawer
  const [sortBy, setSortBy] = usePerfState(null);
  const [showUnmatched, setShowUnmatched] = usePerfState(false);

  // ── Fetch when sheetUrl is set ─────────────────────────────────────────
  usePerfEffect(() => {
    if (!sheetUrl) { setSheetStatus("no-url"); return; }
    let cancelled = false;
    setSheetStatus("loading"); setSheetError(null);
    fetch(`/api/performance?url=${encodeURIComponent(sheetUrl)}`)
      .then(r => r.json().then(j => ({ ok: r.ok, body: j })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setSheetStatus("error"); setSheetError(body.error || "Fetch failed"); return; }
        setData(body); setSheetStatus("ok");
      })
      .catch(e => { if (!cancelled) { setSheetStatus("error"); setSheetError(e.message); } });
    return () => { cancelled = true; };
  }, [sheetUrl]);

  // ── All approved pieces — always the spine of the view ─────────────────
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
    if (!data || !data.rows.length) {
      return { byPieceId: {}, unmatchedRows: [] };
    }
    const urlCol = data.url_col;
    const rowByKey = new Map();
    const unmatchedRows = [];
    for (const row of data.rows) {
      const key = normUrl(row[urlCol]);
      if (!key) { unmatchedRows.push(row); continue; }
      if (!rowByKey.has(key)) rowByKey.set(key, row);
    }
    const byPieceId = {};
    const usedKeys = new Set();
    for (const p of approvedPieces) {
      if (p.urlKey && rowByKey.has(p.urlKey)) {
        byPieceId[p.piece.id] = rowByKey.get(p.urlKey);
        usedKeys.add(p.urlKey);
      }
    }
    for (const [key, row] of rowByKey.entries()) {
      if (!usedKeys.has(key)) unmatchedRows.push(row);
    }
    return { byPieceId, unmatchedRows };
  }, [data, approvedPieces]);

  // ── Column classification ──────────────────────────────────────────────
  const cols = usePerfMemo(() => {
    if (!data) return { numeric: [], text: [] };
    return classifyColumns(data.headers, data.rows, data.url_col, data.trend_col);
  }, [data]);

  const heroMetric = cols.numeric[0] || null;
  const stripMetrics = cols.numeric.slice(1, 4);

  // ── KPI strip — totals across matched pieces only ──────────────────────
  const kpis = usePerfMemo(() => {
    if (!data) return null;
    const totals = {};
    for (const m of cols.numeric.slice(0, 4)) {
      let sum = 0, count = 0;
      for (const p of approvedPieces) {
        const row = joined.byPieceId[p.piece.id];
        if (!row) continue;
        const v = row[m];
        if (typeof v === "number") { sum += v; count++; }
      }
      if (count > 0) totals[m] = { sum, count };
    }
    return Object.keys(totals).length > 0 ? totals : null;
  }, [data, joined, cols, approvedPieces]);

  // ── Sorted card list ───────────────────────────────────────────────────
  const sortedPieces = usePerfMemo(() => {
    if (!heroMetric || !data) return approvedPieces;
    const metric = sortBy || heroMetric;
    return [...approvedPieces].sort((a, b) => {
      const ra = joined.byPieceId[a.piece.id];
      const rb = joined.byPieceId[b.piece.id];
      const va = ra ? ra[metric] : null;
      const vb = rb ? rb[metric] : null;
      // Pieces with data sort before those without
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return vb - va;
      return 0;
    });
  }, [approvedPieces, joined, sortBy, heroMetric, data]);

  // ── Save sheet URL ─────────────────────────────────────────────────────
  function saveSheetUrl(newUrl) {
    setProject(p => ({
      ...p,
      performance: { ...(p.performance || {}), sheet_url: newUrl, last_configured_by: currentUser?.id, last_configured_at: new Date().toISOString() },
    }));
  }

  function doRefresh() {
    if (!sheetUrl) return;
    setSheetStatus("loading");
    fetch(`/api/performance?url=${encodeURIComponent(sheetUrl)}`)
      .then(r => r.json())
      .then(j => { setData(j); setSheetStatus("ok"); })
      .catch(e => { setSheetStatus("error"); setSheetError(e.message); });
  }

  const selectedEntry = selected ? approvedPieces.find(p => p.piece.id === selected) : null;
  const selectedRow = selected ? joined.byPieceId[selected] : null;
  const matchedCount = Object.keys(joined.byPieceId).length;

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
            {approvedPieces.length} approved {approvedPieces.length === 1 ? "piece" : "pieces"}.
            {data ? ` ${matchedCount} matched to sheet data.` : " Click any card to connect Google Analytics data."}
          </p>
        </div>

        {/* Controls — only visible once sheet is connected */}
        {sheetUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ ...FONT, fontSize: "0.7rem", color: "#999" }}>
              {sheetStatus === "loading" && "Syncing…"}
              {sheetStatus === "ok" && data && <>Synced {fmtSyncTime(data.fetched_at)}</>}
              {sheetStatus === "error" && <span style={{ color: "#c8401a" }}>Sync failed</span>}
            </div>
            <button onClick={doRefresh} style={{
              ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "6px 12px", border: "1px solid #d7d1c8", background: "#fff", color: "#444", borderRadius: "3px", cursor: "pointer",
            }}>↻ Refresh</button>
          </div>
        )}
      </header>

      {/* ── Sync error banner ────────────────────────────────────────────── */}
      {sheetStatus === "error" && (
        <div style={{
          ...FONT, padding: "12px 16px", background: "#fff", border: "1px solid #f0d0c0",
          borderLeft: "3px solid #c8401a", borderRadius: "3px", marginBottom: "20px",
          fontSize: "0.78rem", color: "#333", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px",
        }}>
          <span>Sheet sync failed — {sheetError}. Check the sheet is shared "anyone with the link can view".</span>
          <button onClick={() => setSelected("__setup__")} style={{
            ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "5px 10px", border: "1px solid #d7d1c8", background: "#faf8f4", color: "#444", borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap",
          }}>Update URL</button>
        </div>
      )}

      {/* ── KPI strip — visible only once data is loaded ─────────────────── */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, Object.keys(kpis).length)}, 1fr)`, gap: "12px", marginBottom: "24px" }}>
          {Object.keys(kpis).map(m => (
            <div key={m} style={{
              background: "#fff", border: "1px solid #e8e3da", borderLeft: "3px solid #1a2f4e",
              padding: "14px 16px", borderRadius: "3px",
            }}>
              <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
                Total {m}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 600, color: "#1a2535", marginTop: "4px", lineHeight: 1 }}>
                {formatNum(kpis[m].sum)}
              </div>
              <div style={{ ...FONT, fontSize: "0.68rem", color: "#aaa", marginTop: "4px" }}>
                across {kpis[m].count} {kpis[m].count === 1 ? "piece" : "pieces"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sort + unmatched controls — only once data is loaded ─────────── */}
      {data && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
          {cols.numeric.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
          {joined.unmatchedRows.length > 0 && (
            <button
              onClick={() => setShowUnmatched(v => !v)}
              style={{
                ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em",
                padding: "5px 10px", borderRadius: "3px", cursor: "pointer", marginLeft: "auto",
                border: showUnmatched ? "1px solid #1a2f4e" : "1px solid #d7d1c8",
                background: showUnmatched ? "#e8f2fa" : "#fff",
                color: showUnmatched ? "#1a2f4e" : "#666",
              }}
            >
              {joined.unmatchedRows.length} unmatched sheet {joined.unmatchedRows.length === 1 ? "row" : "rows"} {showUnmatched ? "▲" : "▼"}
            </button>
          )}
        </div>
      )}

      {/* ── Unmatched rows (collapsed by default) ────────────────────────── */}
      {showUnmatched && joined.unmatchedRows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px", marginBottom: "20px" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e3da", background: "#faf8f4", ...FONT, fontSize: "0.72rem", color: "#666" }}>
            Sheet rows whose URL didn't match any approved piece.
          </div>
          {joined.unmatchedRows.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 16px", borderBottom: "1px solid #f0ede6", gap: "12px",
            }}>
              <code style={{ ...FONT, fontSize: "0.72rem", color: "#333", background: "#f5f2ec", padding: "3px 7px", borderRadius: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                {String(row[data.url_col] ?? "(no url)")}
              </code>
              {heroMetric && (
                <span style={{ ...FONT, fontSize: "0.76rem", fontWeight: 600, color: "#666", flexShrink: 0 }}>
                  {heroMetric}: {formatNum(row[heroMetric])}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Cards — always rendered for every approved piece ─────────────── */}
      {approvedPieces.length === 0 ? (
        <div style={{ ...FONT, padding: "40px", textAlign: "center", color: "#aaa", fontSize: "0.82rem" }}>
          No approved pieces yet. Pieces move here once they're approved in the tracker.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {sortedPieces.map(({ piece, cluster, pillar }) => {
            const row = joined.byPieceId[piece.id] || null;
            return (
              <PieceCard
                key={piece.id}
                piece={piece} cluster={cluster} pillar={pillar}
                row={row}
                heroMetric={heroMetric}
                stripMetrics={stripMetrics}
                trendCol={data?.trend_col || null}
                hasSheet={!!sheetUrl}
                onClick={() => setSelected(piece.id)}
              />
            );
          })}
        </div>
      )}

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      {(selected && selected !== "__setup__" && selectedEntry) && (
        <PieceDrawer
          entry={selectedEntry}
          row={selectedRow}
          headers={data?.headers || null}
          urlCol={data?.url_col || null}
          trendCol={data?.trend_col || null}
          hasSheet={!!sheetUrl}
          sheetStatus={sheetStatus}
          onConnectSheet={saveSheetUrl}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

// ─── Piece card ─────────────────────────────────────────────────────────────
// row is null when no sheet data matched this piece.
function PieceCard({ piece, cluster, pillar, row, heroMetric, stripMetrics, trendCol, hasSheet, onClick }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const hasData = !!row;
  const heroValue = hasData && heroMetric ? row[heroMetric] : null;
  const trend = hasData && trendCol ? parseTrend(row[trendCol]) : null;
  const trendColor = trend?.dir === "up" ? "#1e7a45" : trend?.dir === "down" ? "#c8401a" : "#999";
  const trendBg   = trend?.dir === "up" ? "#e6f5ec"  : trend?.dir === "down" ? "#fbe8e2"  : "#f0ede6";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px",
        padding: "16px 18px 14px", cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column", minHeight: "160px",
        opacity: hasData ? 1 : 0.72,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a2f4e"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,47,78,0.08)"; e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e3da"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.opacity = hasData ? "1" : "0.72"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "3px" }}>
            {pillar.label}
          </div>
          <div style={{ ...FONT, fontSize: "0.86rem", fontWeight: 600, color: "#1a2535", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {piece.title}
          </div>
        </div>
        {trend && trend.dir !== "flat" && (
          <span style={{
            ...FONT, fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: "2px",
            color: trendColor, background: trendBg, whiteSpace: "nowrap", flexShrink: 0,
          }}>{trend.label}</span>
        )}
      </div>

      {/* Hero metric or no-data prompt */}
      <div style={{ marginTop: "auto" }}>
        {hasData && heroMetric ? (
          <>
            <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "2px" }}>
              {heroMetric}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 600, color: "#1a2535", lineHeight: 1 }}>
              {formatNum(heroValue)}
            </div>
          </>
        ) : (
          <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb" }}>
            {hasSheet ? "No data matched" : "Click to add data →"}
          </div>
        )}
      </div>

      {/* Secondary metrics strip */}
      {hasData && stripMetrics.length > 0 && (
        <div style={{ display: "flex", gap: "14px", borderTop: "1px solid #f0ede6", paddingTop: "10px", marginTop: "10px" }}>
          {stripMetrics.map(m => (
            <div key={m} style={{ minWidth: 0 }}>
              <div style={{ ...FONT, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>{m}</div>
              <div style={{ ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#333", marginTop: "1px" }}>{formatNum(row[m])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Piece drawer ────────────────────────────────────────────────────────────
// Shows metrics when sheet data is available; shows the sheet connection form
// when it isn't (either no sheet URL, or no matching row for this piece).
function PieceDrawer({ entry, row, headers, urlCol, trendCol, hasSheet, sheetStatus, onConnectSheet, onClose }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const { piece, cluster, pillar } = entry;
  const liveUrl = piece.publishing?.live_url || piece.url;
  const [draft, setDraft] = usePerfState("");

  function handleSave() {
    if (draft.trim()) { onConnectSheet(draft.trim()); }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,25,35,0.35)", zIndex: 100 }} />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: "min(440px, 90vw)",
        background: "#fff", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", zIndex: 101,
        overflowY: "auto", padding: "24px 28px",
      }}>
        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", gap: "10px" }}>
          <div>
            <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>
              {pillar.label} · {cluster.label}
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#1a2535", margin: 0, lineHeight: 1.3 }}>
              {piece.title}
            </h3>
          </div>
          <button onClick={onClose} style={{ ...FONT, fontSize: "1.2rem", color: "#888", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }} aria-label="Close">×</button>
        </div>

        {/* Live URL */}
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "6px", marginBottom: "18px",
            ...FONT, fontSize: "0.7rem", color: "#1a2f4e", textDecoration: "none",
            padding: "7px 10px", background: "#f0ede6", borderRadius: "3px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            <span style={{ opacity: 0.5 }}>↗</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{liveUrl}</span>
          </a>
        )}

        {/* Metrics — if row data exists */}
        {row && headers && (
          <div style={{ borderTop: "1px solid #e8e3da" }}>
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
        )}

        {/* No data — sheet connection prompt */}
        {!row && (
          <div style={{ borderTop: "1px solid #e8e3da", paddingTop: "20px" }}>
            <div style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1a2f4e", marginBottom: "8px" }}>
              {hasSheet ? "No data matched for this piece" : "Connect Google Analytics sheet"}
            </div>
            <div style={{ ...FONT, fontSize: "0.78rem", color: "#666", marginBottom: "14px", lineHeight: 1.5 }}>
              {hasSheet
                ? "The sheet loaded but no row matched this piece's URL. Ask Jason to add a row for this page, or check the URL column lines up."
                : "Paste the share URL from Jason's sheet. Sheet must be shared \"anyone with the link can view\" — metrics will appear across all cards once connected."}
            </div>
            {!hasSheet && (
              <>
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                  style={{
                    ...FONT, width: "100%", padding: "9px 12px", border: "1px solid #d7d1c8",
                    borderRadius: "3px", fontSize: "0.76rem", color: "#333", marginBottom: "10px",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                />
                <button
                  onClick={handleSave}
                  disabled={!draft.trim()}
                  style={{
                    ...FONT, width: "100%", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "10px 16px", border: "none", borderRadius: "3px", cursor: draft.trim() ? "pointer" : "not-allowed",
                    background: draft.trim() ? "#1a2f4e" : "#c8c0b4", color: "#fff",
                  }}
                >
                  Save & Sync
                </button>
              </>
            )}
            {hasSheet && sheetStatus === "error" && (
              <>
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Paste a new share URL to retry"
                  style={{
                    ...FONT, width: "100%", padding: "9px 12px", border: "1px solid #f0d0c0",
                    borderRadius: "3px", fontSize: "0.76rem", color: "#333", marginBottom: "10px",
                  }}
                />
                <button onClick={handleSave} disabled={!draft.trim()} style={{
                  ...FONT, width: "100%", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "10px 16px", border: "none", borderRadius: "3px", cursor: draft.trim() ? "pointer" : "not-allowed",
                  background: draft.trim() ? "#1a2f4e" : "#c8c0b4", color: "#fff",
                }}>Update & Retry</button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

window.PerformancePanel = PerformancePanel;
