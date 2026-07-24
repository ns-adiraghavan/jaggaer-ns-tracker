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
  // Prefer the explicitly set publish date — most reliable for backfilled pieces
  // that have no status_history entries.
  if (piece.publishing && piece.publishing.launch_date) return piece.publishing.launch_date;
  // Fall back to when the piece last entered "approved" in the history log.
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

// ─── Record adapter — normalises both old flat records and new {daily,snapshots} ──
//
// Old shape: { url, summary, timeseries, top_queries, countries, devices,
//              date_range, uploaded_at, uploaded_by, filename }
// New shape: { url, daily: { "YYYY-MM-DD": {clicks,impressions,ctr,position} },
//              snapshots: [{ snapshot_date, uploaded_at, summary, top_queries,
//                            countries, devices, date_range, filename, ... }] }
//
// Returns a normalised view: { timeseries, summary, top_queries, countries,
//   devices, date_range, uploaded_at, filename, latestSnapshot, prevSnapshot }
function perfRecordView(record) {
  if (!record) return null;

  // New model
  if (record.daily && record.snapshots) {
    const snaps = record.snapshots;
    const latest = snaps[snaps.length - 1] || {};
    const prev   = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
    // Build sorted timeseries from daily dict
    const timeseries = Object.entries(record.daily)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      timeseries,
      summary:        latest.summary       || {},
      top_queries:    latest.top_queries   || [],
      countries:      latest.countries     || [],
      devices:        latest.devices       || [],
      date_range:     latest.date_range    || {},
      uploaded_at:    latest.uploaded_at   || null,
      filename:       latest.filename      || null,
      latestSnapshot: latest,
      prevSnapshot:   prev,
      snapshotCount:  snaps.length,
    };
  }

  // Old/flat model — passthrough
  return {
    timeseries:     record.timeseries    || [],
    summary:        record.summary       || {},
    top_queries:    record.top_queries   || [],
    countries:      record.countries     || [],
    devices:        record.devices       || [],
    date_range:     record.date_range    || {},
    uploaded_at:    record.uploaded_at   || null,
    filename:       record.filename      || null,
    latestSnapshot: null,
    prevSnapshot:   null,
    snapshotCount:  1,
  };
}

// Week-over-week deltas from the daily series (calendar Mon–Sun), NOT from a
// diff of two rolling-window upload summaries. Returns
// { clicks, impressions, ctr, avg_position, weeks } with sign, or null.
function perfWoW(view) {
  if (!view) return null;
  const w = perfCalendarWoW(view.timeseries);
  if (!w || !w.lastWeek) return null;
  const tw = w.thisWeek, lw = w.lastWeek;
  const twCtr = tw.impressions ? tw.clicks / tw.impressions : 0;
  const lwCtr = lw.impressions ? lw.clicks / lw.impressions : 0;
  return {
    clicks:       w.clicksDelta,
    impressions:  w.impressionsDelta,
    ctr:          twCtr - lwCtr,
    avg_position: (tw.weightedPos || 0) - (lw.weightedPos || 0),
    weeks:        w,
  };
}

