// api/docx-render.js
// GET /api/docx-render?path=config/style-guide.docx
// Fetches the file from GitHub (raw), runs mammoth to convert docx → HTML,
// returns { html, messages } — or { error } on failure.

import mammoth from "mammoth";

const SG_PATH = "config/style-guide.docx";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !repo) return res.status(500).json({ error: "GitHub credentials not configured" });

  const path = req.query.path || SG_PATH;

  try {
    // 1. Get file metadata (for sha + download_url) via Contents API
    const metaRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ns-jaggaer-tracker" } }
    );
    if (!metaRes.ok) {
      if (metaRes.status === 404) return res.status(404).json({ error: "No style guide uploaded yet." });
      return res.status(metaRes.status).json({ error: "GitHub API error" });
    }
    const meta = await metaRes.json();

    // 2. Fetch raw file bytes (GitHub returns base64 in content field for files < 100MB)
    const base64 = meta.content.replace(/\n/g, "");
    const buffer = Buffer.from(base64, "base64");

    // 3. Convert with mammoth
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "b => strong",
          "i => em",
          "u => u",
        ],
      }
    );

    return res.status(200).json({
      html: result.value,
      warnings: result.messages.filter(m => m.type === "warning").map(m => m.message),
      size: buffer.length,
      sha: meta.sha,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
