// api/notify.js — One-click "Send to Editors" for approved clusters
// Called by the SendToEditorsButton component in tracker.jsx when a cluster
// reaches fully-approved state and an admin clicks the button.
//
// Required Vercel env vars (shared with digest.js):
//   RESEND_API_KEY      — Resend API key
//   EDITORS_TO          — comma-separated email list for digital editors
//   DIGEST_FROM         — verified sender address

const RESEND_API = "https://api.resend.com/emails";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, cluster, pillar, pieces } = req.body || {};

  if (type !== "editors" && type !== "piece-approved") return res.status(400).json({ error: "Unknown notification type" });

  // ─── Piece-approved alert ─────────────────────────────────────────────────
  if (type === "piece-approved") {
    const { piece, cluster: clusterLabel, approvedBy, note } = req.body || {};
    if (!piece?.title) return res.status(400).json({ error: "Missing piece" });

    let projectConfig = {};
    try {
      const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/config/project.json`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      });
      if (r.ok) {
        const d = await r.json();
        projectConfig = JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
      }
    } catch {}

    const notifConfig = projectConfig.notifications || {};
    const recipients = (notifConfig.approved_to && notifConfig.approved_to.length)
      ? notifConfig.approved_to
      : [];

    if (!recipients.length) {
      // No recipients configured — silently skip (don't error; caller ignores response)
      return res.status(200).json({ sent: false, reason: "No approved_to recipients configured" });
    }

    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">PIECE APPROVED</div>
      <div style="font-size:18px;font-weight:700;color:#fff;line-height:1.3;">${piece.title}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px;">${clusterLabel || ""}${piece.format ? " · " + piece.format : ""}</div>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#888;width:120px;">Approved by</td>
          <td style="padding:6px 0;font-size:13px;color:#1a2535;font-weight:500;">${approvedBy || "—"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#888;">Date</td>
          <td style="padding:6px 0;font-size:13px;color:#1a2535;">${today}</td>
        </tr>
        ${piece.url ? `<tr>
          <td style="padding:6px 0;font-size:12px;color:#888;">File</td>
          <td style="padding:6px 0;"><a href="${piece.url}" style="font-size:13px;color:#c8401a;font-weight:600;text-decoration:none;">View deliverable →</a></td>
        </tr>` : ""}
        ${note ? `<tr>
          <td style="padding:6px 0;font-size:12px;color:#888;vertical-align:top;">Note</td>
          <td style="padding:6px 0;font-size:13px;color:#444;line-height:1.5;">${note}</td>
        </tr>` : ""}
      </table>
    </div>
    <div style="padding:16px 32px;background:#eaf5ee;border-top:3px solid #1e7a45;">
      <p style="margin:0;font-size:12px;color:#1e7a45;font-weight:600;">✓ This piece has been approved and is ready for the next step in the publishing workflow.</p>
    </div>
    <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:11px;color:#aaa;text-align:center;">
      Sent ${today} via NS × Jaggaer Content Tracker
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM || "NS x Jaggaer Tracker <onboarding@resend.dev>",
        to: recipients,
        subject: `✓ Approved: ${piece.title}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return res.status(500).json({ error: "Resend failed", detail: err });
    }

    return res.status(200).json({ sent: true, recipients, piece: piece.title });
  }

  // ─── Cluster editors handover (type === "editors") ────────────────────────
  if (!cluster || !pieces?.length) return res.status(400).json({ error: "Missing cluster or pieces" });

  // Load project.json to get editors list
  let projectConfig = {};
  try {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/config/project.json`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    });
    if (r.ok) {
      const d = await r.json();
      projectConfig = JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
    }
  } catch {}

  const notifConfig = projectConfig.notifications || {};
  const recipients = (notifConfig.editors_to && notifConfig.editors_to.length)
    ? notifConfig.editors_to
    : (process.env.EDITORS_TO || process.env.DIGEST_TO || "").split(",").map(e => e.trim()).filter(Boolean);

  if (!recipients.length) {
    return res.status(500).json({ error: "No editors configured. Add them in Admin → Notifications." });
  }

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const pieceRows = pieces.map(p => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;font-size:13px;color:#1a2535;font-weight:500;">${p.title}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;font-size:12px;color:#888;">${p.format || "—"}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;">
        <a href="${p.url}" style="font-size:12px;color:#c8401a;font-weight:600;text-decoration:none;">View file →</a>
      </td>
    </tr>`).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">READY FOR PUBLISHING</div>
      <div style="font-size:20px;font-weight:700;color:#fff;">${cluster}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">${pillar} · ${pieces.length} piece${pieces.length !== 1 ? "s" : ""} · All approved</div>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:14px;color:#444;margin:0 0 20px;">
        The <strong>${cluster}</strong> cluster has been fully approved by Jaggaer and is ready for publishing. 
        All ${pieces.length} pieces are listed below with direct links to the deliverable files.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e8e3da;border-radius:4px;overflow:hidden;">
        <thead>
          <tr style="background:#f8f6f2;">
            <th style="padding:8px 16px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:left;font-weight:600;">Title</th>
            <th style="padding:8px 16px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:left;font-weight:600;">Type</th>
            <th style="padding:8px 16px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;text-align:left;font-weight:600;">File</th>
          </tr>
        </thead>
        <tbody>${pieceRows}</tbody>
      </table>
    </div>
    <div style="padding:16px 32px;background:#eaf5ee;border-top:3px solid #1e7a45;">
      <p style="margin:0;font-size:12px;color:#1e7a45;font-weight:600;">
        ✓ All pieces in this cluster have been reviewed and approved. 
        Cluster linking rules: all pieces should interlink within the cluster before publishing.
      </p>
    </div>
    <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:11px;color:#aaa;text-align:center;">
      Sent ${today} via NS × Jaggaer Content Tracker
    </div>
  </div>
</body>
</html>`;

  const emailRes = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM || "NS x Jaggaer Tracker <onboarding@resend.dev>",
      to: recipients,
      subject: `Ready to publish: ${cluster} — ${pieces.length} piece${pieces.length !== 1 ? "s" : ""} approved`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    return res.status(500).json({ error: "Resend failed", detail: err });
  }

  return res.status(200).json({ sent: true, recipients, cluster, pieces: pieces.length });
}
