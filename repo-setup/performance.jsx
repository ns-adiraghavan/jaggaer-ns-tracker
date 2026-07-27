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

// ─── Branded vs non-branded ─────────────────────────────────────────────────
// Branded / navigational queries (the ones that name Jaggaer) rank far better
// than the terms we're actually competing for, so they flatter the average
// position. We split them out and treat NON-branded as the honest organic
// number. Keep PERF_BRAND_TERMS in sync with isBranded() in api/perf-xlsx.js.
const PERF_BRAND_TERMS = ["jaggaer", "jaggear", "jagaer", "jaggar", "jagger"];
function perfIsBranded(query) {
  if (!query) return false;
  const q = String(query).toLowerCase();
  return PERF_BRAND_TERMS.some(t => q.includes(t));
}

// Branded/non-branded rollup for one piece. Prefers the aggregates the parser
// computes over the FULL query list; falls back to the stored top queries for
// records ingested before the parser knew about branded (so it still works
// without a re-upload — just over the stored slice).
function perfBrandedSplit(view) {
  const s = view && view.summary;
  if (s && s.branded && s.nonbranded && s.branded.query_count != null) {
    return { branded: s.branded, nonbranded: s.nonbranded, source: "all" };
  }
  const mk = () => ({ impressions: 0, clicks: 0, wImpr: 0, wSum: 0, query_count: 0 });
  const b = mk(), n = mk();
  for (const q of (view && view.top_queries) || []) {
    const branded = q.branded != null ? q.branded : perfIsBranded(q.query);
    const bucket = branded ? b : n;
    bucket.impressions += q.impressions || 0;
    bucket.clicks += q.clicks || 0;
    bucket.query_count += 1;
    if ((q.impressions || 0) > 0 && (q.position || 0) > 0) {
      bucket.wImpr += q.impressions; bucket.wSum += q.impressions * q.position;
    }
  }
  const pack = x => ({
    impressions: x.impressions, clicks: x.clicks, query_count: x.query_count,
    weighted_position: x.wImpr > 0 ? x.wSum / x.wImpr : 0,
    position_impressions: x.wImpr,
  });
  return { branded: pack(b), nonbranded: pack(n), source: "top" };
}

