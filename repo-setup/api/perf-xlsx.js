// Vercel serverless function — parses a Google Search Console .xlsx export.
//
// Input:  POST /api/perf-xlsx   body: { filename, content }   (content = base64 xlsx)
// Output: {
//   url:        "https://www.jaggaer.com/blog/...",   // canonical URL from Pages/Filters sheet
//   url_key:    "why-supply-chain-visibility-...",    // slug, used as the storage key
//   summary:    { clicks, impressions, ctr, avg_position },
//   timeseries: [{ date, clicks, impressions, ctr, position }, ...],   // from Chart
//   top_queries:[{ query, clicks, impressions, ctr, position }, ...],  // from Queries
//   countries:  [{ country, clicks, impressions, ctr, position }, ...],
//   devices:    [{ device, clicks, impressions, ctr, position }, ...],
//   date_range: { start, end, label },
//   parsed_at:  "2026-07-14T...Z"
// }
//
// GSC exports are multi-sheet workbooks:
//   Chart              Date | Clicks | Impressions | CTR | Position
//   Queries            Top queries | Clicks | Impressions | CTR | Position
//   Pages              Top pages   | Clicks | Impressions | CTR | Position
//   Countries          Country     | ...
//   Devices            Device      | ...
//   Search appearance  (often empty)
//   Filters            Filter | Value   ← contains the Page filter URL and date range
//
// Because the export is always filtered to a single page, the Pages sheet has
// exactly one row — that row is the article-level summary and its URL is the
// join key back to piece.publishing.live_url.

import * as XLSX from "xlsx";

// Body can be a multi-MB base64 string.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// ─── Cell coercion ──────────────────────────────────────────────────────────
function num(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/,/g, "").replace(/%$/, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// GSC writes CTR either as a fraction (0.0016) or as a "0.16%" string,
// depending on locale. Normalise to a fraction.
function ctr(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "string" && v.includes("%")) return num(v) / 100;
  const n = num(v);
  return n > 1 ? n / 100 : n;
}

// Dates arrive as JS Date objects (cellDates:true) or as "2026-06-23" strings.
function isoDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ─── Sheet lookup — tolerant of casing / naming drift across GSC locales ────
function findSheet(wb, ...candidates) {
  for (const c of candidates) {
    const hit = wb.SheetNames.find(n => n.toLowerCase().trim() === c.toLowerCase());
    if (hit) return XLSX.utils.sheet_to_json(wb.Sheets[hit], { defval: null, raw: true });
  }
  return [];
}

