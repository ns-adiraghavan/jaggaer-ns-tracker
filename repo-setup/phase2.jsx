// phase2.jsx — Phase 2 surfaces: Comments history, Reference (context tabs),
// and the Content-Calendar .xlsx sync (Access-style diff preview → apply).
// Depends on: window.NS_PHASE2 (phase2-logic.js) and window.XLSX (SheetJS CDN).

const { useState: useP2State, useEffect: useP2Effect, useMemo: useP2Memo, useRef: useP2Ref } = React;
const P2FONT = { fontFamily: "Noto Sans, sans-serif" };

// ── Shared helpers ────────────────────────────────────────────────────────────
function p2MemberName(project, id) {
  if (!id) return "—";
  const all = [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
  const m = all.find(x => x.id === id);
  return m ? m.name : id;
}
function p2FormatTs(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "America/New_York", month: "short", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}
const P2_VERDICT = {
  "approved":       { label: "Approved",       color: "#1e7a45", bg: "#e6f5ec" },
  "needs-revision": { label: "Needs revision",  color: "#b05e00", bg: "#fef3e8" },
  "question":       { label: "Comment",         color: "#1e4fa8", bg: "#eaf0fb" },
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. COMMENTS — global feedback history, phase-filtered, click → open piece
// ═══════════════════════════════════════════════════════════════════════════
function CommentsPanel({ project, currentUser, activePhase, onOpenPiece }) {
  const phase = activePhase || 1;
  const [scope, setScope] = useP2State("phase"); // 'phase' | 'all'

  // Build a piece index → { pieceId: { piece, cluster, pillar } }
  const index = useP2Memo(() => {
    const idx = {};
    for (const pl of project.pillars || [])
      for (const c of pl.clusters || [])
        for (const pc of c.pieces || [])
          idx[pc.id] = { piece: pc, cluster: c, pillar: pl };
    return idx;
  }, [project]);

  // Flatten feedback into per-piece groups, newest activity first.
  const groups = useP2Memo(() => {
    const fb = project.feedback || {};
    const out = [];
    for (const pieceId in fb) {
      const entries = fb[pieceId] || [];
      if (!entries.length) continue;
      const ref = index[pieceId];
      if (!ref) continue; // orphan feedback (piece deleted)
      if (scope === "phase" && (ref.piece.phase || 1) !== phase) continue;
      const sorted = [...entries].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
      out.push({ pieceId, ref, entries: sorted, latest: sorted[0]?.ts });
    }
    out.sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0));
    return out;
  }, [project, index, scope, phase]);

  const totalComments = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div style={{ ...P2FONT, padding: "28px 32px 80px", maxWidth: "1000px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "6px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#0f1923", margin: 0 }}>
          Comment history
        </h1>
        <div style={{ display: "flex", gap: "4px", background: "#f0ece4", borderRadius: "3px", padding: "2px" }}>
          {[["phase", "This phase"], ["all", "All phases"]].map(([id, label]) => (
            <button key={id} onClick={() => setScope(id)} style={{
              padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em",
              border: "none", borderRadius: "2px", cursor: "pointer",
              background: scope === id ? "#fff" : "transparent",
              color: scope === id ? "#0f1923" : "#888",
              boxShadow: scope === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: "0.8rem", color: "#8a837a", margin: "0 0 22px" }}>
        {totalComments} comment{totalComments !== 1 ? "s" : ""} across {groups.length} piece{groups.length !== 1 ? "s" : ""}
        {scope === "phase" ? ` · Phase ${phase}` : ""}. Click a piece to open its review drawer.
      </p>

      {groups.length === 0 && (
        <div style={{ padding: "48px", textAlign: "center", color: "#9b948c", fontSize: "0.9rem",
          background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px" }}>
          No comments yet{scope === "phase" ? ` in Phase ${phase}` : ""}.
        </div>
      )}

      {groups.map(g => {
        const { piece, cluster, pillar } = g.ref;
        const ct = CT_DISPLAY[piece.content_type] || null;
        return (
          <div key={g.pieceId} style={{ background: "#fff", border: "1px solid #e8e3da",
            borderRadius: "4px", marginBottom: "14px", overflow: "hidden" }}>
            <button
              onClick={() => onOpenPiece && onOpenPiece(cluster.id, piece.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer",
                background: "#faf8f4", border: "none", borderBottom: "1px solid #eee",
                padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f4efe7"}
              onMouseLeave={e => e.currentTarget.style.background = "#faf8f4"}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f1923",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {piece.title}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#9b948c", marginTop: "2px" }}>
                  {pillar.label} · {cluster.label}
                  <span style={{ marginLeft: "8px", fontWeight: 700,
                    color: (piece.phase || 1) === 2 ? "#8a2be2" : "#1e6fa8" }}>
                    P{piece.phase || 1}
                  </span>
                  {ct && <span style={{ marginLeft: "6px", color: ct.color }}>· {ct.label}</span>}
                </div>
              </div>
              <span style={{ fontSize: "0.66rem", color: "#b0a99e", fontWeight: 700 }}>
                {g.entries.length} comment{g.entries.length !== 1 ? "s" : ""} →
              </span>
            </button>
            <div style={{ padding: "4px 0" }}>
              {g.entries.slice(0, 6).map(e => {
                const v = P2_VERDICT[e.verdict] || P2_VERDICT["question"];
                return (
                  <div key={e.id} style={{ padding: "9px 16px", borderTop: "1px solid #f2efe9", display: "flex", gap: "10px" }}>
                    <div style={{ flexShrink: 0, width: "108px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#333" }}>{p2MemberName(project, e.author)}</div>
                      <div style={{ fontSize: "0.62rem", color: "#b0a99e", marginTop: "1px" }}>{p2FormatTs(e.ts)}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "inline-block", fontSize: "0.58rem", fontWeight: 700,
                        letterSpacing: "0.05em", textTransform: "uppercase", color: v.color,
                        background: v.bg, padding: "1px 7px", borderRadius: "2px", marginRight: "8px" }}>
                        {v.label}
                      </span>
                      {e.section && <span style={{ fontSize: "0.64rem", color: "#b0a99e" }}>{e.section} </span>}
                      <span style={{ fontSize: "0.8rem", color: "#222", lineHeight: 1.5 }}>{e.body}</span>
                    </div>
                  </div>
                );
              })}
              {g.entries.length > 6 && (
                <div style={{ padding: "7px 16px", fontSize: "0.68rem", color: "#9b948c", borderTop: "1px solid #f2efe9" }}>
                  + {g.entries.length - 6} more — open the piece to see all.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.CommentsPanel = CommentsPanel;

// ═══════════════════════════════════════════════════════════════════════════
// 2. REFERENCE — Phase 2 context tabs (keywords, backlog, glossary, …)
// ═══════════════════════════════════════════════════════════════════════════
const P2_REFERENCE_PATH = "config/phase2-reference.json";

function Phase2ReferencePanel() {
  const [state, setState] = useP2State("loading"); // loading | ready | error
  const [ref, setRef] = useP2State(null);
  const [active, setActive] = useP2State(0);
  const [err, setErr] = useP2State("");

  useP2Effect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await window.NS_API.getJsonFile(P2_REFERENCE_PATH);
        if (!alive) return;
        setRef(data); setState("ready");
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e)); setState("error");
      }
    })();
    return () => { alive = false; };
  }, []);

  if (state === "loading")
    return <div style={{ ...P2FONT, padding: "48px", color: "#9b948c" }}>Loading Phase 2 reference…</div>;
  if (state === "error")
    return (
      <div style={{ ...P2FONT, padding: "32px", maxWidth: "760px" }}>
        <div style={{ background: "#fff5f5", border: "1px solid #f0bba8", borderRadius: "4px", padding: "18px 22px" }}>
          <div style={{ fontWeight: 700, color: "#c8401a", marginBottom: "6px" }}>Reference file not available</div>
          <div style={{ fontSize: "0.82rem", color: "#666" }}>
            Could not load <code>{P2_REFERENCE_PATH}</code> ({err}). It is written on the first calendar sync.
          </div>
        </div>
      </div>
    );

  const tabs = (ref && ref.tabs) || [];
  const cur = tabs[active] || null;

  return (
    <div style={{ ...P2FONT, display: "flex", height: "calc(100vh - 36px)", overflow: "hidden" }}>
      {/* Tab rail */}
      <div style={{ width: "248px", flexShrink: 0, borderRight: "1px solid #e8e3da",
        overflowY: "auto", background: "#faf8f4", padding: "18px 0" }}>
        <div style={{ padding: "0 18px 10px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#b0a99e" }}>Phase 2 Reference</div>
        {tabs.map((t, i) => (
          <button key={t.sheet} onClick={() => setActive(i)} style={{
            width: "100%", textAlign: "left", border: "none", cursor: "pointer",
            padding: "9px 18px", fontSize: "0.78rem",
            fontWeight: i === active ? 700 : 400,
            color: i === active ? "#c8401a" : "#4a453e",
            background: i === active ? "#fff" : "transparent",
            borderLeft: "3px solid " + (i === active ? "#c8401a" : "transparent"),
          }}>
            {t.sheet}
            <span style={{ display: "block", fontSize: "0.62rem", color: "#b0a99e", fontWeight: 400 }}>
              {t.rows.length} row{t.rows.length !== 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Table pane */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 34px 80px" }}>
        {cur && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#0f1923", margin: "0 0 4px" }}>
              {cur.sheet}
            </h1>
            {cur.note && (
              <p style={{ fontSize: "0.78rem", color: "#8a837a", lineHeight: 1.55, margin: "0 0 18px", maxWidth: "900px" }}>
                {cur.note}
              </p>
            )}
            <div style={{ overflowX: "auto", border: "1px solid #e8e3da", borderRadius: "4px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.76rem" }}>
                <thead>
                  <tr>
                    {cur.columns.map((c, i) => (
                      <th key={i} style={{ position: "sticky", top: 0, background: "#f0ede6",
                        textAlign: "left", padding: "8px 11px", borderBottom: "2px solid #d4cfc8",
                        fontWeight: 700, color: "#1a2535", whiteSpace: "nowrap" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cur.rows.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 ? "#faf8f4" : "#fff" }}>
                      {cur.columns.map((_, ci) => (
                        <td key={ci} style={{ padding: "7px 11px", borderBottom: "1px solid #eee",
                          color: "#333", verticalAlign: "top", lineHeight: 1.45 }}>
                          {row[ci]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
window.Phase2ReferencePanel = Phase2ReferencePanel;

// ═══════════════════════════════════════════════════════════════════════════
// 3. SYNC — Content Calendar .xlsx → diff preview → apply (Access import style)
// ═══════════════════════════════════════════════════════════════════════════
function Phase2SyncPanel({ project, setProject }) {
  const [stage, setStage] = useP2State("idle"); // idle | parsing | preview | applying | done | error
  const [diff, setDiff] = useP2State(null);
  const [nextProject, setNextProject] = useP2State(null);
  const [refData, setRefData] = useP2State(null);
  const [err, setErr] = useP2State("");
  const fileRef = useP2Ref();

  const CAT_COLORS = { seo: "#1a6a3a", geo: "#1e4fa8", bofu: "#8a2be2" };

  function reset() { setStage("idle"); setDiff(null); setNextProject(null); setRefData(null); setErr(""); }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (file) await parseFile(file);
    e.target.value = "";
  }

  async function parseFile(file) {
    setStage("parsing"); setErr("");
    try {
      if (!window.XLSX) throw new Error("Spreadsheet engine not loaded. Reload the page and retry.");
      if (!window.NS_PHASE2) throw new Error("Phase 2 sync logic not loaded.");
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array", cellDates: true });
      const rows = window.NS_PHASE2.parseCalendar(window.XLSX, wb);
      if (!rows.length) throw new Error("No article rows found on the Content Calendar sheet.");
      const d = window.NS_PHASE2.diff(rows, project);
      const np = window.NS_PHASE2.apply(rows, project);
      // Also refresh the reference tabs from the same workbook (non-calendar sheets).
      const ref = buildReference(wb);
      setDiff(d); setNextProject(np); setRefData(ref); setStage("preview");
    } catch (ex) {
      setErr(ex.message || String(ex)); setStage("error");
    }
  }

  // Rebuild the reference JSON from every sheet except Content Calendar and Call/Thread summaries.
  function buildReference(wb) {
    const CALL_RE = /(Call Summary|Thread Summary)/i;
    const tabs = [];
    for (const name of wb.SheetNames) {
      if (name === "Content Calendar" || CALL_RE.test(name)) continue;
      const grid = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: "" })
        .map(r => r.map(c => (c == null ? "" : (c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim()))))
        .filter(r => r.some(c => c));
      if (!grid.length) continue;
      const title = grid[0][0] || name;
      let headerIdx = null;
      for (let i = 1; i < Math.min(6, grid.length); i++) {
        if (grid[i].filter(Boolean).length >= 3) { headerIdx = i; break; }
      }
      if (headerIdx == null) headerIdx = grid.length > 1 ? 1 : 0;
      const note = grid.slice(1, headerIdx).map(r => r[0]).filter(Boolean).join(" ").trim();
      let header = grid[headerIdx].slice();
      while (header.length && !header[header.length - 1]) header.pop();
      const ncol = header.length || Math.max(...grid.map(r => r.length));
      const rows = grid.slice(headerIdx + 1).map(r => { const rr = r.slice(0, ncol); while (rr.length < ncol) rr.push(""); return rr; }).filter(r => r.some(c => c));
      tabs.push({ sheet: name, title, note, columns: header, rows });
    }
    return { source_file: "Phase 2 workbook", generated_at: new Date().toISOString(), tabs };
  }

  async function applyChanges() {
    setStage("applying");
    // 1. Calendar → project.json (schedule/tags), preserving status/feedback/uploads.
    setProject(nextProject);
    // 2. Reference tabs → separate file so project.json stays lean.
    if (refData) {
      try { await window.NS_API.saveJsonFile(P2_REFERENCE_PATH, refData, "phase 2 reference refresh"); }
      catch (e) { /* non-fatal — calendar sync already applied */ }
    }
    setTimeout(() => setStage("done"), 700);
  }

  const btn = (color, bg, border) => ({
    ...P2FONT, fontSize: "0.74rem", fontWeight: 700, color, background: bg,
    border: `1px solid ${border}`, padding: "8px 16px", borderRadius: "3px",
    cursor: "pointer", letterSpacing: "0.03em",
  });

  return (
    <div style={{ ...P2FONT, padding: "28px 32px 80px", maxWidth: "1040px" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#0f1923", margin: "0 0 4px" }}>
        Sync Content Calendar
      </h1>
      <p style={{ fontSize: "0.82rem", color: "#8a837a", lineHeight: 1.55, margin: "0 0 20px", maxWidth: "820px" }}>
        Upload the Phase 2 topics/keywords workbook (<code>.xlsx</code>). The <strong>Content Calendar</strong> sheet
        drives the schedule and tags; every other sheet (except call/thread summaries) refreshes the P2 Reference.
        Review the changes below before they sync. Article status, reviewer feedback, and uploaded files are never
        overwritten, and titles dropped from the sheet are kept under “Not in current sheet”.
      </p>

      {(stage === "idle" || stage === "error") && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => fileRef.current.click()} style={btn("#fff", "#c8401a", "#c8401a")}>
            ↑ Upload workbook (.xlsx)
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
          {stage === "error" && <span style={{ fontSize: "0.78rem", color: "#c8401a" }}>Error: {err}</span>}
        </div>
      )}

      {stage === "parsing" && <div style={{ color: "#8a837a", fontSize: "0.82rem" }}>Reading workbook…</div>}

      {stage === "preview" && diff && (
        <div>
          {/* Summary counts — the Access/Excel import verdict strip */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "0 0 18px" }}>
            {[
              ["New", diff.counts.added, "#1e7a45", "#e6f5ec"],
              ["Updated", diff.counts.updated, "#b05e00", "#fef3e8"],
              ["Unchanged", diff.counts.unchanged, "#8a837a", "#f0ede6"],
              ["Not in sheet", diff.counts.offSheet, "#c8401a", "#fdeee8"],
            ].map(([label, n, color, bg]) => (
              <div key={label} style={{ background: bg, border: `1px solid ${color}33`,
                borderRadius: "4px", padding: "10px 18px", minWidth: "96px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{n}</div>
                <div style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Detail tables */}
          {diff.added.length > 0 && (
            <PreviewBlock title={`New articles (${diff.added.length})`} accent="#1e7a45">
              {diff.added.map((r, i) => (
                <PreviewRow key={i} cat={r.category} catColors={CAT_COLORS}
                  title={r.title} meta={`Week ${r.week} · ${r.tier}`} />
              ))}
            </PreviewBlock>
          )}
          {diff.updated.length > 0 && (
            <PreviewBlock title={`Updated (${diff.updated.length})`} accent="#b05e00">
              {diff.updated.map((u, i) => (
                <div key={i} style={{ padding: "9px 14px", borderTop: "1px solid #f2efe9" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#222" }}>{u.row.title}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {u.changes.map((ch, j) => (
                      <span key={j} style={{ fontSize: "0.66rem", background: "#fef3e8", color: "#b05e00",
                        border: "1px solid #f0d4a8", borderRadius: "2px", padding: "1px 7px" }}>
                        {ch.field}: {String(ch.from)} → {String(ch.to)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </PreviewBlock>
          )}
          {diff.offSheet.length > 0 && (
            <PreviewBlock title={`No longer in sheet — kept, not deleted (${diff.offSheet.length})`} accent="#c8401a">
              {diff.offSheet.map((pc, i) => (
                <PreviewRow key={i} cat={pc.content_type} catColors={CAT_COLORS}
                  title={pc.title} meta={`status: ${pc.status}`} />
              ))}
            </PreviewBlock>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={applyChanges} style={btn("#fff", "#1e7a45", "#1e7a45")}>
              Apply {diff.counts.added + diff.counts.updated} change{(diff.counts.added + diff.counts.updated) !== 1 ? "s" : ""} + refresh reference
            </button>
            <button onClick={reset} style={btn("#888", "#fff", "#e0dbd4")}>Cancel</button>
          </div>
        </div>
      )}

      {stage === "applying" && <div style={{ color: "#8a837a", fontSize: "0.82rem" }}>Applying &amp; saving to GitHub…</div>}

      {stage === "done" && (
        <div style={{ background: "#f0faf4", border: "1px solid #b6e5c8", borderRadius: "4px", padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, color: "#1e7a45", marginBottom: "4px" }}>✓ Calendar synced</div>
          <div style={{ fontSize: "0.8rem", color: "#555" }}>
            Schedule and tags updated; reference tabs refreshed. Changes are saving to GitHub automatically.
          </div>
          <button onClick={reset} style={{ ...btn("#1e7a45", "#fff", "#b6e5c8"), marginTop: "12px" }}>Sync another file</button>
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ title, accent, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px",
      marginBottom: "14px", overflow: "hidden" }}>
      <div style={{ padding: "9px 14px", background: "#faf8f4", borderBottom: "1px solid #eee",
        borderLeft: `3px solid ${accent}`, fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.04em", textTransform: "uppercase", color: accent }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PreviewRow({ cat, catColors, title, meta }) {
  const color = (catColors && catColors[cat]) || "#888";
  return (
    <div style={{ padding: "8px 14px", borderTop: "1px solid #f2efe9", display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ flexShrink: 0, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.05em",
        textTransform: "uppercase", color, border: `1px solid ${color}55`, borderRadius: "2px", padding: "1px 6px" }}>
        {(cat || "?").toUpperCase()}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", color: "#222",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      <span style={{ flexShrink: 0, fontSize: "0.66rem", color: "#9b948c" }}>{meta}</span>
    </div>
  );
}
window.Phase2SyncPanel = Phase2SyncPanel;