// Sum many per-piece splits into one portfolio split (impression-weighted pos).
function perfMergeBrandedSplits(splits) {
  const mk = () => ({ impressions: 0, clicks: 0, wImpr: 0, wSum: 0, query_count: 0 });
  const b = mk(), n = mk();
  for (const sp of splits) {
    for (const [side, acc] of [["branded", b], ["nonbranded", n]]) {
      const x = sp[side] || {};
      acc.impressions += x.impressions || 0;
      acc.clicks += x.clicks || 0;
      acc.query_count += x.query_count || 0;
      const den = x.position_impressions || 0;
      acc.wImpr += den; acc.wSum += (x.weighted_position || 0) * den;
    }
  }
  const pack = x => ({
    impressions: x.impressions, clicks: x.clicks, query_count: x.query_count,
    weighted_position: x.wImpr > 0 ? x.wSum / x.wImpr : 0,
    position_impressions: x.wImpr,
  });
  return { branded: pack(b), nonbranded: pack(n) };
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
  const [showMethod, setShowMethod] = usePerfState(false); // "how it's calculated" panel

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
    const brandedSplits = [];         // per-piece branded/non-branded rollups
    const pillarMap = {};             // pillar label -> trailing-3mo impressions
    let dataThrough = null, lastUpload = null; // freshness signals
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
      brandedSplits.push(perfBrandedSplit(view));
      pillarMap[p.pillar.label] = (pillarMap[p.pillar.label] || 0) + totals.impressions;
      const lastDate = view.timeseries.length ? view.timeseries[view.timeseries.length - 1].date : null;
      if (lastDate && (!dataThrough || lastDate > dataThrough)) dataThrough = lastDate;
      if (view.uploaded_at && (!lastUpload || view.uploaded_at > lastUpload)) lastUpload = view.uploaded_at;
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

    // Portfolio branded / non-branded rollup (impression-weighted position).
    const brandedPortfolio = perfMergeBrandedSplits(brandedSplits);

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
      avgPosition: qwImpr > 0 ? qwWeighted / qwImpr : 0,   // all queries (branded + not)
      branded: brandedPortfolio.branded,
      nonbranded: brandedPortfolio.nonbranded,
      imprByPillar: Object.entries(pillarMap)
        .map(([label, impressions]) => ({ label, impressions }))
        .sort((a, b) => b.impressions - a.impressions),
      dataThrough,
      lastUpload,
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

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <PerfKpi
            label="Impressions (trailing 3mo)"
            value={perfNum(kpis.impressions)}
            sub={kpis.mostImpr ? `top: ${kpis.mostImpr.title}` : `across ${kpis.pieces} ${kpis.pieces === 1 ? "piece" : "pieces"}`}
            formula="Sum of daily page impressions (Search Console 'Chart' sheet, i.e. every query) over the trailing-3-month window per piece, added across all pieces with data. Not limited to any top-N query list."
          />
          <PerfKpi
            label="Clicks (trailing 3mo)"
            value={perfNum(kpis.clicks)}
            sub={`across ${kpis.pieces} ${kpis.pieces === 1 ? "piece" : "pieces"}`}
            formula="Sum of daily page clicks over the trailing-3-month window, added across all pieces with data."
          />
          <PerfKpi
            label="Avg position — non-branded"
            value={kpis.nonbranded && kpis.nonbranded.position_impressions > 0 ? perfPos(kpis.nonbranded.weighted_position) : "—"}
            sub={`organic only · all-query wtd ${perfPos(kpis.avgPosition)}`}
            formula={"Impression-weighted average position across NON-branded queries only: Σ(impressions × position) ÷ Σ(impressions), excluding any query containing the brand name. Branded/navigational queries rank far better and are split out so this reflects true organic ranking. 'All-query' in the subline includes branded."}
          />
          <PerfKpi
            label="Target-keyword impressions"
            value={perfNum(kpis.tgtImpr)}
            sub={kpis.tgtMatched ? `${kpis.tgtRanked} of ${kpis.tgtMatched} rank page-1 for target` : "no target keyword matched yet"}
            accent
            infoAlign="right"
            formula="Impressions on the Search Console query fuzzy-matched to each piece's brief target keyword (≥2 shared meaningful tokens, ≥60% token overlap), summed across pieces. 'Page-1' means that matched query's average position ≤ 10."
          />
          <PerfKpi
            label="Avg position on target kw"
            value={kpis.tgtImpr > 0 ? perfPos(kpis.tgtAvgPos) : "—"}
            sub="impression-weighted"
            accent
            infoAlign="right"
            formula="Impression-weighted average position of the matched target-keyword queries: Σ(impr × position) ÷ Σ(impr) across pieces."
          />
        </div>
      )}

      {/* ── Summary charts — collapsible 3-up donuts ─────────────────────── */}
      {kpis && <PerfSummaryCharts kpis={kpis} />}

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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {canUpload && (
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
            )}
            <button
              onClick={() => setShowMethod(v => !v)}
              style={{
                ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", padding: "6px 10px",
                border: "1px solid #e8e3da", borderRadius: "3px", cursor: "pointer",
                background: showMethod ? "#1a2f4e" : "#fff",
                color: showMethod ? "#fff" : "#aaa",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {showMethod ? "▲ How it's calculated" : "▼ How it's calculated"}
            </button>
          </div>
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

      {/* ── Methodology panel ─────────────────────────────────────────────── */}
      {showMethod && <PerfMethodology />}

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
// Custom hover tooltip — native title was unreliable and gave no styling control.
// Shows a positioned bubble on hover/focus; align "right" near the row's edge so
// it doesn't clip off-screen.
function PerfInfo({ text, align }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [show, setShow] = usePerfState(false);
  if (!text) return null;
  const pos = align === "right"
    ? { right: 0 }
    : { left: "50%", transform: "translateX(-50%)" };
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ cursor: "help", color: "#b8b1a4", fontWeight: 700, fontSize: "0.7rem", border: "1px solid #d7d1c8", borderRadius: "50%", width: "14px", height: "14px", lineHeight: "12px", textAlign: "center", display: "inline-block", flexShrink: 0 }}>i</span>
      {show && (
        <span style={{
          position: "absolute", top: "20px", ...pos, zIndex: 500, width: "240px",
          background: "#1a2535", color: "#fff", ...FONT, fontSize: "0.68rem", fontWeight: 400,
          lineHeight: 1.45, letterSpacing: "normal", textTransform: "none", textAlign: "left",
          padding: "8px 11px", borderRadius: "4px", boxShadow: "0 6px 20px rgba(0,0,0,0.28)", pointerEvents: "none",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function PerfKpi({ label, value, sub, accent, formula, infoAlign }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{ position: "relative", background: "#fff", border: "1px solid #e8e3da", borderLeft: `3px solid ${accent ? "#c8401a" : "#1a2f4e"}`, padding: "14px 16px", borderRadius: "3px" }}>
      <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", display: "flex", alignItems: "center", gap: "5px" }}>
        <span>{label}</span>
        <PerfInfo text={formula} align={infoAlign} />
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

// ─── Branded vs non-branded split ─────────────────────────────────────────
// Two rows — non-branded (the terms we're competing for) and branded (queries
// naming Jaggaer). Shows each group's impressions, share, and impression-weighted
// average position. Non-branded position is the honest organic number.
function PerfBrandedSplit({ branded, nonbranded }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const total = (branded.impressions || 0) + (nonbranded.impressions || 0);
  const share = v => (total > 0 ? (v / total) * 100 : 0);
  const GRID = "120px 1fr 90px 60px";
  const rows = [
    { key: "nonbranded", label: "Non-branded", tint: "#1a2f4e", data: nonbranded },
    { key: "branded",    label: "Branded",     tint: "#c8401a", data: branded },
  ];
  const INFO = "A query is 'branded' when it contains the Jaggaer name (incl. common misspellings and site:jaggaer.com). Branded/navigational searches rank far better than the terms you're competing for, so they flatter the blended average position. Non-branded is the honest organic figure. Weighted position = Σ(impressions × position) ÷ Σ(impressions) within each group.";
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px", padding: "14px 18px", marginBottom: "20px" }}>
      <div style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <span>Branded vs non-branded</span>
        <PerfInfo text={INFO} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "12px", padding: "0 0 5px", borderBottom: "1px solid #f0ede6" }}>
        {["", "Impressions", "Avg pos.", "Queries"].map((h, i) => (
          <span key={i} style={{ ...FONT, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#bbb", textAlign: i >= 2 ? "right" : "left" }}>{h}</span>
        ))}
      </div>
      {rows.map(r => (
        <div key={r.key} style={{ display: "grid", gridTemplateColumns: GRID, gap: "12px", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f5f2ec" }}>
          <span style={{ ...FONT, fontSize: "0.74rem", fontWeight: 700, color: r.tint, display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: r.tint, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div style={{ position: "relative", flex: 1, height: "16px", background: "#f5f2ec", borderRadius: "2px", overflow: "hidden", minWidth: "20px" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${share(r.data.impressions)}%`, background: r.tint, opacity: 0.85 }} />
            </div>
            <span style={{ ...FONT, fontSize: "0.76rem", fontWeight: 700, color: "#1a2535", whiteSpace: "nowrap" }}>
              {perfNum(r.data.impressions)}<span style={{ color: "#aaa", fontWeight: 600, fontSize: "0.64rem", marginLeft: "4px" }}>{share(r.data.impressions).toFixed(0)}%</span>
            </span>
          </div>
          <span style={{ ...FONT, fontSize: "0.82rem", fontWeight: 700, color: "#1a2535", textAlign: "right" }}>
            {r.data.position_impressions > 0 ? perfPos(r.data.weighted_position) : "—"}
          </span>
          <span style={{ ...FONT, fontSize: "0.74rem", color: "#888", textAlign: "right" }}>{r.data.query_count || 0}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ────────────────────────────────────────────────────────────
// Composition donut: segments = [{ label, value, color }]. Optional centre text.
function PerfDonut({ segments, size = 132, thickness = 22, centerTop, centerMain, centerSub }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0ede6" strokeWidth={thickness} />
      {total > 0 && segments.map((s, i) => {
        const frac = (s.value || 0) / total;
        const len = frac * C;
        const node = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`}>
            <title>{`${s.label}: ${perfNum(s.value)} (${(frac * 100).toFixed(0)}%)`}</title>
          </circle>
        );
        acc += len;
        return node;
      })}
      {centerMain != null && (
        <>
          {centerTop && <text x={cx} y={cy - 12} textAnchor="middle" style={{ ...FONT, fontSize: "8px", fontWeight: 700, letterSpacing: "0.5px", fill: "#aaa" }}>{String(centerTop).toUpperCase()}</text>}
          <text x={cx} y={cy + (centerSub ? 3 : 6)} textAnchor="middle" style={{ fontFamily: "'Playfair Display', serif", fontSize: "21px", fontWeight: 600, fill: "#1a2535" }}>{centerMain}</text>
          {centerSub && <text x={cx} y={cy + 18} textAnchor="middle" style={{ ...FONT, fontSize: "8.5px", fill: "#999" }}>{centerSub}</text>}
        </>
      )}
    </svg>
  );
}

// ─── Summary charts — collapsible 3-up donuts below the KPI numbers ─────────
// (1) WoW impressions by article with a this/last week toggle, (2) branded vs
// non-branded, (3) impressions by pillar. Replaces the old stacked bar.
function PerfSummaryCharts({ kpis }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [open, setOpen] = usePerfState(true);
  const [wowWeek, setWowWeek] = usePerfState("this");

  const wow = kpis.portfolioWoW;
  const haveWow = wow && wow.lastWeek;
  const articles = kpis.wowByArticle || [];
  const weekField = wowWeek === "this" ? "thisImpr" : "lastImpr";
  const wowSegments = articles.map(a => ({ label: a.title, value: a[weekField] || 0, color: a.color })).filter(s => s.value > 0);
  const wowTotal = wowSegments.reduce((a, s) => a + s.value, 0);

  const nb = kpis.nonbranded || { impressions: 0 };
  const br = kpis.branded || { impressions: 0 };
  const brandedSegments = [
    { label: "Non-branded", value: nb.impressions || 0, color: "#1a2f4e" },
    { label: "Branded", value: br.impressions || 0, color: "#c8401a" },
  ].filter(s => s.value > 0);
  const brTotal = (nb.impressions || 0) + (br.impressions || 0);
  const nbPct = brTotal > 0 ? (nb.impressions / brTotal) * 100 : 0;

  const PILLAR_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7", "#008300", "#e34948"];
  const pillarSegs = (kpis.imprByPillar || []).map((p, i) => ({ label: p.label, value: p.impressions, color: PILLAR_PALETTE[i % PILLAR_PALETTE.length] }));
  const pillarTotal = pillarSegs.reduce((a, s) => a + s.value, 0);

  const CARD = { background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px", padding: "14px 16px", display: "flex", flexDirection: "column" };
  const TITLE = { ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#888", display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" };
  const donutRow = { display: "flex", alignItems: "center", gap: "14px" };

  const Legend = ({ items, showDelta }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: it.color, flexShrink: 0 }} />
          <span style={{ ...FONT, fontSize: "0.66rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{it.label}</span>
          {showDelta && it.delta != null
            ? <span style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, color: it.delta >= 0 ? "#1e7a45" : "#c8401a", flexShrink: 0 }}>{it.delta > 0 ? "+" : it.delta < 0 ? "−" : ""}{perfNum(Math.abs(it.delta))}</span>
            : <span style={{ ...FONT, fontSize: "0.64rem", fontWeight: 600, color: "#999", flexShrink: 0 }}>{perfNum(it.value)}</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: open ? "12px" : "4px" }}>
        <button onClick={() => setOpen(v => !v)} style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 10px", border: "1px solid #e8e3da", borderRadius: "3px", cursor: "pointer", background: open ? "#1a2f4e" : "#fff", color: open ? "#fff" : "#888" }}>
          {open ? "▼ Summary charts" : "► Summary charts"}
        </button>
        {(kpis.dataThrough || kpis.lastUpload) && (
          <span style={{ ...FONT, fontSize: "0.66rem", color: "#999" }}>
            {kpis.dataThrough ? <>Data through <b style={{ color: "#666" }}>{perfDate(kpis.dataThrough)}</b></> : null}
            {kpis.lastUpload ? ` · last upload ${perfUploadedAt(kpis.lastUpload)}` : ""}
          </span>
        )}
      </div>

      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>

          {/* 1 · WoW impressions by article */}
          <div style={CARD}>
            <div style={TITLE}>
              <span style={{ flex: 1 }}>Impressions by article · WoW</span>
              <PerfInfo text="Each article's share of impressions in the selected calendar week (Mon–Sun). Toggle this week vs last. Legend shows each article's week-over-week change." align="right" />
            </div>
            {haveWow ? (
              <>
                <div style={{ display: "flex", border: "1px solid #e8e3da", borderRadius: "3px", overflow: "hidden", width: "fit-content", marginBottom: "12px" }}>
                  {[["this", `This wk`], ["last", `Last wk`]].map(([id, lbl]) => (
                    <button key={id} onClick={() => setWowWeek(id)} style={{ ...FONT, fontSize: "0.64rem", fontWeight: 600, padding: "4px 10px", border: "none", cursor: "pointer", background: wowWeek === id ? "#1a2f4e" : "#fff", color: wowWeek === id ? "#fff" : "#888" }}>{lbl}</button>
                  ))}
                </div>
                <div style={donutRow}>
                  <PerfDonut segments={wowSegments} centerTop={wowWeek === "this" ? "This week" : "Last week"} centerMain={perfNum(wowTotal)} centerSub="impressions" />
                  <Legend items={articles.filter(a => (a.thisImpr > 0 || a.lastImpr > 0)).map(a => ({ label: a.title, color: a.color, value: a[weekField], delta: a.delta }))} showDelta />
                </div>
                <div style={{ ...FONT, fontSize: "0.66rem", color: wow.impressionsDelta >= 0 ? "#1e7a45" : "#c8401a", fontWeight: 700, marginTop: "10px" }}>
                  {wow.impressionsDelta > 0 ? "+" : wow.impressionsDelta < 0 ? "−" : ""}{perfNum(Math.abs(wow.impressionsDelta))} ({perfSignedPct(wow.impressionsPct)}) vs last week
                </div>
              </>
            ) : (
              <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", padding: "20px 0" }}>Not enough complete weeks yet.</div>
            )}
          </div>

          {/* 2 · Branded vs non-branded */}
          <div style={CARD}>
            <div style={TITLE}>
              <span style={{ flex: 1 }}>Branded vs non-branded</span>
              <PerfInfo text="Share of impressions from queries that name Jaggaer (branded/navigational) vs everything else. Non-branded is the organic demand you're earning. Avg position for each group is impression-weighted." align="right" />
            </div>
            {brTotal > 0 ? (
              <div style={donutRow}>
                <PerfDonut segments={brandedSegments} centerTop="Non-branded" centerMain={`${nbPct.toFixed(0)}%`} centerSub="of impressions" />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, flex: 1 }}>
                  {[["Non-branded", nb, "#1a2f4e"], ["Branded", br, "#c8401a"]].map(([lbl, d, col]) => (
                    <div key={lbl} style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: col, flexShrink: 0 }} />
                        <span style={{ ...FONT, fontSize: "0.66rem", color: "#555", flex: 1 }}>{lbl}</span>
                        <span style={{ ...FONT, fontSize: "0.64rem", fontWeight: 700, color: "#1a2535" }}>{perfNum(d.impressions || 0)}</span>
                      </div>
                      <div style={{ ...FONT, fontSize: "0.6rem", color: "#999", marginLeft: "15px" }}>
                        avg pos {d.position_impressions > 0 ? perfPos(d.weighted_position) : "—"} · {d.query_count || 0} queries
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", padding: "20px 0" }}>No query data yet.</div>
            )}
          </div>

          {/* 3 · Impressions by pillar */}
          <div style={CARD}>
            <div style={TITLE}>
              <span style={{ flex: 1 }}>Impressions by pillar</span>
              <PerfInfo text="Trailing-3-month impressions grouped by content pillar — which themes are pulling the most search demand across all live pieces." align="right" />
            </div>
            {pillarTotal > 0 ? (
              <div style={donutRow}>
                <PerfDonut segments={pillarSegs} centerTop="Total" centerMain={perfNum(pillarTotal)} centerSub="trailing 3mo" />
                <Legend items={pillarSegs} />
              </div>
            ) : (
              <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", padding: "20px 0" }}>No pillar data yet.</div>
            )}
          </div>

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
function PerfWeeklyBars({ series, uploads }) {
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
  // Which weeks contain an upload? Marker sits under that week's bar.
  const uploadWeeks = new Set((uploads || []).filter(Boolean).map(d => perfMondayOf(String(d).slice(0, 10))));
  const anyUpload = rows.some(r => uploadWeeks.has(r.week));
  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e" }}>
          Impressions by week
        </div>
        {anyUpload && (
          <div style={{ ...FONT, fontSize: "0.6rem", color: "#8a7f6f", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#1a2f4e" }}>▲</span> export uploaded
          </div>
        )}
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
      {/* Upload markers — carets aligned under the week each export landed in */}
      {anyUpload && (
        <div style={{ display: "flex", gap: "3px", marginTop: "2px" }}>
          {rows.map(r => (
            <div key={r.week} title={uploadWeeks.has(r.week) ? `Export uploaded — week of ${perfDate(r.week)}` : undefined}
                 style={{ flex: 1, minWidth: "6px", textAlign: "center", ...FONT, fontSize: "0.62rem", lineHeight: 1, color: "#1a2f4e" }}>
              {uploadWeeks.has(r.week) ? "▲" : ""}
            </div>
          ))}
        </div>
      )}
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
  const cardSplit = view ? perfBrandedSplit(view) : null;
  const cardNonBrandedPos = cardSplit && cardSplit.nonbranded.position_impressions > 0
    ? cardSplit.nonbranded.weighted_position : cardQwPos;
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
              { label: "Avg position",value: cardNonBrandedPos > 0 ? perfPos(cardNonBrandedPos) : "—", sub: "non-branded", delta: perfDeltaLabel(wow, "avg_position"), color: "#333" },
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

// ─── Query table — top 15 by default, expand to all, branded rows tagged ────
function PerfQueryTable({ rows }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [expanded, setExpanded] = usePerfState(false);
  if (!rows || !rows.length) return null;
  const DEFAULT = 15;
  const shown = expanded ? rows : rows.slice(0, DEFAULT);
  const max = Math.max(...rows.map(r => r.impressions), 1);
  const GRID = "1fr 46px 62px 44px";
  const brandedCount = rows.filter(r => (r.branded != null ? r.branded : perfIsBranded(r.query))).length;
  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
        <div style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e" }}>Top queries</div>
        <div style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>
          {rows.length} {rows.length === 1 ? "query" : "queries"}{brandedCount > 0 ? ` · ${brandedCount} branded` : ""}
        </div>
      </div>
      <div style={{ borderTop: "1px solid #e8e3da" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "6px 0", borderBottom: "1px solid #f0ede6" }}>
          {["Query", "Clicks", "Impr.", "Pos."].map((h, i) => (
            <span key={i} style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#bbb", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
          ))}
        </div>
        {shown.map((r, i) => {
          const branded = r.branded != null ? r.branded : perfIsBranded(r.query);
          return (
            <div key={i} style={{ position: "relative", borderBottom: "1px solid #f5f2ec" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(r.impressions / max) * 100}%`, background: branded ? "#c8401a" : "#1a2f4e", opacity: 0.05 }} />
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: GRID, gap: "8px", padding: "8px 0", alignItems: "baseline" }}>
                <span style={{ ...FONT, fontSize: "0.74rem", color: "#333", lineHeight: 1.35, display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.query || "").replace(/\s+/g, " ")}</span>
                  {branded && <span style={{ ...FONT, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#c8401a", background: "#fbe8e2", border: "1px solid #f0d0c0", borderRadius: "2px", padding: "1px 4px", flexShrink: 0 }}>brand</span>}
                </span>
                <span style={{ ...FONT, fontSize: "0.74rem", color: r.clicks > 0 ? "#1a2535" : "#ccc", fontWeight: 600, textAlign: "right" }}>{r.clicks}</span>
                <span style={{ ...FONT, fontSize: "0.74rem", color: "#666", textAlign: "right" }}>{perfNum(r.impressions)}</span>
                <span style={{ ...FONT, fontSize: "0.74rem", color: "#888", textAlign: "right" }}>{perfPos(r.position)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > DEFAULT && (
        <button onClick={() => setExpanded(v => !v)} style={{ ...FONT, marginTop: "8px", fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", padding: "6px 10px", border: "1px solid #e8e3da", background: "#fff", color: "#1a2f4e", borderRadius: "3px", cursor: "pointer" }}>
          {expanded ? "Show fewer" : `Show all ${rows.length} queries`}
        </button>
      )}
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
  const modalSplit = view ? perfBrandedSplit(view) : null;
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
          width: "min(940px, 100%)", maxHeight: "100%",
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
            ["Clicks (3mo)", perfNum(modalWt.clicks), "Σ daily page clicks over the trailing-3-month window (from publish date).", false],
            ["Impressions (3mo)", perfNum(modalWt.impressions), "Σ daily page impressions (every query, GSC ‘Chart’ sheet) over the trailing-3-month window.", false],
            ["Avg monthly", perfNum(modalWt.avgMonthly), "Impressions in the window ÷ (days in window ÷ 30). A month-normalised run-rate.", false],
            ["Avg pos · non-branded", modalSplit && modalSplit.nonbranded.position_impressions > 0 ? perfPos(modalSplit.nonbranded.weighted_position) : (modalQwPos > 0 ? perfPos(modalQwPos) : "—"), "Impression-weighted position over non-branded queries only: Σ(impr×pos) ÷ Σ(impr), excluding queries that name Jaggaer.", true],
          ].map(([k, v, formula, right]) => (
            <div key={k} style={{ position: "relative", background: "#faf8f4", border: "1px solid #f0ede6", borderRadius: "3px", padding: "9px 10px" }}>
              <div style={{ ...FONT, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{k}</span>
                <PerfInfo text={formula} align={right ? "right" : undefined} />
              </div>
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

        <PerfWeeklyBars series={modalChartSeries} uploads={(record.snapshots || []).map(s => s.uploaded_at || s.snapshot_date)} />

        {modalSplit && (modalSplit.branded.impressions > 0 || modalSplit.nonbranded.impressions > 0) && (
          <div style={{ marginTop: "22px" }}>
            <PerfBrandedSplit branded={modalSplit.branded} nonbranded={modalSplit.nonbranded} />
          </div>
        )}

        <PerfQueryTable rows={view.top_queries} />
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

// ─── Methodology panel — "How these numbers are calculated" ─────────────────
// Read-only reference so anyone (NS or Jaggaer) can see exactly how each metric
// is derived, plus the branded term list and the two big reading caveats.
function PerfMethodology() {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const rows = [
    { name: "Impressions", plain: "How many times the page showed in Search Console — across every query, not a top-N list.", formula: "Σ daily page impressions over the window (GSC ‘Chart’ sheet)." },
    { name: "Clicks", plain: "Clicks the page earned from search.", formula: "Σ daily page clicks over the window." },
    { name: "CTR", plain: "Share of impressions that became clicks.", formula: "clicks ÷ impressions." },
    { name: "Avg position — non-branded", plain: "Where you rank for the terms you're competing for, ignoring searches that already name Jaggaer. This is the headline organic number.", formula: "Σ(impressions × position) ÷ Σ(impressions), over non-branded queries only." },
    { name: "Avg position — all-query", plain: "Same calculation but including branded/navigational queries (shown in the subline and tooltip).", formula: "Σ(impressions × position) ÷ Σ(impressions), over every query." },
    { name: "Page-level position (GSC)", plain: "Search Console's own page position. It differs from the weighted number because it isn't dominated by one high-impression term.", formula: "Read directly from the GSC ‘Pages’ row." },
    { name: "Target-keyword rank", plain: "Whether the piece ranks for its brief's target keyword — we fuzzy-match the target to the actual queries GSC reports.", formula: "≥2 shared meaningful tokens AND ≥60% token overlap; ‘page 1’ = matched query position ≤ 10." },
    { name: "Week over week", plain: "This complete calendar week (Mon–Sun) vs last, each piece anchored from its publish date.", formula: "Σ impressions in each week → delta and %." },
    { name: "Trailing 3 months", plain: "The window every headline number uses.", formula: "From max(publish date, 90 days ago) to today." },
  ];
  return (
    <div style={{ marginBottom: "24px", border: "1px solid #d7d1c8", borderRadius: "4px", background: "#faf8f4", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #e8e3da" }}>
        <span style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2f4e" }}>How these numbers are calculated</span>
        <p style={{ ...FONT, fontSize: "0.72rem", color: "#888", margin: "6px 0 0", lineHeight: 1.5 }}>
          Every figure comes from the Search Console exports you upload — nothing is estimated. Hover the “i” on any tile to see its formula inline.
        </p>
      </div>
      <div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: "14px", padding: "11px 18px", borderBottom: i < rows.length - 1 ? "1px solid #edeae4" : "none", background: i % 2 ? "#faf8f4" : "#fff" }}>
            <div style={{ ...FONT, fontSize: "0.74rem", fontWeight: 700, color: "#1a2535" }}>{r.name}</div>
            <div>
              <div style={{ ...FONT, fontSize: "0.74rem", color: "#444", lineHeight: 1.5 }}>{r.plain}</div>
              <div style={{ ...FONT, fontSize: "0.68rem", color: "#8a7f6f", marginTop: "3px", fontFamily: "monospace" }}>{r.formula}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e8e3da", background: "#fff" }}>
        <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: "5px" }}>Branded terms & caveats</div>
        <p style={{ ...FONT, fontSize: "0.72rem", color: "#666", margin: "0 0 6px", lineHeight: 1.55 }}>
          A query is tagged <b>branded</b> if it contains: {PERF_BRAND_TERMS.map(t => <code key={t} style={{ background: "#f5f2ec", padding: "1px 5px", borderRadius: "2px", marginRight: "4px" }}>{t}</code>)} (this also catches <code style={{ background: "#f5f2ec", padding: "1px 5px", borderRadius: "2px" }}>site:jaggaer.com</code>).
        </p>
        <p style={{ ...FONT, fontSize: "0.72rem", color: "#666", margin: 0, lineHeight: 1.55 }}>
          Two things to know when reading week-over-week: Search Console finalises the most recent ~3 days late, so the current week can read low until the next upload; and the portfolio bar only reflects articles whose latest export covers that week — an article with no fresh export shows zero, not a real drop. Weighted position is sensitive to a single high-impression, low-rank query, which is why page-level position is shown alongside it.
        </p>
      </div>
    </div>
  );
}

window.PerformancePanel = PerformancePanel;
// Shared with the weekly report so live cards can show impressions.
window.NS_perfSlug = perfSlug;
