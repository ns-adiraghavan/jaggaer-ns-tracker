// Tracker v7 — phase-aware: Phase 1 / Phase 2 model, CSV sync, content-type sub-views

const { useState: useStateTR, useRef: useRefTR, useMemo: useMemoTR } = React;

// Cluster colour palette — directly lifted from spreadsheet fills
const CLUSTER_PALETTE = [
  { bg: "#EAF2F8", border: "#c5ddef", text: "#1a3a52", intentBg: "#d4eaf5", seqColor: "#1F618D" },
  { bg: "#E9F7EF", border: "#c2e8d4", text: "#1a3d2b", intentBg: "#d2f0e0", seqColor: "#1E7A45" },
  { bg: "#FEF9E7", border: "#f0e4b0", text: "#4a3a0a", intentBg: "#faf0cc", seqColor: "#9A7D0A" },
  { bg: "#F5EEF8", border: "#dccce8", text: "#3a1f52", intentBg: "#ecddf5", seqColor: "#6C3483" },
];

const PILLAR_ACCENT = {
  "ai-in-s2p":               "#784212",
  "discrete-manufacturing":  "#1F618D",
  "public-sector":           "#1E8449",
  "higher-education":        "#6C3483",
};

// ─── Content-type display lookup — single source of truth for label/colour ────
// across TrackerHeader, ContentTypeNav (sidebar.jsx) and AdminOverview (admin.jsx).
// "ad-hoc" pieces are expedited/as-needed, NOT part of the weighted 30+ piece
// programme split, so their weight is intentionally null (no % shown).
const CT_DISPLAY = {
  "msv":                { label: "MSV-Driven",        color: "#1a6a3a", bg: "#eaf4ee", border: "#b8dfc8" },
  "ai-in-s2p":          { label: "AI in S2P (Claude)", color: "#1e4fa8", bg: "#eaf0fb", border: "#bad0f0" },
  "industry-specific":  { label: "Industry-Specific",  color: "#784212", bg: "#fef3e8", border: "#f0d4a8" },
  "ad-hoc":             { label: "Ad-Hoc Articles",    color: "#c8401a", bg: "#fdeee8", border: "#f0bba8" },
};
window.CT_DISPLAY = CT_DISPLAY;

// ─── Workflow stages — read from project.workflow_stages if present, else use defaults ──
// Each stage: { id, label, color, bg, actor }
// actor: "jaggaer" | "ns" | "person:<id>" — controls who sees the action button
// Kept in sync with the live config (config/project.json → workflow_stages).
// This is only a FALLBACK for when the project hasn't hydrated yet; the live
// workflow always wins via getWorkflowStages() + syncWorkflowGlobals().
const DEFAULT_WORKFLOW_STAGES = [
  { id: "not-started",      label: "Not Started",                   color: "rgba(17,24,32,0.38)", bg: "rgba(17,24,32,0.06)", actor: "jaggaer" },
  { id: "stage-nq11b",      label: "SME Review (Confirmation of topics)", color: "#0e6655",       bg: "#e8f5f0",             actor: "person:m-ny8dy" },
  { id: "brief-uploaded",   label: "Brief Uploaded",                color: "#0e6655",             bg: "#e8f5f0",             actor: ["ns", "jaggaer"] },
  { id: "writing",          label: "Writing",                       color: "#1e6fa8",             bg: "#e8f2fa",             actor: "ns" },
  { id: "marketing-review", label: "Abhishek and Orlagh Review",    color: "#6c3483",             bg: "#f5eef8",             actor: ["person:abhishek", "person:m-ny8dy"] },
  { id: "ed-review",         label: "Ed Content Review",             color: "#7d6608",             bg: "#fefde8",             actor: "person:m-ed01" },
  { id: "editors",          label: "CTA Check",                     color: "#b05e00",             bg: "#fdf0e0",             actor: "jaggaer" },
  { id: "approved",         label: "Approved",                      color: "#1e7a45",             bg: "#e6f5ec",             actor: null },
];

// Ad-Hoc Articles run a short two-stage chain instead of the full pipeline above:
// writing (NS uploads) → ad-hoc-review (any Jaggaer user) → approved.
// Kept OUT of the main DEFAULT_WORKFLOW_STAGES array so it never shifts indices
// for the standard pieces — UploadPanel/ReviewPanel branch on content_type
// === "ad-hoc" to route into this stage explicitly rather than walking stageOrder.
const ADHOC_REVIEW_STAGE = {
  id: "ad-hoc-review", label: "Ad-Hoc Review (Jaggaer)", color: "#c8401a", bg: "#fdeee8", actor: "jaggaer",
};
function getAdHocReviewStage(project) {
  const stages = getWorkflowStages(project);
  return stages.find(s => s.id === "ad-hoc-review") || ADHOC_REVIEW_STAGE;
}
function isAdHoc(piece) { return piece && piece.content_type === "ad-hoc"; }
// White-paper deliverables require BOTH a PDF and an HTML companion file.
// Formats that trigger dual-upload mode:
const WP_FORMATS = ["Whitepaper", "Whitepaper (gated)", "eBook / Guide"];
function isWhitePaper(piece) { return piece && WP_FORMATS.includes(piece.format); }
// Path helpers for a given rev + ext
function wpDeliverablePath(piece, pillar, cluster, month, rev, ext) {
  return `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${rev}.${ext}`;
}

function getWorkflowStages(project) {
  return (project && project.workflow_stages && project.workflow_stages.length)
    ? project.workflow_stages
    : DEFAULT_WORKFLOW_STAGES;
}

function buildStatusMeta(stages) {
  const meta = {};
  stages.forEach(s => { meta[s.id] = { label: s.label, color: s.color, bg: s.bg }; });
  return meta;
}

// Static STATUS_META for components that can't easily receive the project prop.
// These are `let` so they can be repointed at the LIVE workflow once the project
// hydrates — see syncWorkflowGlobals(), called from app.jsx. This guarantees that
// custom/admin-reconfigured stages (e.g. "stage-nq11b") resolve to the right
// label/colour everywhere, not just in components that thread `stageMeta` through.
let STATUS_META = buildStatusMeta(DEFAULT_WORKFLOW_STAGES);
let STATUS_ORDER = DEFAULT_WORKFLOW_STAGES.map(s => s.id);
let IN_MOTION_STATUSES = DEFAULT_WORKFLOW_STAGES.filter(s => s.id !== "not-started" && s.id !== "approved").map(s => s.id);

function syncWorkflowGlobals(project) {
  const stages = getWorkflowStages(project);
  const hasAdHoc = stages.some(s => s.id === "ad-hoc-review");
  const stagesWithAdHoc = hasAdHoc ? stages : [...stages, getAdHocReviewStage(project)];
  STATUS_META = buildStatusMeta(stagesWithAdHoc);
  STATUS_ORDER = stagesWithAdHoc.map(s => s.id);
  IN_MOTION_STATUSES = stagesWithAdHoc.filter(s => s.id !== "not-started" && s.id !== "approved").map(s => s.id);
}
window.NS_syncWorkflow = syncWorkflowGlobals;

// ─── Actor / turn helpers — single source of truth for "whose turn is it" ─────
// Used by the table, the notification bell, and the sidebar so none of them
// hardcode stage ids (which silently break whenever the workflow is reordered).
function actorMatchesUser(actor, user) {
  if (!actor || !user) return false;
  const actors = Array.isArray(actor) ? actor : [actor];
  return actors.some(a => {
    if (a === "ns") return user.org === "ns";
    if (a === "jaggaer") return user.org === "jaggaer";
    if (typeof a === "string" && a.startsWith("person:")) return user.id === a.slice(7);
    return false;
  });
}
function actorIsJaggaerSide(actor, project) {
  if (!actor) return false;
  const actors = Array.isArray(actor) ? actor : [actor];
  const jids = new Set((project.team && project.team.jaggaer || []).map(m => "person:" + m.id));
  return actors.some(a => a === "jaggaer" || jids.has(a));
}
// Returns { isTurn, mode, awaitsJaggaer } for a piece given the current user.
function pieceTurnFor(piece, user, project) {
  const stages = getWorkflowStages(project);
  const st = piece.status === "ad-hoc-review" ? getAdHocReviewStage(project) : stages.find(s => s.id === piece.status);
  if (!st || piece.status === "approved" || piece.status === "not-started") {
    return { isTurn: false, mode: "history", awaitsJaggaer: false };
  }
  const isTurn = actorMatchesUser(st.actor, user);
  const isNS = user.org === "ns";
  return {
    isTurn,
    mode: isTurn ? (isNS ? "upload" : "review") : "history",
    awaitsJaggaer: isTurn && user.org === "jaggaer",
  };
}

// ─── Deliverable file-type helpers ────────────────────────────────────────────
// The deliverable used to be hardcoded as .html everywhere. Pieces now carry
// `deliverable_ext` (set on upload) so PDFs, docx, etc. round-trip correctly.
function deliverableExt(piece) {
  return (piece && piece.deliverable_ext) ? piece.deliverable_ext.replace(/^\./, "").toLowerCase() : "html";
}
function deliverableFileName(piece) {
  return `deliverable-v${piece.revision_count || 1}.${deliverableExt(piece)}`;
}
const TEXT_DELIVERABLE_EXTS = ["html", "htm", "md", "markdown", "txt"];
function isTextDeliverable(piece) { return TEXT_DELIVERABLE_EXTS.includes(deliverableExt(piece)); }
function isPdfDeliverable(piece) { return deliverableExt(piece) === "pdf"; }

// Binary types must be read as base64 (readAsText corrupts them) and committed
// to GitHub as raw base64. Text types keep the existing readAsText path.
const BINARY_DELIVERABLE_EXTS = ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "png", "jpg", "jpeg", "gif", "zip"];
function extOf(name) { const m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : "html"; }
function readDeliverableFile(file) {
  return new Promise((resolve, reject) => {
    const ext = extOf(file.name);
    const binary = BINARY_DELIVERABLE_EXTS.includes(ext);
    const reader = new FileReader();
    reader.onerror = reject;
    if (binary) {
      reader.onload = () => {
        const s = String(reader.result);
        const b64 = s.slice(s.indexOf(",") + 1); // strip "data:...;base64,"
        resolve({ ext, name: file.name, binary: true, b64 });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => resolve({ ext, name: file.name, binary: false, text: String(reader.result) });
      reader.readAsText(file);
    }
  });
}

// ─── Stage-history log ────────────────────────────────────────────────────────
// Every status transition (upload, approve, send-back, question) appends a
// { stage, ts, by } entry here, going forward only. Existing pieces are seeded
// with a single synthetic entry (ts: null) on first read so the Weekly Report
// has at least one data point — see ensureSeededHistory().
// Timestamps are stored UTC (consistent with last_updated/feedback ts elsewhere)
// and converted to EST only at display time via formatEST().
function appendStatusHistory(piece, stage, by) {
  const prevHistory = Array.isArray(piece.status_history) ? piece.status_history : [];
  return [...prevHistory, { stage, ts: new Date().toISOString(), by: by || null }];
}

// Used wherever a piece is first rendered without a status_history — backfills
// one entry showing the CURRENT stage with ts: null (intentionally blank; we
// don't know when it actually entered that stage, only that it's there now).
function ensureSeededHistory(piece) {
  if (Array.isArray(piece.status_history) && piece.status_history.length) return piece.status_history;
  return [{ stage: piece.status, ts: null, by: piece.last_updated_by || piece.last_upload_by || null }];
}

// Displays a UTC ISO timestamp as US Eastern time. Returns "—" for null/blank
// (used for seeded history entries where we don't know the real date).
function formatEST(isoString, opts) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  const base = { timeZone: "America/New_York", month: "short", day: "numeric" };
  return d.toLocaleString("en-US", { ...base, ...(opts || {}) });
}

// ─── Force-download helper — raw.githubusercontent serves HTML inline; fetch → blob forces save ──
async function forceDownload(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) { window.open(url, "_blank"); return; }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch { window.open(url, "_blank"); }
}


// ─── Phase helpers ────────────────────────────────────────────────────────────

// Keep getClusterWeek for Publishing Sequence tab only
function getClusterWeek(clusterId, schedule) {
  if (!schedule) return null;
  const slot = (schedule).find(w => w.slots.some(s => s.cluster === clusterId));
  return slot ? slot.week : null;
}

// Stub retained for PublishingSequence tab — week dates for Jaggaer publish calendar
function getScheduleContext(project) {
  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
  if (!activeMonth || !activeMonth.start_date) return { currentWeek: null, startDate: null };
  const start = new Date(activeMonth.start_date);
  return { currentWeek: null, startDate: start }; // currentWeek intentionally null — no "overdue" concept
}

function weekDateRange(weekNum, startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const weekStart = new Date(start.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

// Stub — always returns null (no overdue/due concept anymore)
function getPieceTiming() { return null; }

// ─── CSV helpers ───────────────────────────────────────────────────────────────
const CSV_FIELDS = ["id","title","format","cluster","pillar","content_type","phase",
  "primary_keyword","secondary_keyword","intent","funnel","geography","assignee","notes","url",
  "valid_clusters"];

function projectToCsv(project) {
  const rows = [CSV_FIELDS.join(",")];
  for (const pillar of project.pillars || []) {
    for (const cluster of pillar.clusters || []) {
      for (const piece of cluster.pieces || []) {
        const pillarClusterLabels = (pillar.clusters || []).map(c => c.label).join(" | ");
        const row = CSV_FIELDS.map(f => {
          let val = "";
          if (f === "cluster") val = cluster.label;
          else if (f === "pillar") val = pillar.label;
          else if (f === "valid_clusters") val = pillarClusterLabels;
          else val = piece[f] !== undefined ? String(piece[f]) : "";
          // Escape commas/quotes
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            val = '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        });
        rows.push(row.join(","));
      }
    }
  }
  return rows.join("\n");
}

function csvToProjectUpdates(csvText, project) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = [];
    let cur = "", inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || "").trim(); });
    rows.push(row);
  }

  // Build lookup of existing piece ids
  const existingIds = new Set();
  for (const pillar of project.pillars || [])
    for (const cluster of pillar.clusters || [])
      for (const piece of cluster.pieces || [])
        existingIds.add(piece.id);

  const updates = {};    // existing piece id -> row
  const newPieces = [];  // rows with no matching id
  for (const row of rows) {
    if (row.id && existingIds.has(row.id)) {
      updates[row.id] = row;
    } else if (row.title && row.cluster) {
      newPieces.push(row);
    }
  }

  const newProject = JSON.parse(JSON.stringify(project));
  const updateableFields = ["title","format","content_type","primary_keyword",
    "secondary_keyword","intent","funnel","geography","assignee","notes","url"];
  let changed = 0;

  // 1. Update existing pieces
  for (const pillar of newProject.pillars || []) {
    for (const cluster of pillar.clusters || []) {
      for (const piece of cluster.pieces || []) {
        const upd = updates[piece.id];
        if (!upd) continue;
        for (const f of updateableFields) {
          if (upd[f] !== undefined && upd[f] !== String(piece[f] || "")) {
            piece[f] = upd[f];
            changed++;
          }
        }
        if (upd.phase) {
          const parsed = parseInt(upd.phase) || 1;
          if (parsed !== piece.phase) { piece.phase = parsed; changed++; }
        }
      }
    }
  }

  // 2. Add new pieces — match cluster by label (case-insensitive), pillar optional
  for (const row of newPieces) {
    let targetCluster = null;
    for (const pillar of newProject.pillars || []) {
      const pillarMatch = !row.pillar ||
        pillar.label.toLowerCase() === row.pillar.toLowerCase();
      if (!pillarMatch) continue;
      const cluster = (pillar.clusters || []).find(
        c => c.label.toLowerCase() === row.cluster.toLowerCase()
      );
      if (cluster) { targetCluster = cluster; break; }
    }
    if (!targetCluster) continue; // unknown cluster — skip

    const newId = "piece-" + targetCluster.id + "-"
      + (targetCluster.pieces.length + 1) + "-"
      + Math.random().toString(36).slice(2, 6);

    targetCluster.pieces.push({
      id: newId,
      title: row.title || "Untitled",
      format: row.format || "",
      content_type: row.content_type || "",
      phase: parseInt(row.phase) || 1,
      primary_keyword: row.primary_keyword || "",
      secondary_keyword: row.secondary_keyword || "",
      intent: row.intent || "",
      funnel: row.funnel || "",
      geography: row.geography || "",
      assignee: row.assignee || "",
      notes: row.notes || "",
      url: row.url || "",
      status: "not-started",
    });
    changed++;
  }

  return { newProject, changed };
}

// ─── CSV Sync Panel (used in Admin) ──────────────────────────────────────────
function CsvSyncPanel({ project, setProject }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [uploadState, setUploadState] = React.useState("idle"); // idle|parsing|preview|saving|done|error
  const [preview, setPreview] = React.useState(null); // { changed, newProject }
  const [errorMsg, setErrorMsg] = React.useState("");
  const fileRef = React.useRef();

  function downloadCsv() {
    const csv = projectToCsv(project);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jaggaer-topics-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadState("parsing");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { newProject, changed } = csvToProjectUpdates(ev.target.result, project);
        setPreview({ changed, newProject });
        setUploadState("preview");
      } catch(err) {
        setErrorMsg(err.message);
        setUploadState("error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function applyChanges() {
    setUploadState("saving");
    setProject(preview.newProject);
    setTimeout(() => setUploadState("done"), 800);
  }

  const btnStyle = (color, bg, border) => ({
    ...FONT, fontSize: "0.72rem", fontWeight: 600,
    color, background: bg, border: `1px solid ${border}`,
    padding: "7px 16px", borderRadius: "3px", cursor: "pointer",
    letterSpacing: "0.04em",
  });

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px", padding: "20px 24px" }}>
      <div style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "#888", marginBottom: "14px" }}>
        Topic CSV Sync
      </div>
      <p style={{ ...FONT, fontSize: "0.82rem", color: "#666", marginBottom: "16px", lineHeight: 1.5 }}>
        Download the current topic list as a CSV. Edit existing fields offline, or add new rows to create new topics.
        New rows need a <strong>title</strong> and a <strong>cluster</strong> name matching an existing cluster exactly. Leave <strong>id</strong> blank for new topics.
        Status and feedback are never overwritten.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
        <button onClick={downloadCsv} style={btnStyle("#1e4fa8", "#eef3fb", "#c5d8f5")}>
          ↓ Download Current Topics CSV
        </button>
        <button onClick={() => fileRef.current.click()}
          style={btnStyle("#1a2535", "#f5f2ec", "#d4cfc8")}
          disabled={uploadState === "parsing" || uploadState === "saving"}>
          ↑ Upload Updated CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
      </div>

      {uploadState === "parsing" && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#888" }}>Parsing CSV…</div>
      )}

      {uploadState === "preview" && preview && (
        <div style={{ background: preview.changed > 0 ? "#f0faf4" : "#faf8f4",
          border: `1px solid ${preview.changed > 0 ? "#b6e5c8" : "#e0dbd4"}`,
          borderRadius: "4px", padding: "14px 18px" }}>
          <div style={{ ...FONT, fontSize: "0.82rem", fontWeight: 600,
            color: preview.changed > 0 ? "#1e7a45" : "#888", marginBottom: "8px" }}>
            {preview.changed > 0
              ? `${preview.changed} field${preview.changed !== 1 ? "s" : ""} will be updated`
              : "No changes detected — CSV matches current state"}
          </div>
          {preview.changed > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={applyChanges} style={btnStyle("#fff", "#1e7a45", "#1e7a45")}>
                Apply {preview.changed} changes
              </button>
              <button onClick={() => { setUploadState("idle"); setPreview(null); }}
                style={btnStyle("#888", "#fff", "#e0dbd4")}>
                Cancel
              </button>
            </div>
          )}
          {preview.changed === 0 && (
            <button onClick={() => { setUploadState("idle"); setPreview(null); }}
              style={{ ...btnStyle("#888", "#fff", "#e0dbd4"), marginTop: "8px" }}>
              Dismiss
            </button>
          )}
        </div>
      )}

      {uploadState === "saving" && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#888" }}>Saving to GitHub…</div>
      )}

      {uploadState === "done" && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#1e7a45", fontWeight: 600 }}>
          ✓ Topics synced. Changes will save to GitHub automatically.
        </div>
      )}

      {uploadState === "error" && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#b91c1c" }}>
          Error parsing CSV: {errorMsg}
        </div>
      )}

      <div style={{ ...FONT, fontSize: "0.7rem", color: "#bbb", marginTop: "14px", lineHeight: 1.5 }}>
        CSV columns: id · title · format · cluster · pillar · content_type · phase · primary_keyword · secondary_keyword · intent · funnel · geography · assignee · notes · url
        <br />To update an existing topic: keep its id. To add a new topic: leave id blank, set cluster to an exact existing cluster name.
        Status, revision count, and feedback history are never affected by CSV sync.
      </div>
    </div>
  );
}


