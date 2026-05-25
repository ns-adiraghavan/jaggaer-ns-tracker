// api/digest.js — Daily 6pm IST digest
// Triggered by Vercel Cron (set in vercel.json) at 12:30 UTC = 6:00pm IST.
// Reads project.json from GitHub, checks for activity since last digest,
// and sends a summary email via Resend only if something happened.
//
// Required Vercel env vars:
//   GITHUB_TOKEN        (already set)
//   GITHUB_REPO         (already set)
//   RESEND_API_KEY      (add when Resend account created — free tier: 100 emails/day)
//   DIGEST_TO           (comma-separated recipient emails, e.g. "indy@jaggaer.com,chahat@netscribes.com")
//   DIGEST_FROM         (verified sender address in Resend, e.g. "tracker@yourdomain.com")

export const config = { maxDuration: 30 };

const GITHUB_API = "https://api.github.com";
const RESEND_API = "https://api.resend.com/emails";

async function fetchGitHub(path) {
  const res = await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
  const data = await res.json();
  return JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
}

async function putGitHub(path, content, sha) {
  await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "digest: update last-sent timestamp",
      content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
      sha,
    }),
  });
}

function formatStatus(s) {
  const MAP = {
    "not-started": "Not Started", "uploaded": "Uploaded",
    "jaggaer-feedback": "Feedback Left", "revised": "Revised", "approved": "Approved",
  };
  return MAP[s] || s;
}

