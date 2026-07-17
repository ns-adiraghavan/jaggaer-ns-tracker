// Performance panel — Search Console metrics per published piece.
//
// Ingestion is file upload, not a live sheet pull. Jason exports a GSC report
// filtered to one page, drops the .xlsx on that piece's card, and the parsed
// result is written to project.json.
//
// Data flow:
//   1. Card dropzone → base64 → POST /api/perf-xlsx.
//   2. Response keyed by the URL slug from the export's Pages sheet.
//   3. Stored at project.performanceData[url_key]; joined back to pieces via
//      piece.publishing.live_url. Slug mismatch is surfaced, never swallowed.
//
// Jaggaer users upload. NS users read.

const { useState: usePerfState, useMemo: usePerfMemo, useRef: usePerfRef } = React;

// ─── Utilities ──────────────────────────────────────────────────────────────

// Same slug rule as api/perf-xlsx.js — last non-empty path segment, lowercased.
function perfSlug(url) {
  if (!url) return null;
  let s = String(url).trim().toLowerCase();
  s = s.replace(/^https?:\/\/[^/]+/, "");
  s = s.replace(/[?#].*$/, "");
  s = s.replace(/\/+$/, "");
  const parts = s.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

// Release date = when the piece last entered "approved". Seeded history entries
// carry ts: null (we never backfilled dates we didn't have), so those fall back
// to last_updated and, failing that, sort last.
function perfReleaseTs(piece) {
  const history = piece.status_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].stage === "approved" && history[i].ts) return history[i].ts;
  }
  return piece.last_updated || null;
}

function perfNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}

function perfPct(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return (v * 100).toFixed(2) + "%";
}

function perfPos(v) {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0) return "—";
  return v.toFixed(1);
}

function perfDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MON[Number(m) - 1]} ${Number(d)}`;
}

function perfUploadedAt(iso) {
  if (!iso) return "";
  try { return formatEST(iso); } catch { return String(iso).slice(0, 10); }
}

function perfFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read the file"));
    r.readAsDataURL(file);
  });
}

// ─── Performance computation helpers ────────────────────────────────────────

// Trailing-3-month window: from 90 days ago (or go-live date, whichever is later)
// to today. Returns filtered timeseries rows.
function perfTrailing3Month(timeseries, releaseTs) {
  if (!timeseries || !timeseries.length) return [];
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const releaseMs = releaseTs ? new Date(releaseTs).getTime() : 0;
  const windowStart = Math.max(ninetyDaysAgo, releaseMs);
  return timeseries.filter(p => {
    const t = new Date(p.date).getTime();
    return t >= windowStart && t <= now;
  });
}

// Sum impressions and clicks over a timeseries window.
function perfWindowTotals(window) {
  let impressions = 0, clicks = 0, weighted = 0;
  for (const p of window) {
    impressions += p.impressions || 0;
    clicks += p.clicks || 0;
    weighted += (p.impressions || 0) * (p.position || 0);
  }
  const avgMonthly = window.length ? (impressions / (window.length / 30)) : 0;
  const weightedAvgPos = impressions > 0 ? weighted / impressions : 0;
  return { impressions, clicks, avgMonthly, weightedAvgPos };
}

// ─── Sparkline ──────────────────────────────────────────────────────────────
function PerfSparkline({ series, w = 240, h = 34, color = "#c8401a" }) {
  if (!series || series.length < 2) return null;
  const vals = series.map(p => p.impressions);
  const max = Math.max(...vals, 1);
  const stepX = w / (series.length - 1);
  const pts = vals.map((v, i) => [i * stepX, h - (v / max) * (h - 3) - 1]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={color} opacity="0.08" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Root panel ─────────────────────────────────────────────────────────────
function PerformancePanel({ project, setProject, currentUser, adminMode }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const canUpload = currentUser?.org === "jaggaer" || !!adminMode;

  const [sortBy, setSortBy] = usePerfState("impressions"); // "impressions" | "release"
  const [selected, setSelected] = usePerfState(null);   // url_key of open modal
  const [busyKey, setBusyKey] = usePerfState(null);     // url_key currently uploading
  const [error, setError] = usePerfState(null);         // { key, message }

  const perfData = project.performanceData || {};

  // ── Published pieces — approved and carrying a live URL ────────────────
  const published = usePerfMemo(() => {
    const out = [];
    let approvedNoUrl = 0;
    for (const pillar of project.pillars || []) {
      for (const cluster of pillar.clusters || []) {
        for (const piece of cluster.pieces || []) {
          if (piece.status !== "approved") continue;
          const url = piece.publishing?.live_url || piece.url || null;
          if (!url) { approvedNoUrl++; continue; }
          out.push({ piece, cluster, pillar, url, key: perfSlug(url) });
        }
      }
    }
    if (sortBy === "release") {
      // Newest release first. Pieces with no logged approval date sort last —
      // they're the pre-tracking ones and we can't honestly place them.
      out.sort((a, b) => {
        const ta = perfReleaseTs(a.piece), tb = perfReleaseTs(b.piece);
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return new Date(tb) - new Date(ta);
      });
    } else {
      // Impressions desc; pieces with no data uploaded yet sink to the bottom.
      out.sort((a, b) => {
        const da = perfData[a.key], db = perfData[b.key];
        if (da && !db) return -1;
        if (!da && db) return 1;
        if (da && db) return (db.summary?.impressions || 0) - (da.summary?.impressions || 0);
        return 0;
      });
    }
    out.approvedNoUrl = approvedNoUrl;
    return out;
  }, [project, perfData, sortBy]);

  const approvedNoUrl = published.approvedNoUrl || 0;
  const withData = published.filter(p => perfData[p.key]);

  // ── Records whose slug matches no published piece ──────────────────────
  const orphans = usePerfMemo(() => {
    const known = new Set(published.map(p => p.key));
    return Object.keys(perfData).filter(k => !known.has(k));
  }, [perfData, published]);

  // ── KPI strip — totals across pieces that have data (trailing 3 months) ──
  const kpis = usePerfMemo(() => {
    if (!withData.length) return null;
    let clicks = 0, impressions = 0, avgMonthlySum = 0, weighted = 0;
    let best = null, mostImpr = null;
    for (const p of withData) {
      const record = perfData[p.key];
      const releaseTs = perfReleaseTs(p.piece);
      const window = perfTrailing3Month(record.timeseries, releaseTs);
      const totals = window.length ? perfWindowTotals(window) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
      clicks += totals.clicks;
      impressions += totals.impressions;
      avgMonthlySum += totals.avgMonthly;
      weighted += totals.weightedAvgPos * totals.impressions;
      const s = record.summary || {};
      if (s.avg_position > 0 && (!best || s.avg_position < best.pos)) best = { pos: s.avg_position, title: p.piece.title };
      if (!mostImpr || totals.impressions > (mostImpr.impr || 0)) mostImpr = { impr: totals.impressions, title: p.piece.title };
    }
    return {
      clicks,
      impressions,
      avgMonthly: withData.length ? avgMonthlySum / withData.length : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      avgPosition: impressions > 0 ? weighted / impressions : 0,
      best,
      mostImpr,
      pieces: withData.length,
    };
  }, [withData, perfData]);

  // ── Upload ─────────────────────────────────────────────────────────────
  async function handleUpload(entry, file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setError({ key: entry.key, message: "That isn't an .xlsx. Export the report from Search Console as Excel." });
      return;
    }
    setError(null);
    setBusyKey(entry.key);
    try {
      const content = await perfFileToBase64(file);
      const r = await fetch("/api/perf-xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename: file.name }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `Parse failed (${r.status})`);

      if (body.url_key !== entry.key) {
        throw new Error(
          `This export is for ${body.url}, which doesn't match this piece's live URL (${entry.url}). Re-export with the right page filter, or fix the live URL on the piece.`
        );
      }

      const record = {
        url: body.url,
        uploaded_at: new Date().toISOString(),
        uploaded_by: currentUser?.id || null,
        filename: body.filename || file.name,
        date_range: body.date_range,
        summary: body.summary,
        timeseries: body.timeseries,
        top_queries: body.top_queries,
        countries: body.countries,
        devices: body.devices,
      };

      setProject(p => ({
        ...p,
        performanceData: { ...(p.performanceData || {}), [body.url_key]: record },
      }));
    } catch (e) {
      setError({ key: entry.key, message: e.message });
    } finally {
      setBusyKey(null);
    }
  }

  function clearRecord(key) {
    setProject(p => {
      const next = { ...(p.performanceData || {}) };
      delete next[key];
      return { ...p, performanceData: next };
    });
    setSelected(null);
  }

  const selectedEntry = selected ? published.find(p => p.key === selected) : null;

  return (
    <main className="ns-tracker" style={{ padding: "28px 32px", maxWidth: "1240px" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: "24px" }}>
        <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
          Search Performance
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#1a2535", margin: 0 }}>
          How the pieces we shipped are doing.
        </h1>
        <p style={{ ...FONT, fontSize: "0.8rem", color: "#888", marginTop: "8px", maxWidth: "680px", lineHeight: 1.5 }}>
          {published.length} live {published.length === 1 ? "piece" : "pieces"}, {withData.length} with Search Console data.
          {canUpload
            ? " Export a report from Search Console with a single page filter applied, then drop the .xlsx on that piece's card."
            : " Jaggaer uploads the Search Console exports; these cards are read-only for NS."}
          {approvedNoUrl > 0 && ` ${approvedNoUrl} approved ${approvedNoUrl === 1 ? "piece has" : "pieces have"} no live URL yet.`}
        </p>
      </header>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <PerfKpi label="Clicks (trailing 3mo)" value={perfNum(kpis.clicks)} sub={`across ${kpis.pieces} ${kpis.pieces === 1 ? "piece" : "pieces"}`} />
          <PerfKpi label="Impressions (trailing 3mo)" value={perfNum(kpis.impressions)} sub={kpis.mostImpr ? `top: ${kpis.mostImpr.title}` : ""} />
          <PerfKpi label="Avg monthly impressions" value={perfNum(kpis.avgMonthly)} sub="trailing 3-month avg" />
          <PerfKpi label="Avg position (weighted)" value={perfPos(kpis.avgPosition)} sub={kpis.best ? `best: ${perfPos(kpis.best.pos)}` : ""} />
        </div>
      )}

      {/* ── Orphan records ───────────────────────────────────────────────── */}
      {orphans.length > 0 && (
        <div style={{
          ...FONT, padding: "12px 16px", background: "#fff", border: "1px solid #f0d0c0",
          borderLeft: "3px solid #c8401a", borderRadius: "3px", marginBottom: "20px", fontSize: "0.78rem", color: "#333",
        }}>
          {orphans.length} uploaded {orphans.length === 1 ? "export doesn't" : "exports don't"} match any live piece URL:{" "}
          {orphans.map(k => <code key={k} style={{ background: "#f5f2ec", padding: "2px 6px", borderRadius: "2px", marginRight: "6px" }}>{k}</code>)}
          {" "}The piece's live URL probably changed after upload.
        </div>
      )}

      {/* ── Sort toggle ──────────────────────────────────────────────────── */}
      {published.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginBottom: "12px" }}>
          <span style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa" }}>
            Sort by
          </span>
          <div style={{ display: "flex", border: "1px solid #e8e3da", borderRadius: "3px", overflow: "hidden", background: "#fff" }}>
            {[["impressions", "Impressions"], ["release", "Release date"]].map(([id, label]) => {
              const on = sortBy === id;
              return (
                <button
                  key={id}
                  onClick={() => setSortBy(id)}
                  style={{
                    ...FONT, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.03em",
                    padding: "6px 12px", border: "none", cursor: "pointer",
                    background: on ? "#1a2f4e" : "#fff",
                    color: on ? "#fff" : "#888",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      {published.length === 0 ? (
        <div style={{ ...FONT, padding: "40px", textAlign: "center", color: "#aaa", fontSize: "0.82rem" }}>
          No live pieces yet. Cards appear here once a piece is approved and has a live URL.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
          {published.map(entry => (
            <PerfPieceCard
              key={entry.key}
              entry={entry}
              sortBy={sortBy}
              record={perfData[entry.key] || null}
              canUpload={canUpload}
              busy={busyKey === entry.key}
              error={error && error.key === entry.key ? error.message : null}
              onUpload={file => handleUpload(entry, file)}
              onOpen={() => setSelected(entry.key)}
              onDismissError={() => setError(null)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {selectedEntry && perfData[selectedEntry.key] && (
        <PerfPieceModal
          entry={selectedEntry}
          record={perfData[selectedEntry.key]}
          canUpload={canUpload}
          busy={busyKey === selectedEntry.key}
          error={error && error.key === selectedEntry.key ? error.message : null}
          onUpload={file => handleUpload(selectedEntry, file)}
          onClear={() => clearRecord(selectedEntry.key)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

// ─── KPI tile ───────────────────────────────────────────────────────────────
function PerfKpi({ label, value, sub }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderLeft: "3px solid #1a2f4e", padding: "14px 16px", borderRadius: "3px" }}>
      <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 600, color: "#1a2535", marginTop: "4px", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", marginTop: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Dropzone ───────────────────────────────────────────────────────────────
function PerfDropzone({ busy, onUpload, compact, label }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const inputRef = usePerfRef(null);
  const [over, setOver] = usePerfState(false);

  return (
    <div
      onClick={e => { e.stopPropagation(); if (!busy) inputRef.current?.click(); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={e => { e.preventDefault(); setOver(false); }}
      onDrop={e => {
        e.preventDefault(); e.stopPropagation(); setOver(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && !busy) onUpload(f);
      }}
      style={{
        ...FONT, fontSize: compact ? "0.7rem" : "0.74rem", textAlign: "center",
        padding: compact ? "8px 10px" : "16px 12px",
        border: `1px dashed ${over ? "#c8401a" : "#d7d1c8"}`,
        background: over ? "#fdf3ef" : "#faf8f4",
        color: busy ? "#aaa" : over ? "#c8401a" : "#888",
        borderRadius: "3px", cursor: busy ? "wait" : "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files && e.target.files[0];
          e.target.value = "";
          if (f) onUpload(f);
        }}
      />
      {busy ? "Parsing…" : (label || "Drop Search Console .xlsx, or click to browse")}
    </div>
  );
}

// ─── Piece card ─────────────────────────────────────────────────────────────
function PerfPieceCard({ entry, record, canUpload, busy, error, onUpload, onOpen, onDismissError, sortBy }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const { piece, pillar } = entry;
  const s = record ? (record.summary || {}) : null;
  const releaseTs = perfReleaseTs(piece);
  // Trailing-3-month window metrics (computed upfront to avoid IIFE in JSX)
  const cardWin = record ? perfTrailing3Month(record.timeseries, releaseTs) : [];
  const cardWt = cardWin.length ? perfWindowTotals(cardWin) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
  const cardKw = piece.primary_keyword || null;

  return (
    <div
      onClick={record ? onOpen : undefined}
      style={{
        background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px",
        padding: "16px 18px 14px", cursor: record ? "pointer" : "default",
        display: "flex", flexDirection: "column", gap: "10px", minHeight: "170px",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { if (record) { e.currentTarget.style.borderColor = "#1a2f4e"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,47,78,0.08)"; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e3da"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Header */}
      <div>
        <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "3px" }}>
          {pillar.label}
        </div>
        <div style={{ ...FONT, fontSize: "0.86rem", fontWeight: 600, color: "#1a2535", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {piece.title}
        </div>
        {sortBy === "release" && (
          <div style={{ ...FONT, fontSize: "0.66rem", color: "#1e7a45", fontWeight: 600, marginTop: "4px" }}>
            {releaseTs ? `Released ${perfUploadedAt(releaseTs)}` : "Release date not logged"}
          </div>
        )}
      </div>

      {record ? (
        <>
          <div style={{ marginTop: "auto" }}>
            <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "2px" }}>
              Impressions · trailing 3 months
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.1rem", fontWeight: 600, color: "#1a2535", lineHeight: 1 }}>
              {perfNum(cardWt.impressions)}
            </div>
            <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", marginTop: "3px" }}>
              avg {perfNum(cardWt.avgMonthly)} / month
            </div>
          </div>
          <PerfSparkline series={cardWin.length >= 2 ? cardWin : record.timeseries} />

          <div style={{ display: "flex", gap: "16px", borderTop: "1px solid #f0ede6", paddingTop: "10px" }}>
            {[["Clicks", perfNum(cardWt.clicks)], ["CTR", perfPct(cardWt.clicks && cardWt.impressions ? cardWt.clicks / cardWt.impressions : 0)], ["Avg position", perfPos(cardWt.weightedAvgPos)]].map(([k, v]) => (
              <div key={k}>
                <div style={{ ...FONT, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>{k}</div>
                <div style={{ ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#333", marginTop: "1px" }}>{v}</div>
              </div>
            ))}
          </div>
          {cardKw && (
            <div style={{ ...FONT, fontSize: "0.66rem", color: "#555", background: "#f5f2ec", padding: "4px 8px", borderRadius: "2px" }}>
              <span style={{ color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.58rem" }}>Target keyword · </span>{cardKw}
            </div>
          )}
          <div style={{ ...FONT, fontSize: "0.64rem", color: "#bbb" }}>
            {record.date_range && record.date_range.start
              ? `${perfDate(record.date_range.start)} – ${perfDate(record.date_range.end)}`
              : "Range unknown"}
            {record.uploaded_at && ` · uploaded ${perfUploadedAt(record.uploaded_at)}`}
          </div>
        </>
      ) : (
        <div style={{ marginTop: "auto" }}>
          {canUpload ? (
            <PerfDropzone busy={busy} onUpload={onUpload} />
          ) : (
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", padding: "16px 0" }}>
              No Search Console data uploaded yet.
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          onClick={e => { e.stopPropagation(); onDismissError(); }}
          style={{
            ...FONT, fontSize: "0.7rem", color: "#c8401a", background: "#fbe8e2",
            border: "1px solid #f0d0c0", borderRadius: "3px", padding: "8px 10px", lineHeight: 1.4, cursor: "pointer",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Time-series chart ──────────────────────────────────────────────────────
function PerfChart({ series }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (!series || series.length < 2) {
    return <div style={{ ...FONT, fontSize: "0.74rem", color: "#bbb", padding: "12px 0" }}>Not enough days to chart.</div>;
  }
  // Impressions carry the shape; clicks are counted in single digits, so a
  // second axis would exaggerate them. Clicks are marked as dots on the curve
  // instead — one dot per day that earned at least one click.
  const H = 110, PAD = 4;
  const maxI = Math.max(...series.map(p => p.impressions), 1);
  const stepX = 100 / (series.length - 1);   // percent, so the SVG stretches
  const px = i => PAD + i * stepX;
  const py = v => H - (v / maxI) * (H - 12) - 2;

  const impLine = series.map((p, i) => `${px(i).toFixed(2)},${py(p.impressions).toFixed(1)}`).join(" ");
  const clickDays = series.map((p, i) => ({ ...p, i })).filter(p => p.clicks > 0);

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${100 + PAD * 2} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <polygon points={`${PAD},${H} ${impLine} ${PAD + 100},${H}`} fill="#c8401a" opacity="0.07" />
        <polyline points={impLine} fill="none" stroke="#c8401a" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {clickDays.map(p => (
          <line
            key={p.i}
            x1={px(p.i)} x2={px(p.i)}
            y1={py(p.impressions) - 4} y2={py(p.impressions) + 4}
            stroke="#1a2f4e" strokeWidth="1.6" vectorEffect="non-scaling-stroke"
          >
            <title>{`${p.date} · ${p.clicks} click${p.clicks === 1 ? "" : "s"} · ${p.impressions} impressions`}</title>
          </line>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
        <span style={{ ...FONT, fontSize: "0.64rem", color: "#aaa" }}>{perfDate(series[0].date)}</span>
        <div style={{ display: "flex", gap: "12px" }}>
          <span style={{ ...FONT, fontSize: "0.64rem", color: "#c8401a", fontWeight: 600 }}>Impressions</span>
          <span style={{ ...FONT, fontSize: "0.64rem", color: "#1a2f4e", fontWeight: 600 }}>Days with clicks</span>
        </div>
        <span style={{ ...FONT, fontSize: "0.64rem", color: "#aaa" }}>{perfDate(series[series.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ─── Dimension table ────────────────────────────────────────────────────────
function PerfDimTable({ title, rows, field, limit }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (!rows || !rows.length) return null;
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(...shown.map(r => r.impressions), 1);
  const GRID = "1fr 46px 62px 44px";

  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ borderTop: "1px solid #e8e3da" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "6px 0", borderBottom: "1px solid #f0ede6" }}>
          {["", "Clicks", "Impr.", "Pos."].map((h, i) => (
            <span key={i} style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#bbb", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
          ))}
        </div>
        {shown.map((r, i) => (
          <div key={i} style={{ position: "relative", borderBottom: "1px solid #f5f2ec" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${(r.impressions / max) * 100}%`, background: "#c8401a", opacity: 0.05,
            }} />
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "8px 0", alignItems: "baseline" }}>
              <span style={{ ...FONT, fontSize: "0.74rem", color: "#333", lineHeight: 1.35 }}>
                {String(r[field] || "").replace(/\s+/g, " ")}
              </span>
              <span style={{ ...FONT, fontSize: "0.74rem", color: r.clicks > 0 ? "#1a2535" : "#ccc", fontWeight: 600, textAlign: "right" }}>{r.clicks}</span>
              <span style={{ ...FONT, fontSize: "0.74rem", color: "#666", textAlign: "right" }}>{perfNum(r.impressions)}</span>
              <span style={{ ...FONT, fontSize: "0.74rem", color: "#888", textAlign: "right" }}>{perfPos(r.position)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Piece modal ────────────────────────────────────────────────────────────
// Centered dialog rather than a right-hand drawer (July 2026): the drawer was
// too narrow for the query table, which is the thing people actually open this
// for. Scroll lives on the inner body so the header stays put.
function PerfPieceModal({ entry, record, canUpload, busy, error, onUpload, onClear, onClose }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const { piece, cluster, pillar, url } = entry;
  const s = record.summary || {};
  const [confirmClear, setConfirmClear] = usePerfState(false);
  // Trailing-3-month metrics for modal display
  const modalRelTs = perfReleaseTs(piece);
  const modalWin = perfTrailing3Month(record.timeseries, modalRelTs);
  const modalWt = modalWin.length ? perfWindowTotals(modalWin) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
  const modalKw = piece.primary_keyword || null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,25,35,0.42)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "4px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.24)",
          width: "min(720px, 100%)", maxHeight: "100%",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
      <div style={{ overflowY: "auto", padding: "24px 28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "10px" }}>
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

        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px",
          ...FONT, fontSize: "0.7rem", color: "#1a2f4e", textDecoration: "none",
          padding: "7px 10px", background: "#f0ede6", borderRadius: "3px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          <span style={{ opacity: 0.5 }}>↗</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{url}</span>
        </a>

        <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "10px" }}>
          {[
            ["Clicks (3mo)", perfNum(modalWt.clicks)],
            ["Impressions (3mo)", perfNum(modalWt.impressions)],
            ["Avg monthly", perfNum(modalWt.avgMonthly)],
            ["Avg position (wtd)", modalWt.weightedAvgPos > 0 ? perfPos(modalWt.weightedAvgPos) : "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "#faf8f4", border: "1px solid #f0ede6", borderRadius: "3px", padding: "9px 10px" }}>
              <div style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>{k}</div>
              <div style={{ ...FONT, fontSize: "0.95rem", fontWeight: 700, color: "#1a2535", marginTop: "2px" }}>{v}</div>
            </div>
          ))}
        </div>
        {modalKw && (
          <div style={{ ...FONT, fontSize: "0.7rem", color: "#444", background: "#f5f2ec", padding: "6px 10px", borderRadius: "3px", marginBottom: "10px" }}>
            <span style={{ color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.6rem" }}>Target keyword </span>{modalKw}
          </div>
        )}
        </>

        <div style={{ ...FONT, fontSize: "0.68rem", color: "#aaa", marginBottom: "10px" }}>
          {(record.date_range && record.date_range.label) || "Date range"}
          {record.date_range && record.date_range.start && ` · ${perfDate(record.date_range.start)} – ${perfDate(record.date_range.end)}`}
        </div>

        <PerfChart series={record.timeseries} />

        <PerfDimTable title="Top queries" rows={record.top_queries} field="query" limit={10} />
        <PerfDimTable title="Countries" rows={record.countries} field="country" limit={8} />
        <PerfDimTable title="Devices" rows={record.devices} field="device" />

        <div style={{ marginTop: "26px", borderTop: "1px solid #e8e3da", paddingTop: "16px" }}>
          <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", marginBottom: "8px" }}>
            {record.filename && <>Source: <code style={{ background: "#f5f2ec", padding: "2px 5px", borderRadius: "2px" }}>{record.filename}</code> · </>}
            uploaded {perfUploadedAt(record.uploaded_at)}
          </div>
          {canUpload && (
            <>
              <PerfDropzone busy={busy} onUpload={onUpload} compact label="Replace with a newer export" />
              {error && (
                <div style={{ ...FONT, fontSize: "0.7rem", color: "#c8401a", background: "#fbe8e2", border: "1px solid #f0d0c0", borderRadius: "3px", padding: "8px 10px", marginTop: "8px", lineHeight: 1.4 }}>
                  {error}
                </div>
              )}
              <button
                onClick={() => { if (confirmClear) onClear(); else setConfirmClear(true); }}
                style={{
                  ...FONT, marginTop: "8px", fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em",
                  padding: "6px 10px", border: "1px solid #e8e3da", background: "#fff",
                  color: confirmClear ? "#c8401a" : "#999", borderRadius: "3px", cursor: "pointer",
                }}
              >
                {confirmClear ? "Click again to remove this data" : "Remove data"}
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

window.PerformancePanel = PerformancePanel;
// Shared with the weekly report so live cards can show impressions.
window.NS_perfSlug = perfSlug;
