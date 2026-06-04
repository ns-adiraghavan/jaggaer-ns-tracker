// api/notify.js
//
// POST /api/notify   { type: "piece-approved", piece, cluster, pillar, approvedBy, note }
//   → fires TWO emails in parallel:
//       1. Stakeholder alert  → notifications.approved_to
//       2. Editors copy       → notifications.editors_to  (includes inline HTML + download link)
//
// POST /api/notify   { type: "editors", cluster, pillar, pieces }
//   → manual cluster handover button (still available, separate from auto per-piece emails)
//
// Env vars:  RESEND_API_KEY, GITHUB_TOKEN, GITHUB_REPO, DIGEST_FROM

const RESEND_API  = "https://api.resend.com/emails";
const GITHUB_API  = "https://api.github.com";

async function loadProject() {
  const r = await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/config/project.json`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (!r.ok) return {};
  const d = await r.json();
  return JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
}

async function fetchDeliverableHtml(githubPath) {
  if (!githubPath) return null;
  try {
    const r = await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/${githubPath}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.content) return null;
    return Buffer.from(d.content.replace(/\n/g, ""), "base64").toString("utf8");
  } catch { return null; }
}

// Strip outer html/head/body tags — we only want the body content for inline embedding
function extractBody(html) {
  if (!html) return null;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  // If no body tag, strip any <html>/<head> and return the rest
  return html
    .replace(/<html[^>]*>/gi, "").replace(/<\/html>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .trim();
}

async function sendEmail({ to, subject, html }) {
  if (!to || !to.length) return { sent: false, reason: "No recipients" };
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM || "NS x Jaggaer Tracker <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return { sent: true };
}

// ─── Email builders ───────────────────────────────────────────────────────────

function buildStakeholderEmail({ piece, clusterLabel, pillar, approvedBy, note, today, appUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">PIECE APPROVED</div>
      <div style="font-size:19px;font-weight:700;color:#fff;line-height:1.25;">${piece.title}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:6px;">${clusterLabel}${pillar ? " · " + pillar : ""}${piece.format ? " · " + piece.format : ""}</div>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:7px 0;font-size:12px;color:#999;width:110px;vertical-align:top;">Approved by</td>
          <td style="padding:7px 0;font-size:13px;color:#1a2535;font-weight:600;">${approvedBy || "—"}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;font-size:12px;color:#999;vertical-align:top;">Date</td>
          <td style="padding:7px 0;font-size:13px;color:#1a2535;">${today}</td>
        </tr>
        ${note ? `<tr>
          <td style="padding:7px 0;font-size:12px;color:#999;vertical-align:top;">Note</td>
          <td style="padding:7px 0;font-size:13px;color:#444;line-height:1.6;">${note}</td>
        </tr>` : ""}
      </table>
    </div>
    <div style="padding:16px 32px;background:#eaf5ee;border-top:3px solid #1e7a45;">
      <p style="margin:0;font-size:12px;color:#1e7a45;font-weight:600;">✓ Approved and queued for publishing.</p>
    </div>
    ${appUrl ? `<div style="padding:20px 32px;border-top:1px solid #f0ece4;text-align:center;">
      <a href="${appUrl}" style="display:inline-block;background:#1a2535;color:#fff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:10px 24px;border-radius:2px;">Open Tracker →</a>
    </div>` : ""}
    <div style="padding:12px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:10px;color:#bbb;text-align:center;">
      ${today} · NS × Jaggaer Content Tracker
    </div>
  </div>
</body>
</html>`;
}

