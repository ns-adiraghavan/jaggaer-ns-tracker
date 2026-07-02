// api/digest.js — Daily 6pm IST digest
// Triggered by Vercel Cron (set in vercel.json) at 12:30 UTC = 6:00pm IST.
// Reads project.json from GitHub, checks for activity since last digest,
// and sends a summary email via Resend only if something happened.
//
// Required Vercel env vars:
//   GITHUB_TOKEN        (already set)
//   GITHUB_REPO         (already set)
//   MAILEROO_API_KEY    (set in Vercel env)
//   DIGEST_TO           (comma-separated recipient emails — fallback if not in project.json)
//   DIGEST_FROM         (sender address on your verified Maileroo domain)

export const config = { maxDuration: 30 };

const GITHUB_API = "https://api.github.com";
const MAILEROO_API = "https://smtp.maileroo.com/api/v2/emails";

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

// ── Derive stage categories from workflow_stages config ──────────────────────
// Returns sets of stage IDs bucketed by their role in the digest.
function categoriseStages(stages) {
  const nsUploadStages   = new Set(); // NS submitted something — goes to "Submitted" section
  const reviewStages     = new Set(); // Awaiting a named reviewer or Jaggaer — goes to "Awaiting Review"
  const sendbackStages   = new Set(); // Sent back to NS after review — goes to "Sent Back / Needs Revision"

  const stageOrder = stages.map(s => s.id);

  stages.forEach((stage, idx) => {
    const id = stage.id;
    if (id === "not-started" || id === "approved") return;

    const actor = stage.actor || "";
    const actors = Array.isArray(actor) ? actor : (actor ? [actor] : []);
    const isNS = actors.includes("ns");
    const isPerson = actors.some(a => a.startsWith("person:"));
    const isJG = actors.includes("jaggaer");

    if (isNS) {
      // NS-actor stages: if there's a non-NS stage before this one in the order, it was
      // sent back. If this is the first NS stage, it's an upload.
      const prevNonNS = stages.slice(0, idx).some(s => {
        const pa = Array.isArray(s.actor) ? s.actor : (s.actor ? [s.actor] : []);
        return !pa.includes("ns") && s.id !== "not-started";
      });
      if (prevNonNS) sendbackStages.add(id);
      else nsUploadStages.add(id);
    } else if (isJG || isPerson) {
      reviewStages.add(id);
    }
  });

  return { nsUploadStages, reviewStages, sendbackStages };
}

