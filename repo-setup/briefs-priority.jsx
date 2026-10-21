// briefs-priority.jsx — "Briefs & Priority" tab (Jaggaer + admin only).
// Lists every piece that is not Live. Lets Jaggaer set a P1/P2/P3 priority and
// upload a brief without opening the piece. Additive only:
//   • priority is an optional piece field (missing = Unassigned) — no workflow stage
//   • a brief upload here behaves exactly like the in-piece "Upload Brief" tab:
//     Not Started → Brief Uploaded (ad-hoc pieces / later stages: file is attached only)
// Depends on: window.NS_API.uploadBriefFile (api.js). All names are BP-prefixed
// to avoid global collisions (scripts load without a bundler).

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

function BriefsPriorityPanel({ project, setProject, currentUser, adminMode, activePhase, onOpenPiece }) {
  const canEdit = currentUser?.org === "jaggaer" || !!adminMode;
  const [scope, setScope] = useBPState("phase");      // 'phase' | 'all'
  const [pfilter, setPfilter] = useBPState("all");    // all | unassigned | P1 | P2 | P3
  const [query, setQuery] = useBPState("");
  const [busy, setBusy] = useBPState({});             // pieceId -> true while uploading
  const [errors, setErrors] = useBPState({});         // pieceId -> message
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
    if (!canEdit) return;
    const now = new Date().toISOString();
    patchPiece(pieceId, pc => {
      if (value) pc.priority = value; else delete pc.priority;
      pc.priority_updated = now;
      pc.priority_updated_by = currentUser.id;
    });
  }

  async function handleFile(row, file) {
    if (!canEdit || !file) return;
    const { piece, cluster, pillar } = row;
    setBusy(b => ({ ...b, [piece.id]: true }));
    setErrors(e => { const n = { ...e }; delete n[piece.id]; return n; });
    try {
      const result = await window.NS_API.uploadBriefFile(piece, cluster.id, pillar.id, project.active_month, file, currentUser.id);
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
    } catch (e) {
      setErrors(er => ({ ...er, [piece.id]: e.message || "Upload failed" }));
    } finally {
      setBusy(b => { const n = { ...b }; delete n[piece.id]; return n; });
      if (fileRefs.current[piece.id]) fileRefs.current[piece.id].value = "";
    }
  }

  if (!canEdit) {
    return (
      <div className="ns-admin-locked">
        <div className="ns-eyebrow ns-eyebrow-dark">JAGGAER ONLY</div>
        <p>This tab is available to Jaggaer users and admins.</p>
      </div>
    );
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
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#0f1923", margin: 0 }}>Briefs &amp; Priority</h1>
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
      </div>
      <p style={{ fontSize: "0.82rem", color: "#666", margin: "0 0 18px", lineHeight: 1.5 }}>
        Every piece that isn't live. Set a priority and upload a brief here, or from inside the piece as usual.
        Uploading a brief to a <strong>Not Started</strong> piece moves it to <strong>Brief Uploaded</strong>.
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
        {chip("all", "All", counts.all)}
        {chip("unassigned", "Unassigned", counts.unassigned)}
        {BP_PRIORITIES.map(p => chip(p.id, p.label, counts[p.id]))}
        <input
          value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or keyword…"
          style={{ marginLeft: "auto", padding: "6px 10px", fontSize: "0.8rem", border: "1px solid #ddd6c8", borderRadius: "3px", minWidth: "220px", ...BPFONT }}
        />
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
                {meta.label}
              </span>

              <select
                value={piece.priority || ""} onChange={e => setPriority(piece.id, e.target.value)}
                style={{
                  padding: "5px 8px", fontSize: "0.78rem", fontWeight: 700, borderRadius: "3px", cursor: "pointer",
                  border: "1px solid #ddd6c8", ...BPFONT,
                  ...(BP_RANK[piece.priority] !== undefined
                    ? { color: BP_PRIORITIES[BP_RANK[piece.priority]].color, background: BP_PRIORITIES[BP_RANK[piece.priority]].bg }
                    : { color: "#888", background: "#fff" }),
                }}
              >
                <option value="">Unassigned</option>
                {BP_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>

              <div>
                <input
                  type="file" style={{ display: "none" }}
                  ref={el => { fileRefs.current[piece.id] = el; }}
                  onChange={e => handleFile(row, e.target.files && e.target.files[0])}
                />
                <button
                  disabled={isBusy}
                  onClick={() => fileRefs.current[piece.id] && fileRefs.current[piece.id].click()}
                  title={moves ? "Uploads the brief and moves the piece to Brief Uploaded" : "Attaches the brief to this piece"}
                  style={{
                    padding: "6px 12px", fontSize: "0.74rem", fontWeight: 700, borderRadius: "3px", cursor: isBusy ? "wait" : "pointer",
                    border: "1px solid #0f1923", background: moves ? "#0f1923" : "#fff", color: moves ? "#fff" : "#0f1923", whiteSpace: "nowrap",
                  }}
                >{isBusy ? "Uploading…" : files.length ? "Add brief" : "Upload brief"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