function buildEditorsEmail({ piece, clusterLabel, pillar, approvedBy, note, today, bodyHtml, rawGithubUrl }) {
  // Inline the piece HTML if available, with a containing shell that resets styles
  const inlineSection = bodyHtml ? `
    <div style="border-top:1px solid #e8e3da;margin-top:4px;">
      <div style="padding:12px 32px 8px;background:#f8f6f2;">
        <span style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#aaa;font-weight:700;">PIECE CONTENT — REVIEW INLINE</span>
      </div>
      <div style="padding:0 32px 32px;font-family:Georgia,serif;font-size:14px;line-height:1.75;color:#1a2535;">
        ${bodyHtml}
      </div>
    </div>` : "";

  const downloadRow = rawGithubUrl ? `
        <tr>
          <td style="padding:7px 0;font-size:12px;color:#999;vertical-align:top;">File</td>
          <td style="padding:7px 0;">
            <a href="${rawGithubUrl}" download style="font-size:13px;color:#c8401a;font-weight:600;text-decoration:none;">Download HTML →</a>
            <span style="font-size:11px;color:#bbb;margin-left:8px;">Right-click → Save As if it opens in browser</span>
          </td>
        </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">READY FOR PUBLISHING</div>
      <div style="font-size:19px;font-weight:700;color:#fff;line-height:1.25;">${piece.title}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:6px;">${clusterLabel}${pillar ? " · " + pillar : ""}${piece.format ? " · " + piece.format : ""}</div>
    </div>
    <div style="padding:24px 32px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:7px 0;font-size:12px;color:#999;width:110px;vertical-align:top;">Approved by</td>
          <td style="padding:7px 0;font-size:13px;color:#1a2535;font-weight:600;">${approvedBy || "—"}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;font-size:12px;color:#999;vertical-align:top;">Date</td>
          <td style="padding:7px 0;font-size:13px;color:#1a2535;">${today}</td>
        </tr>
        ${downloadRow}
        ${note ? `<tr>
          <td style="padding:7px 0;font-size:12px;color:#999;vertical-align:top;">Approval note</td>
          <td style="padding:7px 0;font-size:13px;color:#444;line-height:1.6;">${note}</td>
        </tr>` : ""}
      </table>
    </div>
    ${inlineSection}
    <div style="padding:14px 32px;background:#eaf5ee;border-top:3px solid #1e7a45;">
      <p style="margin:0;font-size:12px;color:#1e7a45;font-weight:600;">✓ Approved by Jaggaer — ready to publish to CMS.</p>
    </div>
    <div style="padding:12px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:10px;color:#bbb;text-align:center;">
      ${today} · NS × Jaggaer Content Tracker
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type } = req.body || {};
  if (!type) return res.status(400).json({ error: "Missing type" });

  const project     = await loadProject();
  const notifConfig = project.notifications || {};
  const today       = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const appUrl      = process.env.APP_URL || `https://${process.env.VERCEL_URL || ""}`;

  // ── piece-approved: two parallel emails ────────────────────────────────────
  if (type === "piece-approved") {
    const { piece, cluster: clusterLabel, pillar, approvedBy, note } = req.body;
    if (!piece?.title) return res.status(400).json({ error: "Missing piece.title" });

    const approvedTo = notifConfig.approved_to || [];
    const editorsTo  = notifConfig.editors_to  || [];

    if (!approvedTo.length && !editorsTo.length) {
      return res.status(200).json({ sent: false, reason: "No recipients configured in approved_to or editors_to" });
    }

    // Fetch deliverable HTML for editors email (non-blocking — if it fails, email still sends)
    let bodyHtml  = null;
    let rawGithubUrl = null;
    if (piece.deliverablePath) {
      const rawHtml = await fetchDeliverableHtml(piece.deliverablePath);
      bodyHtml = rawHtml ? extractBody(rawHtml) : null;
      rawGithubUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPO}/main/${piece.deliverablePath}`;
    }

    const results = await Promise.allSettled([
      // 1. Stakeholder alert
      approvedTo.length ? sendEmail({
        to: approvedTo,
        subject: `✓ Approved: ${piece.title}`,
        html: buildStakeholderEmail({ piece, clusterLabel, pillar, approvedBy, note, today, appUrl }),
      }) : Promise.resolve({ sent: false, reason: "No approved_to" }),

      // 2. Editors copy with inline HTML
      editorsTo.length ? sendEmail({
        to: editorsTo,
        subject: `Ready to publish: ${piece.title}`,
        html: buildEditorsEmail({ piece, clusterLabel, pillar, approvedBy, note, today, bodyHtml, rawGithubUrl }),
      }) : Promise.resolve({ sent: false, reason: "No editors_to" }),
    ]);

    const [stakeholder, editors] = results;
    return res.status(200).json({
      stakeholder: stakeholder.status === "fulfilled" ? stakeholder.value : { error: stakeholder.reason?.message },
      editors:     editors.status     === "fulfilled" ? editors.value     : { error: editors.reason?.message },
    });
  }

  // ── editors (manual cluster handover button) ────────────────────────────────
  if (type === "editors") {
    const { cluster, pillar, pieces } = req.body;
    if (!cluster || !pieces?.length) return res.status(400).json({ error: "Missing cluster or pieces" });

    const editorsTo = (notifConfig.editors_to && notifConfig.editors_to.length)
      ? notifConfig.editors_to
      : (process.env.EDITORS_TO || "").split(",").map(e => e.trim()).filter(Boolean);

    if (!editorsTo.length) return res.status(500).json({ error: "No editors configured in Admin → Notifications." });

    const pieceRows = pieces.map(p => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;font-size:13px;color:#1a2535;font-weight:500;">${p.title}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;font-size:12px;color:#888;">${p.format || "—"}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ece4;">
        <a href="${p.url || "#"}" style="font-size:12px;color:#c8401a;font-weight:600;text-decoration:none;">View file →</a>
      </td>
    </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:8px;">CLUSTER HANDOVER</div>
      <div style="font-size:20px;font-weight:700;color:#fff;">${cluster}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px;">${pillar || ""} · ${pieces.length} piece${pieces.length !== 1 ? "s" : ""} · All approved</div>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:14px;color:#444;margin:0 0 20px;line-height:1.6;">
        The <strong>${cluster}</strong> cluster is fully approved and ready for publishing.
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
      <p style="margin:0;font-size:12px;color:#1e7a45;font-weight:600;">✓ All pieces reviewed and approved. Ensure interlinking before publishing.</p>
    </div>
    <div style="padding:12px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:10px;color:#bbb;text-align:center;">
      ${today} · NS × Jaggaer Content Tracker
    </div>
  </div>
</body>
</html>`;

    await sendEmail({ to: editorsTo, subject: `Cluster ready: ${cluster} — ${pieces.length} pieces approved`, html });
    return res.status(200).json({ sent: true, recipients: editorsTo, cluster, pieces: pieces.length });
  }

  return res.status(400).json({ error: "Unknown type" });
}