export default async function handler(req, res) {
  const body = req.method === "POST" ? (req.body || {}) : {};
  const force = body.force === true;

  try {
    // 1. Load project state
    const project = await fetchGitHub("config/project.json");

    // 2. Read workflow stages — fall back to hardcoded defaults if none in project
    const baseStages = (project.workflow_stages && project.workflow_stages.length)
      ? project.workflow_stages
      : [
          { id: "not-started",      actor: "jaggaer" },
          { id: "brief-uploaded",   actor: "ns" },
          { id: "writing",          actor: "ns" },
          { id: "robert-review",    actor: "person:m-9toiv" },
          { id: "marketing-review", actor: "jaggaer" },
          { id: "editors",          actor: "jaggaer" },
          { id: "approved",         actor: null },
        ];
    // Ad-Hoc Articles run a separate short chain (writing → ad-hoc-review → approved)
    // that lives outside project.workflow_stages — always append it here so the
    // digest correctly buckets ad-hoc pieces sitting in review.
    const stages = baseStages.some(s => s.id === "ad-hoc-review")
      ? baseStages
      : [...baseStages, { id: "ad-hoc-review", label: "Ad-Hoc Review (Jaggaer)", actor: "jaggaer" }];

    const { nsUploadStages, reviewStages, sendbackStages } = categoriseStages(stages);
    const stageLabel = Object.fromEntries(stages.map(s => [s.id, s.label || s.id]));

    // 3. Load digest state (last sent + last known piece statuses)
    let digestState = { last_sent: null };
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

    // 4. Scan all pieces for activity since last digest
    // IMPORTANT: use timestamps (last_updated, last_upload) as the source of truth —
    // NOT stage-ID comparison against digest-state.json. Stage IDs change when admins
    // edit the workflow, which would otherwise cause every piece to appear as "changed".
    const submitted   = []; // NS upload/resubmit since last digest
    const inReview    = []; // moved into a review stage since last digest
    const sentBack    = []; // sent back to NS for revision since last digest
    const approved    = []; // reached approved since last digest
    const briefsAttached = []; // Jaggaer attached a brief/keyword file since last digest
    for (const pillar of project.pillars || []) {
      for (const cluster of pillar.clusters || []) {
        for (const piece of cluster.pieces || []) {
          // Use timestamps — immune to workflow stage ID changes
          const updatedTs  = piece.last_updated ? new Date(piece.last_updated) : null;
          const uploadTs   = piece.last_upload  ? new Date(piece.last_upload)  : null;
          const briefTs    = piece.brief_last_updated ? new Date(piece.brief_last_updated) : null;
          const recentUpdate = updatedTs && updatedTs > lastSent;
          const recentUpload = uploadTs  && uploadTs  > lastSent;
          const recentBrief  = briefTs   && briefTs   > lastSent;
          const hasActivity  = recentUpdate || recentUpload || recentBrief;

          if (!hasActivity) continue;

          const item = {
            title:   piece.title,
            pillar:  pillar.label,
            cluster: cluster.label,
            status:  piece.status,
            stageLabel: stageLabel[piece.status] || piece.status,
            by: piece.last_updated_by || piece.last_upload_by || "—",
          };

          // Brief attachment: detect separately so it surfaces even on in-flight pieces
          if (recentBrief) {
            const latestBrief = (piece.brief_files || []).slice(-1)[0];
            briefsAttached.push({
              ...item,
              briefFilename: latestBrief?.filename || "file",
              briefCount: (piece.brief_files || []).length,
            });
          }

          // Only bucket into workflow sections if the status/upload itself changed
          if (!recentUpdate && !recentUpload) continue;

          if (piece.status === "approved") {
            approved.push(item);
          } else if (sendbackStages.has(piece.status)) {
            sentBack.push(item);
          } else if (reviewStages.has(piece.status)) {
            inReview.push(item);
          } else if (nsUploadStages.has(piece.status) || recentUpload) {
            submitted.push(item);
          }
        }
      }
    }

    // 5. Check feedback array for new notes since last digest
    const feedback = project.feedback || {};
    const newNotes = [];
    for (const [pieceId, entries] of Object.entries(feedback)) {
      for (const entry of entries) {
        if (!entry.ts || new Date(entry.ts) <= lastSent) continue;
        let foundPiece = null, foundCluster = null, foundPillar = null;
        for (const p of project.pillars || []) {
          for (const c of p.clusters || []) {
            const piece = c.pieces.find(x => x.id === pieceId);
            if (piece) { foundPiece = piece; foundCluster = c; foundPillar = p; }
          }
        }
        if (foundPiece) {
          newNotes.push({
            title:   foundPiece.title,
            pillar:  foundPillar.label,
            cluster: foundCluster.label,
            verdict: entry.verdict,
            author:  entry.author,
          });
        }
      }
    }

    const hasActivity = force
      || submitted.length > 0
      || inReview.length > 0
      || sentBack.length > 0
      || approved.length > 0
      || newNotes.length > 0
      || briefsAttached.length > 0;

    if (!hasActivity) {
      return res.status(200).json({ sent: false, reason: "No activity since last digest" });
    }

    // 7. Resolve recipients
    const notifConfig = project.notifications || {};
    const recipients = (notifConfig.digest_to && notifConfig.digest_to.length)
      ? notifConfig.digest_to
      : (process.env.DIGEST_TO || "").split(",").map(e => e.trim()).filter(Boolean);

    if (!recipients.length) {
      return res.status(500).json({ error: "No recipients configured. Add them in Admin → Notifications." });
    }

    // 8. Build email
    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const appUrl = process.env.APP_URL || `https://${process.env.VERCEL_URL || "jaggaer-ns-tracker.vercel.app"}`;

    // Resolve team names from project
    const allMembers = [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
    function memberName(id) {
      if (!id || id === "—") return "—";
      const m = allMembers.find(x => x.id === id);
      return m ? m.name.split(" ")[0] : id;
    }

    // For each activity item, derive a plain-english "next action" label
    function nextAction(stageId) {
      const stage = stages.find(s => s.id === stageId);
      if (!stage) return "—";
      const actor = stage.actor;
      const actors = Array.isArray(actor) ? actor : (actor ? [actor] : []);
      if (!actors.length) return "Done";
      const labels = actors.map(a => {
        if (a === "ns") return "NS to act";
        if (a === "jaggaer") return "Jaggaer to review";
        if (a.startsWith("person:")) {
          const m = allMembers.find(x => x.id === a.slice(7));
          return m ? `${m.name.split(" ")[0]} to review` : a.slice(7);
        }
        return a;
      });
      return labels.join(" + ");
    }

    const verdictLabel = { "approved": "Approved ✓", "needs-revision": "Needs revision", "question": "Question raised" };

    function row(cols) {
      return `<tr>${cols.map((c, i) => `<td style="padding:9px 14px;border-bottom:1px solid #f0ece4;font-size:${i === 0 ? "13px" : "12px"};color:${i === 0 ? "#1a2535" : "#666"};font-weight:${i === 0 ? "500" : "400"};">${c}</td>`).join("")}</tr>`;
    }

    function section(heading, accentColor, items, colsFn) {
      if (!items.length) return "";
      return `
        <div style="margin-bottom:28px;">
          <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${accentColor};font-weight:700;font-family:sans-serif;border-left:3px solid ${accentColor};padding-left:8px;margin-bottom:10px;">${heading} · ${items.length}</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e8e3da;border-radius:4px;overflow:hidden;background:#fff;">
            ${items.map(item => row(colsFn(item))).join("")}
          </table>
        </div>`;
    }

    // Merge "submitted" + "inReview" — they're the same action seen from two angles.
    // Show whichever list is non-empty (inReview takes priority as it's the destination stage).
    const submittedItems = inReview.length ? inReview : submitted;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #e8e3da;border-radius:6px;overflow:hidden;">

    <div style="background:#0f1923;padding:22px 28px;">
      <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:6px;">NS × JAGGAER · DAILY DIGEST</div>
      <div style="font-size:17px;font-weight:700;color:#fff;">${today}</div>
    </div>

    <div style="padding:24px 28px;">

      ${section("Needs your review", "#6c3483", submittedItems,
        item => [item.title, item.cluster, nextAction(item.status)]
      )}

      ${section("Sent back for revision", "#b05e00", sentBack,
        item => [item.title, item.cluster, nextAction(item.status)]
      )}

      ${section("Approved today", "#1e7a45", approved,
        item => [item.title, item.cluster, "✓ Done"]
      )}

      ${section("Brief / keyword files attached", "#0e6655", briefsAttached,
        item => [item.title, item.cluster, `${item.briefFilename}${item.briefCount > 1 ? ` (+${item.briefCount - 1} total)` : ""}`]
      )}

      ${section("Feedback added", "#c8401a", newNotes,
        item => [item.title, item.cluster, verdictLabel[item.verdict] || item.verdict]
      )}

      ${force && !submittedItems.length && !sentBack.length && !approved.length && !newNotes.length && !briefsAttached.length
        ? '<p style="color:#aaa;font-size:13px;margin:0;">No changes today — digest triggered manually.</p>'
        : ""}

    </div>

    <div style="padding:16px 28px;border-top:1px solid #f0ece4;text-align:center;">
      <a href="${appUrl}" style="display:inline-block;background:#c8401a;color:#fff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:10px 24px;border-radius:3px;">Open Tracker →</a>
    </div>

    <div style="padding:12px 28px;background:#faf8f4;border-top:1px solid #f0ece4;font-size:10px;color:#bbb;text-align:center;">
      Sent 6pm IST · Only sent on days with activity
    </div>
  </div>
</body>
</html>`;

    // 9. Send
    const fromAddr = process.env.DIGEST_FROM || "tracker@maileroo.com";
    const emailRes = await fetch(MAILEROO_API, {
      method: "POST",
      headers: {
        "X-Sending-Key": process.env.MAILEROO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: fromAddr, display_name: "NS × Jaggaer Tracker" },
        to: recipients.map(addr => ({ address: addr })),
        subject: `Tracker · ${today}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return res.status(500).json({ error: "Resend failed", detail: err });
    }

    // 10. Update digest-state.json in GitHub — only store last_sent timestamp
    // piece_states is no longer used for change detection (timestamps are); drop it to
    // avoid the stale-stage-ID problem when admins edit the workflow.
    const newState = { last_sent: new Date().toISOString() };
    try {
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
      activity: {
        submitted: submitted.length,
        inReview: inReview.length,
        sentBack: sentBack.length,
        approved: approved.length,
        newNotes: newNotes.length,
        briefsAttached: briefsAttached.length,
      },
    });

  } catch (err) {
    console.error("Digest error:", err);
    return res.status(500).json({ error: err.message });
  }
}
