// /api/piece?id=<pieceId>
// JSON fallback for piece.html (used when the page wasn't server-preloaded,
// e.g. hitting /piece.html?id= directly). Same shape as before — piece.html
// decodes deliverable.content (base64) into a blob URL client-side.
//
// Lookup + deliverable-version resolution live in ./_lib/piece-lookup so this
// and /api/piece-page stay in sync.

import { buildPiecePayload } from "./_lib/piece-lookup.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing ?id= param" });

  try {
    const payload = await buildPiecePayload(id);
    if (payload.notFound) {
      return res.status(404).json({ error: `Piece not found: ${id}` });
    }
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[api/piece]", err);
    return res.status(500).json({ error: err.message });
  }
}
