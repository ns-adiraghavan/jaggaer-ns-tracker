// briefs-priority.jsx — "Briefs & Topics" tab: the one place to submit briefs and new topics.
// Open to every signed-in user (NS and Jaggaer). Additive only:
//   • New topic: title + optional week, keyword, notes, brief file. A week puts the topic
//     in that existing weekly cluster (standard pipeline); no week = Ad-Hoc article.
//   • Brief upload on any row behaves like the in-piece "Upload Brief" tab:
//     Not Started → Brief Uploaded (ad-hoc pieces / later stages: file is attached only).
//   • Priority P1/P2/P3 is an optional piece field (missing = Unassigned), not a workflow
//     stage. Only Jaggaer users and admin can change it; everyone can see it.
// Depends on: window.NS_API.uploadBriefFile (api.js). Names are BP-prefixed to avoid
// global collisions (scripts load without a bundler).

const { useState: useBPState, useMemo: useBPMemo, useRef: useBPRef } = React;
const BPFONT = { fontFamily: "Noto Sans, sans-serif" };

const BP_PRIORITIES = [
  { id: "P1", label: "P1", color: "#b42318", bg: "#fdeceb" },
  { id: "P2", label: "P2", color: "#b05e00", bg: "#fef3e8" },
  { id: "P3", label: "P3", color: "#1e4fa8", bg: "#eaf0fb" },
];
const BP_RANK = { P1: 0, P2: 1, P3: 2 };

function bpStatusMeta(status) {
  try {
    if (typeof STATUS_META !== "undefined" && STATUS_META[status]) return STATUS_META[status];
  } catch {}
  return { label: status, color: "#555", bg: "#eee" };
}

function bpStatusLabel(piece, project) {
  try {
    if (window.NS_statusLabelFor) {
      const l = window.NS_statusLabelFor(piece, project);
      if (l) return l;
    }
  } catch {}
  return bpStatusMeta(piece.status).label;
}