// Row keys vary by first column header ("Top queries", "Country", "Device").
// Grab whichever key isn't one of the four metric columns.
const METRIC_KEYS = new Set(["clicks", "impressions", "ctr", "position"]);
function labelOf(row) {
  for (const k of Object.keys(row)) {
    if (!METRIC_KEYS.has(k.toLowerCase().trim())) {
      const v = row[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return null;
}

function get(row, key) {
  const hit = Object.keys(row).find(k => k.toLowerCase().trim() === key);
  return hit ? row[hit] : null;
}

function dimRows(rows, field) {
  return rows
    .filter(r => labelOf(r) !== null)
    .map(r => ({
      [field]: labelOf(r),
      clicks: num(get(r, "clicks")),
      impressions: num(get(r, "impressions")),
      ctr: ctr(get(r, "ctr")),
      position: num(get(r, "position")),
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// ─── Snapshot date — trailing YYYY-MM-DD in filename wins; date_range.end fallback ───
// Filenames like "https___www_jaggaer_com_-Performance-on-Search-2026-07-21.xlsx"
// let us date the export without trusting GSC's rolling window edge.
function extractSnapshotDate(filename, dateRangeEnd) {
  if (filename) {
    // Match the last YYYY-MM-DD in the filename string (before the extension)
    const m = String(filename).match(/(\d{4}-\d{2}-\d{2})(?:\.\w+)?$/);
    if (m) return m[1];
  }
  return dateRangeEnd || null;
}

// ─── URL → slug key ─────────────────────────────────────────────────────────
function slugify(url) {
  if (!url) return null;
  let s = String(url).trim().toLowerCase();
  s = s.replace(/^https?:\/\/[^/]+/, "");   // strip origin
  s = s.replace(/[?#].*$/, "");             // strip query/hash
  s = s.replace(/\/+$/, "");                // strip trailing slash
  const parts = s.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content, filename } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: "Missing 'content' — send the .xlsx as a base64 string." });
  }

  let wb;
  try {
    const buf = Buffer.from(content, "base64");
    wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  } catch (e) {
    return res.status(400).json({ error: `Could not read the workbook: ${e.message}` });
  }

  try {
    const chartRows   = findSheet(wb, "Chart", "Dates", "Date");
    const queryRows   = findSheet(wb, "Queries", "Query");
    const pageRows    = findSheet(wb, "Pages", "Page");
    const countryRows = findSheet(wb, "Countries", "Country");
    const deviceRows  = findSheet(wb, "Devices", "Device");
    const filterRows  = findSheet(wb, "Filters", "Filter");

    // ── Canonical URL — Pages sheet first, Filters sheet as fallback ──────
    let url = null;
    const pageRow = pageRows.find(r => labelOf(r));
    if (pageRow) url = labelOf(pageRow);

    if (!url) {
      const pageFilter = filterRows.find(r => {
        const k = Object.values(r)[0];
        return k && String(k).toLowerCase().trim() === "page";
      });
      if (pageFilter) url = String(Object.values(pageFilter)[1] || "").trim() || null;
    }

    if (!url) {
      return res.status(422).json({
        error: "No page URL found in this export. The Pages sheet is empty and no Page filter is set — export from Search Console with a single page filter applied.",
      });
    }

    const url_key = slugify(url);
    if (!url_key) {
      return res.status(422).json({ error: `Could not derive a slug from the page URL: ${url}` });
    }

    // ── Time series ───────────────────────────────────────────────────────
    const timeseries = chartRows
      .map(r => ({
        date: isoDate(get(r, "date")),
        clicks: num(get(r, "clicks")),
        impressions: num(get(r, "impressions")),
        ctr: ctr(get(r, "ctr")),
        position: num(get(r, "position")),
      }))
      .filter(r => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Summary — Pages row is authoritative (GSC computes it correctly).
    //    Fall back to summing the chart if the Pages row is metric-less.
    const pageClicks = pageRow ? num(get(pageRow, "clicks")) : 0;
    const pageImpr   = pageRow ? num(get(pageRow, "impressions")) : 0;
    const sumClicks  = timeseries.reduce((a, r) => a + r.clicks, 0);
    const sumImpr    = timeseries.reduce((a, r) => a + r.impressions, 0);

    const clicks      = pageImpr > 0 ? pageClicks : sumClicks;
    const impressions = pageImpr > 0 ? pageImpr   : sumImpr;

    const pagePos = pageRow ? num(get(pageRow, "position")) : 0;
    // Impression-weighted average position across the series — the honest
    // number when the Pages row doesn't carry one.
    const weighted = timeseries.reduce((a, r) => a + r.position * r.impressions, 0);
    const avg_position = pagePos > 0
      ? pagePos
      : (sumImpr > 0 ? weighted / sumImpr : 0);

    const pageCtr = pageRow ? ctr(get(pageRow, "ctr")) : 0;
    const summary = {
      clicks,
      impressions,
      ctr: pageCtr > 0 ? pageCtr : (impressions > 0 ? clicks / impressions : 0),
      avg_position,
    };

    // ── Date range ────────────────────────────────────────────────────────
    const dateFilter = filterRows.find(r => {
      const k = Object.values(r)[0];
      return k && String(k).toLowerCase().trim() === "date";
    });
    const date_range = {
      start: timeseries.length ? timeseries[0].date : null,
      end: timeseries.length ? timeseries[timeseries.length - 1].date : null,
      label: dateFilter ? String(Object.values(dateFilter)[1] || "").trim() : null,
    };

    const snapshot_date = extractSnapshotDate(filename, date_range.end);

    return res.status(200).json({
      url,
      url_key,
      filename: filename || null,
      snapshot_date,
      summary,
      timeseries,
      top_queries: dimRows(queryRows, "query").slice(0, 25),
      countries: dimRows(countryRows, "country"),
      devices: dimRows(deviceRows, "device"),
      date_range,
      parsed_at: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: `Parse failed: ${e.message}` });
  }
}
