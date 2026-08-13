// /api/piece-page?id=<pieceId>   (vercel.json rewrites /piece/:id here)
//
// Serves the piece.html shell with:
//   1. Per-piece <title> + Open Graph / Twitter meta, so links pasted into
//      Slack / Teams / email unfurl with the real title, pillar and status
//      instead of a generic "Piece · NS × Jaggaer".
//   2. window.__PIECE_ID__ and (when found) window.__PIECE_DATA__ injected
//      inline, so the client renders immediately with no extra round-trip and
//      doesn't depend on parsing an id out of the URL.
//
// Falls back to a redirect to /piece.html?id= if the shell can't be fetched.

import { buildPiecePayload } from "./_lib/piece-lookup.js";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stageLabel(payload) {
  const st = (payload.workflow_stages || []).find(s => s.id === payload.piece.status);
  return st ? st.label : payload.piece.status;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host  = req.headers.host;
  const origin = `${proto}://${host}`;

  if (!id) {
    res.writeHead(302, { Location: "/" });
    return res.end();
  }

  // Fetch the static shell from this same deployment.
  let shell;
  try {
    const r = await fetch(`${origin}/piece.html`);
    if (!r.ok) throw new Error(`shell ${r.status}`);
    shell = await r.text();
  } catch (e) {
    // Can't get the shell — fall back to the query-string form, which the
    // client can still resolve on its own.
    res.writeHead(302, { Location: `/piece.html?id=${encodeURIComponent(id)}` });
    return res.end();
  }

  // Look up the piece for meta + preload (never fatal — client handles misses).
  let payload = null;
  try {
    const p = await buildPiecePayload(id);
    if (!p.notFound) payload = p;
  } catch (e) {
    console.error("[api/piece-page] lookup failed:", e.message);
  }

  // ── Build head meta ──
  let title = "Piece · NS × Jaggaer";
  let desc  = "NS × Jaggaer content workspace.";
  if (payload) {
    const t = payload.piece.title || payload.piece.id;
    title = `${t} · NS × Jaggaer`;
    const bits = [payload.pillar.label, payload.cluster.label, `Status: ${stageLabel(payload)}`]
      .filter(Boolean);
    desc = bits.join(" · ");
  }

  const metaBlock =
    `<title>${esc(title)}</title>\n` +
    `  <meta name="description" content="${esc(desc)}" />\n` +
    `  <meta property="og:type" content="article" />\n` +
    `  <meta property="og:site_name" content="NS × Jaggaer" />\n` +
    `  <meta property="og:title" content="${esc(title)}" />\n` +
    `  <meta property="og:description" content="${esc(desc)}" />\n` +
    `  <meta property="og:url" content="${esc(origin)}/piece/${esc(encodeURIComponent(id))}" />\n` +
    `  <meta property="og:image" content="${esc(origin)}/netscribes-logo.png" />\n` +
    `  <meta name="twitter:card" content="summary" />\n` +
    `  <meta name="twitter:title" content="${esc(title)}" />\n` +
    `  <meta name="twitter:description" content="${esc(desc)}" />`;

  // Replace the shell's static <title> with the meta block. Callback form so a
  // "$" in a piece title/label isn't interpreted as a replace special pattern.
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, () => metaBlock);

  // Inject preload script just before </head>. JSON is escaped so a stray
  // "</script>" or "<" in the data can't break out of the tag.
  const preload =
    `<script>window.__PIECE_ID__=${JSON.stringify(id).replace(/</g, "\\u003c")};` +
    (payload
      ? `window.__PIECE_DATA__=${JSON.stringify(payload).replace(/</g, "\\u003c")};`
      : "") +
    `</script>`;
  html = html.replace(/<\/head>/i, () => `${preload}\n</head>`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store"); // piece state changes; keep OG fresh
  return res.status(200).end(html);
}