const VERDICT_META = {
  "approved":       { label: "Approved",      glyph: "✓" },
  "needs-revision": { label: "Needs Revision", glyph: "↻" },
  "question":       { label: "Question",      glyph: "?" }
};

// PUBLISHING_SEQUENCE — now read from project.json → project.schedule

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assigneeName(project, id) {
  if (!id) return "—";
  const all = [...project.team.ns, ...project.team.jaggaer];
  const m = all.find(x => x.id === id);
  return m ? m.name.split(" ")[0] : "—";
}

function StatusChip({ status, stageMeta }) {
  const meta = (stageMeta || STATUS_META)[status] || STATUS_META["not-started"] || { label: status, color: "#888", bg: "#eee" };
  return (
    <span className="ns-status-chip" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

// ─── Inline cell editor — shared by table + card views ────────────────────────
// Renders the value normally; on admin hover shows pencil; on click flips to input/select.
function InlineCell({ value, type, options, onSave, children, className }) {
  const [editing, setEditing] = useStateTR(false);
  const [draft, setDraft] = useStateTR(value);
  const inputRef = useRefTR(null);

  function activate(e) {
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit(e) {
    e.stopPropagation();
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  function onKey(e) {
    e.stopPropagation();
    if (e.key === "Enter") commit(e);
    if (e.key === "Escape") { setEditing(false); setDraft(value); }
  }

  if (editing) {
    if (type === "select") {
      return (
        <select
          ref={inputRef}
          className={`ns-inline-select ${className || ""}`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          onClick={e => e.stopPropagation()}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        ref={inputRef}
        className={`ns-inline-input ${className || ""}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <span className={`ns-inline-cell ${className || ""}`} onClick={activate} title="Click to edit">
      {children || value || "—"}
      <span className="ns-inline-pencil">✎</span>
    </span>
  );
}


// ─── Activity Bar — recent uploads/feedback, phase-filtered ─────────────────
function FilterBar({ project, currentWeek, onOpenPiece, activeFilter, setActiveFilter, currentUser }) {
  const PANEL = { fontFamily: "Noto Sans, sans-serif" };
  const baseStages = (project.workflow_stages && project.workflow_stages.length)
    ? project.workflow_stages : DEFAULT_WORKFLOW_STAGES;
  const stages = baseStages.some(s => s.id === "ad-hoc-review") ? baseStages : [...baseStages, getAdHocReviewStage(project)];
  const stageMeta = {};
  stages.forEach(s => { stageMeta[s.id] = s; });

  // Determine which stage ids are "my turn" based on current user
  function isMyTurn(actor) {
    if (!actor || !currentUser) return false;
    const actors = Array.isArray(actor) ? actor : [actor];
    return actors.some(a => {
      if (a === "ns") return currentUser.org === "ns";
      if (a === "jaggaer") return currentUser.org === "jaggaer";
      if (typeof a === "string" && a.startsWith("person:")) return currentUser.id === a.slice(7);
      return false;
    });
  }

  const myTurnStageIds = new Set(stages.filter(s => isMyTurn(s.actor)).map(s => s.id));
  const terminalIds = new Set(["not-started", "approved"]);

  const myActions = [], recent = [];
  const byStage = {};

  for (const pillar of project.pillars) {
    for (const cluster of pillar.clusters) {
      for (const piece of cluster.pieces) {
        if (!terminalIds.has(piece.status) && myTurnStageIds.has(piece.status)) {
          myActions.push({ piece, cluster, pillar });
        }
        const ts = piece.last_updated || piece.last_upload;
        if (ts && !terminalIds.has(piece.status)) recent.push({ piece, cluster, pillar, ts });
        (byStage[piece.status] = byStage[piece.status] || []).push({ piece, cluster, pillar });
      }
    }
  }
  recent.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const recentTop = recent.slice(0, 5);

  // Label depends on role
  const actionLabel = currentUser?.org === "jaggaer" ? "Awaiting Your Review" : "Your Turn";

  // One quick chip per workflow stage that currently holds pieces — lets anyone
  // see at a glance which topics sit at which stage. Reads the live workflow.
  function hexA(c, a) { return (typeof c === "string" && c.startsWith("#")) ? c + a : c; }
  const stageChips = stages
    .filter(s => (byStage[s.id] || []).length > 0)
    .map(s => ({
      id: `stage:${s.id}`,
      label: `${byStage[s.id].length} · ${s.label}`,
      color: s.color || "#555",
      bg: s.bg || "#f5f2ec",
      activeBg: s.bg || "#ede8e0",
      border: hexA(s.color, "33") || "#d4cfc8",
      items: byStage[s.id],
      tag: null,
    }));

  const chips = [
    myActions.length > 0 && {
      id: "mine", label: `${myActions.length} ${actionLabel}`,
      color: "#1e6fa8", bg: "#e8f2fa", activeBg: "#d4e8f7", border: "#c5ddef",
      items: myActions,
      tag: currentUser?.org === "jaggaer" ? "Awaiting review" : "Your turn",
    },
    recentTop.length > 0 && {
      id: "recent", label: `${recentTop.length} Recent`,
      color: "#555", bg: "#f5f2ec", activeBg: "#ede8e0", border: "#d4cfc8",
      items: recentTop,
    },
    ...stageChips,
  ].filter(Boolean);

  if (chips.length === 0) return null;

  function relTime(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={{ borderBottom: "1px solid #e0dbd4", background: "#faf8f4" }}>
      {/* ── Chip row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>
        <span style={{ ...PANEL, fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#aaa", marginRight: "4px" }}>
          Actions
        </span>
        {chips.map(chip => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(isActive ? null : chip.id)}
              style={{
                ...PANEL, fontSize: "0.68rem", fontWeight: 600,
                color: chip.color,
                background: isActive ? chip.activeBg : chip.bg,
                border: `1px solid ${chip.border}`,
                borderRadius: "3px", padding: "3px 10px",
                cursor: "pointer", transition: "all 0.12s",
                boxShadow: isActive ? `inset 0 0 0 1px ${chip.color}44` : "none",
              }}
            >{chip.label}</button>
          );
        })}
        {activeFilter && (
          <button
            onClick={() => setActiveFilter(null)}
            style={{
              ...PANEL, fontSize: "0.63rem", color: "#aaa",
              background: "transparent", border: "none",
              cursor: "pointer", marginLeft: "2px",
            }}
          >✕ Clear</button>
        )}
      </div>

      {/* ── Inline expanded list when filter active ── */}
      {activeFilter && (() => {
        const chip = chips.find(c => c.id === activeFilter);
        if (!chip) return null;
        return (
          <div style={{ borderTop: "1px solid #e0dbd4", maxHeight: "220px", overflowY: "auto" }}>
            {chip.items.map(({ piece, cluster, pillar, ts }) => {
              const sm = stageMeta[piece.status] || { label: piece.status, color: "#888", bg: "#f0ece4" };
              const who = (piece.last_upload_by || piece.last_updated_by)
                ? (() => { const all = [...project.team.ns, ...project.team.jaggaer]; const m = all.find(x => x.id === (piece.last_upload_by || piece.last_updated_by)); return m ? m.name.split(" ")[0] : null; })()
                : null;
              return (
                <div
                  key={piece.id}
                  onClick={() => onOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: "history" })}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "7px 20px",
                    borderBottom: "1px solid #f0ece4",
                    borderLeft: `3px solid ${chip.color}`,
                    background: "#fff",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#faf8f4"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  {activeFilter !== "recent" && chip.tag && (
                    <span style={{
                      ...PANEL, fontSize: "0.62rem", fontWeight: 700,
                      color: chip.color, border: `1px solid ${chip.border}`,
                      padding: "1px 6px", borderRadius: "2px", whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {chip.tag}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...PANEL, fontSize: "0.78rem", fontWeight: 500, color: "#0f1923", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {piece.title}
                    </div>
                    <div style={{ ...PANEL, fontSize: "0.67rem", color: "#888", marginTop: "1px" }}>
                      {pillar.label} · {cluster.label}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {activeFilter === "recent" && who && (
                      <span style={{ ...PANEL, fontSize: "0.65rem", color: "#aaa" }}>{who} · {relTime(ts)}</span>
                    )}
                    <span style={{ ...PANEL, fontSize: "0.67rem", fontWeight: 600, color: sm.color, background: sm.bg, padding: "1px 6px", borderRadius: "2px" }}>
                      {sm.label}
                    </span>
                    <span style={{ color: chip.color, fontSize: "0.75rem" }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}


// ─── Tracker root ─────────────────────────────────────────────────────────────
function Tracker({ project, setProject, currentUser, activePillar, activeCluster, setActiveCluster, adminMode, activeMonthId, activeContentType, onAdminEditPiece, onAdminEditCluster }) {
  const effectiveMonthId = activeMonthId || project.active_month;
  const stats = window.computeStats(project, effectiveMonthId);
  const currentWeek = 1; // retained for Publishing Sequence tab only — not used for piece timing

  // Filter pillars to only clusters belonging to the active month.
  // Also filter by content type when activeContentType is set (By Type sidebar nav).
  const filteredPillars = project.pillars.map(p => ({
    ...p,
    clusters: p.clusters
      .filter(c => (c.month_id || project.active_month) === effectiveMonthId)
      .filter(c => !activeCluster || c.id === activeCluster)
      .map(c => ({
        ...c,
        pieces: activeContentType
          ? c.pieces.filter(pc => (pc.content_type || 'msv') === activeContentType)
          : c.pieces,
      }))
      .filter(c => c.pieces.length > 0),
  })).filter(p => {
    if (activePillar && p.id !== activePillar) return false;
    return p.clusters.length > 0;
  });

  const pillars = filteredPillars; // pillar + contentType filtering handled in filteredPillars above
  const [activeTab, setActiveTab] = useStateTR("tracker");
  const [viewMode, setViewMode] = useStateTR("table");
  const [openPiece, setOpenPiece] = useStateTR(null);
  const [activeFilter, setActiveFilter] = useStateTR(null);
  const [searchQuery, setSearchQuery] = useStateTR("");
  const [showAdHocModal, setShowAdHocModal] = useStateTR(false);

  // Apply search filter on top of pillar/cluster/content-type filters
  const sq = searchQuery.trim().toLowerCase();
  const searchedPillars = !sq ? pillars : pillars.map(p => ({
    ...p,
    clusters: p.clusters.map(c => ({
      ...c,
      pieces: c.pieces.filter(pc =>
        pc.title?.toLowerCase().includes(sq) ||
        pc.primary_keyword?.toLowerCase().includes(sq) ||
        pc.secondary_keyword?.toLowerCase().includes(sq) ||
        pc.format?.toLowerCase().includes(sq) ||
        (pc.status && (STATUS_META[pc.status]?.label || pc.status).toLowerCase().includes(sq))
      ),
    })).filter(c => c.pieces.length > 0),
  })).filter(p => p.clusters.length > 0);

  function updatePiece(clusterId, pieceId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) {
        for (const c of p.clusters) {
          if (c.id !== clusterId) continue;
          const idx = c.pieces.findIndex(x => x.id === pieceId);
          if (idx >= 0) Object.assign(c.pieces[idx], patch);
        }
      }
      return next;
    });
  }

  function addFeedback(pieceId, entry) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.feedback) next.feedback = {};
      if (!next.feedback[pieceId]) next.feedback[pieceId] = [];
      next.feedback[pieceId].push(entry);
      return next;
    });
  }

  // Ad-Hoc Articles need a pillar/cluster home to reuse all the existing piece
  // machinery (file paths, upload/review panels, preview, feedback). Rather than
  // building a parallel data structure, we auto-create one dedicated pillar with
  // a single catch-all cluster the first time anyone adds an ad-hoc piece.
  // Returns the new piece id.
  function addAdHocPiece(title, currentUser) {
    let newPieceId = null;
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let pillar = next.pillars.find(p => p.id === "ad-hoc-articles");
      if (!pillar) {
        pillar = { id: "ad-hoc-articles", label: "Ad-Hoc Articles", sequence: next.pillars.length + 1, clusters: [] };
        next.pillars.push(pillar);
      }
      let cluster = pillar.clusters.find(c => c.id === "c-ad-hoc");
      if (!cluster) {
        cluster = { id: "c-ad-hoc", label: "Ad-Hoc Articles", sequence: 1, intent: "expedited", anchor_piece: "", month_id: next.active_month, pieces: [] };
        pillar.clusters.push(cluster);
      }
      newPieceId = "piece-" + Math.random().toString(36).slice(2, 8);
      cluster.pieces.push({
        id: newPieceId,
        title: title.trim() || "Untitled ad-hoc article",
        format: "Ad-Hoc Article",
        assignee: currentUser?.id || "",
        status: "writing", // NS uploads directly — no brief/SME-review gate for ad-hoc
        content_type: "ad-hoc",
        revision_count: 0,
        primary_keyword: "",
        geography: "all",
        status_history: [{ stage: "writing", ts: new Date().toISOString(), by: currentUser?.id || null }],
        last_updated: new Date().toISOString(),
        last_updated_by: currentUser?.id || null,
      });
      return next;
    });
    return newPieceId;
  }

  function deletePiece(clusterId, pieceId) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) {
        for (const c of p.clusters) {
          if (c.id !== clusterId) continue;
          c.pieces = c.pieces.filter(x => x.id !== pieceId);
          if (next.feedback) delete next.feedback[pieceId];
        }
      }
      return next;
    });
  }

  // Resolve open piece for overlay
  let overlayPillar = null, overlayCluster = null, overlayPiece = null;
  if (openPiece) {
    for (const p of project.pillars) {
      for (const c of p.clusters) {
        if (c.id === openPiece.clusterId) {
          overlayPillar = p; overlayCluster = c;
          overlayPiece = c.pieces.find(x => x.id === openPiece.pieceId) || null;
        }
      }
    }
  }

  return (
    <main className="ns-tracker">
      <TrackerHeader
        project={project} stats={stats}
        activeCluster={activeCluster} setActiveCluster={setActiveCluster}
        activeTab={activeTab} setActiveTab={setActiveTab}
        viewMode={viewMode} setViewMode={setViewMode}
        currentUser={currentUser} onOpenPiece={setOpenPiece}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        onAddAdHoc={() => setShowAdHocModal(true)}
      />
      {showAdHocModal && (
        <AdHocCreateModal
          onClose={() => setShowAdHocModal(false)}
          onCreate={(title) => {
            const newId = addAdHocPiece(title, currentUser);
            setShowAdHocModal(false);
            if (newId) setOpenPiece({ clusterId: "c-ad-hoc", pieceId: newId, mode: "upload" });
          }}
        />
      )}
      {activeTab === "tracker" && (
        <>
          <FilterBar project={project} currentWeek={currentWeek} onOpenPiece={setOpenPiece} activeFilter={activeFilter} setActiveFilter={setActiveFilter} currentUser={currentUser} />
        </>
      )}
      {activeTab === "tracker" && viewMode === "cards" && (
        <div className="ns-tracker-body">
          {searchedPillars.map(pillar => (
            <PillarBlock
              key={pillar.id} pillar={pillar}
              sequence={project.pillars.indexOf(pillar)}
              activeCluster={activeCluster} project={project}
              openPiece={openPiece} setOpenPiece={setOpenPiece}
              updatePiece={updatePiece} addFeedback={addFeedback}
              currentUser={currentUser} adminMode={adminMode}
              onAdminEditPiece={onAdminEditPiece} onAdminEditCluster={onAdminEditCluster}
              currentWeek={currentWeek}
            />
          ))}
          {sq && searchedPillars.length === 0 && (
            <div style={{ fontFamily: "Noto Sans, sans-serif", padding: "48px 32px", color: "#9b948c", fontSize: "0.9rem", textAlign: "center" }}>
              No pieces match "<strong>{searchQuery}</strong>"
            </div>
          )}
        </div>
      )}
      {activeTab === "tracker" && viewMode === "table" && (
        <CompactTable
          pillars={searchedPillars} project={project}
          setOpenPiece={setOpenPiece}
          currentUser={currentUser} adminMode={adminMode}
          updatePiece={updatePiece} addFeedback={addFeedback}
        />
      )}
      
      {overlayPiece && overlayCluster && overlayPillar && (
        <DrawerOverlay
          piece={overlayPiece} cluster={overlayCluster} pillar={overlayPillar}
        project={project} mode={openPiece.mode || (overlayPiece && overlayPiece.revision_count ? "annotate" : "details")}
          setMode={m => setOpenPiece(prev => ({ ...prev, mode: m }))}
          updatePiece={updatePiece} addFeedback={addFeedback}
          currentUser={currentUser} adminMode={adminMode}
          onAdminEditPiece={onAdminEditPiece}
          deletePiece={deletePiece}
          onClose={() => setOpenPiece(null)}
        />
      )}
    </main>
  );
}


// ─── Notification Bell — Jaggaer users see pieces awaiting their review ───────
function NotificationBell({ project, currentUser, onOpenPiece }) {
  const [open, setOpen] = useStateTR(false);
  if (currentUser.org !== "jaggaer") return null;

  const pending = [];
  for (const pillar of project.pillars) {
    for (const cluster of pillar.clusters) {
      for (const piece of cluster.pieces) {
        // A piece is "awaiting you" when the current stage's actor matches this
        // Jaggaer user. Reads the live workflow — no hardcoded stage ids.
        if (pieceTurnFor(piece, currentUser, project).isTurn) {
          pending.push({ piece, cluster, pillar });
        }
      }
    }
  }

  const count = pending.length;
  const PANEL = { fontFamily: "Noto Sans, sans-serif" };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={count > 0 ? `${count} piece${count > 1 ? "s" : ""} awaiting your review` : "No items awaiting review"}
        style={{
          position: "relative",
          background: count > 0 ? "#fff8f0" : "#f8f6f2",
          border: `1px solid ${count > 0 ? "#f0c89a" : "#e0dbd4"}`,
          borderRadius: "4px",
          padding: "6px 10px",
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: "6px",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = count > 0 ? "#fef3e8" : "#f0ece4"}
        onMouseLeave={e => e.currentTarget.style.background = count > 0 ? "#fff8f0" : "#f8f6f2"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={count > 0 ? "#b05e00" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            ...PANEL, fontSize: "0.68rem", fontWeight: 700,
            color: "#b05e00",
          }}>{count} to review</span>
        )}
        {count === 0 && (
          <span style={{ ...PANEL, fontSize: "0.68rem", color: "#aaa" }}>All reviewed</span>
        )}
        {count > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            width: "16px", height: "16px",
            background: "#c8401a", color: "#fff",
            borderRadius: "50%", fontSize: "0.6rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Noto Sans, sans-serif",
            boxShadow: "0 0 0 2px #fff",
          }}>{count}</span>
        )}
      </button>

      {open && count > 0 && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: "340px",
            background: "#fff",
            border: "1px solid #e0dbd4",
            borderRadius: "4px",
            boxShadow: "0 8px 24px rgba(15,25,35,0.12)",
            zIndex: 200,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 16px",
              borderBottom: "1px solid #f0ece4",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ ...PANEL, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b05e00" }}>
                Awaiting Your Review
              </span>
              <span style={{ ...PANEL, fontSize: "0.68rem", color: "#aaa" }}>{count} piece{count > 1 ? "s" : ""}</span>
            </div>
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {pending.map(({ piece, cluster, pillar }) => {
                const sm = STATUS_META[piece.status] || { label: piece.status, color: "#888", bg: "#eee" };
                const uploadedBy = piece.last_upload_by
                  ? (() => { const all = [...project.team.ns, ...project.team.jaggaer]; const m = all.find(x => x.id === piece.last_upload_by); return m ? m.name.split(" ")[0] : piece.last_upload_by; })()
                  : null;
                const ts = piece.last_upload || piece.last_updated;
                const diff = ts ? Math.floor((Date.now() - new Date(ts)) / 86400000) : null;
                const daysAgo = diff === null ? "" : diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff}d ago`;
                return (
                  <div
                    key={piece.id}
                    onClick={() => { onOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: "feedback" }); setOpen(false); }}
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid #f0ece4",
                      cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fdf9f5"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: sm.color, flexShrink: 0, marginTop: "4px",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...PANEL, fontSize: "0.78rem", fontWeight: 500, color: "#0f1923", lineHeight: 1.35,
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {piece.title}
                      </div>
                      <div style={{ ...PANEL, fontSize: "0.67rem", color: "#888", marginTop: "3px" }}>
                        {pillar.label} · {cluster.label}
                      </div>
                      <div style={{ ...PANEL, fontSize: "0.67rem", color: sm.color, marginTop: "2px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ background: sm.bg, padding: "1px 6px", borderRadius: "2px", fontWeight: 600 }}>{sm.label}</span>
                        {uploadedBy && <span style={{ color: "#aaa" }}>by {uploadedBy}{daysAgo ? ` · ${daysAgo}` : ""}</span>}
                      </div>
                    </div>
                    <span style={{ ...PANEL, fontSize: "0.72rem", color: "#c8401a", fontWeight: 600, flexShrink: 0, marginTop: "2px" }}>Review →</span>
                  </div>
                );
              })}
            </div>
            <div style={{
              padding: "8px 16px",
              background: "#faf8f4",
              borderTop: "1px solid #f0ece4",
              ...PANEL, fontSize: "0.67rem", color: "#aaa", textAlign: "center",
            }}>
              Click any piece to open the feedback form
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Ad-Hoc Article creation modal ─────────────────────────────────────────────
// Deliberately minimal: just a topic/title. No keywords, schedule_week, or brief
// scaffolding — ad-hoc pieces skip straight to "writing" status so NS can upload
// the finished HTML immediately. Open to any NS user, not gated by adminMode.
function AdHocCreateModal({ onClose, onCreate }) {
  const [title, setTitle] = useStateTR("");
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,32,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "5px", padding: "24px", width: "420px", maxWidth: "90vw", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
          New Ad-Hoc Article
        </div>
        <p style={{ ...FONT, fontSize: "0.78rem", color: "#666", marginTop: 0, marginBottom: "16px", lineHeight: 1.5 }}>
          Expedited content outside the planned calendar. Drop a topic, then upload the finished HTML — any Jaggaer reviewer can approve or send it back, no Abhishek/Vizna/Ed/CTA gates.
        </p>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Article topic / working title"
          onKeyDown={e => { if (e.key === "Enter" && title.trim()) onCreate(title); }}
          style={{
            ...FONT, fontSize: "0.85rem", width: "100%",
            border: "1px solid #e8e3da", borderRadius: "3px",
            padding: "9px 12px", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
          <button onClick={onClose} style={{ ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#888", background: "none", border: "none", cursor: "pointer", padding: "8px 10px" }}>
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onCreate(title)}
            disabled={!title.trim()}
            style={{
              ...FONT, fontSize: "0.78rem", fontWeight: 700,
              color: "#fff", background: title.trim() ? "#c8401a" : "#e0d8cc",
              border: "none", borderRadius: "3px",
              padding: "9px 18px", cursor: title.trim() ? "pointer" : "default",
            }}
          >Create →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function TrackerHeader({ project, stats, activeCluster, setActiveCluster, activeTab, setActiveTab, viewMode, setViewMode, currentUser, onOpenPiece, searchQuery, setSearchQuery, onAddAdHoc }) {
  const totalPieces = project.pillars.reduce((n, p) => n + p.clusters.reduce((m, c) => m + c.pieces.length, 0), 0);
  const clusterStats = window.computeStats(project).byCluster;
  const readyClusters = Object.values(clusterStats).filter(c => c.ready).length;
  const totalClusters = Object.keys(clusterStats).length;
  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
  const monthLabel = activeMonth ? activeMonth.label : "";

  return (
    <header className="ns-tracker-head">
      <div className="ns-tracker-head-row">
        <div className="ns-tracker-head-left">
          <div className="ns-tracker-eyebrow">{monthLabel}</div>
          <h1 className="ns-tracker-title">{totalPieces} pieces · {project.pillars.length} pillars</h1>
          {project.content_type_split && project.content_type_split.length > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
              {project.content_type_split.map(ct => {
                const meta = CT_DISPLAY[ct.id] || CT_DISPLAY["industry-specific"];
                return (
                  <span key={ct.id} title={ct.description} style={{
                    fontFamily: "Noto Sans, sans-serif",
                    fontSize: "0.67rem", fontWeight: 700,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
                    padding: "3px 10px", borderRadius: "2px", cursor: "default",
                  }}>
                    {typeof ct.weight === "number" ? `${Math.round(ct.weight * 100)}% ` : ""}{meta.label}
                    {ct.pieces_est && <span style={{ opacity: 0.65, fontWeight: 400 }}> · ~{ct.pieces_est}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="ns-tracker-head-right" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            <KPI big={stats.approved} small={`/ ${stats.total}`} label="Approved" />
            <KPI big={stats.awaiting} small="" label="Awaiting Jaggaer" />
            <KPI big={readyClusters} small={`/ ${totalClusters}`} label="Clusters Ready" />
          </div>
          {currentUser && onOpenPiece && <NotificationBell project={project} currentUser={currentUser} onOpenPiece={onOpenPiece} />}
        </div>
      </div>

      <div className="ns-tracker-nav-row">
        <div className="ns-tracker-tabs">
          {[["tracker","Content Tracker"]].map(([id, label]) => (
            <button key={id} className={`ns-tracker-tab ${activeTab === id ? "is-active" : ""}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="ns-tracker-nav-right">
          {activeTab === "tracker" && setSearchQuery && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: "absolute", left: "9px", color: "#9b948c", pointerEvents: "none" }}>
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="8.9" y1="8.9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search pieces…"
                style={{
                  fontFamily: "Noto Sans, sans-serif",
                  fontSize: "0.78rem",
                  color: "#1a2535",
                  background: "#fff",
                  border: "1px solid #e8e3da",
                  borderRadius: "3px",
                  padding: "6px 28px 6px 28px",
                  width: "200px",
                  outline: "none",
                  transition: "border-color 0.15s, width 0.2s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#c8401a"; e.currentTarget.style.width = "260px"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e8e3da"; e.currentTarget.style.width = "200px"; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: "7px",
                    background: "none", border: "none",
                    color: "#9b948c", cursor: "pointer",
                    fontSize: "0.8rem", lineHeight: 1, padding: "0 2px",
                  }}
                  title="Clear search"
                >✕</button>
              )}
            </div>
          )}
          {activeTab === "tracker" && currentUser?.org === "ns" && onAddAdHoc && (
            <button
              onClick={onAddAdHoc}
              style={{
                fontFamily: "Noto Sans, sans-serif",
                fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.03em",
                color: "#fff", background: "#c8401a",
                border: "none", borderRadius: "3px",
                padding: "7px 14px", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Log an expedited article outside the planned content calendar"
            >+ Ad-Hoc Article</button>
          )}
          {activeTab === "tracker" && (
            <div className="ns-view-toggle">
              <button className={`ns-view-btn ${viewMode === "cards" ? "is-active" : ""}`} onClick={() => setViewMode("cards")} title="Card view">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor"/><rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor"/><rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor"/><rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor"/></svg>
                Cards
              </button>
              <button className={`ns-view-btn ${viewMode === "table" ? "is-active" : ""}`} onClick={() => setViewMode("table")} title="Compact table">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="14" height="2.5" rx="1" fill="currentColor"/><rect x="0" y="4" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.6"/><rect x="0" y="8" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.6"/><rect x="0" y="12" width="14" height="2" rx="1" fill="currentColor" opacity="0.4"/></svg>
                Table
              </button>
            </div>
          )}
          {activeCluster && activeTab === "tracker" && (
            <div className="ns-tracker-filter">
              <span className="ns-eyebrow-rule"></span>
              <span>Filtered — one cluster</span>
              <button onClick={() => setActiveCluster(null)} className="ns-link-btn">Show all →</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function KPI({ big, small, label }) {
  return (
    <div className="ns-kpi">
      <div className="ns-kpi-num">
        <span className="ns-kpi-big">{big}</span>
        <span className="ns-kpi-small">{small}</span>
      </div>
      <div className="ns-kpi-label">{label}</div>
    </div>
  );
}

// ─── Publishing sequence view ─────────────────────────────────────────────────
function PublishingSequence({ project }) {
  const clusterStats = window.computeStats(project).byCluster;
  const { currentWeek, startDate } = getScheduleContext(project);

  return (
    <div className="ns-sequence">
      <div className="ns-sequence-intro">
        <div className="ns-eyebrow ns-eyebrow-dark">4-Week Publishing Sequence · Informational clusters first, commercial second</div>
        <p className="ns-sequence-rule">Publish all pieces within a cluster before moving to the next. Add internal links between all pieces in the same cluster.</p>
      </div>
      <div className="ns-sequence-weeks">
        {(project.schedule || []).map(week => {
          const isCurrent = week.week === currentWeek;
          const dateRange = weekDateRange(week.week, startDate);
          const weekClusters = week.slots.map(slot => {
            const pillar = project.pillars.find(p => p.id === slot.pillar);
            const cluster = pillar?.clusters.find(c => c.id === slot.cluster);
            const total = cluster ? cluster.pieces.length : 0;
            const cs = clusterStats[slot.cluster] || { approved: 0, total, ready: false };
            return { pillar, cluster, cs, slot };
          });
          const weekReady = weekClusters.every(w => w.cs.ready);
          const totalPieces = weekClusters.reduce((n, w) => n + (w.cs.total || 0), 0);
          const approvedPieces = weekClusters.reduce((n, w) => n + (w.cs.approved || 0), 0);

          return (
            <div key={week.week} className={`ns-week-card ${isCurrent ? "is-current" : ""} ${weekReady ? "is-done" : ""}`}>
              <div className="ns-week-head">
                <div className="ns-week-label-row">
                  <span className="ns-week-num">{week.label}</span>
                  {isCurrent && <span className="ns-week-badge-current">Current</span>}
                  {weekReady && <span className="ns-week-badge-done">Complete</span>}
                  {!weekReady && !isCurrent && week.week < currentWeek && <span className="ns-week-badge-blocked">Behind</span>}
                </div>
                {/* Calendar date range — the key clarity addition */}
                {dateRange && (
                  <div style={{
                    fontFamily: "Noto Sans, sans-serif",
                    fontSize: "0.7rem", fontWeight: 600,
                    color: isCurrent ? "#c8401a" : "#888",
                    letterSpacing: "0.02em",
                    marginBottom: "6px",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {dateRange}
                    <span style={{ fontWeight: 400, color: "#aaa" }}>·</span>
                    <span style={{ fontWeight: 400, color: "#aaa" }}>{approvedPieces}/{totalPieces} pieces approved</span>
                  </div>
                )}
                <p className="ns-week-goal">{week.goal}</p>
              </div>
              <div className="ns-week-clusters">
                {weekClusters.map(({ pillar, cluster, cs, slot }) => {
                  if (!cluster) return null;
                  const pct = cs.total > 0 ? Math.round((cs.approved / cs.total) * 100) : 0;
                  return (
                    <div key={slot.cluster} className={`ns-week-cluster-row ${cs.ready ? "is-ready" : ""}`}>
                      <div className="ns-week-cluster-info">
                        <span className="ns-week-pillar-tag">{pillar?.label?.split(" ")[0] || ""}</span>
                        <span className="ns-week-cluster-name">{cluster.label}</span>
                        <span className={`ns-week-cluster-intent ${cluster.intent}`}>{cluster.intent}</span>
                      </div>
                      <div className="ns-week-cluster-progress">
                        <div className="ns-week-progress-bar">
                          <div className="ns-week-progress-fill" style={{ width: `${pct}%`, background: cs.ready ? "var(--st-approved)" : "var(--accent)" }}></div>
                        </div>
                        <span className="ns-week-progress-label">{cs.approved}/{cs.total}</span>
                        {cs.ready && <span className="ns-week-ready-mark">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Pillar block ─────────────────────────────────────────────────────────────
function PillarBlock({ pillar, sequence, activeCluster, project, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onAdminEditCluster, currentWeek }) {
  const clusters = activeCluster ? pillar.clusters.filter(c => c.id === activeCluster) : pillar.clusters;
  if (clusters.length === 0) return null;
  const pillarStats = window.computeStats(project).byPillar[pillar.id];

  return (
    <section className="ns-pillar-block">
      <div className="ns-pillar-header">
        <div className="ns-pillar-num">P{String(sequence).padStart(2, "0")}</div>
        <div>
          <h2 className="ns-pillar-title">{pillar.label}</h2>
          <div className="ns-pillar-sub">
            {pillar.subtitle && <><span>{pillar.subtitle}</span><span className="ns-pillar-sub-sep">·</span></>}
            <span>{pillarStats.approved} / {pillarStats.total} approved</span>
          </div>
        </div>
      </div>
      <div className="ns-cluster-grid">
        {clusters.map((c, i) => (
          <ClusterCard
            key={c.id} cluster={c} pillar={pillar} project={project}
            clusterIndex={i}
            openPiece={openPiece} setOpenPiece={setOpenPiece}
            updatePiece={updatePiece} addFeedback={addFeedback}
            currentUser={currentUser} adminMode={adminMode}
            onAdminEditPiece={onAdminEditPiece} onAdminEditCluster={onAdminEditCluster}
            stagger={i} currentWeek={currentWeek}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Send to Editors button ───────────────────────────────────────────────────
// Shown on fully-approved clusters (admin only). Calls /api/notify to send
// an email to the editors list with links to all approved pieces.
function SendToEditorsButton({ cluster, pillar, project }) {
  const [state, setState] = useStateTR("idle"); // idle | sending | sent | error
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
  const monthId = project.active_month || "month-1";

  async function send(e) {
    e.stopPropagation();
    setState("sending");
    try {
      const pieces = cluster.pieces.map(p => ({
        title: p.title,
        format: p.format,
        url: `https://github.com/${REPO}/tree/main/content/${monthId}/${pillar.id}/${cluster.id}/${p.id}`,
      }));
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "editors",
          cluster: cluster.label,
          pillar: pillar.label,
          pieces,
        }),
      });
      setState(res.ok ? "sent" : "error");
      if (res.ok) setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
    }
  }

  const label =
    state === "sending" ? "Sending…" :
    state === "sent"    ? "✓ Sent to editors" :
    state === "error"   ? "Send failed — retry?" :
    "Send to Editors →";

  const col =
    state === "sent"  ? "#1e7a45" :
    state === "error" ? "#b91c1c" :
    "#d1fae5";

  return (
    <button
      onClick={send}
      disabled={state === "sending" || state === "sent"}
      style={{
        ...FONT,
        marginTop: "10px",
        display: "inline-flex", alignItems: "center", gap: "6px",
        fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: col,
        background: "rgba(209,250,229,0.08)",
        border: `1px solid ${state === "sent" ? "#6ee7a0" : state === "error" ? "#fca5a5" : "rgba(110,231,160,0.35)"}`,
        padding: "5px 12px", borderRadius: "3px",
        cursor: state === "sending" || state === "sent" ? "default" : "pointer",
        transition: "all 0.15s",
      }}
    >
      {state === "sending" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      )}
      {label}
    </button>
  );
}

// ─── Cluster card ─────────────────────────────────────────────────────────────
function ClusterCard({ cluster, pillar, project, clusterIndex, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onAdminEditCluster, stagger, currentWeek }) {
  const total = cluster.pieces.length;
  const approved = cluster.pieces.filter(p => p.status === "approved").length;
  const liveInMotion = getWorkflowStages(project).filter(s => s.id !== "not-started" && s.id !== "approved").map(s => s.id);
  const inMotion = cluster.pieces.filter(p => liveInMotion.includes(p.status)).length;
  const ready = approved === total && total > 0;
  const anchor = cluster.pieces.find(p => p.id === cluster.anchor_piece);
  const weekSlot = (project.schedule || []).find(w => w.slots.some(s => s.cluster === cluster.id));
  const overdueCount = 0; // Phase model — no overdue concept
  const dueCount = 0;

  const pal = CLUSTER_PALETTE[clusterIndex % CLUSTER_PALETTE.length];
  const headStyle = ready
    ? { background: "#1b4332", borderBottomColor: "rgba(110,231,160,0.2)" }
    : { background: pal.bg, borderBottomColor: pal.border };
  const titleColor = ready ? "#d1fae5" : pal.text;
  const metaColor  = ready ? "rgba(209,250,229,0.6)" : pal.seqColor + "99";
  const anchorColor = ready ? "rgba(209,250,229,0.45)" : pal.seqColor + "88";

  return (
    <article className={`ns-cluster-card ${ready ? "is-ready" : ""}`} style={{ animationDelay: `${stagger * 60}ms` }}>
      <header className={`ns-cluster-head ${ready ? "is-ready" : ""}`} style={headStyle}>
          <div className="ns-cluster-head-meta">
          <div className="ns-cluster-meta-row">
            <span className="ns-cluster-seq-badge" style={{ color: metaColor }}>C{String(cluster.sequence).padStart(2, "0")}</span>
            <span className="ns-cluster-dot">·</span>
            <span className="ns-cluster-intent-badge" style={{ color: metaColor }}>{cluster.intent === "informational" ? "Informational" : "Commercial"}</span>
            {weekSlot && <span className="ns-cluster-week-badge" style={{ color: metaColor }}>Wk {weekSlot.week}</span>}
            {overdueCount > 0 && !ready && <span style={{ fontFamily:"Noto Sans,sans-serif", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#b91c1c", background:"rgba(185,28,28,0.12)", padding:"2px 7px", borderRadius:"2px", marginLeft:"4px" }}>{overdueCount} overdue</span>}
            {dueCount > 0 && overdueCount === 0 && !ready && <span style={{ fontFamily:"Noto Sans,sans-serif", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#92400e", background:"rgba(217,119,6,0.12)", padding:"2px 7px", borderRadius:"2px", marginLeft:"4px" }}>Due now</span>}
            {ready && <span className="ns-cluster-ready-badge">Publish-ready</span>}
            {adminMode && <button className="ns-admin-edit" onClick={() => onAdminEditCluster(cluster.id)}>Edit →</button>}
          </div>
          <h3 className="ns-cluster-title" style={{ color: titleColor }}>{cluster.label}</h3>
          {anchor && <div className="ns-anchor-cluster" style={{ color: anchorColor }}>Anchor: {anchor.title.split(":")[0].replace(" (Anchor)","")}</div>}
          {/* Send to editors — only shown when cluster is fully approved */}
          {ready && adminMode && (
            <SendToEditorsButton cluster={cluster} pillar={pillar} project={project} />
          )}
        </div>
        <ProgressArc total={total} approved={approved} inMotion={inMotion} ready={ready} palette={pal} />
      </header>
      <ul className="ns-piece-list">
        {cluster.pieces.map((piece, idx) => (
          <PieceRow
            key={piece.id} piece={piece} cluster={cluster} pillar={pillar}
            isAnchor={piece.id === cluster.anchor_piece}
            isLast={idx === cluster.pieces.length - 1}
            project={project} openPiece={openPiece} setOpenPiece={setOpenPiece}
            updatePiece={updatePiece} addFeedback={addFeedback}
            currentUser={currentUser} adminMode={adminMode} onAdminEditPiece={onAdminEditPiece}
            currentWeek={currentWeek}
          />
        ))}
      </ul>
    </article>
  );
}

// ─── Progress arc ─────────────────────────────────────────────────────────────
function ProgressArc({ total, approved, inMotion, ready, palette }) {
  const size = 68, stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const approvedFrac = total > 0 ? approved / total : 0;
  const motionFrac = total > 0 ? (approved + inMotion) / total : 0;
  const ticks = Array.from({ length: total }).map((_, i) => {
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x1: size/2 + Math.cos(angle) * (r-5), y1: size/2 + Math.sin(angle) * (r-5),
      x2: size/2 + Math.cos(angle) * r,     y2: size/2 + Math.sin(angle) * r,
    };
  });

  const numColor   = ready ? "#6ee7a0" : (palette ? palette.text : "#fff");
  const slashColor = ready ? "rgba(209,250,229,0.35)" : (palette ? palette.seqColor + "55" : "rgba(240,237,230,0.35)");
  const totColor   = ready ? "rgba(209,250,229,0.50)" : (palette ? palette.seqColor + "88" : "rgba(240,237,230,0.50)");
  const lblColor   = ready ? "rgba(209,250,229,0.60)" : (palette ? palette.seqColor + "99" : "rgba(240,237,230,0.40)");
  const trackColor = palette && !ready ? palette.border : "rgba(17,24,32,0.10)";

  return (
    <div className={`ns-arc-wrap ${ready ? "is-ready" : ""}`}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {motionFrac > approvedFrac && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(200,64,26,0.30)"
            strokeWidth={stroke} strokeDasharray={`${c*motionFrac} ${c}`}
            transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="butt" />
        )}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3d8c5c"
          strokeWidth={stroke} strokeDasharray={`${c*approvedFrac} ${c}`}
          transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 500ms cubic-bezier(.4,0,.2,1)" }} />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={palette && !ready ? palette.border : "rgba(240,237,230,0.18)"} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="ns-arc-center">
        <div className="ns-arc-frac">
          <span className="ns-arc-num" style={{ color: numColor }}>{approved}</span>
          <span className="ns-arc-slash" style={{ color: slashColor }}>/</span>
          <span className="ns-arc-tot" style={{ color: totColor }}>{total}</span>
        </div>
        <div className="ns-arc-label" style={{ color: lblColor }}>{ready ? "Ready" : "Done"}</div>
      </div>
    </div>
  );
}

// ─── Piece row (card view) ────────────────────────────────────────────────────
function PieceRow({ piece, cluster, pillar, isAnchor, isLast, project, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, currentWeek }) {
  const isOpen = openPiece && openPiece.pieceId === piece.id;
  const feedback = (project.feedback || {})[piece.id] || [];
  const isNS = currentUser.org === "ns";
  const isJG = currentUser.org === "jaggaer";
  const phaseBadge = piece.phase === 2
    ? { label: "P2", color: "#6C3483", bg: "#f5eef8" }
    : { label: "P1", color: "#1F618D", bg: "#eaf2f8" };

  const nsMembers = project.team.ns.map(m => ({ value: m.id, label: m.name }));

  const stages = getWorkflowStages(project);
  const stageMeta = buildStatusMeta(stages.some(s => s.id === "ad-hoc-review") ? stages : [...stages, getAdHocReviewStage(project)]);
  const stageOrder = stages.map(s => s.id);
  const currentStageIdx = stageOrder.indexOf(piece.status);
  const isAdHocReviewStage = piece.status === "ad-hoc-review";
  const currentStage = isAdHocReviewStage ? getAdHocReviewStage(project) : stages.find(s => s.id === piece.status);
  const nextStage = isAdHocReviewStage ? null : (stages[currentStageIdx + 1] || null);

  function actorMatches(actor) {
    if (!actor) return false;
    const actors = Array.isArray(actor) ? actor : [actor];
    return actors.some(a => {
      if (a === "ns") return isNS;
      if (a === "jaggaer") return isJG;
      if (a.startsWith("person:")) return currentUser.id === a.slice(7);
      return false;
    });
  }

  function hasActorType(actor, type) {
    if (!actor) return false;
    const actors = Array.isArray(actor) ? actor : [actor];
    return actors.includes(type);
  }

  function primaryAction() {
    if (!currentStage || piece.status === "approved") return null;
    const actor = currentStage.actor;
    if (!actorMatches(actor)) return null;
    // Label logic
    if (piece.status === "not-started") return { label: "Upload Brief", mode: "brief" };
    if (hasActorType(actor, "ns") || isNS) {
      const displayNext = (isAdHoc(piece) && piece.status === "writing") ? getAdHocReviewStage(project) : nextStage;
      return { label: displayNext ? `Submit → ${displayNext.label}` : "Submit", mode: "upload" };
    }
    // Named person or Jaggaer reviewer
    return { label: "Review", mode: "review" };
  }
  const action = primaryAction();

  // "Awaits" highlight: piece is waiting on Jaggaer org (any stage where actor includes jaggaer, excluding not-started)
  const awaitsJaggaer = isJG && currentStage && hasActorType(currentStage.actor, "jaggaer") && piece.status !== "not-started";
  // Observer: Indy/Anna can always open and view, even when it's Ed's or NS's turn
  const isObserver = isJG && !actorMatches(currentStage?.actor);

  return (
    <li className={`ns-piece-row ${isLast ? "is-last" : ""} ${isAnchor ? "is-anchor" : ""} ${awaitsJaggaer && isJG ? "awaits" : ""} ${isOpen ? "is-open" : ""}`}
      style={{}}>
      <div className="ns-piece-main" onClick={() => setOpenPiece(isOpen ? null : { clusterId: cluster.id, pieceId: piece.id, mode: action?.mode || "history" })}>
        <div className="ns-piece-l">
          {adminMode ? (
            <InlineCell
              value={piece.status}
              type="select"
              options={stageOrder.map(s => ({ value: s, label: stageMeta[s]?.label || s }))}
              onSave={val => updatePiece(cluster.id, piece.id, { status: val })}
            >
              <StatusChip status={piece.status} stageMeta={stageMeta} />
            </InlineCell>
          ) : (
            <StatusChip status={piece.status} stageMeta={stageMeta} />
          )}
          <div className="ns-piece-text">
            <div className="ns-piece-title-row">
              {isAnchor && <span className="ns-anchor-mark" title="Anchor piece">◆</span>}
              {adminMode ? (
                <InlineCell
                  value={piece.title}
                  type="text"
                  onSave={val => updatePiece(cluster.id, piece.id, { title: val })}
                  className="ns-inline-title"
                >
                  <h4 className="ns-piece-title">{piece.title}</h4>
                </InlineCell>
              ) : (
                <h4 className="ns-piece-title">{piece.title}</h4>
              )}
            </div>
            <div className="ns-piece-meta">
              {adminMode ? (
                <InlineCell
                  value={piece.format}
                  type="text"
                  onSave={val => updatePiece(cluster.id, piece.id, { format: val })}
                  className="ns-inline-meta"
                >{piece.format}</InlineCell>
              ) : (
                <span>{piece.format}</span>
              )}
              <span className="ns-meta-sep">·</span>
              {adminMode ? (
                <InlineCell
                  value={piece.assignee}
                  type="select"
                  options={[{ value: "", label: "— unassigned —" }, ...nsMembers]}
                  onSave={val => updatePiece(cluster.id, piece.id, { assignee: val })}
                  className="ns-inline-meta"
                >{assigneeName(project, piece.assignee)}</InlineCell>
              ) : (
                <span>{assigneeName(project, piece.assignee)}</span>
              )}
              {piece.geography && piece.geography !== "all" && <><span className="ns-meta-sep">·</span><span className="ns-piece-geo">{piece.geography.toUpperCase()}</span></>}
              {(piece.revision_count > 0 || feedback.length > 0) && (
                <><span className="ns-meta-sep">·</span><span className="ns-piece-meta-hint">{[piece.revision_count > 0 && `rev ${piece.revision_count}`, feedback.length > 0 && `${feedback.length}✎`].filter(Boolean).join(" ")}</span></>
              )}
              <><span className="ns-meta-sep">·</span><span style={{ fontFamily:"Noto Sans,sans-serif", fontSize:"0.6rem", fontWeight:700, color: phaseBadge.color, background: phaseBadge.bg, padding:"1px 5px", borderRadius:"2px", border:`1px solid ${phaseBadge.color}44` }}>{phaseBadge.label}</span></>
            </div>
          </div>
        </div>
        <div className="ns-piece-r">
          {action ? (
            <button className={`ns-piece-btn ${action.mode === "feedback" ? "is-primary" : ""}`}
              onClick={e => { e.stopPropagation(); setOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: action.mode }); }}>
              {action.label} →
            </button>
          ) : (
            <span className="ns-piece-state-glyph">{isOpen ? "−" : "+"}</span>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── HTML Preview Panel ───────────────────────────────────────────────────────
// Injects a line-number gutter into the iframe so reviewers can cite "¶12" etc.
function injectLineNumbers(html) {
  // We inject a small script + style into the fetched HTML that:
  // 1. Numbers every block element (h1-h6, p, li, blockquote, td) with a left margin gutter
  // 2. Highlights the element on hover
  // 3. Posts a message to parent when clicked so the section field can be auto-populated
  const injected = `
<style id="__ns_lnum">
  body { padding-left: 52px !important; box-sizing: border-box; }
  .__ns_lnum_wrap { position:relative; cursor:pointer; }
  .__ns_lnum_gutter {
    position:absolute; left:-50px; top:2px; width:42px;
    font-family:monospace; font-size:10px; color:#c0bbb5;
    text-align:right; line-height:inherit;
    user-select:none; cursor:pointer;
    transition:color 0.1s;
    white-space:nowrap;
  }
  .__ns_lnum_wrap:hover { background:rgba(200,64,26,0.04); }
  .__ns_lnum_wrap:hover .__ns_lnum_gutter { color:#c8401a; }
  .__ns_lnum_wrap.is-highlighted { background:#fff8f0 !important; outline:2px solid #c8401a; outline-offset:2px; border-radius:2px; }
  .__ns_pin {
    position:absolute; top:-8px; left:-50px;
    min-width:18px; height:18px; padding:0 4px; box-sizing:border-box;
    background:#c8401a; color:#fff; border-radius:9px;
    font-family:'Noto Sans',system-ui,sans-serif; font-size:10px; font-weight:700;
    line-height:18px; text-align:center; cursor:pointer; user-select:none;
    box-shadow:0 1px 4px rgba(0,0,0,0.25); z-index:5;
  }
  .__ns_pin:hover { background:#a33315; }
</style>
<script id="__ns_lnum_script">
(function(){
  var tags = ['p','h1','h2','h3','h4','h5','h6','li','blockquote','td','figcaption'];
  var n = 0;
  var byLine = {};
  function anchor(wrap, el, num){
    document.querySelectorAll('.__ns_lnum_wrap.is-highlighted').forEach(function(w){ w.classList.remove('is-highlighted'); });
    wrap.classList.add('is-highlighted');
    var excerpt = el.textContent.slice(0, 60).trim();
    window.parent.postMessage({ type:'__ns_line_click', lineNum: num, excerpt: excerpt }, '*');
    setTimeout(function(){ wrap.classList.remove('is-highlighted'); }, 2500);
  }
  tags.forEach(function(tag){
    document.querySelectorAll(tag).forEach(function(el){
      if(el.closest('.__ns_lnum_wrap')) return;
      n++;
      var num = n;
      var wrap = document.createElement('div');
      wrap.className = '__ns_lnum_wrap';
      wrap.style.position = 'relative';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      byLine[num] = wrap;
      var gutter = document.createElement('span');
      gutter.className = '__ns_lnum_gutter';
      gutter.textContent = '\u00B6' + num;
      gutter.dataset.ln = num;
      wrap.insertBefore(gutter, el);
      // Click the number OR anywhere on the block to anchor a comment
      // (but don't hijack text selection).
      wrap.addEventListener('click', function(ev){
        if (ev.target.classList && ev.target.classList.contains('__ns_pin')) return;
        var sel = window.getSelection && window.getSelection().toString();
        if (sel && sel.length > 0) return;
        anchor(wrap, el, num);
      });
    });
  });
  // Render visible comment pins from the parent.
  function setPins(pins){
    document.querySelectorAll('.__ns_pin').forEach(function(p){ p.remove(); });
    (pins||[]).forEach(function(p){
      var wrap = byLine[p.lineNum];
      if(!wrap) return;
      var pin = document.createElement('span');
      pin.className = '__ns_pin';
      pin.textContent = p.count > 1 ? p.count : '\uD83D\uDCAC';
      pin.title = p.count + ' comment' + (p.count>1?'s':'') + ' here';
      pin.addEventListener('click', function(e){
        e.stopPropagation();
        window.parent.postMessage({ type:'__ns_pin_click', lineNum: p.lineNum }, '*');
        document.querySelectorAll('.__ns_lnum_wrap.is-highlighted').forEach(function(w){ w.classList.remove('is-highlighted'); });
        wrap.classList.add('is-highlighted');
        setTimeout(function(){ wrap.classList.remove('is-highlighted'); }, 2500);
      });
      wrap.appendChild(pin);
    });
  }
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === '__ns_set_pins') { setPins(e.data.pins); return; }
    if (e.data.type === '__ns_scroll_to') {
      var target = byLine[e.data.lineNum];
      if (!target) return;
      document.querySelectorAll('.__ns_lnum_wrap.is-highlighted').forEach(function(x){ x.classList.remove('is-highlighted'); });
      target.classList.add('is-highlighted');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function(){ target.classList.remove('is-highlighted'); }, 2500);
    }
  });
  // Tell the parent we're ready so it can push existing pins.
  window.parent.postMessage({ type:'__ns_ready' }, '*');
})();
</script>`;
  // Inject before </body> or at end
  if (html.includes("</body>")) return html.replace("</body>", injected + "</body>");
  return html + injected;
}

// Measures a box so we can scale an oversized iframe down to fit it.
function useBoxSize() {
  const ref = useRefTR(null);
  const [size, setSize] = useStateTR({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    let ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(update); ro.observe(el); }
    else window.addEventListener("resize", update);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", update); };
  }, []);
  return [ref, size];
}

// Renders the deliverable iframe at a desktop logical width and scales it down to
// fit the (narrower) viewer pane. Without this, the content's own responsive CSS
// collapses multi-column layouts and hides sidebars (e.g. @media max-width:900px).
// PDFs are passed through unscaled — they reflow on their own.
const DELIVERABLE_DESIGN_WIDTH = 1180;
function ScaledFrame({ src, title, pdf, iframeRef, onLoad }) {
  const [boxRef, size] = useBoxSize();
  const scale = (pdf || !size.w || size.w >= DELIVERABLE_DESIGN_WIDTH) ? 1 : size.w / DELIVERABLE_DESIGN_WIDTH;
  const frameStyle = scale === 1
    ? { width: "100%", height: "100%" }
    : {
        width: `${Math.round(size.w / scale)}px`,
        height: `${Math.round((size.h || 600) / scale)}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      };
  return (
    <div ref={boxRef} style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#fff" }}>
      <iframe
        ref={iframeRef}
        src={src}
        {...(!pdf && { sandbox: "allow-same-origin allow-scripts" })}
        title={title}
        onLoad={onLoad}
        style={{ border: "none", display: "block", ...frameStyle }}
      />
    </div>
  );
}

// Decodes a fetched GitHub file (base64) into a Blob URL appropriate to its type.
// Returns { url, kind } where kind is "html" | "pdf" | "other".
function deliverableBlobFromGithub(data, piece) {
  const b64 = data.content.replace(/\n/g, "");
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (isPdfDeliverable(piece)) {
    return { url: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), kind: "pdf" };
  }
  if (isTextDeliverable(piece)) {
    const html = injectLineNumbers(new TextDecoder("utf-8").decode(bytes));
    return { url: URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })), kind: "html" };
  }
  // docx/xlsx/etc — not inline-previewable in the browser
  return { url: URL.createObjectURL(new Blob([bytes])), kind: "other" };
}

function PreviewPanel({ piece, cluster, pillar, project }) {
  const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
  const monthId = project.active_month || "month-1";
  const rev = piece.revision_count || 1;
  const isWP = isWhitePaper(piece) && piece.wp_has_html;

  // activeSlot: "pdf" | "html" — only relevant for whitepapers with both files
  const [activeSlot, setActiveSlot] = useStateTR("pdf");
  const [srcdoc, setSrcdoc] = useStateTR(null);
  const [kind, setKind] = useStateTR("html");
  const [loading, setLoading] = useStateTR(true);
  const [error, setError] = useStateTR(null);

  // For WP pieces, build path dynamically from active slot; else use primary deliverable
  function githubPathFor(slot) {
    if (isWP) return `content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/deliverable-v${rev}.${slot}`;
    return `content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/${deliverableFileName(piece)}`;
  }
  const githubPath = isWP ? githubPathFor(activeSlot) : githubPathFor("primary");
  const githubTreeUrl = `https://github.com/${REPO}/tree/main/content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}`;

  // Synthetic piece-like object for deliverableBlobFromGithub when in HTML slot
  const pieceLike = isWP && activeSlot === "html"
    ? { ...piece, deliverable_ext: "html" }
    : piece;

  React.useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setLoading(true); setError(null); setSrcdoc(null);
    fetch(`/api/github?path=${encodeURIComponent(githubPath)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        const { url, kind: k } = deliverableBlobFromGithub(data, pieceLike);
        objectUrl = url;
        setKind(k);
        setSrcdoc(objectUrl);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [githubPath]);

  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const activeExt = isWP ? activeSlot : deliverableExt(piece);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 20px",
        background: "#f0f7ff", borderBottom: "1px solid #c5ddef",
        flexShrink: 0,
      }}>
        {/* WP toggle */}
        {isWP && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            {["pdf", "html"].map(slot => (
              <button key={slot} onClick={() => setActiveSlot(slot)} style={{
                ...FONT, fontSize: "0.68rem", fontWeight: 700, padding: "4px 10px", borderRadius: "3px",
                border: "1px solid #c5ddef", cursor: "pointer", textTransform: "uppercase",
                background: activeSlot === slot ? "#1a3a52" : "#fff",
                color: activeSlot === slot ? "#fff" : "#6b8fa8",
                transition: "all 0.12s",
              }}>{slot}</button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 600, color: "#1a3a52" }}>
            {isWP ? `deliverable-v${rev}.${activeSlot}` : deliverableFileName(piece)}
          </span>
          {piece.last_upload && (
            <span style={{ ...FONT, fontSize: "0.68rem", color: "#6b8fa8", marginLeft: "10px" }}>
              · {new Date(piece.last_upload).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
          {piece.last_upload_by && (() => {
            const all = [...(project.team.ns || []), ...(project.team.jaggaer || [])];
            const member = all.find(x => x.id === piece.last_upload_by);
            const name = member ? member.name.split(" ")[0] : piece.last_upload_by;
            return <span style={{ ...FONT, fontSize: "0.68rem", color: "#6b8fa8", marginLeft: "6px" }}>· uploaded by {name}</span>;
          })()}
        </div>
        <button
          onClick={() => {
            if (srcdoc) {
              fetch(srcdoc).then(r => r.blob()).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const safeTitle = (piece.title || piece.id).replace(/[^a-z0-9 _-]/gi, " ").trim().replace(/\s+/g, "-").slice(0, 60);
                a.href = url; a.download = `${safeTitle}-v${rev}.${activeExt}`;
                a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
              });
            }
          }}
          style={{
            ...FONT, fontSize: "0.7rem", fontWeight: 600,
            color: "#1e6fa8", background: "#fff",
            border: "1px solid #c5ddef", padding: "5px 12px", borderRadius: "3px", cursor: "pointer",
          }}>↓ Download {activeExt.toUpperCase()}</button>
        <a href={githubTreeUrl}
          target="_blank" rel="noopener noreferrer"
          style={{
            ...FONT, fontSize: "0.7rem", fontWeight: 500,
            color: "#6b8fa8", border: "1px solid #c5ddef", padding: "5px 12px",
            borderRadius: "3px", textDecoration: "none",
          }}>GitHub →</a>
      </div>

      {/* iframe area */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#fff" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#faf8f4",
          }}>
            <div style={{ ...FONT, fontSize: "0.82rem", color: "#888" }}>Loading preview…</div>
          </div>
        )}
        {error && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "12px",
            background: "#faf8f4",
          }}>
            <div style={{ ...FONT, fontSize: "0.82rem", color: "#b91c1c" }}>Could not load preview</div>
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#888" }}>{error} — file may not be uploaded yet</div>
          </div>
        )}
        {srcdoc && kind === "other" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "10px", background: "#faf8f4",
          }}>
            <div style={{ ...FONT, fontSize: "0.82rem", color: "#555" }}>Inline preview isn't available for .{activeExt} files.</div>
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#888" }}>Use the Download button above to open it.</div>
          </div>
        )}
        {srcdoc && kind !== "other" && (
          <ScaledFrame
            src={srcdoc}
            pdf={kind === "pdf"}
            title={`Preview: ${piece.title}`}
            onLoad={e => { try { e.target.contentWindow.scrollTo(0, 0); } catch(_) {} }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function PieceDrawer({ piece, cluster, pillar, project, mode, setMode, updatePiece, addFeedback, deletePiece, currentUser, adminMode, onAdminEditPiece, onClose }) {
  const feedback = (project.feedback || {})[piece.id] || [];
  const isNS = currentUser.org === "ns";
  const isJG = currentUser.org === "jaggaer";

  const stages = getWorkflowStages(project);
  const stageMeta = buildStatusMeta(stages.some(s => s.id === "ad-hoc-review") ? stages : [...stages, getAdHocReviewStage(project)]);
  const stageOrder = stages.map(s => s.id);
  const currentStageIdx = stageOrder.indexOf(piece.status);
  const isAdHocReviewStage = piece.status === "ad-hoc-review";
  const currentStage = isAdHocReviewStage ? getAdHocReviewStage(project) : stages.find(s => s.id === piece.status);
  const nextStage = isAdHocReviewStage ? null : (stages[currentStageIdx + 1] || null);
  // For ad-hoc pieces still writing, the real next stage is Ad-Hoc Review, not the standard chain's marketing-review.
  const displayNextStage = (isAdHoc(piece) && piece.status === "writing") ? getAdHocReviewStage(project) : nextStage;

  function actorMatches(actor) {
    if (!actor) return false;
    const actors = Array.isArray(actor) ? actor : [actor];
    return actors.some(a => {
      if (a === "ns") return isNS;
      if (a === "jaggaer") return isJG;
      if (a.startsWith("person:")) return currentUser.id === a.slice(7);
      return false;
    });
  }

  function hasActorType(actor, type) {
    if (!actor) return false;
    const actors = Array.isArray(actor) ? actor : [actor];
    return actors.includes(type);
  }

  const isCurrentActor = currentStage && actorMatches(currentStage.actor);
  const canBrief = isCurrentActor && piece.status === "not-started"; // Jaggaer uploads brief
  // NS (or admin) can upload/reupload at any non-terminal stage, regardless of whose actor turn it is
  const canUpload = (isNS || adminMode) && piece.status !== "not-started" && piece.status !== "approved";
  const canReview = isCurrentActor && !isNS && piece.status !== "not-started" && piece.status !== "approved";
  // canReplace is now redundant (canUpload covers it), kept as false to avoid stale tab
  const canReplace = false;
  // Ad-Hoc pieces in ad-hoc-review have an uploaded deliverable by definition (writing → ad-hoc-review only
  // happens after upload), so hasDeliverable can't use stageOrder.indexOf (which returns -1 for this stage).
  const hasDeliverable = isAdHocReviewStage || currentStageIdx > stageOrder.indexOf("brief-uploaded");

  return (
    <div className={`ns-piece-drawer${mode === "preview" || mode === "annotate" ? " is-preview" : ""}`}>
      <div className="ns-drawer-tabs">
        {canBrief && <button className={`ns-drawer-tab is-primary-tab ${mode==="brief"?"is-active":""}`} onClick={() => setMode("brief")}>Upload Brief</button>}
        {canUpload && <button className={`ns-drawer-tab is-primary-tab ${mode==="upload"?"is-active":""}`} onClick={() => setMode("upload")}>{displayNextStage ? `Submit → ${displayNextStage.label}` : "Submit"}</button>}
        {canReplace && <button className={`ns-drawer-tab ${mode==="replace"?"is-active":""}`} onClick={() => setMode("replace")} title="Replace your draft before it enters review">↩ Replace Draft</button>}
        {canReview && <button className={`ns-drawer-tab is-primary-tab ${mode==="review"?"is-active":""}`} onClick={() => setMode("review")}>Review</button>}
        {hasDeliverable && <button className={`ns-drawer-tab ${mode==="annotate"?"is-active":""}`} onClick={() => setMode("annotate")}>Preview & Comment</button>}
        <button className={`ns-drawer-tab ${mode==="history"?"is-active":""}`} onClick={() => setMode("history")}>
          Notes {feedback.length > 0 && <span className="ns-tab-count">{feedback.length}</span>}
        </button>
        <button className={`ns-drawer-tab ${mode==="details"?"is-active":""}`} onClick={() => setMode("details")}>Details</button>
        {adminMode && <button className={`ns-drawer-tab ${mode==="edit"?"is-active":""}`} onClick={() => setMode("edit")}>Edit</button>}
        {adminMode && <button className={`ns-drawer-tab ns-drawer-tab-delete ${mode==="delete"?"is-active":""}`} onClick={() => setMode("delete")}>Delete</button>}
        <button className="ns-drawer-close" onClick={onClose}>Close ✕</button>
      </div>
      <div className="ns-drawer-body" style={(mode === "preview" || mode === "annotate") ? { padding: 0, overflow: "hidden" } : {}}>
        {mode === "brief" && canBrief && <BriefUploadPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} stages={stages} />}
        {mode === "upload" && canUpload && (isWhitePaper(piece)
          ? <WhitepaperUploadPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} stages={stages} />
          : <UploadPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} stages={stages} />)}
        {mode === "replace" && canReplace && <ReplaceDraftPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} stages={stages} onDone={() => setMode("details")} />}
        {mode === "review" && canReview && <ReviewPanel piece={piece} cluster={cluster} project={project} currentUser={currentUser} updatePiece={updatePiece} addFeedback={addFeedback} stages={stages} stageMeta={stageMeta} onDone={() => setMode("history")} />}
        {mode === "preview" && hasDeliverable && <PreviewPanel piece={piece} cluster={cluster} pillar={pillar} project={project} />}
        {mode === "annotate" && hasDeliverable && <AnnotatePanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} addFeedback={addFeedback} updatePiece={updatePiece} onDone={() => setMode("history")} />}
        {mode === "history" && <NotesHistory piece={piece} project={project} />}
        {mode === "details" && <PieceDetails piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} adminMode={adminMode} updatePiece={updatePiece} />}
        {mode === "edit" && adminMode && <EditPiecePanel piece={piece} cluster={cluster} project={project} updatePiece={updatePiece} onDone={() => setMode("details")} />}
        {mode === "delete" && adminMode && <DeletePiecePanel piece={piece} cluster={cluster} deletePiece={deletePiece} onClose={onClose} />}
      </div>
    </div>
  );
}

// ─── Edit panel (drawer) ──────────────────────────────────────────────────────
function EditPiecePanel({ piece, cluster, project, updatePiece, onDone }) {
  const { useState: useStateEP } = React;
  const allMembers = [...project.team.ns, ...project.team.jaggaer];
  const [form, setForm] = useStateEP({
    title:             piece.title || "",
    format:            piece.format || "",
    primary_keyword:   piece.primary_keyword || "",
    secondary_keyword: piece.secondary_keyword || "",
    status:            piece.status || "not-started",
    assignee:          piece.assignee || "",
    geography:         piece.geography || "all",
  });
  const [saved, setSaved] = useStateEP(false);

  function field(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function save() {
    updatePiece(cluster.id, piece.id, form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onDone(); }, 900);
  }

  return (
    <div className="ns-edit-panel">
      <div className="ns-edit-eyebrow">EDIT PIECE</div>
      <div className="ns-edit-grid">
        <label className="ns-edit-label">Title
          <input className="ns-edit-input ns-edit-input-wide" value={form.title} onChange={field("title")} />
        </label>
        <label className="ns-edit-label">Content Type
          <input className="ns-edit-input" value={form.format} onChange={field("format")} />
        </label>
        <label className="ns-edit-label">Primary Keyword
          <input className="ns-edit-input" value={form.primary_keyword} onChange={field("primary_keyword")} />
        </label>
        <label className="ns-edit-label">Secondary Keyword
          <input className="ns-edit-input" value={form.secondary_keyword} onChange={field("secondary_keyword")} />
        </label>
        <label className="ns-edit-label">Status
          <select className="ns-edit-input ns-edit-select" value={form.status} onChange={field("status")}>
            {getWorkflowStages(project).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="ns-edit-label">Assignee
          <select className="ns-edit-input ns-edit-select" value={form.assignee} onChange={field("assignee")}>
            <option value="">— unassigned —</option>
            {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="ns-edit-label">Geography
          <input className="ns-edit-input" value={form.geography} onChange={field("geography")} />
        </label>
      </div>
      <div className="ns-edit-actions">
        <button className="ns-edit-save" onClick={save} disabled={saved}>
          {saved ? "Saved ✓" : "Save Changes"}
        </button>
        <button className="ns-edit-cancel" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeletePiecePanel({ piece, cluster, deletePiece, onClose }) {
  const { useState: useStateDP } = React;
  const isApproved = piece.status === "approved";
  const [confirmed, setConfirmed] = useStateDP(false);

  if (isApproved) {
    return (
      <div className="ns-delete-panel">
        <div className="ns-delete-warning">
          <div className="ns-delete-icon">⚠</div>
          <div className="ns-delete-title">Cannot delete an approved piece</div>
          <p className="ns-delete-body">This piece has been approved. Deleting it would break the cluster's publish-readiness record. To remove it, first revert the status in Edit, then delete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ns-delete-panel">
      {!confirmed ? (
        <div className="ns-delete-warning">
          <div className="ns-delete-icon">✕</div>
          <div className="ns-delete-title">Delete this piece?</div>
          <p className="ns-delete-body ns-delete-piece-name">"{piece.title}"</p>
          <p className="ns-delete-body">This removes the piece from <strong>{cluster.label}</strong> and clears all its feedback notes. This cannot be undone.</p>
          <div className="ns-delete-actions">
            <button className="ns-delete-confirm-btn" onClick={() => setConfirmed(true)}>Yes, delete permanently</button>
            <button className="ns-delete-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="ns-delete-warning">
          <div className="ns-delete-icon ns-delete-icon-gone">✓</div>
          <div className="ns-delete-title">Deleting…</div>
          {(() => { deletePiece(cluster.id, piece.id); setTimeout(onClose, 600); return null; })()}
        </div>
      )}
    </div>
  );
}

// ─── Replace Draft Panel — NS replaces their own draft BEFORE it enters review ─
// Does NOT advance status. Overwrites the same version file in GitHub.
function ReplaceDraftPanel({ piece, cluster, pillar, project, currentUser, updatePiece, stages, onDone }) {
  const [dragging, setDragging] = useStateTR(false);
  const [stage, setStage] = useStateTR("idle");
  const [filename, setFilename] = useStateTR(null);
  const [bytes, setBytes] = useStateTR(0);
  const [progress, setProgress] = useStateTR(0);
  const [errorMsg, setErrorMsg] = useStateTR(null);
  const inputRef = useRefTR(null);
  const rev = piece.revision_count || 1;
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function handleFile(file) {
    setStage("uploading"); setFilename(file.name); setBytes(file.size);
    const payload = await readDeliverableFile(file);
    for (let i = 0; i <= 100; i += 6) { setProgress(i); await new Promise(r => setTimeout(r, 28)); }
    const result = await window.NS_API.replaceDeliverable(piece, cluster.id, pillar.id, project.active_month, payload, currentUser.id);
    if (!result.ok) {
      setStage("error");
      setErrorMsg(result.error || "GitHub commit failed — check console");
      return;
    }
    updatePiece(cluster.id, piece.id, {
      deliverable_ext: payload.ext,
      last_upload: new Date().toISOString(),
      last_upload_by: currentUser.id,
      last_updated: new Date().toISOString(),
      last_updated_by: currentUser.id,
    });
    setStage("done");
  }

  return (
    <div className="ns-upload">
      <div className="ns-upload-l">
        <div style={{ ...FONT, fontSize: "0.7rem", background: "#fff8e6", border: "1px solid #f0d070", color: "#7a5800", padding: "8px 14px", borderRadius: "3px", marginBottom: "12px" }}>
          This replaces your current draft <strong>without</strong> advancing the workflow. Status stays at <strong>{STATUS_META[piece.status]?.label || piece.status}</strong>.
        </div>
        <div className={`ns-dropzone ${dragging?"is-dragging":""} ${stage!=="idle"?"is-busy":""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
          onClick={() => stage === "idle" && inputRef.current?.click()}>
          {stage === "idle" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Drop replacement file here</div>
            <div className="ns-drop-sub">or click to choose · .html, .pdf, .docx, .md</div>
            <div className="ns-drop-path">→ <code>…/{piece.id}/{deliverableFileName(piece)}</code> (overwrites)</div>
          </>)}
          {stage === "uploading" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Replacing {filename}…</div>
            <div className="ns-drop-progress"><div className="ns-drop-progress-fill" style={{width:`${progress}%`}}></div></div>
            <div className="ns-drop-sub">{Math.round(bytes/1024)} KB · committing to GitHub</div>
          </>)}
          {stage === "done" && (<>
            <div className="ns-drop-rule is-done"></div>
            <div className="ns-drop-title">Replaced ✓</div>
            <div className="ns-drop-sub">{filename} · {deliverableFileName(piece)} updated</div>
            <div className="ns-drop-path">Status unchanged · <button onClick={onDone} style={{...FONT,background:"none",border:"none",color:"#c8401a",fontWeight:600,cursor:"pointer",fontSize:"0.78rem",padding:0}}>Close drawer →</button></div>
          </>)}
          {stage === "error" && (<>
            <div className="ns-drop-rule" style={{background:"#c8401a"}}></div>
            <div className="ns-drop-title" style={{color:"#c8401a"}}>Upload failed ✕</div>
            <div className="ns-drop-sub" style={{color:"#c8401a"}}>{errorMsg}</div>
            <div className="ns-drop-path"><button onClick={() => { setStage("idle"); setErrorMsg(null); }} style={{...FONT,background:"none",border:"none",color:"#c8401a",cursor:"pointer",fontFamily:"Noto Sans,sans-serif",fontSize:"0.78rem",fontWeight:600,padding:0}}>Try again →</button></div>
          </>)}
          <input ref={inputRef} type="file" accept=".html,.htm,.md,.markdown,.txt,.pdf,.docx,.doc,.xlsx,.xls" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>
      <div className="ns-upload-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>When to use this</div>
        <ul className="ns-upload-rules">
          <li>Caught an error in your draft before anyone reviewed it.</li>
          <li>Brief changed and you need to update before submitting.</li>
          <li>Same revision number — no version history entry created.</li>
          <li>To formally submit to the next reviewer, use the <strong>Submit</strong> tab.</li>
        </ul>
      </div>
    </div>
  );
}


function UploadPanel({ piece, cluster, pillar, project, currentUser, updatePiece, stages }) {
  const [dragging, setDragging] = useStateTR(false);
  const [stage, setStage] = useStateTR("idle");
  const [filename, setFilename] = useStateTR(null);
  const [bytes, setBytes] = useStateTR(0);
  const [progress, setProgress] = useStateTR(0);
  const [errorMsg, setErrorMsg] = useStateTR(null);
  const inputRef = useRefTR(null);
  const workflowStages = stages || getWorkflowStages(project);
  const stageOrder = workflowStages.map(s => s.id);
  const currentIdx = stageOrder.indexOf(piece.status);
  const nextStage = workflowStages[currentIdx + 1] || null;
  const nextRev = (piece.revision_count || 0) + 1;
  // Ad-Hoc Articles skip the standard chain: writing → ad-hoc-review directly.
  const adHocNext = isAdHoc(piece) && piece.status === "writing" ? getAdHocReviewStage(project) : null;

  async function handleFile(file) {
    setStage("uploading"); setFilename(file.name); setBytes(file.size);
    const payload = await readDeliverableFile(file);
    for (let i = 0; i <= 100; i += 6) { setProgress(i); await new Promise(r => setTimeout(r, 28)); }
    const result = await window.NS_API.uploadPieceDeliverable(piece, cluster.id, pillar.id, project.active_month, payload, currentUser.id);
    if (!result.ok) {
      setStage("error");
      setErrorMsg(result.error || "GitHub commit failed — check console");
      return;
    }
    // If a reviewer sent this back and stored return_to_stage, jump straight back
    // to them instead of climbing the full chain from the next stage.
    // Ad-Hoc Articles run a separate short chain: writing → ad-hoc-review → approved,
    // bypassing the standard marketing-review/ed-review/editors gates entirely.
    const newStatus = piece.return_to_stage
      ? piece.return_to_stage
      : (adHocNext ? adHocNext.id : (nextStage ? nextStage.id : piece.status));
    updatePiece(cluster.id, piece.id, {
      status: newStatus,
      revision_count: nextRev,
      deliverable_ext: payload.ext,
      return_to_stage: null, // consumed — clear it
      last_upload: new Date().toISOString(),
      last_upload_by: currentUser.id,
      last_updated: new Date().toISOString(),
      last_updated_by: currentUser.id,
      status_history: appendStatusHistory(piece, newStatus, currentUser.id),
    });
    setStage("done");
  }

  return (
    <div className="ns-upload">
      <div className="ns-upload-l">
        <div className={`ns-dropzone ${dragging?"is-dragging":""} ${stage!=="idle"?"is-busy":""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
          onClick={() => stage === "idle" && inputRef.current?.click()}>
          {stage === "idle" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Drop deliverable here</div>
            <div className="ns-drop-sub">or click to choose · .html, .pdf, .docx, .md</div>
            <div className="ns-drop-path">→ <code>content/{project.active_month}/{pillar.id}/{cluster.id}/{piece.id}/deliverable-v{nextRev}.&lt;ext&gt;</code></div>
          </>)}
          {stage === "uploading" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Uploading {filename}…</div>
            <div className="ns-drop-progress"><div className="ns-drop-progress-fill" style={{width:`${progress}%`}}></div></div>
            <div className="ns-drop-sub">{Math.round(bytes/1024)} KB · committing to GitHub</div>
          </>)}
          {stage === "done" && (<>
            <div className="ns-drop-rule is-done"></div>
            <div className="ns-drop-title">Committed ✓</div>
            <div className="ns-drop-sub">{filename} · deliverable-v{nextRev}.{filename ? filename.split('.').pop().toLowerCase() : "html"}</div>
            <div className="ns-drop-path">Status → <strong>{piece.return_to_stage ? (workflowStages.find(s => s.id === piece.return_to_stage)?.label || piece.return_to_stage) : ((adHocNext || nextStage)?.label || "submitted")}</strong>{!piece.return_to_stage && (adHocNext || nextStage) ? ` · ${(adHocNext || nextStage).actor === "ns" ? "NS" : (typeof (adHocNext || nextStage).actor === "string" && (adHocNext || nextStage).actor.startsWith("person:")) ? (adHocNext || nextStage).actor.slice(7) : "Jaggaer"} is cued.` : (piece.return_to_stage ? " · returning to reviewer." : "")}</div>
          </>)}
          {stage === "error" && (<>
            <div className="ns-drop-rule" style={{background:"#c8401a"}}></div>
            <div className="ns-drop-title" style={{color:"#c8401a"}}>Upload failed ✕</div>
            <div className="ns-drop-sub" style={{color:"#c8401a"}}>{errorMsg}</div>
            <div className="ns-drop-path"><button onClick={() => { setStage("idle"); setErrorMsg(null); }} style={{background:"none",border:"none",color:"#c8401a",cursor:"pointer",fontFamily:"Noto Sans,sans-serif",fontSize:"0.78rem",fontWeight:600,padding:0}}>Try again →</button></div>
          </>)}
          <input ref={inputRef} type="file" accept=".html,.htm,.md,.markdown,.txt,.pdf,.docx,.doc,.xlsx,.xls" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>
      <div className="ns-upload-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>What happens next</div>
        <ul className="ns-upload-rules">
          <li>One file per upload. Re-uploads create a new versioned file.</li>
          <li>Versions are preserved — nothing is overwritten.</li>
          {(piece.return_to_stage || nextStage) && (
            <li>Status moves to <strong>{piece.return_to_stage ? (workflowStages.find(s => s.id === piece.return_to_stage)?.label || piece.return_to_stage) : nextStage.label}</strong>{piece.return_to_stage ? " — returning directly to the reviewer who sent this back." : "."}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
// ─── WhitepaperUploadPanel — dual PDF + HTML upload for whitepapers/eBooks ───
// Shows two independent drop zones. Each file can be uploaded independently.
// Submit becomes active once at least the PDF is attached (HTML optional but encouraged).
// Both use the same revision number; the piece advances to next stage on submit.
function WhitepaperUploadPanel({ piece, cluster, pillar, project, currentUser, updatePiece, stages }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const workflowStages = stages || getWorkflowStages(project);
  const stageOrder = workflowStages.map(s => s.id);
  const currentIdx = stageOrder.indexOf(piece.status);
  const nextStage = workflowStages[currentIdx + 1] || null;
  const nextRev = (piece.revision_count || 0) + 1;

  // Per-file state: idle | uploading | done | error
  const [pdfState, setPdfState] = useStateTR("idle");
  const [pdfName, setPdfName] = useStateTR(null);
  const [pdfError, setPdfError] = useStateTR(null);
  const [pdfDragging, setPdfDragging] = useStateTR(false);

  const [htmlState, setHtmlState] = useStateTR("idle");
  const [htmlName, setHtmlName] = useStateTR(null);
  const [htmlError, setHtmlError] = useStateTR(null);
  const [htmlDragging, setHtmlDragging] = useStateTR(false);

  const [submitting, setSubmitting] = useStateTR(false);
  const [submitted, setSubmitted] = useStateTR(false);

  const pdfRef = useRefTR(null);
  const htmlRef = useRefTR(null);

  const pdfReady = pdfState === "done";
  const htmlReady = htmlState === "done";
  const canSubmit = pdfReady && !submitting && !submitted;

  async function handlePdf(file) {
    if (!file || pdfState === "uploading") return;
    setPdfState("uploading"); setPdfName(file.name); setPdfError(null);
    try {
      const payload = await readDeliverableFile(file);
      const result = await window.NS_API.uploadWhitepaperFile(
        piece, cluster.id, pillar.id, project.active_month, payload, "pdf", currentUser.id
      );
      if (!result.ok) { setPdfState("error"); setPdfError(result.error || "Upload failed"); return; }
      setPdfState("done");
    } catch (e) {
      setPdfState("error"); setPdfError(e.message || "Upload failed");
    }
  }

  async function handleHtml(file) {
    if (!file || htmlState === "uploading") return;
    setHtmlState("uploading"); setHtmlName(file.name); setHtmlError(null);
    try {
      const payload = await readDeliverableFile(file);
      const result = await window.NS_API.uploadWhitepaperFile(
        piece, cluster.id, pillar.id, project.active_month, payload, "html", currentUser.id
      );
      if (!result.ok) { setHtmlState("error"); setHtmlError(result.error || "Upload failed"); return; }
      setHtmlState("done");
    } catch (e) {
      setHtmlState("error"); setHtmlError(e.message || "Upload failed");
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const newStatus = piece.return_to_stage
      ? piece.return_to_stage
      : (nextStage ? nextStage.id : piece.status);
    updatePiece(cluster.id, piece.id, {
      status: newStatus,
      revision_count: nextRev,
      deliverable_ext: "pdf",            // primary = pdf
      wp_has_html: htmlReady,            // flag: companion HTML also present
      return_to_stage: null,
      last_upload: new Date().toISOString(),
      last_upload_by: currentUser.id,
      last_updated: new Date().toISOString(),
      last_updated_by: currentUser.id,
      status_history: appendStatusHistory(piece, newStatus, currentUser.id),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  function DropZone({ label, sub, state, name, error, dragging, onDrop, onDragOver, onDragLeave, onClick, accept, inputRef, onFile }) {
    const borderColor = state === "done" ? "#1e7a45" : state === "error" ? "#c8401a" : dragging ? "#c8401a" : "#d4cfc8";
    const bg = state === "done" ? "#f0faf5" : dragging ? "#fff8f5" : "#faf8f4";
    return (
      <div
        style={{ border: `1.5px dashed ${borderColor}`, borderRadius: "4px", padding: "14px 16px", background: bg, cursor: state === "uploading" ? "default" : "pointer", transition: "all 0.15s", textAlign: "center" }}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onClick}
      >
        {state === "idle" && (
          <>
            <div style={{ ...FONT, fontSize: "0.75rem", fontWeight: 700, color: "#1a2535", marginBottom: "3px" }}>{label}</div>
            <div style={{ ...FONT, fontSize: "0.68rem", color: "#9b948c" }}>{sub}</div>
          </>
        )}
        {state === "uploading" && (
          <div style={{ ...FONT, fontSize: "0.75rem", color: "#1a2535", fontWeight: 500 }}>Uploading {name}…</div>
        )}
        {state === "done" && (
          <div style={{ ...FONT, fontSize: "0.75rem", color: "#1e7a45", fontWeight: 600 }}>
            ✓ {name}
            <span
              style={{ marginLeft: "10px", color: "#1e6fa8", fontWeight: 400, fontSize: "0.68rem", textDecoration: "underline", cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); state === "done" && onClick(); }}
            >replace</span>
          </div>
        )}
        {state === "error" && (
          <div style={{ ...FONT, fontSize: "0.75rem", color: "#c8401a", fontWeight: 500 }}>
            ✕ {error}
            <span style={{ marginLeft: "8px", color: "#1e6fa8", fontSize: "0.68rem", textDecoration: "underline", cursor: "pointer" }} onClick={e => { e.stopPropagation(); onClick(); }}>retry</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="ns-upload">
      <div className="ns-upload-l">
        {/* PDF zone */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b05e00", marginBottom: "6px" }}>
            PDF <span style={{ color: "#c8401a" }}>*</span> required
          </div>
          <DropZone
            label="Drop PDF here" sub="click to choose · .pdf"
            state={pdfState} name={pdfName} error={pdfError} dragging={pdfDragging}
            onDragOver={e => { e.preventDefault(); setPdfDragging(true); }}
            onDragLeave={() => setPdfDragging(false)}
            onDrop={e => { e.preventDefault(); setPdfDragging(false); const f = e.dataTransfer.files?.[0]; if(f) handlePdf(f); }}
            onClick={() => pdfState !== "uploading" && pdfRef.current?.click()}
            accept=".pdf" inputRef={pdfRef} onFile={handlePdf}
          />
        </div>

        {/* HTML zone */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b6560", marginBottom: "6px" }}>
            HTML companion <span style={{ color: "#9b948c", fontWeight: 400 }}>optional</span>
          </div>
          <DropZone
            label="Drop HTML page here" sub="click to choose · .html"
            state={htmlState} name={htmlName} error={htmlError} dragging={htmlDragging}
            onDragOver={e => { e.preventDefault(); setHtmlDragging(true); }}
            onDragLeave={() => setHtmlDragging(false)}
            onDrop={e => { e.preventDefault(); setHtmlDragging(false); const f = e.dataTransfer.files?.[0]; if(f) handleHtml(f); }}
            onClick={() => htmlState !== "uploading" && htmlRef.current?.click()}
            accept=".html,.htm" inputRef={htmlRef} onFile={handleHtml}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitted}
          style={{
            ...FONT, width: "100%", padding: "10px 0", borderRadius: "4px",
            fontSize: "0.78rem", fontWeight: 700, cursor: canSubmit && !submitted ? "pointer" : "default",
            background: submitted ? "#1e7a45" : canSubmit ? "#c8401a" : "#e0dbd5",
            color: canSubmit || submitted ? "#fff" : "#9b948c",
            border: "none", transition: "background 0.15s",
          }}
        >
          {submitted
            ? `✓ Submitted → ${(nextStage?.label || "next stage")}`
            : submitting
              ? "Submitting…"
              : !pdfReady
                ? "Upload PDF to submit"
                : `Submit → ${nextStage?.label || "next stage"}`}
        </button>
      </div>

      <div className="ns-upload-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Whitepaper deliverables</div>
        <ul className="ns-upload-rules">
          <li>Upload the <strong>PDF</strong> first — this is the gated download file. It's required before submitting.</li>
          <li>Upload the <strong>HTML page</strong> if available — this is the landing/teaser page reviewers can preview inline.</li>
          <li>Both files are stored at the same revision number. Reviewers can toggle between them in the preview.</li>
          {(piece.return_to_stage || nextStage) && (
            <li>Submitting moves status to <strong>{piece.return_to_stage ? (workflowStages.find(s=>s.id===piece.return_to_stage)?.label||piece.return_to_stage) : nextStage.label}</strong>.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ─── Review Panel — unified for all non-NS review stages ─────────────────────
// Handles any stage where actor is "jaggaer" or "person:<id>".
// On "approved" → advances to next workflow stage.
// On "needs-revision" → sends back to the most recent NS stage (writing).
// On "question" → leaves status unchanged, logs the note.
function ReviewPanel({ piece, cluster, project, currentUser, updatePiece, addFeedback, stages, stageMeta, onDone }) {
  const [verdict, setVerdict] = useStateTR("approved");
  const [body, setBody] = useStateTR("");
  const [submitting, setSubmitting] = useStateTR(false);

  const inputRef = useRefTR(null);

  const workflowStages = stages || getWorkflowStages(project);
  const stageOrder = workflowStages.map(s => s.id);
  const isAdHocReviewStage = piece.status === "ad-hoc-review";
  const currentIdx = stageOrder.indexOf(piece.status);
  const currentStage = isAdHocReviewStage ? getAdHocReviewStage(project) : workflowStages[currentIdx];
  const nextStage = isAdHocReviewStage ? null : (workflowStages[currentIdx + 1] || null);
  // "Send back" goes to the nearest NS-actor stage before current.
  // Return-to-sender: after NS fixes and re-uploads, the piece jumps back to
  // THIS reviewer's stage (not restarting from Abhishek/Orlagh).
  // Ad-Hoc Articles only ever send back to "writing" — there's no chain to walk.
  const sendBackStage = isAdHocReviewStage
    ? { id: "writing" }
    : ([...workflowStages].slice(0, currentIdx).reverse().find(s => s.actor === "ns") || workflowStages[0]);
  const isLastStage = isAdHocReviewStage ? true : (nextStage?.id === "approved" || !nextStage);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function submit() {
    if (!body.trim() && verdict !== "approved") return;
    setSubmitting(true);
    let newStatus = piece.status;
    let extraFields = {};
    if (verdict === "approved") {
      newStatus = isAdHocReviewStage ? "approved" : (nextStage ? nextStage.id : "approved");
      extraFields = { return_to_stage: null }; // clear any pending return
    } else if (verdict === "needs-revision") {
      newStatus = sendBackStage.id;
      // Store which stage to return to after NS fixes — skip the chain below this reviewer
      extraFields = { return_to_stage: piece.status };
    }
    // "question" keeps current status
    const entry = {
      id: "fb-"+Math.random().toString(36).slice(2,8),
      author: currentUser.id, verdict,
      body: body.trim() || "(no note)",
      ts: new Date().toISOString(),
      stage: piece.status,
    };
    addFeedback(piece.id, entry);
    updatePiece(cluster.id, piece.id, {
      status: newStatus,
      last_updated: new Date().toISOString(),
      last_updated_by: currentUser.id,
      status_history: appendStatusHistory(piece, newStatus, currentUser.id),
      ...extraFields,
    });
    // Fire approval notification when piece reaches final "approved" status
    if (newStatus === "approved") {
      // Build the GitHub path to the deliverable so the server can fetch + embed the HTML
      const _monthId = project.active_month || "month-1";
      const _rev = piece.revision_count || 1;
      const _deliverablePath = `content/${_monthId}/${pillar.id}/${cluster.id}/${piece.id}/deliverable-v${_rev}.html`;
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "piece-approved",
          piece: {
            id: piece.id,
            title: piece.title,
            format: piece.format || "",
            url: piece.url || "",          // target CMS URL (may be empty)
            deliverablePath: _deliverablePath, // GitHub repo path to the .html file
          },
          cluster: cluster.label,
          pillar: pillar.label || "",
          approvedBy: currentUser.name || currentUser.id,
          note: body.trim(),
        }),
      }).catch(() => {}); // fire-and-forget; don't block UI on email failure
    }
    await new Promise(r => setTimeout(r, 300));
    setSubmitting(false); setBody(""); onDone();
  }

  return (
    <div className="ns-feedback">
      <div className="ns-feedback-l">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>
          {currentStage?.label || "Review"} — Your Verdict
        </div>
        <div className="ns-verdict-row">
          {["approved","needs-revision","question"].map(v => (
            <button key={v} className={`ns-verdict ${verdict===v?`is-on ${v}`:""}`} onClick={() => setVerdict(v)}>
              <span className="ns-verdict-glyph">{VERDICT_META[v].glyph}</span>
              <span>{VERDICT_META[v].label}</span>
            </button>
          ))}
        </div>
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:8,marginTop:16}}>
          Note {verdict==="approved"?"(optional)":"(required)"}
        </div>
        <textarea className="ns-feedback-textarea" value={body} onChange={e => setBody(e.target.value)}
          placeholder={verdict==="approved" ? "Anything for the team on the way out — optional." : verdict==="needs-revision" ? "What needs to change and where. Be specific — section, paragraph, claim." : "Ask a question. Status stays; NS and Jaggaer both see it."}>
        </textarea>
        <div className="ns-feedback-actions">
          <button className="ns-feedback-submit" disabled={submitting||(verdict!=="approved"&&!body.trim())} onClick={submit}>
            {submitting ? "Submitting…" : verdict==="approved" ? `Approve → ${nextStage?.label || "Done"}` : verdict==="needs-revision" ? `Send Back → ${sendBackStage.label}` : "Log Question"}
          </button>
        </div>
      </div>
      <div className="ns-feedback-r">
        {/* ── Brief files — always shown if briefs have been uploaded ── */}
        {(piece.brief_files || []).length > 0 && (() => {
          const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
          const briefFiles = piece.brief_files || [];
          const allTeam = [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
          return (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#1a2535", marginBottom: "8px", fontFamily: "Noto Sans, sans-serif" }}>
                Brief & Keywords
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {briefFiles.map((bf, idx) => {
                  const ext = bf.filename.split(".").pop().toUpperCase();
                  const url = `https://raw.githubusercontent.com/${REPO}/main/${bf.path}`;
                  const uploader = allTeam.find(m => m.id === bf.uploaded_by);
                  const uploaderName = uploader ? uploader.name.split(" ")[0] : bf.uploaded_by;
                  return (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "8px 12px",
                      background: "#faf8f4", border: "1px solid #e8e3da", borderRadius: "3px",
                      fontFamily: "Noto Sans, sans-serif",
                    }}>
                      <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em",
                        color: "#c8401a", background: "#fdf0e8", border: "1px solid #f0cfc0",
                        padding: "1px 5px", borderRadius: "2px", flexShrink: 0 }}>{ext}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: "0.75rem", color: "#333",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={bf.filename}>{bf.filename}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1e6fa8",
                          textDecoration: "none", flexShrink: 0, padding: "3px 8px",
                          border: "1px solid #c5ddef", borderRadius: "2px", background: "#fff",
                          whiteSpace: "nowrap" }}>↓ Open</a>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Stage</div>
        <ol className="ns-feedback-process">
          <li><strong>Approved</strong> — advances to <em>{nextStage?.label || "complete"}</em>.</li>
          <li><strong>Needs revision</strong> — sends to NS (<em>{sendBackStage.label}</em>). When NS re-uploads, it returns directly to <em>{currentStage?.label || "this stage"}</em> — not the full chain.</li>
          <li><strong>Question</strong> — open thread, status unchanged.</li>
        </ol>
        {isLastStage && (
          <div style={{marginTop:16}}>
            <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:8}}>Cluster State</div>
            <div className="ns-feedback-cluster-state">
              {cluster.pieces.filter(p => p.status==="approved").length} of {cluster.pieces.length} approved.
              {cluster.pieces.every(p => p.status==="approved" || p.id===piece.id) && verdict==="approved" && (
                <div className="ns-feedback-readymsg">Approving this piece marks the cluster <strong>publish-ready</strong>.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notes history ────────────────────────────────────────────────────────────
function NotesHistory({ piece, project }) {
  const feedback = (project.feedback || {})[piece.id] || [];
  const history = ensureSeededHistory(piece);
  return (
    <div>
      <StageHistoryTimeline piece={piece} project={project} history={history} />
      {!feedback.length ? (
        <div className="ns-history-empty">
          <div className="ns-eyebrow ns-eyebrow-dark">No Notes Yet</div>
          <div className="ns-history-empty-text">Feedback will appear here as an attributed thread.</div>
        </div>
      ) : (
        <div>
          <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:12, marginTop: 20}}>Review Thread</div>
          <div className="ns-history-list">
            {feedback.map((f, i) => <FeedbackCard key={f.id} entry={f} project={project} ordinal={i+1} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// Stage-history timeline — shows every status transition this piece has gone
// through, with EST timestamps where known. Seeded entries (pieces that were
// already mid-pipeline when this feature shipped) show the current stage with
// no timestamp, per design: we don't backfill dates we don't actually have.
function StageHistoryTimeline({ piece, project, history }) {
  const stages = getWorkflowStages(project);
  const adHocStage = getAdHocReviewStage(project);
  const all = [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
  function stageLabel(id) {
    if (id === "ad-hoc-review") return adHocStage.label;
    return stages.find(s => s.id === id)?.label || id;
  }
  function memberName(id) {
    if (!id) return "—";
    const m = all.find(x => x.id === id);
    return m ? m.name.split(" ")[0] : id;
  }
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div>
      <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Stage History</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {history.map((h, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "baseline", gap: "10px",
            padding: "7px 10px", background: i === history.length - 1 ? "#fdf8f3" : "transparent",
            borderRadius: "3px", borderLeft: `2px solid ${i === history.length - 1 ? "#c8401a" : "#e8e3da"}`,
          }}>
            <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#1a2535", minWidth: "170px" }}>
              {stageLabel(h.stage)}
            </span>
            <span style={{ ...FONT, fontSize: "0.72rem", color: "#999" }}>
              {h.ts ? `${formatEST(h.ts, { hour: "2-digit", minute: "2-digit" })} EST` : "date not logged (pre-tracking)"}
              {h.by ? ` · ${memberName(h.by)}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackCard({ entry, project, ordinal }) {
  const all = [...project.team.ns, ...project.team.jaggaer];
  const author = all.find(a => a.id === entry.author) || { name: entry.author, org: "ns", role: "" };
  const v = VERDICT_META[entry.verdict] || { label: entry.verdict, glyph: "•" };
  const dateStr = formatEST(entry.ts, { hour: "2-digit", minute: "2-digit" }) + " EST";
  return (
    <article className={`ns-fb-card ns-fb-${entry.verdict}`}>
      <header className="ns-fb-head">
        <div className="ns-fb-author">
          <span className={`ns-org-pill ns-org-${author.org}`}>{author.org==="ns"?"NS":"JG"}</span>
          <span className="ns-fb-name">{author.name}</span>
          <span className="ns-fb-role">{author.role}</span>
        </div>
        <div className="ns-fb-meta">
          <span className="ns-fb-verdict"><span className="ns-fb-verdict-glyph">{v.glyph}</span>{v.label}</span>
          <span className="ns-fb-date">{dateStr}</span>
        </div>
      </header>
      <p className="ns-fb-body">{entry.body}</p>
      <div className="ns-fb-ordinal">#{String(ordinal).padStart(2,"0")}</div>
    </article>
  );
}

// ─── Brief & Keyword Files Section ────────────────────────────────────────────
// Shown in the Details tab. Jaggaer can attach SEO briefs / keyword files here.
// All users can see attached files and download them. Jaggaer can add more files at any stage.
function BriefFilesSection({ piece, cluster, pillar, project, currentUser, updatePiece }) {
  const [uploadStage, setUploadStage] = useStateTR("idle"); // idle | uploading | done | error
  const [uploadFilename, setUploadFilename] = useStateTR(null);
  const [uploadError, setUploadError] = useStateTR(null);
  const [dragging, setDragging] = useStateTR(false);
  const inputRef = useRefTR(null);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  const isJaggaer = currentUser?.org === "jaggaer";
  const briefFiles = piece.brief_files || [];

  async function handleFile(file) {
    setUploadStage("uploading"); setUploadFilename(file.name); setUploadError(null);
    try {
      const result = await window.NS_API.uploadBriefFile(piece, cluster.id, pillar.id, project.active_month, file, currentUser.id);
      if (!result.ok) throw new Error(result.error || "Upload failed");
      const now = new Date().toISOString();
      const newRecord = { filename: file.name, path: result.path, uploaded_by: currentUser.id, uploaded_at: now };
      updatePiece(cluster.id, piece.id, {
        brief_files: [...briefFiles, newRecord],
        brief_last_updated: now,
        last_updated: now,
        last_updated_by: currentUser.id,
      });
      setUploadStage("done");
    } catch (e) {
      setUploadError(e.message);
      setUploadStage("error");
    }
  }

  const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
  function fileUrl(bf) {
    return `https://raw.githubusercontent.com/${REPO}/main/${bf.path}`;
  }
  function allTeam() {
    return [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
  }
  function memberName(id) {
    const m = allTeam().find(x => x.id === id);
    return m ? m.name.split(" ")[0] : id;
  }
  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ marginTop: "28px", ...FONT }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1a2535" }}>
          Brief & Keyword Files
        </div>
        <div style={{ flex: 1, height: "1px", background: "#e8e3da" }} />
        {isJaggaer && (
          <span style={{ fontSize: "0.68rem", color: "#6b6560" }}>Jaggaer only</span>
        )}
      </div>

      {/* Attached files list */}
      {briefFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {briefFiles.map((bf, idx) => {
            const ext = bf.filename.split(".").pop().toUpperCase();
            return (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px",
                background: "#faf8f4",
                border: "1px solid #e8e3da",
                borderRadius: "3px",
              }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: "#c8401a", background: "#fdf0e8",
                  border: "1px solid #f0cfc0",
                  padding: "2px 7px", borderRadius: "2px", flexShrink: 0,
                }}>
                  {ext}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#1a2535", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bf.filename}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#9b948c", marginTop: "1px" }}>
                    {memberName(bf.uploaded_by)} · {formatDate(bf.uploaded_at)}
                  </div>
                </div>
                <a
                  href={fileUrl(bf)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "0.7rem", fontWeight: 600, color: "#1e6fa8",
                    background: "#fff", border: "1px solid #c5ddef",
                    padding: "5px 12px", borderRadius: "3px",
                    textDecoration: "none", whiteSpace: "nowrap",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e8f2fa"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  ↓ Download
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — non-Jaggaer */}
      {!isJaggaer && briefFiles.length === 0 && (
        <div style={{ fontSize: "0.8rem", color: "#9b948c", padding: "10px 0" }}>
          No brief or keyword files attached yet.
        </div>
      )}

      {/* Upload widget — Jaggaer only */}
      {isJaggaer && (
        <div
          style={{
            border: `1.5px dashed ${dragging ? "#c8401a" : uploadStage === "done" ? "#1e7a45" : "#d4cfc8"}`,
            borderRadius: "4px",
            padding: "14px 18px",
            background: dragging ? "#fff8f5" : uploadStage === "done" ? "#f0faf5" : "#faf8f4",
            cursor: uploadStage === "uploading" ? "default" : "pointer",
            transition: "all 0.15s",
            textAlign: "center",
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f && uploadStage !== "uploading") handleFile(f); }}
          onClick={() => uploadStage !== "uploading" && inputRef.current?.click()}
        >
          {uploadStage === "idle" && (
            <>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a2535", marginBottom: "3px" }}>
                {briefFiles.length > 0 ? "Attach another file" : "Attach SEO brief or keyword file"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#9b948c" }}>
                PDF, DOCX, XLSX, CSV, HTML · drag & drop or click
              </div>
            </>
          )}
          {uploadStage === "uploading" && (
            <div style={{ fontSize: "0.78rem", color: "#1a2535", fontWeight: 500 }}>
              Uploading {uploadFilename}…
            </div>
          )}
          {uploadStage === "done" && (
            <div style={{ fontSize: "0.78rem", color: "#1e7a45", fontWeight: 600 }}>
              ✓ {uploadFilename} attached
              <span
                style={{ marginLeft: "12px", color: "#1e6fa8", fontWeight: 400, fontSize: "0.7rem", textDecoration: "underline", cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setUploadStage("idle"); setUploadFilename(null); }}
              >
                Add another
              </span>
            </div>
          )}
          {uploadStage === "error" && (
            <div style={{ fontSize: "0.78rem", color: "#c8401a", fontWeight: 500 }}>
              Upload failed — {uploadError || "unknown error"}
              <span
                style={{ marginLeft: "12px", color: "#1e6fa8", fontWeight: 400, fontSize: "0.7rem", textDecoration: "underline", cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setUploadStage("idle"); }}
              >
                Retry
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.html,.md,.txt"
            hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value = ""; handleFile(f); } }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Publishing Info Section — shown at top of Details for approved pieces ───
function PublishingInfoSection({ piece, cluster, project, currentUser, updatePiece }) {
  const { useState: useSPI } = React;
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const isJaggaer = currentUser?.org === "jaggaer";
  const pub = piece.publishing || {};
  const [form, setForm] = useSPI({
    published_by:     pub.published_by || "",
    launch_date:      pub.launch_date || "",
    live_url:         pub.live_url || "",
    performance_data: pub.performance_data || "",
  });
  const [saved, setSaved] = useSPI(false);
  const [editing, setEditing] = useSPI(false);

  function field(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }
  function save() {
    updatePiece(cluster.id, piece.id, {
      publishing: { ...pub, ...form, updated_at: new Date().toISOString() },
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }
  function cancel() {
    setForm({
      published_by:     pub.published_by || "",
      launch_date:      pub.launch_date || "",
      live_url:         pub.live_url || "",
      performance_data: pub.performance_data || "",
    });
    setEditing(false);
  }

  const hasAny = pub.published_by || pub.launch_date || pub.live_url || pub.performance_data;

  return (
    <div style={{
      ...FONT,
      background: "#f0faf5",
      border: "1.5px solid #a8d8bc",
      borderLeft: "4px solid #1e7a45",
      borderRadius: "4px",
      padding: "20px 24px 20px",
      marginBottom: "24px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1e7a45" }}>
          ✓ Publishing Info
        </div>
        <div style={{ flex: 1, height: "1px", background: "#a8d8bc" }} />
        {isJaggaer && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              fontSize: "0.7rem", fontWeight: 600, color: "#1e7a45",
              background: "#fff", border: "1px solid #a8d8bc",
              padding: "4px 12px", borderRadius: "3px", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e0f5ea"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >
            {hasAny ? "Edit" : "+ Add Publishing Info"}
          </button>
        )}
      </div>

      {/* Read mode */}
      {!editing && (
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 14px" }}>
          {[
            ["Published By",     pub.published_by],
            ["Launch Date",      pub.launch_date],
            ["Live URL",         pub.live_url],
            ["Performance Data", pub.performance_data],
          ].map(([label, val]) => (
            <React.Fragment key={label}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7a56", paddingTop: "2px" }}>
                {label}
              </div>
              <div style={{ fontSize: "0.82rem", color: val ? "#1a2535" : "#9b948c" }}>
                {val
                  ? (label === "Live URL" || label === "Performance Data")
                    ? <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: "#1e6fa8", textDecoration: "underline", wordBreak: "break-all" }}>{val}</a>
                    : val
                  : (isJaggaer ? <span style={{ fontStyle: "italic" }}>—</span> : "—")
                }
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Edit mode — Jaggaer only */}
      {editing && isJaggaer && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7a56" }}>
              Published By
              <input
                value={form.published_by}
                onChange={field("published_by")}
                placeholder="e.g. Jason R"
                style={{
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem",
                  padding: "8px 10px", borderRadius: "3px",
                  border: "1px solid #a8d8bc", background: "#fff",
                  color: "#1a2535", fontWeight: 400,
                  outline: "none",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7a56" }}>
              Launch Date
              <input
                type="date"
                value={form.launch_date}
                onChange={field("launch_date")}
                style={{
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem",
                  padding: "8px 10px", borderRadius: "3px",
                  border: "1px solid #a8d8bc", background: "#fff",
                  color: "#1a2535", fontWeight: 400,
                  outline: "none",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7a56" }}>
              Live URL
              <input
                value={form.live_url}
                onChange={field("live_url")}
                placeholder="https://jaggaer.com/blog/..."
                style={{
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem",
                  padding: "8px 10px", borderRadius: "3px",
                  border: "1px solid #a8d8bc", background: "#fff",
                  color: "#1a2535", fontWeight: 400,
                  outline: "none",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2a7a56" }}>
              Performance Data URL
              <input
                value={form.performance_data}
                onChange={field("performance_data")}
                placeholder="https://analytics... or GA link"
                style={{
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem",
                  padding: "8px 10px", borderRadius: "3px",
                  border: "1px solid #a8d8bc", background: "#fff",
                  color: "#1a2535", fontWeight: 400,
                  outline: "none",
                }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={save}
              disabled={saved}
              style={{
                fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 600,
                background: saved ? "#1e7a45" : "#1e7a45", color: "#fff",
                border: "none", padding: "9px 20px", borderRadius: "3px",
                cursor: saved ? "default" : "pointer",
                opacity: saved ? 0.8 : 1, transition: "opacity 0.15s",
              }}
            >
              {saved ? "Saved ✓" : "Save Publishing Info"}
            </button>
            <button
              onClick={cancel}
              style={{
                fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 500,
                background: "transparent", color: "#6b6560",
                border: "1px solid #c8c3bb", padding: "9px 16px", borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Piece details ────────────────────────────────────────────────────────────
function PieceDetails({ piece, cluster, pillar, project, currentUser, adminMode, updatePiece }) {
  const weekSlot = (project.schedule || []).find(w => w.slots.some(s => s.cluster === cluster.id));
  const rows = [
    ["Pillar",            pillar.label],
    ["Cluster",           cluster.label],
    ["Intent",            cluster.intent === "informational" ? "Informational" : "Commercial"],
    ["Publishing week",   weekSlot ? weekSlot.label : "—"],
    ["Content Type",        piece.format],
    ["Assignee",          (() => { if (!piece.assignee) return "—"; const all=[...project.team.ns,...project.team.jaggaer]; return all.find(x=>x.id===piece.assignee)?.name || "—"; })()],
    ["Geography",         (piece.geography || "all").toUpperCase()],
    ["User path",         piece.user_paths ? piece.user_paths.join(", ") : "—"],
    ["Primary keyword",   piece.primary_keyword || "—"],
    ["Secondary keyword", piece.secondary_keyword || "—"],
    ["Anchor piece",      piece.id === cluster.anchor_piece ? "Yes — this is the cluster anchor" : "No"],
    ["Funnel stage",      piece.funnel || "—"],
    ["Target URL",        piece.url || piece.notes?.match(/URL:\s*(\S+)/)?.[1] || "—"],
    ["Word count",        piece.notes?.match(/Words:\s*([\d,–-]+)/)?.[1] || "—"],
    ["Revision count",    piece.revision_count || 0],
    ["Status",            STATUS_META[piece.status]?.label || piece.status],
  ];
  if (piece.notes) rows.push(["Notes", piece.notes.replace(/\s*\|\s*(URL|Words):[^|]*/g, "").trim()]);

  // Build GitHub raw URL for the deliverable if one has been uploaded
  const hasDeliverable = piece.status !== "not-started";
  const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
  const monthId = project.active_month || "month-1";
  const deliverableUrl = hasDeliverable
    ? `https://raw.githubusercontent.com/${REPO}/main/content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/${deliverableFileName(piece)}`
    : null;
  const repoViewUrl = hasDeliverable
    ? `https://github.com/${REPO}/tree/main/content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}`
    : null;
  // Whitepaper companion HTML URL
  const isWPDetails = isWhitePaper(piece) && piece.wp_has_html;
  const wpHtmlUrl = isWPDetails
    ? `https://raw.githubusercontent.com/${REPO}/main/content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/deliverable-v${piece.revision_count||1}.html`
    : null;

  return (
    <div className="ns-details">
      {/* ── Publishing Info — top of details, approved pieces only ── */}
      {piece.status === "approved" && (
        <PublishingInfoSection
          piece={piece} cluster={cluster} project={project}
          currentUser={currentUser} updatePiece={updatePiece}
        />
      )}

      {/* ── Brief upload nudge — not-started pieces, Jaggaer only ── */}
      {piece.status === "not-started" && currentUser?.org === "jaggaer" && (
        <div style={{
          fontFamily: "Noto Sans, sans-serif",
          background: "#fffbf5",
          border: "1.5px dashed #e0b87c",
          borderLeft: "4px solid #b05e00",
          borderRadius: "4px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b05e00", marginBottom: "4px" }}>
              Brief not uploaded yet
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b5838", lineHeight: 1.5 }}>
              Upload the SEO brief and keyword file to kick off writing. Use the <strong>Upload Brief</strong> tab above.
            </div>
          </div>
        </div>
      )}

      {/* Deliverable download bar — only when a file has been uploaded */}
      {hasDeliverable && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 20px",
          background: "#f0f7ff",
          border: "1px solid #c5ddef",
          borderRadius: "4px",
          marginBottom: "20px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#1a3a52" }}>
              {isWPDetails
                ? `deliverable-v${piece.revision_count||1}.pdf + .html`
                : deliverableFileName(piece)}
            </div>
            <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "#6b8fa8", marginTop: "2px" }}>
              {piece.revision_count > 1 ? `v${piece.revision_count} · ` : ""}
              {piece.last_upload ? `Last uploaded ${new Date(piece.last_upload).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Uploaded"}
            </div>
          </div>
          <button
            onClick={() => forceDownload(deliverableUrl, `${piece.id}-v${piece.revision_count || 1}.${deliverableExt(piece)}`)}
            style={{
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "0.72rem", fontWeight: 600,
              color: "#1e6fa8",
              background: "#fff",
              border: "1px solid #c5ddef",
              padding: "6px 14px",
              borderRadius: "3px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e8f2fa"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >
            ↓ Download {deliverableExt(piece).toUpperCase()}
          </button>
          {isWPDetails && wpHtmlUrl && (
            <button
              onClick={() => forceDownload(wpHtmlUrl, `${piece.id}-v${piece.revision_count||1}.html`)}
              style={{
                fontFamily: "Noto Sans, sans-serif",
                fontSize: "0.72rem", fontWeight: 600,
                color: "#5a3d9e",
                background: "#fff",
                border: "1px solid #dccce8",
                padding: "6px 14px",
                borderRadius: "3px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5eef8"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              ↓ Download HTML
            </button>
          )}
          <a
            href={repoViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "0.72rem", fontWeight: 500,
              color: "#6b8fa8",
              background: "transparent",
              border: "1px solid #c5ddef",
              padding: "6px 14px",
              borderRadius: "3px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#1e6fa8"}
            onMouseLeave={e => e.currentTarget.style.color = "#6b8fa8"}
          >
            View in GitHub →
          </a>
          {(currentUser?.org === "ns" || adminMode) && null}
        </div>
      )}

      <dl className="ns-detail-list">
        {rows.map(([k, v]) => (
          <div className="ns-detail-row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {/* ── Brief & Keyword Files ── */}
      <BriefFilesSection
        piece={piece} cluster={cluster} pillar={pillar}
        project={project} currentUser={currentUser}
        updatePiece={updatePiece}
      />
    </div>
  );
}

// ─── Drawer overlay ───────────────────────────────────────────────────────────
function DrawerOverlay({ piece, cluster, pillar, project, mode, setMode, updatePiece, addFeedback, deletePiece, currentUser, adminMode, onAdminEditPiece, onClose }) {
  return (
    <div className="ns-overlay-backdrop" onClick={onClose}>
      <div className="ns-overlay-panel" onClick={e => e.stopPropagation()}>
        <div className="ns-overlay-handle">
          <div className="ns-overlay-piece-title">
            <span className="ns-overlay-cluster-label">{cluster.label}</span>
            <span className="ns-overlay-sep">·</span>
            <span className="ns-overlay-piece-name">{piece.title}</span>
          </div>
          <button className="ns-overlay-close" onClick={onClose}>Close ✕</button>
        </div>
        <PieceDrawer
          piece={piece} cluster={cluster} pillar={pillar} project={project}
          mode={mode} setMode={setMode}
          updatePiece={updatePiece} addFeedback={addFeedback}
          deletePiece={deletePiece}
          currentUser={currentUser} adminMode={adminMode}
          onAdminEditPiece={onAdminEditPiece} onClose={onClose}
        />
      </div>
    </div>
  );
}

// ─── Compact Table View ───────────────────────────────────────────────────────
function CompactTable({ pillars, project, setOpenPiece, currentUser, adminMode, updatePiece }) {
  const isJG = currentUser.org === "jaggaer";
  const nsMembers = project.team.ns.map(m => ({ value: m.id, label: m.name }));

  return (
    <div className="ns-compact-table-wrap">
      {adminMode && (
        <div className="ns-inline-edit-hint">
          Admin mode — click any <span className="ns-inline-hint-icon">✎</span> field to edit inline. Enter or click away to save.
        </div>
      )}
      <table className="ns-compact-table">
        <thead>
          <tr className="ns-ct-head-row">
            <th className="ns-ct-th ns-ct-th-num">#</th>
            <th className="ns-ct-th">Title</th>
            <th className="ns-ct-th">Content Type</th>
            <th className="ns-ct-th">Assignee</th>
            <th className="ns-ct-th">Primary Keyword</th>
            <th className="ns-ct-th">Secondary Keyword</th>
            <th className="ns-ct-th ns-ct-th-intent">Intent / Publishing</th>
            <th className="ns-ct-th ns-ct-th-path">User Path</th>
            <th className="ns-ct-th ns-ct-th-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {pillars.map((pillar, pi) => {
            const pillarAccent = PILLAR_ACCENT[pillar.id] || "#1a2535";
            const rows = [];

            rows.push(
              <tr key={`pillar-${pillar.id}`} className="ns-ct-pillar-row">
                <td colSpan={9}>
                  <div className="ns-ct-pillar-label" style={{ borderLeftColor: pillarAccent }}>
                    <span className="ns-ct-pillar-name">{pillar.label}</span>
                    {pillar.subtitle && <span className="ns-ct-pillar-sub">{pillar.subtitle}</span>}
                    {pillar.weight != null && <span className="ns-ct-pillar-weight">{Math.round(pillar.weight * 100)}%</span>}
                  </div>
                </td>
              </tr>
            );

            pillar.clusters.forEach((cluster, ci) => {
              const pal = CLUSTER_PALETTE[ci % CLUSTER_PALETTE.length];
              const total = cluster.pieces.length;
              const approved = cluster.pieces.filter(p => p.status === "approved").length;

              rows.push(
                <tr key={`cluster-${cluster.id}`} className="ns-ct-cluster-row" style={{ background: pal.bg }}>
                  <td colSpan={9}>
                    <div className="ns-ct-cluster-label" style={{ color: pal.text }}>
                      <span className="ns-ct-cluster-seq" style={{ color: pal.seqColor }}>C{String(cluster.sequence).padStart(2,"0")}</span>
                      <span className="ns-ct-cluster-name">{cluster.label}</span>
                      <span className={`ns-ct-cluster-intent ${cluster.intent}`} style={{ background: pal.intentBg, color: pal.seqColor }}>{cluster.intent}</span>
                      <span className="ns-ct-cluster-frac" style={{ color: pal.seqColor + "99" }}>{approved}/{total}</span>
                      {approved === total && total > 0 && <span className="ns-ct-ready-chip">Publish-ready</span>}
                    </div>
                  </td>
                </tr>
              );

              cluster.pieces.forEach((piece, idx) => {
                const isAnchor = piece.id === cluster.anchor_piece;
                const feedback = (project.feedback || {})[piece.id] || [];
                const isApproved = piece.status === "approved";
                // Whose turn is it — derived from the LIVE workflow actor, not
                // hardcoded stage ids (which broke when the workflow was reordered).
                const turn = pieceTurnFor(piece, currentUser, project);
                const hasAction = turn.isTurn;
                const awaitsJG = turn.awaitsJaggaer;
                // Approved/published pieces open straight to Details (Publishing Info).
                const openMode = isApproved ? "details" : (turn.isTurn ? turn.mode : "history");

                rows.push(
                  <tr
                    key={piece.id}
                    className={`ns-ct-piece-row ${awaitsJG ? "awaits-jg" : ""} ${isAnchor ? "is-anchor" : ""} ${adminMode ? "is-admin-row" : ""}`}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#faf9f7" }}
                    onClick={() => setOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: openMode })}
                  >
                    <td className="ns-ct-td ns-ct-td-num">
                      <span className="ns-ct-num" style={{ color: pal.seqColor + "aa" }}>{idx + 1}</span>
                      {isAnchor && <span className="ns-ct-anchor-dot" title="Anchor piece" style={{ color: pal.seqColor }}>◆</span>}
                    </td>

                    {/* Title — inline editable for admin */}
                    <td className="ns-ct-td ns-ct-td-title">
                      {adminMode ? (
                        <InlineCell
                          value={piece.title}
                          type="text"
                          onSave={val => updatePiece(cluster.id, piece.id, { title: val })}
                          className="ns-ct-inline-title"
                        >
                          <span className="ns-ct-title">{piece.title}</span>
                        </InlineCell>
                      ) : (
                        <span className="ns-ct-title">{piece.title}</span>
                      )}
                      {feedback.length > 0 && <span className="ns-ct-fb-hint">{feedback.length}✎</span>}
                    </td>

                    {/* Format — inline editable for admin */}
                    <td className="ns-ct-td ns-ct-td-format">
                      {adminMode ? (
                        <InlineCell
                          value={piece.format}
                          type="text"
                          onSave={val => updatePiece(cluster.id, piece.id, { format: val })}
                        >
                          <span className="ns-ct-format" style={{ background: pal.intentBg, color: pal.text }}>{piece.format}</span>
                        </InlineCell>
                      ) : (
                        <span className="ns-ct-format" style={{ background: pal.intentBg, color: pal.text }}>{piece.format}</span>
                      )}
                    </td>

                    {/* Assignee — inline select for admin */}
                    <td className="ns-ct-td ns-ct-td-assignee">
                      {adminMode ? (
                        <InlineCell
                          value={piece.assignee}
                          type="select"
                          options={[{ value: "", label: "— unassigned —" }, ...nsMembers]}
                          onSave={val => updatePiece(cluster.id, piece.id, { assignee: val })}
                        >
                          <span className="ns-ct-assignee">{assigneeName(project, piece.assignee)}</span>
                        </InlineCell>
                      ) : (
                        <span className="ns-ct-assignee">{assigneeName(project, piece.assignee)}</span>
                      )}
                    </td>

                    <td className="ns-ct-td ns-ct-td-kw">
                      <span className="ns-ct-kw-primary">{piece.primary_keyword || "—"}</span>
                    </td>
                    <td className="ns-ct-td ns-ct-td-kw ns-ct-kw-sec">
                      <span className="ns-ct-kw-secondary">{piece.secondary_keyword || "—"}</span>
                    </td>
                    <td className="ns-ct-td ns-ct-td-intent">
                      {isApproved ? (
                        <span
                          className="ns-ct-intent-badge"
                          title={piece.publishing && piece.publishing.live_url ? "Published — view publishing info" : "Approved — add publishing info"}
                          style={{
                            background: (piece.publishing && piece.publishing.live_url) ? "#e6f5ec" : "#fde7e0",
                            color: (piece.publishing && piece.publishing.live_url) ? "#1e7a45" : "#c8401a",
                            fontWeight: 700,
                          }}
                        >
                          {(piece.publishing && piece.publishing.live_url) ? "● Published" : "Publishing ▸"}
                        </span>
                      ) : (
                        <span className={`ns-ct-intent-badge ${cluster.intent}`}>{cluster.intent === "informational" ? "Info" : "Comm"}</span>
                      )}
                    </td>
                    <td className="ns-ct-td ns-ct-td-path">
                      {piece.user_paths ? piece.user_paths.map(p => (
                        <span key={p} className="ns-ct-path-pill">{p.replace("Path ","P")}</span>
                      )) : <span className="ns-ct-na">—</span>}
                    </td>

                    {/* Status — inline select for admin */}
                    <td className="ns-ct-td ns-ct-td-status">
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {(() => {
                          const _sm = buildStatusMeta(getWorkflowStages(project));
                          return adminMode ? (
                            <InlineCell
                              value={piece.status}
                              type="select"
                              options={getWorkflowStages(project).map(s => ({ value: s.id, label: s.label }))}
                              onSave={val => updatePiece(cluster.id, piece.id, { status: val })}
                            >
                              <StatusChip status={piece.status} stageMeta={_sm} />
                            </InlineCell>
                          ) : (
                            <StatusChip status={piece.status} stageMeta={_sm} />
                          );
                        })()}
                        {hasAction && !adminMode && <span className="ns-ct-action-dot" title={awaitsJG ? "Needs your feedback" : "Awaiting upload"} />}
                        {piece.status !== "not-started" && (() => {
                          const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
                          const mId = project.active_month || "month-1";
                          const dlUrl = `https://raw.githubusercontent.com/${REPO}/main/content/${mId}/${pillar.id}/${cluster.id}/${piece.id}/${deliverableFileName(piece)}`;
                          const dlFilename = `${piece.id}-v${piece.revision_count || 1}.${deliverableExt(piece)}`;
                          return (
                            <button
                              title="Download deliverable"
                              onClick={e => { e.stopPropagation(); forceDownload(dlUrl, dlFilename); }}
                              style={{
                                display: "inline-flex", alignItems: "center",
                                fontFamily: "Noto Sans, sans-serif",
                                fontSize: "0.65rem", fontWeight: 600,
                                color: "#1e6fa8", background: "#e8f2fa",
                                border: "1px solid #c5ddef",
                                padding: "2px 7px", borderRadius: "2px",
                                cursor: "pointer", whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >↓</button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              });
            });

            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Brief Upload Panel (Jaggaer uploads the SEO brief to kick off a piece) ───
function BriefUploadPanel({ piece, cluster, pillar, project, currentUser, updatePiece }) {
  const [dragging, setDragging] = useStateTR(false);
  const [stage, setStage] = useStateTR("idle");
  const [filename, setFilename] = useStateTR(null);
  const [bytes, setBytes] = useStateTR(0);
  const [progress, setProgress] = useStateTR(0);
  const inputRef = useRefTR(null);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function handleFile(file) {
    setStage("uploading"); setFilename(file.name); setBytes(file.size);
    for (let i = 0; i <= 80; i += 8) { setProgress(i); await new Promise(r => setTimeout(r, 22)); }
    const result = await window.NS_API.uploadBriefFile(piece, cluster.id, pillar.id, project.active_month, file, currentUser.id);
    for (let i = 82; i <= 100; i += 6) { setProgress(i); await new Promise(r => setTimeout(r, 18)); }
    const now = new Date().toISOString();
    const newFileRecord = { filename: file.name, path: result.path, uploaded_by: currentUser.id, uploaded_at: now };
    const existing = piece.brief_files || [];
    updatePiece(cluster.id, piece.id, {
      status: "brief-uploaded",
      brief_files: [...existing, newFileRecord],
      brief_last_updated: now,
      last_upload: now,
      last_upload_by: currentUser.id,
      last_updated: now,
      last_updated_by: currentUser.id,
    });
    setStage("done");
  }

  return (
    <div className="ns-upload">
      <div className="ns-upload-l">
        <div className={`ns-dropzone ${dragging?"is-dragging":""} ${stage!=="idle"?"is-busy":""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
          onClick={() => stage === "idle" && inputRef.current?.click()}>
          {stage === "idle" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Drop SEO Brief here</div>
            <div className="ns-drop-sub">or click to choose · .pdf, .docx, .md, .html</div>
            <div className="ns-drop-path">→ <code>content/{project.active_month}/{pillar.id}/{cluster.id}/{piece.id}/brief-v{(piece.brief_files||[]).length + 1}.{'{ext}'}</code></div>
          </>)}
          {stage === "uploading" && (<>
            <div className="ns-drop-rule"></div>
            <div className="ns-drop-title">Uploading {filename}…</div>
            <div className="ns-drop-progress"><div className="ns-drop-progress-fill" style={{width:`${progress}%`}}></div></div>
            <div className="ns-drop-sub">{Math.round(bytes/1024)} KB · committing to GitHub</div>
          </>)}
          {stage === "done" && (<>
            <div className="ns-drop-rule is-done"></div>
            <div className="ns-drop-title">Brief Uploaded ✓</div>
            <div className="ns-drop-sub">{filename} · NS will see this in their queue.</div>
            <div className="ns-drop-path">Status → Brief Uploaded. NS can now write the article.</div>
          </>)}
          <input ref={inputRef} type="file" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>
      <div className="ns-upload-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>What happens next</div>
        <ul className="ns-upload-rules">
          <li>Status moves to <strong>Brief Uploaded</strong>. NS writers are notified.</li>
          <li>NS writes the article and uploads it. It goes to Ed for content review.</li>
          <li>After Ed and marketing sign off, it comes back to you for final approval.</li>
        </ul>
      </div>
    </div>
  );
}


// ─── Annotate Panel — iframe preview with inline comment sidebar ───────────────
function AnnotatePanel({ piece, cluster, pillar, project, currentUser, addFeedback, updatePiece, onDone }) {
  const REPO = (window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker";
  const monthId = project.active_month || "month-1";
  const rev = piece.revision_count || 1;
  const isWP_AP = isWhitePaper(piece) && piece.wp_has_html;
  const canAddHtmlCompanion = isWhitePaper(piece) && !piece.wp_has_html && currentUser?.org === "ns";
  const [activeSlot_AP, setActiveSlot_AP] = useStateTR("pdf");
  const [htmlCompState, setHtmlCompState] = useStateTR("idle"); // idle | uploading | done | error
  const [htmlCompError, setHtmlCompError] = useStateTR(null);
  const htmlCompRef = useRefTR(null);

  async function handleHtmlCompanion(file) {
    if (!file || htmlCompState === "uploading") return;
    setHtmlCompState("uploading"); setHtmlCompError(null);
    try {
      const payload = await readDeliverableFile(file);
      const result = await window.NS_API.uploadWhitepaperFile(
        piece, cluster.id, pillar.id, project.active_month, payload, "html", currentUser.id
      );
      if (!result.ok) { setHtmlCompState("error"); setHtmlCompError(result.error || "Upload failed"); return; }
      updatePiece(cluster.id, piece.id, { wp_has_html: true, last_updated: new Date().toISOString(), last_updated_by: currentUser.id });
      setHtmlCompState("done");
    } catch (e) {
      setHtmlCompState("error"); setHtmlCompError(e.message || "Upload failed");
    }
  }
  function githubPathForAP(slot) {
    if (isWP_AP) return `content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/deliverable-v${rev}.${slot}`;
    return `content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}/${deliverableFileName(piece)}`;
  }
  const githubPath = isWP_AP ? githubPathForAP(activeSlot_AP) : githubPathForAP("primary");
  const pieceLike_AP = isWP_AP && activeSlot_AP === "html" ? { ...piece, deliverable_ext: "html" } : piece;

  const [srcdoc, setSrcdoc] = useStateTR(null);
  const [kind, setKind] = useStateTR("html");
  const [loading, setLoading] = useStateTR(true);
  const [error, setError] = useStateTR(null);
  const [commentText, setCommentText] = useStateTR("");
  const [section, setSection] = useStateTR("");
  const [submitting, setSubmitting] = useStateTR(false);
  const [submitted, setSubmitted] = useStateTR(false);
  const [frameReady, setFrameReady] = useStateTR(false);
  const [focusLine, setFocusLine] = useStateTR(null);
  const iframeRef = useRefTR(null);

  const allAnnotations = ((project.feedback || {})[piece.id] || []).filter(f => f.annotation);
  const currentRev = piece.revision_count || 1;
  const existingAnnotations = allAnnotations.filter(f => (f.revision || 1) === currentRev);
  const staleAnnotations = allAnnotations.filter(f => (f.revision || 1) < currentRev);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  // Group comments by anchored paragraph so we can drop a visible pin on each.
  const pins = (() => {
    const m = {};
    existingAnnotations.forEach(a => {
      const num = a.section ? parseInt(String(a.section).replace(/[^0-9]/g, ""), 10) : null;
      if (num) m[num] = (m[num] || 0) + 1;
    });
    return Object.keys(m).map(k => ({ lineNum: +k, count: m[k] }));
  })();

  // Messages from the iframe: a paragraph was clicked (anchor a new comment),
  // a pin was clicked (focus its comment), or the frame is ready for pins.
  React.useEffect(() => {
    function onMsg(e) {
      if (!e.data) return;
      if (e.data.type === "__ns_line_click") {
        setSection(`¶${e.data.lineNum}${e.data.excerpt ? ` — "${e.data.excerpt.slice(0,40)}…"` : ""}`);
      } else if (e.data.type === "__ns_ready") {
        setFrameReady(true);
      } else if (e.data.type === "__ns_pin_click") {
        setFocusLine(e.data.lineNum);
        setTimeout(() => setFocusLine(null), 2600);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Push pins into the iframe once it's ready and whenever comments change.
  React.useEffect(() => {
    if (frameReady && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "__ns_set_pins", pins }, "*");
    }
  }, [frameReady, srcdoc, JSON.stringify(pins)]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setSrcdoc(null); setFrameReady(false);
    fetch(`/api/github?path=${encodeURIComponent(githubPath)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        const { url, kind: k } = deliverableBlobFromGithub(data, pieceLike_AP);
        setKind(k);
        setSrcdoc(url);
        setLoading(false);
      })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [githubPath]);

  async function submitAnnotation() {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const entry = {
      id: "ann-"+Math.random().toString(36).slice(2,8),
      author: currentUser.id,
      verdict: "question",
      body: commentText.trim(),
      ts: new Date().toISOString(),
      annotation: true,
      section: section.trim() || "General",
      revision: currentRev,
    };
    addFeedback(piece.id, entry);
    await new Promise(r => setTimeout(r, 300));
    setCommentText(""); setSection(""); setSubmitting(false); setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* iframe left */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", borderRight: "1px solid #e8e3da" }}>
        {/* top bar */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 16px", background:"#f0f7ff", borderBottom:"1px solid #c5ddef", flexShrink:0 }}>
          {isWP_AP && (
            <div style={{ display:"flex", gap:"4px", flexShrink:0 }}>
              {["pdf","html"].map(slot => (
                <button key={slot} onClick={() => setActiveSlot_AP(slot)} style={{
                  fontFamily:"Noto Sans,sans-serif", fontSize:"0.65rem", fontWeight:700, padding:"3px 8px", borderRadius:"3px",
                  border:"1px solid #c5ddef", cursor:"pointer", textTransform:"uppercase",
                  background: activeSlot_AP===slot ? "#1a3a52" : "#fff",
                  color: activeSlot_AP===slot ? "#fff" : "#6b8fa8", transition:"all 0.12s",
                }}>{slot}</button>
              ))}
            </div>
          )}
          <span style={{ ...FONT, fontSize:"0.72rem", fontWeight:600, color:"#1a3a52" }}>
            {isWP_AP ? `deliverable-v${rev}.${activeSlot_AP}` : deliverableFileName(piece)}
          </span>
          <span style={{ ...FONT, fontSize:"0.68rem", color:"#6b8fa8", flex: 1 }}>
            {kind === "html"
              ? "— Click anywhere on a paragraph to pin a comment there →"
              : kind === "pdf"
                ? "— PDF preview · inline pins are available on HTML deliverables"
                : "— Preview not available for this file type"}
          </span>
          {canAddHtmlCompanion && (
            <>
              <input ref={htmlCompRef} type="file" accept=".html,.htm" hidden onChange={e => e.target.files?.[0] && handleHtmlCompanion(e.target.files[0])} />
              <button
                onClick={() => htmlCompState !== "uploading" && htmlCompRef.current?.click()}
                style={{
                  ...FONT, flexShrink:0, fontSize:"0.66rem", fontWeight:700, padding:"4px 10px", borderRadius:"3px", cursor: htmlCompState === "uploading" ? "wait" : "pointer",
                  border:"1px solid #c5ddef",
                  background: htmlCompState === "done" ? "#e6f5ec" : htmlCompState === "error" ? "#fdeee8" : "#fff",
                  color: htmlCompState === "done" ? "#1e7a45" : htmlCompState === "error" ? "#c8401a" : "#1a3a52",
                  transition:"all 0.12s", whiteSpace:"nowrap",
                }}
              >
                {htmlCompState === "uploading" ? "Uploading…" : htmlCompState === "done" ? "✓ HTML added" : htmlCompState === "error" ? `✕ ${htmlCompError}` : "+ Add HTML companion"}
              </button>
            </>
          )}
        </div>
        <div style={{ position:"absolute", top:"41px", bottom:0, left:0, right:0, background:"#fff" }}>
          {loading && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#faf8f4" }}>
              <span style={{ ...FONT, fontSize:"0.82rem", color:"#888" }}>Loading preview…</span>
            </div>
          )}
          {error && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"8px", background:"#faf8f4" }}>
              <span style={{ ...FONT, fontSize:"0.82rem", color:"#b91c1c" }}>Could not load preview</span>
              <span style={{ ...FONT, fontSize:"0.72rem", color:"#888" }}>{error}</span>
            </div>
          )}
          {srcdoc && kind === "other" && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"8px", background:"#faf8f4" }}>
              <span style={{ ...FONT, fontSize:"0.82rem", color:"#555" }}>Inline preview isn't available for .{isWP_AP ? activeSlot_AP : deliverableExt(piece)} files.</span>
              <span style={{ ...FONT, fontSize:"0.72rem", color:"#888" }}>Comments here are saved to the Notes thread.</span>
            </div>
          )}
          {srcdoc && kind !== "other" && (
            <ScaledFrame
              iframeRef={iframeRef}
              src={srcdoc}
              pdf={kind === "pdf"}
              title={`Annotate: ${piece.title}`}
            />
          )}
        </div>
      </div>

      {/* comment sidebar right */}
      <div style={{ width:"300px", flexShrink:0, display:"flex", flexDirection:"column", background:"#faf9f7" }}>
        {/* new comment form */}
        <div style={{ padding:"16px", borderBottom:"1px solid #e8e3da" }}>
          <div style={{ ...FONT, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#888", marginBottom:"10px" }}>
            Add Comment
          </div>
          <input
            value={section}
            onChange={e => setSection(e.target.value)}
            placeholder="Click a paragraph in the preview to pin here, or type a section name…"
            style={{ ...FONT, width:"100%", fontSize:"0.78rem", padding:"7px 10px", border:"1px solid #d4cfc8", borderRadius:"3px", marginBottom:"8px", background:"#fff", color:"#0d0d0d", boxSizing:"border-box" }}
          />
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Your comment — be specific about what to change and why."
            rows={4}
            style={{ ...FONT, width:"100%", fontSize:"0.78rem", padding:"7px 10px", border:"1px solid #d4cfc8", borderRadius:"3px", resize:"vertical", background:"#fff", color:"#0d0d0d", boxSizing:"border-box", lineHeight:1.5 }}
          />
          <button
            onClick={submitAnnotation}
            disabled={submitting || !commentText.trim()}
            style={{ ...FONT, marginTop:"8px", width:"100%", padding:"8px", fontSize:"0.78rem", fontWeight:600, background: submitted?"#1e7a45":"#c8401a", color:"#fff", border:"none", borderRadius:"3px", cursor: commentText.trim()?"pointer":"not-allowed", opacity: commentText.trim()?1:0.5, transition:"background 0.2s" }}>
            {submitted ? "Comment Added ✓" : submitting ? "Adding…" : "Add Comment →"}
          </button>
          <div style={{ ...FONT, fontSize:"0.68rem", color:"#aaa", marginTop:"6px", lineHeight:1.4 }}>
            Comments are tagged to your name and saved to the Notes thread.
          </div>
        </div>

        {/* existing inline annotations */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
          {/* helper to scroll iframe to a paragraph number */}
          {/* current-version comments */}
          <div style={{ ...FONT, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#888", marginBottom:"10px" }}>
            Inline Comments {existingAnnotations.length > 0 && `(${existingAnnotations.length})`}
          </div>
          {existingAnnotations.length === 0 ? (
            <div style={{ ...FONT, fontSize:"0.78rem", color:"#bbb", lineHeight:1.5 }}>
              No inline comments yet. Add one above.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {existingAnnotations.map(ann => {
                const all = [...(project.team.ns||[]), ...(project.team.jaggaer||[])];
                const author = all.find(a => a.id === ann.author) || { name: ann.author };
                const date = new Date(ann.ts);
                const dateStr = date.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) + " · " + date.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
                const paraNum = ann.section ? parseInt(ann.section.replace("¶","")) : null;
                function scrollToLine() {
                  if (!paraNum || !iframeRef.current) return;
                  iframeRef.current.contentWindow.postMessage({ type:"__ns_scroll_to", lineNum: paraNum }, "*");
                }
                return (
                  <div key={ann.id}
                    onClick={paraNum ? scrollToLine : undefined}
                    style={{ background: focusLine && focusLine === paraNum ? "#fff8f0" : "#fff", border:"1px solid #e8e3da", borderLeft:"3px solid #c8401a", borderRadius:"0 3px 3px 0", padding:"10px 12px", cursor: paraNum ? "pointer" : "default", transition:"box-shadow 0.15s, background 0.15s", boxShadow: focusLine && focusLine === paraNum ? "0 2px 8px rgba(200,64,26,0.25)" : "none" }}
                    onMouseEnter={e => { if (paraNum) e.currentTarget.style.boxShadow = "0 2px 8px rgba(200,64,26,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = (focusLine && focusLine === paraNum) ? "0 2px 8px rgba(200,64,26,0.25)" : "none"; }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
                      <span style={{ ...FONT, fontSize:"0.7rem", fontWeight:600, color:"#1a2535" }}>{author.name.split(" ")[0]}</span>
                      <span style={{ ...FONT, fontSize:"0.65rem", color:"#aaa" }}>{dateStr}</span>
                    </div>
                    {ann.section && ann.section !== "General" && (
                      <div style={{ ...FONT, fontSize:"0.65rem", color:"#c8401a", fontWeight:600, marginBottom:"4px", letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:"4px" }}>
                        {ann.section}
                        {paraNum && <span style={{ fontSize:"0.6rem", color:"#e0a898" }}>↑ click to jump</span>}
                      </div>
                    )}
                    <p style={{ ...FONT, fontSize:"0.78rem", color:"#444", lineHeight:1.5, margin:0 }}>{ann.body}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* stale comments from previous versions */}
          {staleAnnotations.length > 0 && (
            <details style={{ marginTop:"18px" }}>
              <summary style={{ ...FONT, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#bbb", cursor:"pointer", userSelect:"none", marginBottom:"8px", listStyle:"none", display:"flex", alignItems:"center", gap:"6px" }}>
                <span>▸</span>
                <span>Previous versions ({staleAnnotations.length})</span>
              </summary>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"8px" }}>
                {staleAnnotations.map(ann => {
                  const all = [...(project.team.ns||[]), ...(project.team.jaggaer||[])];
                  const author = all.find(a => a.id === ann.author) || { name: ann.author };
                  const date = new Date(ann.ts);
                  const dateStr = date.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
                  return (
                    <div key={ann.id} style={{ background:"#faf9f7", border:"1px solid #ece8e1", borderLeft:"3px solid #d4cfc8", borderRadius:"0 3px 3px 0", padding:"8px 10px", opacity:0.75 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"3px" }}>
                        <span style={{ ...FONT, fontSize:"0.68rem", fontWeight:600, color:"#888" }}>{author.name.split(" ")[0]}</span>
                        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                          <span style={{ ...FONT, fontSize:"0.6rem", background:"#e8e3da", color:"#888", padding:"1px 5px", borderRadius:"2px", fontWeight:600 }}>v{ann.revision || 1}</span>
                          <span style={{ ...FONT, fontSize:"0.62rem", color:"#bbb" }}>{dateStr}</span>
                        </div>
                      </div>
                      {ann.section && ann.section !== "General" && (
                        <div style={{ ...FONT, fontSize:"0.63rem", color:"#b0a89e", fontWeight:600, marginBottom:"3px" }}>{ann.section}</div>
                      )}
                      <p style={{ ...FONT, fontSize:"0.75rem", color:"#888", lineHeight:1.5, margin:0 }}>{ann.body}</p>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

window.Tracker = Tracker;
window.CsvSyncPanel = CsvSyncPanel;
window.projectToCsv = projectToCsv;
window.csvToProjectUpdates = csvToProjectUpdates;
window.STATUS_META = STATUS_META;
window.VERDICT_META = VERDICT_META;
// PUBLISHING_SEQUENCE and INTERLINK_MAP now live in project.json — read via props.
