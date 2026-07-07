// Vercel serverless function — proxies Google Sheets CSV fetches.
//
// Input:  GET /api/performance?url=<any-google-sheets-url>
// Output: {
//   headers:   ["Landing Page", "Users", "Sessions", "Views", "Engagement", "Bounce", "Trend"],
//   rows:      [{ "Landing Page": "...", "Users": 1248, ... }],
//   url_col:   "Landing Page",           // best guess at which column holds the URL/slug
//   trend_col: "Trend" | null,           // best guess at which column is a change/trend indicator
//   fetched_at: "2026-07-07T...Z",
//   source:    "google-sheets" | "csv-passthrough"
// }
//
// Accepts any of these sheet URL formats and normalises to the CSV export
// endpoint before fetching:
//   https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
//   https://docs.google.com/spreadsheets/d/{ID}/edit#gid={gid}
//   https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pub?output=csv   (already CSV, pass through)
//   https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={gid}   (pass through)
//
// The sheet must be shared "anyone with the link can view" or published to
// web. We deliberately do not auth to Google — Jason will share a public link.

// ─── URL normalisation ──────────────────────────────────────────────────────
function toCsvUrl(inputUrl) {
  if (!inputUrl) return null;
  const url = inputUrl.trim();

  // Already a CSV endpoint — pass through.
  if (url.includes("/export?format=csv") || url.includes("output=csv")) {
    return { csvUrl: url, kind: "csv-passthrough" };
  }

  // Standard edit / view URL — extract sheet ID and (optional) gid.
  //   /spreadsheets/d/{ID}/edit#gid={gid}
  //   /spreadsheets/d/{ID}/edit?usp=sharing
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const id = m[1];

  // gid may sit in the hash (#gid=123) or the query (?gid=123).
  let gid = "0";
  const gidHash = url.match(/[#&]gid=(\d+)/);
  const gidQuery = url.match(/[?&]gid=(\d+)/);
  if (gidHash) gid = gidHash[1];
  else if (gidQuery) gid = gidQuery[1];

  return {
    csvUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
    kind: "google-sheets",
  };
}

// ─── Minimal RFC-4180 CSV parser ────────────────────────────────────────────
// Handles quoted fields, escaped double quotes ("") inside quotes, and \r\n or
// \n line endings. Dependency-free so we can keep this function small and cold-
// start fast on Vercel.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }

    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  // Trailing cell / row (file may not end with newline).
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ─── Type coercion — numbers stay numbers, everything else stays string. ────
// We keep the raw string too, since some analytics columns (e.g. "2m 46s",
// "▲ 14%") are meaningful in their formatted form.
function coerce(value) {
  if (value == null) return value;
  const trimmed = String(value).trim();
  if (trimmed === "") return "";
  // Plain integer or decimal (with optional thousand separators).
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) return Number(trimmed.replace(/,/g, ""));
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  // Percentages — keep as string so the % renders, but the number is available
  // via a paired key so we can sort/filter numerically.
  return trimmed;
}

// ─── Column-role heuristics ─────────────────────────────────────────────────
// The sheet schema isn't fixed — Jason will iterate on columns after his first
// submission. We infer the URL column and the trend column from header names
// so downstream rendering doesn't have to hardcode them.
function guessUrlColumn(headers) {
  const candidates = ["url", "landing page", "landing_page", "page", "page path", "page_path", "path", "slug"];
  for (const h of headers) {
    const norm = String(h).toLowerCase().trim();
    if (candidates.includes(norm)) return h;
  }
  // Fallback — first header is usually the identifier column in analytics dumps.
  return headers[0] || null;
}

function guessTrendColumn(headers) {
  const candidates = ["trend", "change", "delta", "wow", "mom", "% change", "growth"];
  for (const h of headers) {
    const norm = String(h).toLowerCase().trim();
    if (candidates.some(c => norm.includes(c))) return h;
  }
  return null;
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing 'url' query param — pass a Google Sheets share link." });

  const normalised = toCsvUrl(url);
  if (!normalised) {
    return res.status(400).json({ error: "Could not parse Google Sheets URL. Paste the share link from the browser bar." });
  }

  try {
    const r = await fetch(normalised.csvUrl, {
      // Follow redirects — Google export URLs often 302 to a signed download URL.
      redirect: "follow",
      headers: { "User-Agent": "ns-jaggaer-tracker/perf" },
    });

    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({
        error: `Google Sheets returned ${r.status}. Check the sheet is shared "anyone with the link can view".`,
        detail: body.slice(0, 400),
      });
    }

    const csv = await r.text();
    const rows = parseCsv(csv).filter(row => row.length > 0 && row.some(c => String(c).trim() !== ""));

    if (rows.length < 2) {
      return res.status(200).json({
        headers: [], rows: [], url_col: null, trend_col: null,
        fetched_at: new Date().toISOString(), source: normalised.kind,
        warning: "Sheet is empty or only contains a header row.",
      });
    }

    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1).map(r => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = coerce(r[i] ?? "");
      }
      return obj;
    });

    return res.status(200).json({
      headers,
      rows: dataRows,
      url_col: guessUrlColumn(headers),
      trend_col: guessTrendColumn(headers),
      fetched_at: new Date().toISOString(),
      source: normalised.kind,
    });
  } catch (e) {
    return res.status(502).json({ error: `Failed to fetch sheet: ${e.message}` });
  }
}