// Signed percentage, e.g. +18% / −57%. Returns "—" when there's no base.
function perfSignedPct(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v * 100).toFixed(0)}%`;
}

// Format a signed WoW delta for display. position delta is inverted (lower = better).
function perfDeltaLabel(delta, field) {
  if (!delta) return null;
  const v = delta[field];
  if (v == null || !Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  if (abs < 0.5 && field !== "ctr") return null; // suppress noise
  const sign = v > 0 ? "+" : "−";
  if (field === "ctr") {
    const pct = (abs * 100).toFixed(2);
    if (Number(pct) < 0.01) return null;
    return { label: `${sign}${pct}%`, up: v > 0 };
  }
  if (field === "avg_position") {
    // Lower position = better, so flip colour signal
    return { label: `${sign}${abs.toFixed(1)}`, up: v < 0 };
  }
  return { label: `${sign}${Math.round(abs).toLocaleString("en-US")}`, up: v > 0 };
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

// ─── Target-keyword matching ────────────────────────────────────────────────
// A piece's brief carries a target keyword (primary_keyword). GSC reports the
// actual search queries, which rarely match word-for-word. We fuzzy-match the
// target keyword to the piece's queries by meaningful-token overlap, then treat
// the piece as "ranking for its target keyword" only when that matched query
// sits on the first page (average position ≤ 10).
const PERF_KW_STOP = new Set([
  "the","a","an","and","or","for","to","of","in","on","is","are","was","were",
  "with","how","what","why","your","you","our","we","do","does","did","that",
  "this","at","by","as","it","its","from","can","could","should","would","when",
  "which","who","will","be","been","being","not","but","if","then","than","into",
  "about","more","most","best","using","use","used","get","getting","vs",
]);

function perfKwTokens(s) {
  if (!s) return [];
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t && t.length > 1 && !PERF_KW_STOP.has(t));
}

// Overlap coefficient |A∩B| / min(|A|,|B|) plus shared-token count.
function perfKwScore(aTokens, bTokens) {
  const aSet = new Set(aTokens), bSet = new Set(bTokens);
  if (!aSet.size || !bSet.size) return { shared: 0, score: 0 };
  let shared = 0;
  for (const t of aSet) if (bSet.has(t)) shared++;
  return { shared, score: shared / Math.min(aSet.size, bSet.size) };
}

// Best GSC query matching a target keyword, or null. Needs ≥2 shared tokens and
// overlap ≥ 0.6; closest overlap wins, impressions break ties.
function perfMatchTarget(targetKw, queries) {
  const tTok = perfKwTokens(targetKw);
  if (!tTok.length || !queries || !queries.length) return null;
  let best = null;
  for (const q of queries) {
    const { shared, score } = perfKwScore(tTok, perfKwTokens(q.query));
    if (shared < 2 || score < 0.6) continue;
    if (!best || score > best.matchScore ||
        (score === best.matchScore && (q.impressions || 0) > (best.impressions || 0))) {
      best = { ...q, matchScore: score, sharedTokens: shared };
    }
  }
  return best;
}

// A matched target query "ranks" when it's on the first page.
function perfTargetRanks(match) {
  return !!match && Number.isFinite(match.position) && match.position > 0 && match.position <= 10;
}

// ─── Calendar-week (Mon–Sun) week-over-week ─────────────────────────────────
function perfAddDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Monday (YYYY-MM-DD) of the ISO week containing dateStr.
function perfMondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();               // 0=Sun … 6=Sat
  return perfAddDays(dateStr, -(dow === 0 ? 6 : dow - 1));
}

function perfSumRange(timeseries, startStr, endStr) {
  let impressions = 0, clicks = 0, wpos = 0;
  for (const p of timeseries) {
    if (p.date >= startStr && p.date <= endStr) {
      impressions += p.impressions || 0;
      clicks      += p.clicks || 0;
      wpos        += (p.impressions || 0) * (p.position || 0);
    }
  }
  return { impressions, clicks, weightedPos: impressions > 0 ? wpos / impressions : 0 };
}

// This vs last complete Mon–Sun week. If the latest week is still partial (GSC
// lag / a mid-week upload), we step back to the last *complete* week so the two
// windows are always full and comparable. null when there isn't a clean prior week.
function perfCalendarWoW(timeseries) {
  if (!timeseries || timeseries.length < 2) return null;
  const lastDate = timeseries[timeseries.length - 1].date;
  const firstDate = timeseries[0].date;
  const mondayOfLast = perfMondayOf(lastDate);
  const sundayOfLast = perfAddDays(mondayOfLast, 6);

  let thisStart, thisEnd;
  if (lastDate >= sundayOfLast) { thisStart = mondayOfLast; thisEnd = sundayOfLast; }
  else { thisStart = perfAddDays(mondayOfLast, -7); thisEnd = perfAddDays(mondayOfLast, -1); }

  const lastStart = perfAddDays(thisStart, -7);
  const lastEnd   = perfAddDays(thisStart, -1);
  const thisWk = perfSumRange(timeseries, thisStart, thisEnd);
  if (lastStart < firstDate) {
    return { thisWeek: { ...thisWk, start: thisStart, end: thisEnd }, lastWeek: null,
             impressionsDelta: null, impressionsPct: null, clicksDelta: null };
  }
  const lastWk = perfSumRange(timeseries, lastStart, lastEnd);
  return {
    thisWeek: { ...thisWk, start: thisStart, end: thisEnd },
    lastWeek: { ...lastWk, start: lastStart, end: lastEnd },
    impressionsDelta: thisWk.impressions - lastWk.impressions,
    impressionsPct:   lastWk.impressions > 0 ? (thisWk.impressions - lastWk.impressions) / lastWk.impressions : null,
    clicksDelta:      thisWk.clicks - lastWk.clicks,
  };
}

// Sum many daily dicts into one timeseries (portfolio-level WoW).
function perfMergeDaily(dailies) {
  const acc = {};
  for (const daily of dailies) {
    for (const [date, v] of Object.entries(daily || {})) {
      const a = acc[date] || (acc[date] = { date, impressions: 0, clicks: 0, _pw: 0 });
      a.impressions += v.impressions || 0;
      a.clicks      += v.clicks || 0;
      a._pw         += (v.impressions || 0) * (v.position || 0);
    }
  }
  return Object.values(acc)
    .map(a => ({ date: a.date, impressions: a.impressions, clicks: a.clicks,
                 position: a.impressions > 0 ? a._pw / a.impressions : 0 }))
    .sort((x, y) => x.date.localeCompare(y.date));
}

// Impression-weighted average position across the QUERY breakdown:
//   Σ(query impressions × query position) / Σ(query impressions).
// This is the honest "where do we rank for the terms we show up for" number —
// it differs from GSC's page-level position, which is diluted by the long tail
// of impressions that never surface in the top-query table.
function perfQueryWeightedPos(view) {
  const s = view && view.summary;
  // Prefer the value computed over the FULL query list at ingest — the stored
  // top_queries is capped at 25, which skews this number high on its own.
  if (s && s.query_weighted_position > 0 && s.query_position_impressions > 0) {
    return { pos: s.query_weighted_position, impr: s.query_position_impressions };
  }
  // Fallback for records parsed before that field existed (top-25 only).
  let impr = 0, weighted = 0;
  for (const q of (view && view.top_queries) || []) {
    const i = q.impressions || 0, p = q.position || 0;
    if (i > 0 && p > 0) { impr += i; weighted += i * p; }
  }
  return { pos: impr > 0 ? weighted / impr : 0, impr };
}

// Clip a timeseries so charts open a couple of days BEFORE the piece went live,
// instead of at whatever date GSC's history happens to start (often months of
// dead-flat pre-launch zero rows).
function perfChartSeries(timeseries, releaseTs) {
  if (!timeseries || !timeseries.length || !releaseTs) return timeseries || [];
  const start = perfAddDays(String(releaseTs).slice(0, 10), -2);
  const clipped = timeseries.filter(p => p.date >= start);
  return clipped.length >= 2 ? clipped : timeseries;
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
  const [showAdmin, setShowAdmin] = usePerfState(false); // admin audit panel

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

  // ── KPI strip — totals across pieces that have data (trailing 3 months),
  //    target-keyword coverage, portfolio WoW, and breakout keywords. ──
  const kpis = usePerfMemo(() => {
    if (!withData.length) return null;
    let clicks = 0, impressions = 0, avgMonthlySum = 0;
    let qwImpr = 0, qwWeighted = 0;   // query-impression-weighted position accumulators
    let best = null, mostImpr = null;
    // Target-keyword rollup
    let tgtImpr = 0, tgtWeighted = 0, tgtMatched = 0, tgtRanked = 0;
    // Breakout (non-target) queries that rank page-1
    const breakout = [];

    for (const p of withData) {
      const view = perfRecordView(perfData[p.key]);
      if (!view) continue;
      const releaseTs = perfReleaseTs(p.piece);
      const window = perfTrailing3Month(view.timeseries, releaseTs);
      const totals = window.length ? perfWindowTotals(window) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
      clicks += totals.clicks;
      impressions += totals.impressions;
      avgMonthlySum += totals.avgMonthly;
      // Weighted position from the query breakdown (not the diluted page-level number).
      const qwp = perfQueryWeightedPos(view);
      qwImpr += qwp.impr; qwWeighted += qwp.pos * qwp.impr;
      const s = view.summary;
      if (qwp.pos > 0 && (!best || qwp.pos < best.pos)) best = { pos: qwp.pos, title: p.piece.title };
      if (!mostImpr || totals.impressions > (mostImpr.impr || 0)) mostImpr = { impr: totals.impressions, title: p.piece.title };

      // Target keyword: fuzzy-match the brief's primary_keyword to GSC queries.
      const match = perfMatchTarget(p.piece.primary_keyword, view.top_queries);
      const matchQ = match ? String(match.query) : null;
      if (match) {
        tgtMatched += 1;
        tgtImpr     += match.impressions || 0;
        tgtWeighted += (match.impressions || 0) * (match.position || 0);
        if (perfTargetRanks(match)) tgtRanked += 1;
      }
      // Other keywords we do well for: non-target queries on page one.
      for (const q of view.top_queries || []) {
        if (matchQ && q.query === matchQ) continue;
        if (/site:/i.test(q.query || "")) continue; // drop search-operator spam queries
        if (q.position > 0 && q.position <= 10 && (q.impressions || 0) >= 10) {
          breakout.push({
            query: String(q.query || "").replace(/\s+/g, " ").trim(),
            impressions: q.impressions || 0,
            clicks: q.clicks || 0,
            position: q.position,
            pieceTitle: p.piece.title,
            pillar: p.pillar.label,
          });
        }
      }
    }
    breakout.sort((a, b) => b.impressions - a.impressions);

    // Portfolio WoW — sum every piece's daily series, then compare weeks.
    const portfolioWoW = perfCalendarWoW(perfMergeDaily(withData.map(p => perfData[p.key]?.daily)));

    // Per-article WoW breakdown for the stacked bar — each article's impressions
    // inside the portfolio's this-week / last-week ranges, so the stack sums to
    // the portfolio total. Colours are assigned by descending 3mo impressions.
    let wowByArticle = [];
    if (portfolioWoW && portfolioWoW.lastWeek) {
      const tw = portfolioWoW.thisWeek, lw = portfolioWoW.lastWeek;
      const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
      const ranked = withData
        .map(p => {
          const view = perfRecordView(perfData[p.key]);
          const t3 = perfWindowTotals(perfTrailing3Month(view.timeseries, perfReleaseTs(p.piece)) || []);
          return { p, view, t3Impr: t3.impressions };
        })
        .sort((a, b) => b.t3Impr - a.t3Impr);
      wowByArticle = ranked.map(({ p, view }, i) => {
        const thisImpr = perfSumRange(view.timeseries, tw.start, tw.end).impressions;
        const lastImpr = perfSumRange(view.timeseries, lw.start, lw.end).impressions;
        return {
          key: p.key,
          title: p.piece.title,
          pillar: p.pillar.label,
          color: i < PALETTE.length ? PALETTE[i] : "#9a958c",
          thisImpr, lastImpr,
          delta: thisImpr - lastImpr,
        };
      }).filter(a => a.thisImpr > 0 || a.lastImpr > 0);
    }

    return {
      clicks,
      impressions,
      avgMonthly: withData.length ? avgMonthlySum / withData.length : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      avgPosition: qwImpr > 0 ? qwWeighted / qwImpr : 0,
      best,
      mostImpr,
      pieces: withData.length,
      wowByArticle,
      // Target keyword
      tgtImpr,
      tgtAvgPos: tgtImpr > 0 ? tgtWeighted / tgtImpr : 0,
      tgtMatched,
      tgtRanked,
      // WoW + breakout
      portfolioWoW,
      breakout,
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

      // ── Merge into {daily, snapshots} model ───────────────────────────────
      // daily: canonical deduped series — later uploads overwrite same-date rows,
      //        so the series grows forward forever without double-counting.
      // snapshots: per-upload provenance + dimension data (queries/countries/devices
      //            are as-of aggregates, so they need to be stored per snapshot).
      setProject(p => {
        const existing = (p.performanceData || {})[body.url_key] || {};
        const mergedDaily = { ...(existing.daily || {}) };
        for (const row of body.timeseries || []) {
          if (row.date) {
            mergedDaily[row.date] = {
              clicks:      row.clicks      || 0,
              impressions: row.impressions || 0,
              ctr:         row.ctr         || 0,
              position:    row.position    || 0,
            };
          }
        }
        const newSnapshot = {
          snapshot_date: body.snapshot_date || body.date_range?.end || new Date().toISOString().slice(0, 10),
          uploaded_at:   new Date().toISOString(),
          uploaded_by:   currentUser?.id || null,
          filename:      body.filename || file.name,
          date_range:    body.date_range,
          summary:       body.summary,
          top_queries:   body.top_queries,
          countries:     body.countries,
          devices:       body.devices,
        };
        // Sort oldest→newest; cap at 52 entries (one year of weeklies).
        const snapshots = [...(existing.snapshots || []), newSnapshot]
          .sort((a, b) => (a.snapshot_date || "").localeCompare(b.snapshot_date || ""))
          .slice(-52);
        return {
          ...p,
          performanceData: {
            ...(p.performanceData || {}),
            [body.url_key]: { url: body.url, daily: mergedDaily, snapshots },
          },
        };
      });
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
            ? " Drop each week's Search Console export (single page filter) on that piece's card every Friday — impressions are compared week over week, calendar Mon–Sun."
            : " Jaggaer uploads the Search Console exports weekly; these cards are read-only for NS. Growth is shown week over week."}
          {approvedNoUrl > 0 && ` ${approvedNoUrl} approved ${approvedNoUrl === 1 ? "piece has" : "pieces have"} no live URL yet.`}
        </p>
      </header>

      {/* ── WoW impressions — headline + stacked bar by article ──────────── */}
      {kpis && kpis.portfolioWoW && kpis.portfolioWoW.lastWeek && (
        <PerfWowStacked wow={kpis.portfolioWoW} articles={kpis.wowByArticle} />
      )}

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <PerfKpi label="Impressions (trailing 3mo)" value={perfNum(kpis.impressions)} sub={kpis.mostImpr ? `top: ${kpis.mostImpr.title}` : `across ${kpis.pieces} ${kpis.pieces === 1 ? "piece" : "pieces"}`} />
          <PerfKpi label="Clicks (trailing 3mo)" value={perfNum(kpis.clicks)} sub={`across ${kpis.pieces} ${kpis.pieces === 1 ? "piece" : "pieces"}`} />
          <PerfKpi label="Avg position (weighted)" value={perfPos(kpis.avgPosition)} sub="impression-weighted across queries" />
          <PerfKpi
            label="Target-keyword impressions"
            value={perfNum(kpis.tgtImpr)}
            sub={kpis.tgtMatched ? `${kpis.tgtRanked} of ${kpis.tgtMatched} rank page-1 for target` : "no target keyword matched yet"}
            accent
          />
          <PerfKpi
            label="Avg position on target kw"
            value={kpis.tgtImpr > 0 ? perfPos(kpis.tgtAvgPos) : "—"}
            sub="impression-weighted"
            accent
          />
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

      {/* ── Sort toggle + admin toggle ───────────────────────────────────── */}
      {published.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
          {canUpload ? (
            <button
              onClick={() => setShowAdmin(v => !v)}
              style={{
                ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", padding: "6px 10px",
                border: "1px solid #e8e3da", borderRadius: "3px", cursor: "pointer",
                background: showAdmin ? "#1a2f4e" : "#fff",
                color: showAdmin ? "#fff" : "#aaa",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {showAdmin ? "▲ Admin" : "▼ Admin"}
            </button>
          ) : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        </div>
      )}

      {/* ── Admin panel ───────────────────────────────────────────────────── */}
      {canUpload && showAdmin && (
        <PerfAdminPanel perfData={perfData} published={published} />
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
          breakout={(kpis && kpis.breakout || []).filter(r => r.pieceTitle === selectedEntry.piece.title)}
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
function PerfKpi({ label, value, sub, accent }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderLeft: `3px solid ${accent ? "#c8401a" : "#1a2f4e"}`, padding: "14px 16px", borderRadius: "3px" }}>
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

// ─── WoW impressions — headline + stacked bar by article ──────────────────
// The headline for the weekly Friday upload: how impressions moved this
// (complete) calendar week vs last, and which articles drove the move. The two
// stacked bars share one scale, so the length gap IS the total change; each
// segment is one article (2px surface gaps between them), with a labelled legend.
function PerfStackRow({ label, total, scaleMax, articles, weekField }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const pct = v => `${scaleMax > 0 ? (v / scaleMax) * 100 : 0}%`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "78px 1fr 74px", alignItems: "center", gap: "10px" }}>
      <span style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999" }}>{label}</span>
      <div style={{ position: "relative", height: "22px", background: "#f5f2ec", borderRadius: "2px", display: "flex", gap: "2px", overflow: "hidden" }}>
        {articles.map(a => a[weekField] > 0 && (
          <div key={a.key} title={`${a.title} · ${perfNum(a[weekField])} impr`}
               style={{ width: pct(a[weekField]), background: a.color, minWidth: a[weekField] > 0 ? "2px" : 0 }} />
        ))}
      </div>
      <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 700, color: "#1a2535", textAlign: "right" }}>{perfNum(total)}</span>
    </div>
  );
}

function PerfWowStacked({ wow, articles }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const tw = wow.thisWeek, lw = wow.lastWeek;
  const up = wow.impressionsDelta >= 0;
  const deltaColor = up ? "#1e7a45" : "#c8401a";
  const sign = wow.impressionsDelta > 0 ? "+" : wow.impressionsDelta < 0 ? "−" : "";
  const range = wk => `${perfDate(wk.start)} – ${perfDate(wk.end)}`;
  const scaleMax = Math.max(tw.impressions, lw.impressions, 1);
  const list = (articles || []).filter(a => a.thisImpr > 0 || a.lastImpr > 0);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e3da", borderLeft: `3px solid ${deltaColor}`,
      borderRadius: "3px", padding: "16px 20px", marginBottom: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
            Impressions · week over week
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginTop: "5px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600, color: "#1a2535", lineHeight: 1 }}>
              {perfNum(tw.impressions)}
            </span>
            <span style={{ ...FONT, fontSize: "0.95rem", fontWeight: 700, color: deltaColor }}>
              {sign}{perfNum(Math.abs(wow.impressionsDelta))} ({perfSignedPct(wow.impressionsPct)})
            </span>
          </div>
        </div>
        <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", textAlign: "right", lineHeight: 1.5 }}>
          This week {range(tw)}<br />vs last week {range(lw)} · calendar Mon–Sun
        </div>
      </div>

      {/* Two stacked bars sharing one scale */}
      <div style={{ display: "grid", gap: "8px", marginTop: "16px" }}>
        <PerfStackRow label="This week" total={tw.impressions} scaleMax={scaleMax} articles={list} weekField="thisImpr" />
        <PerfStackRow label="Last week" total={lw.impressions} scaleMax={scaleMax} articles={list} weekField="lastImpr" />
      </div>

      {/* Legend — colour → article, with each article's WoW delta */}
      {list.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: "14px" }}>
          {list.map(a => {
            const aUp = a.delta >= 0;
            return (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, maxWidth: "260px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: a.color, flexShrink: 0 }} />
                <span style={{ ...FONT, fontSize: "0.68rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                <span style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, color: aUp ? "#1e7a45" : "#c8401a", flexShrink: 0 }}>
                  {a.delta > 0 ? "+" : a.delta < 0 ? "−" : ""}{perfNum(Math.abs(a.delta))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Weekly impressions bars (article subview) ────────────────────────────
// One bar per calendar week from ~launch onward; the two most recent complete
// weeks are highlighted so the WoW move reads at a glance.
function PerfWeeklyBars({ series }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (!series || series.length < 2) return null;
  // Bucket the (already launch-clipped) daily series into Mon–Sun weeks.
  const weeks = {};
  for (const p of series) {
    const wk = perfMondayOf(p.date);
    (weeks[wk] || (weeks[wk] = { week: wk, impressions: 0, clicks: 0 })).impressions += p.impressions || 0;
    weeks[wk].clicks += p.clicks || 0;
  }
  const rows = Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map(r => r.impressions), 1);
  const H = 88;
  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e", marginBottom: "8px" }}>
        Impressions by week
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: `${H}px`, borderBottom: "1px solid #e8e3da" }}>
        {rows.map((r, i) => {
          const recent = i >= rows.length - 2;          // last two complete weeks
          const isLast = i === rows.length - 1;
          return (
            <div key={r.week} title={`Week of ${perfDate(r.week)} · ${perfNum(r.impressions)} impressions · ${r.clicks} clicks`}
                 style={{ flex: 1, minWidth: "6px", height: `${Math.max((r.impressions / max) * (H - 4), r.impressions > 0 ? 2 : 0)}px`,
                          background: isLast ? "#c8401a" : recent ? "#e08a6f" : "#d9d2c7", borderRadius: "2px 2px 0 0" }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
        <span style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>Week of {perfDate(rows[0].week)}</span>
        <span style={{ ...FONT, fontSize: "0.62rem", color: "#c8401a", fontWeight: 600 }}>Week of {perfDate(rows[rows.length - 1].week)}</span>
      </div>
    </div>
  );
}

// ─── Breakout keywords table ──────────────────────────────────────────────
// "What other keywords did we do well for?" — non-target queries sitting on
// page one (position ≤ 10), ranked by impressions, tagged with their piece.
function PerfBreakoutTable({ rows, limit }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  if (!rows || !rows.length) return null;
  const shown = limit ? rows.slice(0, limit) : rows;
  const max = Math.max(...shown.map(r => r.impressions), 1);
  const GRID = "1fr 150px 56px 46px";
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px", padding: "16px 20px", marginBottom: "24px" }}>
      <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "3px" }}>
        Other keywords we're winning
      </div>
      <div style={{ ...FONT, fontSize: "0.72rem", color: "#999", marginBottom: "10px" }}>
        Non-target search queries ranking on page one (position ≤ 10), by impressions.
      </div>
      <div style={{ borderTop: "1px solid #e8e3da" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "6px 0", borderBottom: "1px solid #f0ede6" }}>
          {["Query", "Piece", "Impr.", "Pos."].map((h, i) => (
            <span key={i} style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#bbb", textAlign: i >= 2 ? "right" : "left" }}>{h}</span>
          ))}
        </div>
        {shown.map((r, i) => (
          <div key={i} style={{ position: "relative", borderBottom: "1px solid #f5f2ec" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(r.impressions / max) * 100}%`, background: "#c8401a", opacity: 0.05 }} />
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "8px 0", alignItems: "baseline" }}>
              <span style={{ ...FONT, fontSize: "0.76rem", color: "#333", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis" }}>{r.query}</span>
              <span style={{ ...FONT, fontSize: "0.68rem", color: "#999", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.pieceTitle}</span>
              <span style={{ ...FONT, fontSize: "0.76rem", color: "#1a2535", fontWeight: 600, textAlign: "right" }}>{perfNum(r.impressions)}</span>
              <span style={{ ...FONT, fontSize: "0.76rem", color: "#1e7a45", fontWeight: 600, textAlign: "right" }}>{perfPos(r.position)}</span>
            </div>
          </div>
        ))}
      </div>
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
  const view = record ? perfRecordView(record) : null;
  const releaseTs = perfReleaseTs(piece);
  // Trailing-3-month window metrics (computed upfront to avoid IIFE in JSX)
  const cardWin = view ? perfTrailing3Month(view.timeseries, releaseTs) : [];
  const cardWt = cardWin.length ? perfWindowTotals(cardWin) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
  const cardKw = piece.primary_keyword || null;
  const cardMatch = view ? perfMatchTarget(cardKw, view.top_queries) : null;
  const cardRanks = perfTargetRanks(cardMatch);
  const cardQwPos = view ? perfQueryWeightedPos(view).pos : 0;
  const wow = view ? perfWoW(view) : null;

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

      {view ? (
        <>
          {/* ── Four equal-weight KPIs in a 2×2 grid ── */}
          <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            {[
              { label: "Impressions", value: perfNum(cardWt.impressions), sub: `${perfNum(cardWt.avgMonthly)} / mo`, delta: perfDeltaLabel(wow, "impressions"), color: "#1a2535" },
              { label: "Clicks",      value: perfNum(cardWt.clicks),      sub: `${perfPct(cardWt.clicks && cardWt.impressions ? cardWt.clicks / cardWt.impressions : 0)} CTR`, delta: perfDeltaLabel(wow, "clicks"), color: "#1a2f4e" },
              { label: "CTR",         value: perfPct(cardWt.clicks && cardWt.impressions ? cardWt.clicks / cardWt.impressions : 0), sub: null, delta: perfDeltaLabel(wow, "ctr"), color: "#333" },
              { label: "Avg position",value: cardQwPos > 0 ? perfPos(cardQwPos) : "—", sub: null, delta: perfDeltaLabel(wow, "avg_position"), color: "#333" },
            ].map(({ label, value, sub, delta, color }) => (
              <div key={label}>
                <div style={{ ...FONT, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#aaa", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color, lineHeight: 1 }}>
                    {value}
                  </div>
                  {delta && <span style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, color: delta.up ? "#1e7a45" : "#c8401a" }}>{delta.label}</span>}
                </div>
                {sub && <div style={{ ...FONT, fontSize: "0.6rem", color: "#bbb", marginTop: "1px" }}>{sub}</div>}
              </div>
            ))}
          </div>
          {/* Sparkline — opens ~2 days before go-live, hiding the dead-flat pre-launch zone */}
          <PerfSparkline series={perfChartSeries(view.timeseries, releaseTs)} />
          {view.snapshotCount > 1 && (
            <div style={{ ...FONT, fontSize: "0.58rem", color: "#bbb", textAlign: "right", marginTop: "-4px" }}>
              {view.snapshotCount} uploads tracked
            </div>
          )}
          {/* Target keyword vs. top actual query */}
          {(cardKw || (view.top_queries && view.top_queries.length > 0)) && (
            <div style={{ display: "grid", gridTemplateColumns: cardKw && view.top_queries?.length ? "1fr 1fr" : "1fr", gap: "6px" }}>
              {cardKw && (
                <div style={{ ...FONT, fontSize: "0.66rem", color: "#555", background: "#f5f2ec", padding: "4px 8px", borderRadius: "2px", minWidth: 0 }}>
                  <div style={{ color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.56rem", marginBottom: "2px" }}>Target keyword</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cardKw}</div>
                  <div style={{ marginTop: "2px", fontWeight: 600, color: cardMatch ? (cardRanks ? "#1e7a45" : "#c8401a") : "#bbb", fontSize: "0.6rem" }}>
                    {cardMatch
                      ? (cardRanks
                          ? `Ranks #${perfPos(cardMatch.position)} · ${perfNum(cardMatch.impressions)} impr`
                          : `#${perfPos(cardMatch.position)} · not page 1`)
                      : "Not ranking yet"}
                  </div>
                </div>
              )}
              {view.top_queries && view.top_queries[0] && (
                <div style={{ ...FONT, fontSize: "0.66rem", color: "#2a5a35", background: "#eef7f1", padding: "4px 8px", borderRadius: "2px", border: "1px solid #c8e8d4", minWidth: 0 }}>
                  <div style={{ color: "#1e7a45", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.56rem", marginBottom: "2px" }}>Top query (GSC)</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(view.top_queries[0].query || "").replace(/\s+/g, " ").trim()}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ ...FONT, fontSize: "0.64rem", color: "#bbb" }}>
            {view.date_range && view.date_range.start
              ? `${perfDate(view.date_range.start)} – ${perfDate(view.date_range.end)}`
              : "Range unknown"}
            {view.uploaded_at && ` · uploaded ${perfUploadedAt(view.uploaded_at)}`}
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
function PerfPieceModal({ entry, record, breakout, canUpload, busy, error, onUpload, onClear, onClose }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const { piece, cluster, pillar, url } = entry;
  const view = perfRecordView(record);
  const s = view ? view.summary : {};
  const [confirmClear, setConfirmClear] = usePerfState(false);
  // Trailing-3-month metrics for modal display
  const modalRelTs = perfReleaseTs(piece);
  const modalWin = view ? perfTrailing3Month(view.timeseries, modalRelTs) : [];
  const modalWt = modalWin.length ? perfWindowTotals(modalWin) : { impressions: 0, clicks: 0, avgMonthly: 0, weightedAvgPos: 0 };
  const modalKw = piece.primary_keyword || null;
  const modalMatch = view ? perfMatchTarget(modalKw, view.top_queries) : null;
  const modalRanks = perfTargetRanks(modalMatch);
  const modalQwPos = view ? perfQueryWeightedPos(view).pos : 0;
  const modalChartSeries = view ? perfChartSeries(view.timeseries, modalRelTs) : [];
  const modalWow = view ? perfWoW(view) : null;

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
            ["Avg position (wtd)", modalQwPos > 0 ? perfPos(modalQwPos) : "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "#faf8f4", border: "1px solid #f0ede6", borderRadius: "3px", padding: "9px 10px" }}>
              <div style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>{k}</div>
              <div style={{ ...FONT, fontSize: "0.95rem", fontWeight: 700, color: "#1a2535", marginTop: "2px" }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Target keyword vs. top actual query — two columns so the comparison is immediate */}
        {(modalKw || (view.top_queries && view.top_queries.length > 0)) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <div style={{ background: "#f5f2ec", border: "1px solid #e0dbd4", borderRadius: "3px", padding: "8px 10px" }}>
              <div style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#aaa", marginBottom: "4px" }}>
                Target keyword (brief)
              </div>
              <div style={{ ...FONT, fontSize: "0.82rem", color: "#1a2535", fontWeight: 500 }}>
                {modalKw || "—"}
              </div>
              {modalKw && (
                <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, marginTop: "5px", color: modalMatch ? (modalRanks ? "#1e7a45" : "#c8401a") : "#bbb" }}>
                  {modalMatch
                    ? (modalRanks
                        ? `Ranks #${perfPos(modalMatch.position)} on page 1 · ${perfNum(modalMatch.impressions)} impressions`
                        : `Best match #${perfPos(modalMatch.position)} · not yet on page 1`)
                    : "Not ranking for the target keyword yet"}
                  {modalMatch && (
                    <div style={{ ...FONT, fontSize: "0.6rem", fontWeight: 400, color: "#999", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      matched query: "{String(modalMatch.query).replace(/\s+/g, " ").trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ background: "#eef7f1", border: "1px solid #c8e8d4", borderRadius: "3px", padding: "8px 10px" }}>
              <div style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#1e7a45", marginBottom: "4px" }}>
                Top query driving impressions (GSC)
              </div>
              <div style={{ ...FONT, fontSize: "0.82rem", color: "#1a2535", fontWeight: 500 }}>
                {view.top_queries?.[0]?.query || "—"}
              </div>
            </div>
          </div>
        )}
        {/* WoW delta row — calendar Mon–Sun, this complete week vs last */}
        {modalWow && modalWow.weeks && modalWow.weeks.lastWeek && (() => {
          const items = [
            ["Impressions", perfDeltaLabel(modalWow, "impressions")],
            ["Clicks",      perfDeltaLabel(modalWow, "clicks")],
            ["CTR",         perfDeltaLabel(modalWow, "ctr")],
            ["Position",    perfDeltaLabel(modalWow, "avg_position")],
          ].filter(([, d]) => d);
          const wk = modalWow.weeks;
          return (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", padding: "8px 10px", background: "#f5f8ff", border: "1px solid #d0dbf0", borderRadius: "3px", marginBottom: "10px" }}>
              <span style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a8eb0", alignSelf: "center" }}>
                {`WoW · ${perfDate(wk.thisWeek.start)}–${perfDate(wk.thisWeek.end)} vs ${perfDate(wk.lastWeek.start)}–${perfDate(wk.lastWeek.end)}`}
              </span>
              {items.length
                ? items.map(([label, d]) => (
                    <span key={label} style={{ ...FONT, fontSize: "0.74rem", fontWeight: 700, color: d.up ? "#1e7a45" : "#c8401a" }}>
                      {label}: {d.label}
                    </span>
                  ))
                : <span style={{ ...FONT, fontSize: "0.74rem", fontWeight: 600, color: "#7a8eb0" }}>flat vs last week</span>}
            </div>
          );
        })()}
        </>

        <div style={{ ...FONT, fontSize: "0.68rem", color: "#aaa", marginBottom: "10px" }}>
          {(view.date_range && view.date_range.label) || "Date range"}
          {view.date_range && view.date_range.start && ` · ${perfDate(view.date_range.start)} – ${perfDate(view.date_range.end)}`}
          {view.snapshotCount > 1 && <span style={{ marginLeft: "8px", color: "#bbb" }}>· {view.snapshotCount} uploads tracked</span>}
        </div>

        <PerfChart series={modalChartSeries} />

        <PerfWeeklyBars series={modalChartSeries} />

        <PerfDimTable title="Top queries" rows={view.top_queries} field="query" limit={10} />
        <PerfDimTable title="Countries" rows={view.countries} field="country" limit={8} />
        <PerfDimTable title="Devices" rows={view.devices} field="device" />

        {/* ── Other keywords — non-target page-1 queries for this piece ─── */}
        {breakout && breakout.length > 0 && (
          <div style={{ marginTop: "22px" }}>
            <PerfBreakoutTable rows={breakout} />
          </div>
        )}

        <div style={{ marginTop: "26px", borderTop: "1px solid #e8e3da", paddingTop: "16px" }}>
          <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", marginBottom: "8px" }}>
            {view.filename && <>Source: <code style={{ background: "#f5f2ec", padding: "2px 5px", borderRadius: "2px" }}>{view.filename}</code> · </>}
            uploaded {perfUploadedAt(view.uploaded_at)}
          </div>
          {canUpload && (
            <>
              <PerfDropzone busy={busy} onUpload={onUpload} compact label="Upload another export — data is merged, not replaced" />
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


// ─── Admin audit panel ──────────────────────────────────────────────────────
// Visible only to canUpload users via the "Admin" toggle. Shows every piece
// with GSC data: snapshot history (filename, date-range, upload timestamp) and
// a duplicate-snapshot warning if the same snapshot_date appears more than once.
function PerfAdminPanel({ perfData, published }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  // Build audit rows — one entry per piece that has performanceData
  const rows = published
    .map(entry => {
      const rec = perfData[entry.key];
      if (!rec) return null;
      const snaps = rec.snapshots || [];
      // Daily coverage
      const dates = Object.keys(rec.daily || {}).sort();
      const dailyRange = dates.length
        ? `${dates[0]} → ${dates[dates.length - 1]} (${dates.length}d)`
        : "no daily data";
      // Duplicate snapshot_dates
      const snapDateCounts = {};
      for (const s of snaps) {
        const d = s.snapshot_date || "unknown";
        snapDateCounts[d] = (snapDateCounts[d] || 0) + 1;
      }
      const dupes = Object.entries(snapDateCounts).filter(([, c]) => c > 1);
      return { entry, rec, snaps, dailyRange, dupes };
    })
    .filter(Boolean);

  if (!rows.length) {
    return (
      <div style={{ ...FONT, fontSize: "0.78rem", color: "#aaa", padding: "16px 0 24px", textAlign: "center" }}>
        No GSC data uploaded yet.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "28px", border: "1px solid #d7d1c8", borderRadius: "4px", background: "#faf8f4", overflow: "hidden" }}>
      {/* Panel header */}
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #e8e3da", display: "flex", alignItems: "baseline", gap: "12px" }}>
        <span style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e" }}>
          Upload audit
        </span>
        <span style={{ ...FONT, fontSize: "0.68rem", color: "#aaa" }}>
          {rows.length} {rows.length === 1 ? "piece" : "pieces"} with data · {rows.reduce((s, r) => s + r.snaps.length, 0)} total snapshots
        </span>
      </div>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
        gap: "8px", padding: "7px 18px", borderBottom: "1px solid #e8e3da",
        background: "#f0ede6",
      }}>
        {["Piece", "Daily coverage", "Snapshots", "Latest upload", "Dupes?"].map((h, i) => (
          <span key={i} style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999" }}>{h}</span>
        ))}
      </div>

      {rows.map(({ entry, snaps, dailyRange, dupes }, ri) => {
        const latest = snaps.length ? snaps[snaps.length - 1] : null;
        const hasDupes = dupes.length > 0;
        return (
          <div key={entry.key}>
            {/* Piece row */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
              gap: "8px", padding: "10px 18px",
              borderBottom: ri < rows.length - 1 || snaps.length > 0 ? "1px solid #edeae4" : "none",
              background: hasDupes ? "#fff8f5" : "#fff",
              alignItems: "start",
            }}>
              <div>
                <div style={{ ...FONT, fontSize: "0.76rem", fontWeight: 600, color: "#1a2535", lineHeight: 1.3 }}>
                  {entry.piece.title}
                </div>
                <div style={{ ...FONT, fontSize: "0.62rem", color: "#bbb", marginTop: "2px", fontFamily: "monospace" }}>
                  {entry.key}
                </div>
              </div>
              <span style={{ ...FONT, fontSize: "0.68rem", color: "#666", fontFamily: "monospace" }}>{dailyRange}</span>
              <span style={{ ...FONT, fontSize: "0.76rem", color: "#333", fontWeight: 600 }}>{snaps.length}</span>
              <div>
                {latest ? (
                  <>
                    <div style={{ ...FONT, fontSize: "0.68rem", color: "#555" }}>{perfUploadedAt(latest.uploaded_at)}</div>
                    {latest.filename && (
                      <div style={{ ...FONT, fontSize: "0.6rem", color: "#bbb", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {latest.filename}
                      </div>
                    )}
                  </>
                ) : <span style={{ ...FONT, fontSize: "0.68rem", color: "#ccc" }}>—</span>}
              </div>
              <span style={{
                ...FONT, fontSize: "0.66rem", fontWeight: 700,
                color: hasDupes ? "#c8401a" : "#c5e0cc",
              }}>
                {hasDupes ? `${dupes.length} dupe${dupes.length > 1 ? "s" : ""}` : "✓ clean"}
              </span>
            </div>

            {/* Snapshot history — collapsed sub-rows */}
            {snaps.length > 0 && (
              <div style={{ borderBottom: ri < rows.length - 1 ? "1px solid #edeae4" : "none" }}>
                {snaps.map((s, si) => {
                  const isDupe = (snapDateCounts => snapDateCounts[s.snapshot_date || "unknown"] > 1)(
                    snaps.reduce((acc, x) => { const d = x.snapshot_date || "unknown"; acc[d] = (acc[d] || 0) + 1; return acc; }, {})
                  );
                  return (
                    <div key={si} style={{
                      display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                      gap: "8px", padding: "5px 18px 5px 32px",
                      background: isDupe ? "#fff3ef" : "#faf8f4",
                      borderTop: "1px solid #f0ede6",
                    }}>
                      <div style={{ ...FONT, fontSize: "0.63rem", color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.filename || "unnamed"}
                      </div>
                      <div style={{ ...FONT, fontSize: "0.63rem", color: "#999", fontFamily: "monospace" }}>
                        {s.date_range?.start && s.date_range?.end
                          ? `${s.date_range.start} → ${s.date_range.end}`
                          : s.snapshot_date || "—"}
                      </div>
                      <div style={{ ...FONT, fontSize: "0.63rem", color: "#bbb" }}>snap {si + 1}</div>
                      <div style={{ ...FONT, fontSize: "0.63rem", color: "#bbb" }}>{perfUploadedAt(s.uploaded_at)}</div>
                      <div style={{ ...FONT, fontSize: "0.63rem", fontWeight: 700, color: isDupe ? "#c8401a" : "#bbb" }}>
                        {isDupe ? "⚠ dupe" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

window.PerformancePanel = PerformancePanel;
// Shared with the weekly report so live cards can show impressions.
window.NS_perfSlug = perfSlug;
