// Vercel serverless function — proxies Anthropic /v1/messages calls.
// ANTHROPIC_API_KEY lives in Vercel environment variables, never in the browser.

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed =
    origin === "" ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost");

  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Anthropic API key not configured in environment" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
