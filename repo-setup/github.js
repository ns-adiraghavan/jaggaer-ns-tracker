// Vercel serverless function — proxies all GitHub Contents API calls.
// GITHUB_TOKEN lives in Vercel environment variables, never in the browser.
//
// Supports:
//   GET  /api/github?path=config/project.json        → githubGetFile
//   PUT  /api/github?path=config/project.json        → githubPutFile (body: { message, content, sha? })
//   GET  /api/github?path=build-with-claude&list=1   → list folder contents

export default async function handler(req, res) {
  // Only allow from same origin (Vercel deployment or localhost)
  const origin = req.headers.origin || "";
  const allowed =
    origin === "" ||                          // same-origin requests have no Origin header
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost");

  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return res.status(500).json({ error: "GitHub credentials not configured in environment" });
  }

  const { path, list } = req.query;
  if (!path) return res.status(400).json({ error: "Missing path param" });

  const ghBase = `https://api.github.com/repos/${repo}/contents/${path}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "ns-jaggaer-tracker",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(ghBase, { headers: ghHeaders });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === "PUT") {
      const r = await fetch(ghBase, {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