export default async function handler(req, res) {
  // Allow manual trigger via POST with { force: true }
  const body = req.method === "POST" ? (req.body || {}) : {};
  const force = body.force === true;

  try {
    // 1. Load project state
    const project = await fetchGitHub("config/project.json");

    // 2. Load digest state (last sent timestamp + last seen piece states)
    let digestState = { last_sent: null, piece_states: {} };
    let digestSha = null;
    try {
      const raw = await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/config/digest-state.json`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      });
      if (raw.ok) {
        const d = await raw.json();
        digestSha = d.sha;
        digestState = JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
      }
    } catch {}

    const lastSent = digestState.last_sent ? new Date(digestState.last_sent) : new Date(0);
    const prevStates = digestState.piece_states || {};

    // 3. Scan all pieces for changes since last digest
    const uploads = [], feedbacks = [], approvals = [];
    const currentStates = {};

    for (const pillar of project.pillars || []) {
      for (const cluster of pillar.clusters || []) {
        for (const piece of cluster.pieces || []) {
          currentStates[piece.id] = piece.status;
          const prev = prevStates[piece.id];

          // Check timestamps
          const uploadTs = piece.last_upload ? new Date(piece.last_upload) : null;
          const updateTs = piece.last_updated ? new Date(piece.last_updated) : null;

          const item = {
            title: piece.title,
            pillar: pillar.label,
            cluster: cluster.label,
            status: piece.status,
            assignee: piece.last_upload_by || piece.last_updated_by || "—",
          };

          if (prev !== piece.status) {
            if (piece.status === "uploaded" || piece.status === "revised") uploads.push(item);
            else if (piece.status === "jaggaer-feedback") feedbacks.push(item);
            else if (piece.status === "approved") approvals.push(item);
          } else if (uploadTs && uploadTs > lastSent && piece.status === "uploaded") {
            uploads.push(item);
          }
        }
      }
    }

    // 4. Also check feedback array for new items
    const feedback = project.feedback || {};
    const newFeedbackNotes = [];
    for (const [pieceId, entries] of Object.entries(feedback)) {
      for (const entry of entries) {
        if (entry.ts && new Date(entry.ts) > lastSent) {
          // Find piece
          let foundPiece = null, foundCluster = null, foundPillar = null;
          for (const p of project.pillars || []) {
            for (const c of p.clusters || []) {
              const piece = c.pieces.find(x => x.id === pieceId);
              if (piece) { foundPiece = piece; foundCluster = c; foundPillar = p; }
            }
          }
          if (foundPiece) {
            newFeedbackNotes.push({
              title: foundPiece.title,
              pillar: foundPillar.label,
              cluster: foundCluster.label,
              verdict: entry.verdict,
              author: entry.author,
            });
          }
        }
      }
    }

    const hasActivity = force || uploads.length > 0 || feedbacks.length > 0 || approvals.length > 0 || newFeedbackNotes.length > 0;

    if (!hasActivity) {
      return res.status(200).json({ sent: false, reason: "No activity since last digest" });
    }

    // 5. Build totals for subject line
    const stats = { total: 0, approved: 0, uploaded: 0, feedback: 0 };
    for (const pillar of project.pillars || []) {
      for (const cluster of pillar.clusters || []) {
        for (const piece of cluster.pieces || []) {
          stats.total++;
          if (piece.status === "approved") stats.approved++;
          else if (piece.status === "uploaded" || piece.status === "revised") stats.uploaded++;
          else if (piece.status === "jaggaer-feedback") stats.feedback++;
        }
      }
    }

    // 6. Resolve recipients — project.json takes priority over env var
    const notifConfig = project.notifications || {};
    const recipientList = notifConfig.digest_to && notifConfig.digest_to.length
      ? notifConfig.digest_to
      : (process.env.DIGEST_TO || "").split(",").map(e => e.trim()).filter(Boolean);

    const recipients = recipientList;

    // 6. Build email HTML
    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const appUrl = `https://${process.env.VERCEL_URL || "your-app.vercel.app"}`;

    function section(title, items, cols) {
      if (!items.length) return "";
      const rows = items.map(item => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:13px;color:#1a2535;font-weight:500;">${item.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:12px;color:#888;">${item.cluster}</td>
          ${cols === "upload" ? `<td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:12px;color:#1e6fa8;font-weight:600;">${formatStatus(item.status)}</td>` : ""}
          ${cols === "feedback" ? `<td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:12px;color:#b05e00;font-weight:600;">${item.verdict || "note"}</td>` : ""}
          ${cols === "approval" ? `<td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:12px;color:#1e7a45;font-weight:600;">✓ Approved</td>` : ""}
        </tr>`).join("");
      return `
        <h3 style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#aaa;margin:24px 0 8px;font-family:sans-serif;">${title} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e8e3da;border-radius:4px;overflow:hidden;">
          ${rows}
        </table>`;
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">
    <!-- Header -->
    <div style="background:#0f1923;padding:24px 32px;">
      <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">DAILY DIGEST</div>
      <div style="font-size:20px;font-weight:700;color:#fff;">NS × Jaggaer Tracker</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">${today}</div>
    </div>
    <!-- KPI strip -->
    <div style="display:flex;border-bottom:1px solid #f0ece4;">
      ${[["Approved", stats.approved + "/" + stats.total, "#1e7a45"], ["Awaiting Review", stats.uploaded, "#1e6fa8"], ["Needs Revision", stats.feedback, "#b05e00"]].map(([label, val, color]) => `
        <div style="flex:1;padding:16px 20px;border-right:1px solid #f0ece4;">
          <div style="font-size:22px;font-weight:700;color:${color};">${val}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">${label}</div>
        </div>`).join("")}
    </div>
    <!-- Activity -->
    <div style="padding:24px 32px;">
      ${section("New Uploads / Revisions", uploads, "upload")}
      ${section("Feedback Left by Jaggaer", newFeedbackNotes.length ? newFeedbackNotes : feedbacks, "feedback")}
      ${section("Approved Today", approvals, "approval")}
      ${!uploads.length && !feedbacks.length && !approvals.length && newFeedbackNotes.length === 0 ? '<p style="color:#888;font-size:13px;">No specific changes — digest sent manually.</p>' : ""}
    </div>
    <!-- CTA -->
    <div style="padding:20px 32px;border-top:1px solid #f0ece4;text-align:center;">
      <a href="${appUrl}" style="display:inline-block;background:#c8401a;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:12px 28px;border-radius:3px;">Open Tracker →</a>
    </div>
    <div style="padding:16px 32px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:11px;color:#aaa;text-align:center;">
      Sent at 6pm IST · Only sent on days with activity · Netscribes × Jaggaer
    </div>
  </div>
</body>
</html>`;

    // 7. Send via Resend
    if (!recipients.length) {
      return res.status(500).json({ error: "No recipients configured. Add them in Admin → Notifications." });
    }

    const emailRes = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM || "tracker@updates.jaggaer.com",
        to: recipients,
        subject: `Tracker digest · ${today} · ${stats.approved}/${stats.total} approved`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return res.status(500).json({ error: "Resend failed", detail: err });
    }

    // 8. Update digest state in GitHub
    const newState = { last_sent: new Date().toISOString(), piece_states: currentStates };
    try {
      // Try to get current SHA if we don't have it
      if (!digestSha) {
        const r = await fetch(`${GITHUB_API}/repos/${process.env.GITHUB_REPO}/contents/config/digest-state.json`, {
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
        });
        if (r.ok) { const d = await r.json(); digestSha = d.sha; }
      }
      await putGitHub("config/digest-state.json", newState, digestSha);
    } catch (e) {
      console.warn("Could not update digest state:", e.message);
    }

    return res.status(200).json({
      sent: true,
      recipients,
      activity: { uploads: uploads.length, feedbacks: newFeedbackNotes.length + feedbacks.length, approvals: approvals.length },
    });

  } catch (err) {
    console.error("Digest error:", err);
    return res.status(500).json({ error: err.message });
  }
}