function bpNorm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// ── New-topic modal (same look as the Ad-Hoc modal) ─────────────────────────
function BPNewTopicModal({ weeks, existingTitles, onClose, onCreate }) {
  const [title, setTitle] = useBPState("");
  const [clusterId, setClusterId] = useBPState("");   // "" = ad-hoc
  const [keyword, setKeyword] = useBPState("");
  const [notes, setNotes] = useBPState("");
  const [file, setFile] = useBPState(null);
  const [busy, setBusy] = useBPState(false);
  const fileRef = useBPRef(null);
  const dup = title.trim() && existingTitles.has(bpNorm(title));
  const field = { ...BPFONT, fontSize: "0.85rem", width: "100%", border: "1px solid #e8e3da", borderRadius: "3px", padding: "9px 12px", outline: "none", boxSizing: "border-box", background: "#fff" };
  const lab = { ...BPFONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", margin: "14px 0 6px" };

  async function submit() {
    if (!title.trim() || busy) return;
    setBusy(true);
    await onCreate({ title: title.trim(), clusterId, keyword: keyword.trim(), notes: notes.trim(), file });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,32,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={busy ? undefined : onClose}>
      <div style={{ background: "#fff", borderRadius: "5px", padding: "24px", width: "500px", maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ ...BPFONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>New topic</div>
        <p style={{ ...BPFONT, fontSize: "0.78rem", color: "#666", marginTop: 0, marginBottom: "6px", lineHeight: 1.5 }}>
          Add a topic and (optionally) its brief in one go. Pick a week to slot it into the calendar, or leave the week blank to add it as an Ad-Hoc article.
        </p>

        <div style={lab}>Topic / working title</div>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article topic" style={field}
          onKeyDown={e => { if (e.key === "Enter") submit(); }} />
        {dup && <div style={{ ...BPFONT, fontSize: "0.72rem", color: "#b05e00", marginTop: "5px" }}>A piece with this title already exists in the tracker. Check it isn't a duplicate before adding.</div>}

        <div style={lab}>Week <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(blank = Ad-Hoc)</span></div>
        <select value={clusterId} onChange={e => setClusterId(e.target.value)} style={field}>
          <option value="">No week — Ad-Hoc article</option>
          {weeks.map(w => <option key={w.cluster.id} value={w.cluster.id}>{w.cluster.label}{w.pillar.label ? " · " + w.pillar.label : ""}</option>)}
        </select>

        <div style={lab}>Primary keyword <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
        <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} style={field} />

        <div style={lab}>Notes <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...field, resize: "vertical" }} />

        <div style={lab}>Brief <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
        <input type="file" ref={fileRef} style={{ display: "none" }} onChange={e => setFile(e.target.files && e.target.files[0] || null)} />
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} style={{ ...BPFONT, fontSize: "0.74rem", fontWeight: 700, padding: "7px 12px", borderRadius: "3px", cursor: "pointer", border: "1px solid #0f1923", background: "#fff", color: "#0f1923" }}>
            {file ? "Change file" : "Choose brief file"}
          </button>
          <span style={{ ...BPFONT, fontSize: "0.76rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file ? file.name : "No file chosen"}</span>
        </div>
        {file && !clusterId && <div style={{ ...BPFONT, fontSize: "0.72rem", color: "#888", marginTop: "6px" }}>Ad-Hoc articles have no brief step, so the brief is attached to the piece without changing its status.</div>}
        {file && clusterId && <div style={{ ...BPFONT, fontSize: "0.72rem", color: "#888", marginTop: "6px" }}>The topic will be created as <strong>Brief Uploaded</strong>.</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
          <button onClick={onClose} disabled={busy} style={{ ...BPFONT, fontSize: "0.78rem", fontWeight: 600, color: "#888", background: "none", border: "none", cursor: "pointer", padding: "8px 10px" }}>Cancel</button>
          <button onClick={submit} disabled={!title.trim() || busy} style={{ ...BPFONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: title.trim() && !busy ? "#c8401a" : "#e0d8cc", border: "none", borderRadius: "3px", padding: "9px 18px", cursor: title.trim() && !busy ? "pointer" : "default" }}>
            {busy ? "Adding…" : file ? "Add topic + brief" : "Add topic"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefsPriorityPanel({ project, setProject, currentUser, adminMode, activePhase, onOpenPiece }) {
  const canUpload = !!currentUser;                                          // anyone signed in
  const canPrioritise = currentUser?.org === "jaggaer" || !!adminMode;     // Jaggaer + admin only
  const [scope, setScope] = useBPState("phase");      // 'phase' | 'all'
  const [pfilter, setPfilter] = useBPState("all");    // all | unassigned | P1 | P2 | P3
  const [query, setQuery] = useBPState("");
  const [busy, setBusy] = useBPState({});             // pieceId -> true while uploading
  const [errors, setErrors] = useBPState({});         // pieceId -> message
  const [showNew, setShowNew] = useBPState(false);
  const [priOpen, setPriOpen] = useBPState(null);       // pieceId whose priority tray is open
  const [notice, setNotice] = useBPState(null);       // { kind: 'ok'|'warn', text }
  const fileRefs = useBPRef({});
  const phase = activePhase || 1;

  const rows = useBPMemo(() => {
    const out = [];
    for (const pl of project.pillars || [])
      for (const c of pl.clusters || [])
        for (const pc of c.pieces || []) {
          if (pc.status === "live") continue;
          if (scope === "phase" && (pc.phase || 1) !== phase) continue;
          out.push({ piece: pc, cluster: c, pillar: pl });
        }
    return out;
  }, [project, scope, phase]);

  // Weeks a new topic can be slotted into: clusters of the active phase's pillars.
  const weeks = useBPMemo(() => {
    const out = [];
    for (const pl of project.pillars || []) {
      if (pl.id === "ad-hoc-articles" || (pl.phase || 1) !== phase) continue;
      for (const c of pl.clusters || []) out.push({ cluster: c, pillar: pl });
    }
    return out.sort((a, b) => (a.pillar.sequence || 0) - (b.pillar.sequence || 0) || (a.cluster.sequence || 0) - (b.cluster.sequence || 0));
  }, [project, phase]);

  const existingTitles = useBPMemo(() => {
    const s = new Set();
    for (const pl of project.pillars || []) for (const c of pl.clusters || []) for (const pc of c.pieces || []) s.add(bpNorm(pc.title));
    return s;
  }, [project]);

  const counts = useBPMemo(() => {
    const n = { all: rows.length, unassigned: 0, P1: 0, P2: 0, P3: 0 };
    rows.forEach(r => { const p = r.piece.priority; if (BP_RANK[p] !== undefined) n[p]++; else n.unassigned++; });
    return n;
  }, [rows]);

  const visible = useBPMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(r => {
        const p = r.piece.priority;
        if (pfilter === "unassigned" && BP_RANK[p] !== undefined) return false;
        if (BP_RANK[pfilter] !== undefined && p !== pfilter) return false;
        if (!q) return true;
        return (r.piece.title || "").toLowerCase().includes(q) ||
               (r.cluster.label || "").toLowerCase().includes(q) ||
               (r.piece.primary_keyword || "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ra = BP_RANK[a.piece.priority] ?? 9, rb = BP_RANK[b.piece.priority] ?? 9;
        if (ra !== rb) return ra - rb;
        return (a.piece.title || "").localeCompare(b.piece.title || "");
      });
  }, [rows, pfilter, query]);

  function patchPiece(pieceId, fn) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) for (const c of p.clusters) {
        const pc = c.pieces.find(x => x.id === pieceId);
        if (pc) fn(pc);
      }
      return next;
    });
  }

  function setPriority(pieceId, value) {
    if (!canPrioritise) return;
    const now = new Date().toISOString();
    patchPiece(pieceId, pc => {
      if (value) pc.priority = value; else delete pc.priority;
      pc.priority_updated = now;
      pc.priority_updated_by = currentUser.id;
    });
  }

  // Upload a brief file for a piece and record it. Returns { ok, error }.
  async function attachBrief(pieceRef, file) {
    const { piece, clusterId, pillarId } = pieceRef;
    try {
      const result = await window.NS_API.uploadBriefFile(piece, clusterId, pillarId, project.active_month, file, currentUser.id);
      if (!result || !result.ok) throw new Error((result && result.error) || "Upload failed");
      const now = new Date().toISOString();
      const record = { filename: file.name, path: result.path, uploaded_by: currentUser.id, uploaded_at: now };
      patchPiece(piece.id, pc => {
        pc.brief_files = [...(pc.brief_files || []), record];
        pc.brief_last_updated = now;
        pc.last_updated = now;
        pc.last_updated_by = currentUser.id;
        // Same transition as the in-piece Upload Brief tab (not for ad-hoc pieces).
        if (pc.status === "not-started" && pc.content_type !== "ad-hoc") {
          pc.status = "brief-uploaded";
          pc.last_upload = now;
          pc.last_upload_by = currentUser.id;
        }
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Upload failed" };
    }
  }

  async function handleRowFile(row, file) {
    if (!canUpload || !file) return;
    const { piece, cluster, pillar } = row;
    setBusy(b => ({ ...b, [piece.id]: true }));
    setErrors(e => { const n = { ...e }; delete n[piece.id]; return n; });
    const r = await attachBrief({ piece, clusterId: cluster.id, pillarId: pillar.id }, file);
    if (!r.ok) setErrors(er => ({ ...er, [piece.id]: r.error }));
    setBusy(b => { const n = { ...b }; delete n[piece.id]; return n; });
    if (fileRefs.current[piece.id]) fileRefs.current[piece.id].value = "";
  }

  // Create a topic: into the chosen weekly cluster (standard pipeline) or as Ad-Hoc.
  async function createTopic({ title, clusterId, keyword, notes, file }) {
    const now = new Date().toISOString();
    const newId = "piece-" + Math.random().toString(36).slice(2, 8);
    const adhoc = !clusterId;
    let pillarId, targetClusterId, whereLabel;

    if (adhoc) {
      pillarId = "ad-hoc-articles"; targetClusterId = "c-ad-hoc"; whereLabel = "Ad-Hoc";
    } else {
      const w = weeks.find(x => x.cluster.id === clusterId);
      if (!w) { setShowNew(false); setNotice({ kind: "warn", text: "That week no longer exists — nothing was added." }); return; }
      pillarId = w.pillar.id; targetClusterId = clusterId; whereLabel = w.cluster.label;
    }

    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let piece;
      if (adhoc) {
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
        piece = {
          id: newId, title, format: "Ad-Hoc Article", assignee: currentUser?.id || "",
          status: "not-started", content_type: "ad-hoc", phase,
          schedule_month: window.NS_phaseMonth ? window.NS_phaseMonth(next, phase) : next.active_month,
          revision_count: 0, primary_keyword: keyword, geography: "all",
        };
        cluster.pieces.push(piece);
      } else {
        const pillar = next.pillars.find(p => p.id === pillarId);
        const cluster = pillar.clusters.find(c => c.id === targetClusterId);
        // Borrow structural defaults (format / content type / tier / week number) from a sibling piece.
        const sib = (cluster.pieces || [])[0] || ((pillar.clusters || []).flatMap(c => c.pieces || [])[0]) || {};
        const wk = sib.schedule_week != null && (cluster.pieces || []).length ? sib.schedule_week : (/-w(\d+)$/.exec(cluster.id) || [])[1];
        piece = {
          id: newId, title, format: sib.format || "Article", assignee: "",
          status: "not-started", content_type: sib.content_type || "seo", phase: pillar.phase || phase,
          tier: sib.tier || "", primary_keyword: keyword, secondary_keyword: "", intent: "", funnel: "",
          geography: "all", revision_count: 0,
          schedule_month: cluster.month_id || undefined,
        };
        if (wk != null && wk !== "") piece.schedule_week = Number(wk);
        cluster.pieces.push(piece);
      }
      if (notes) piece.notes = notes;
      piece.created_via = "briefs-tab";
      piece.status_history = [{ stage: "not-started", ts: now, by: currentUser?.id || null }];
      piece.last_updated = now;
      piece.last_updated_by = currentUser?.id || null;
      return next;
    });

    let text = `Added “${title}” → ${whereLabel}.`;
    let kind = "ok";
    if (file) {
      const stub = { id: newId };
      const r = await attachBrief({ piece: stub, clusterId: targetClusterId, pillarId }, file);
      if (r.ok) text += adhoc ? " Brief attached." : " Brief uploaded.";
      else { kind = "warn"; text += ` The brief upload failed (${r.error}) — open the topic and upload it again.`; }
    }
    setShowNew(false);
    setPfilter("all"); setQuery("");
    setNotice({ kind, text });
  }

  const chip = (id, label, n) => (
    <button key={id} onClick={() => setPfilter(id)} style={{
      padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid " + (pfilter === id ? "#0f1923" : "#ddd6c8"),
      borderRadius: "999px", cursor: "pointer", background: pfilter === id ? "#0f1923" : "#fff",
      color: pfilter === id ? "#fff" : "#555",
    }}>{label} <span style={{ opacity: 0.65 }}>{n}</span></button>
  );

  return (
    <div style={{ ...BPFONT, padding: "28px 32px 80px", maxWidth: "1100px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "6px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#0f1923", margin: 0 }}>Briefs &amp; Topics</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px", background: "#f0ece4", borderRadius: "3px", padding: "2px" }}>
            {[["phase", "This phase"], ["all", "All phases"]].map(([id, label]) => (
              <button key={id} onClick={() => setScope(id)} style={{
                padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em",
                border: "none", borderRadius: "2px", cursor: "pointer",
                background: scope === id ? "#fff" : "transparent", color: scope === id ? "#0f1923" : "#888",
                boxShadow: scope === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{label}</button>
            ))}
          </div>
          {canUpload && (
            <button onClick={() => { setNotice(null); setShowNew(true); }} style={{ ...BPFONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: "#c8401a", border: "none", borderRadius: "3px", padding: "8px 16px", cursor: "pointer" }}>
              + New topic
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: "0.82rem", color: "#666", margin: "0 0 18px", lineHeight: 1.5 }}>
        Upload briefs and add new topics here, or from inside the piece as usual.
        Uploading a brief to a <strong>Not Started</strong> piece moves it to <strong>Brief Uploaded</strong>.
        {canPrioritise ? " Priority is optional — use Assign priority on a row if you want to rank it." : " Priorities, where set, are shown read-only."}
      </p>

      {notice && (
        <div style={{ ...BPFONT, fontSize: "0.8rem", padding: "10px 14px", marginBottom: "14px", borderRadius: "3px", display: "flex", justifyContent: "space-between", gap: "12px",
          background: notice.kind === "ok" ? "#e6f5ec" : "#fef3e8", color: notice.kind === "ok" ? "#1e7a45" : "#b05e00", border: "1px solid " + (notice.kind === "ok" ? "#bfe3cc" : "#f0cfa6") }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or keyword…"
          style={{ padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #ddd6c8", borderRadius: "3px", minWidth: "240px", ...BPFONT }}
        />
        <span style={{ marginLeft: "auto", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>Priority filter</span>
        {chip("all", "All", counts.all)}
        {chip("unassigned", "Unassigned", counts.unassigned)}
        {BP_PRIORITIES.map(p => chip(p.id, p.label, counts[p.id]))}
      </div>

      {visible.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "#888", fontSize: "0.85rem", border: "1px dashed #ddd6c8", borderRadius: "4px" }}>
          No pieces match this view.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {visible.map(row => {
          const { piece, cluster, pillar } = row;
          const meta = bpStatusMeta(piece.status);
          const files = piece.brief_files || [];
          const isBusy = !!busy[piece.id];
          const moves = piece.status === "not-started" && piece.content_type !== "ad-hoc";
          const pr = BP_RANK[piece.priority] !== undefined ? BP_PRIORITIES[BP_RANK[piece.priority]] : null;
          return (
            <div key={piece.id} style={{
              display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto auto", gap: "14px", alignItems: "center",
              padding: "12px 14px", background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px",
            }}>
              <div style={{ minWidth: 0 }}>
                <div
                  onClick={onOpenPiece ? () => onOpenPiece(cluster.id, piece.id, pillar.id, piece.phase || 1) : undefined}
                  style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f1923", cursor: onOpenPiece ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={piece.title}
                >{piece.title}</div>
                <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pillar.label || pillar.id} · {cluster.label || cluster.id}
                  {files.length > 0 && <span> · {files.length} brief file{files.length === 1 ? "" : "s"}</span>}
                </div>
                {errors[piece.id] && <div style={{ fontSize: "0.72rem", color: "#b42318", marginTop: "3px" }}>Upload failed: {errors[piece.id]}</div>}
              </div>

              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: "999px", color: meta.color, background: meta.bg, whiteSpace: "nowrap" }}>
                {bpStatusLabel(piece, project)}
              </span>

              <div>
                {canUpload && (
                  <>
                    <input
                      type="file" style={{ display: "none" }}
                      ref={el => { fileRefs.current[piece.id] = el; }}
                      onChange={e => handleRowFile(row, e.target.files && e.target.files[0])}
                    />
                    <button
                      disabled={isBusy}
                      onClick={() => fileRefs.current[piece.id] && fileRefs.current[piece.id].click()}
                      title={moves ? "Uploads the brief and moves the piece to Brief Uploaded" : "Attaches the brief to this piece"}
                      style={{
                        padding: "7px 14px", fontSize: "0.76rem", fontWeight: 700, borderRadius: "3px", cursor: isBusy ? "wait" : "pointer",
                        border: "1px solid #0f1923", background: moves ? "#0f1923" : "#fff", color: moves ? "#fff" : "#0f1923", whiteSpace: "nowrap",
                      }}
                    >{isBusy ? "Uploading…" : files.length ? "Add brief" : "Upload brief"}</button>
                  </>
                )}
              </div>

              {/* Priority is optional and secondary: a quiet button (Jaggaer/admin), or a read-only badge once set. */}
              <div style={{ minWidth: "118px", textAlign: "right" }}>
                {canPrioritise ? (
                  <button
                    onClick={() => setPriOpen(priOpen === piece.id ? null : piece.id)}
                    style={{
                      padding: "5px 10px", fontSize: "0.7rem", fontWeight: 700, borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap", ...BPFONT,
                      ...(pr ? { border: "1px solid " + pr.color, color: pr.color, background: pr.bg } : { border: "1px dashed #c9c2b4", color: "#888", background: "transparent" }),
                    }}
                  >{pr ? pr.label + " ▾" : "Assign priority"}</button>
                ) : (
                  pr && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 9px", borderRadius: "3px", color: pr.color, background: pr.bg }}>{pr.label}</span>
                )}
              </div>

              {canPrioritise && priOpen === piece.id && (
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "10px", borderTop: "1px solid #f0ece4" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888" }}>Priority</span>
                  {BP_PRIORITIES.map(o => (
                    <button key={o.id} onClick={() => { setPriority(piece.id, o.id); setPriOpen(null); }} style={{
                      padding: "5px 16px", fontSize: "0.78rem", fontWeight: 700, borderRadius: "3px", cursor: "pointer", ...BPFONT,
                      border: "1px solid " + o.color, color: piece.priority === o.id ? "#fff" : o.color, background: piece.priority === o.id ? o.color : o.bg,
                    }}>{o.label}</button>
                  ))}
                  {pr && <button onClick={() => { setPriority(piece.id, ""); setPriOpen(null); }} style={{ padding: "5px 10px", fontSize: "0.72rem", fontWeight: 600, border: "none", background: "none", color: "#888", cursor: "pointer", textDecoration: "underline" }}>Clear</button>}
                  <button onClick={() => setPriOpen(null)} style={{ marginLeft: "auto", padding: "5px 8px", fontSize: "0.72rem", border: "none", background: "none", color: "#aaa", cursor: "pointer" }}>Close</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && <BPNewTopicModal weeks={weeks} existingTitles={existingTitles} onClose={() => setShowNew(false)} onCreate={createTopic} />}
    </div>
  );
}
