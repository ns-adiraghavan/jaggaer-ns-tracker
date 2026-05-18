// Admin panel — edit project config inline. Writes back via GitHub save path.

const { useState: useStateAD } = React;

function AdminPanel({ project, setProject, adminTarget, setAdminTarget }) {
  const [tab, setTab] = useStateAD(adminTarget?.kind || "overview");

  return (
    <main className="ns-admin">
      <header className="ns-admin-head">
        <div className="ns-admin-eyebrow">Admin · Config Editor</div>
        <h1 className="ns-admin-title">Edit the project, not the code.</h1>
        <p className="ns-admin-deck">
          Pillars, clusters, pieces and the team roster all live in <code>config/project.json</code>. Changes save automatically.
        </p>
      </header>

      <nav className="ns-admin-tabs">
        {[["overview","Overview"],["pillars","Pillars & Clusters"],["team","Team"],["raw","Raw JSON"]].map(([id, label]) => (
          <button key={id} className={`ns-admin-tab ${tab===id?"is-active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <div className="ns-admin-body">
        {tab === "overview" && <AdminOverview project={project} />}
        {tab === "pillars"  && <AdminPillars  project={project} setProject={setProject} adminTarget={adminTarget} />}
        {tab === "team"     && <AdminTeam     project={project} setProject={setProject} />}
        {tab === "raw"      && <AdminRaw      project={project} />}
      </div>
    </main>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function AdminOverview({ project }) {
  const stats = window.computeStats(project);
  const clusterCount = project.pillars.reduce((n, p) => n + p.clusters.length, 0);
  const teamCount = project.team.ns.length + project.team.jaggaer.length;
  const tiles = [
    { num: stats.total,            label: "Pieces Total",           accent: false },
    { num: stats.approved,         label: "Approved",               accent: true  },
    { num: stats.awaiting,         label: "Awaiting Jaggaer",       accent: false },
    { num: project.pillars.length, label: "Pillars",                accent: false },
    { num: clusterCount,           label: "Clusters",               accent: false },
    { num: Object.values(stats.byCluster).filter(c => c.ready).length, label: "Publish-Ready", accent: true },
    { num: teamCount,              label: "Team Members",            accent: false },
  ];
  return (
    <div className="ns-admin-overview">
      {tiles.map(t => (
        <div key={t.label} className={`ns-admin-stat-tile ${t.accent?"is-accent":""}`}>
          <div className="ns-admin-stat-num">{t.num}</div>
          <div className="ns-admin-stat-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Pillars & Clusters — with inline piece editing ───────────────────────────
function AdminPillars({ project, setProject, adminTarget }) {
  const [expandedPillar, setExpandedPillar] = useStateAD(project.pillars[0]?.id || null);
  const [expandedCluster, setExpandedCluster] = useStateAD(adminTarget?.clusterId || null);
  const [confirmDelete, setConfirmDelete] = useStateAD(null);

  function updatePillar(pillarId, patch) {
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); Object.assign(next.pillars.find(x=>x.id===pillarId), patch); return next; });
  }
  function updateCluster(pillarId, clusterId, patch) {
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); Object.assign(next.pillars.find(x=>x.id===pillarId).clusters.find(x=>x.id===clusterId), patch); return next; });
  }
  function updatePiece(clusterId, pieceId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) { const c = p.clusters.find(x=>x.id===clusterId); if(!c) continue; const pc = c.pieces.find(x=>x.id===pieceId); if(pc) Object.assign(pc, patch); }
      return next;
    });
  }
  function nudgeClusterSeq(pillarId, clusterId, dir) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x=>x.id===pillarId);
      const c = p.clusters.find(x=>x.id===clusterId);
      c.sequence = Math.max(1, (c.sequence || 1) + dir);
      return next;
    });
  }
  function addCluster(pillarId) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x=>x.id===pillarId);
      const maxSeq = p.clusters.reduce((m,c) => Math.max(m, c.sequence||0), 0);
      const newId = "c-"+Math.random().toString(36).slice(2,7);
      p.clusters.push({ id: newId, label: "New Cluster", sequence: maxSeq+1, intent: "informational", anchor_piece: "", pieces: [] });
      setExpandedCluster(newId);
      return next;
    });
  }
  function addPiece(pillarId, clusterId) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const c = next.pillars.find(x=>x.id===pillarId).clusters.find(x=>x.id===clusterId);
      c.pieces.push({ id: "piece-"+Math.random().toString(36).slice(2,8), title: "New piece", format: "Article", assignee: project.team.ns[0]?.id||"", status: "not-started", primary_keyword: "", geography: "all", revision_count: 0 });
      return next;
    });
  }
  function deleteCluster(pillarId, clusterId) {
    const cluster = project.pillars.find(p=>p.id===pillarId)?.clusters.find(c=>c.id===clusterId);
    if ((cluster?.pieces||[]).some(pc => pc.status && pc.status !== "not-started")) {
      alert("Cannot delete a cluster with pieces in progress."); setConfirmDelete(null); return;
    }
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); next.pillars.find(x=>x.id===pillarId).clusters = next.pillars.find(x=>x.id===pillarId).clusters.filter(c=>c.id!==clusterId); return next; });
    setConfirmDelete(null);
  }
  function deletePiece(clusterId, pieceId, status) {
    if (status && status !== "not-started") { alert("Cannot delete a piece in progress."); setConfirmDelete(null); return; }
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); for (const p of next.pillars) { const c = p.clusters.find(x=>x.id===clusterId); if(c) c.pieces = c.pieces.filter(x=>x.id!==pieceId); } return next; });
    setConfirmDelete(null);
  }

  const allTeam = [...project.team.ns, ...project.team.jaggaer];

  return (
    <div className="ns-admin-pillars">
      {project.pillars.map((p, pi) => {
        const isOpen = expandedPillar === p.id;
        return (
          <section key={p.id} className="ns-admin-pillar-section">
            <div className={`ns-admin-pillar-h-row ${isOpen?"is-open":""}`} onClick={() => setExpandedPillar(isOpen ? null : p.id)}>
              <span className="ns-admin-pillar-badge">P{String(pi+1).padStart(2,"0")}</span>
              <input type="text" className="ns-admin-pillar-name-input" value={p.label}
                onClick={e => e.stopPropagation()}
                onChange={e => updatePillar(p.id, { label: e.target.value })} />
              <span className="ns-admin-pillar-count">{p.clusters.length} clusters · {p.clusters.reduce((n,c)=>n+c.pieces.length,0)} pieces</span>
              <span className="ns-admin-pillar-chevron">{isOpen?"▴":"▾"}</span>
            </div>

            {isOpen && (
              <div className="ns-admin-pillar-body">
                {p.clusters.map(c => {
                  const isClusterOpen = expandedCluster === c.id;
                  return (
                    <div key={c.id} className="ns-admin-cluster-section">
                      {/* Cluster header row */}
                      <div className={`ns-admin-cluster-h-row ${isClusterOpen?"is-open":""}`}>
                        <div className="ns-admin-cluster-seq-controls">
                          <button className="ns-seq-btn" onClick={() => nudgeClusterSeq(p.id, c.id, -1)} title="Move earlier">▲</button>
                          <span className="ns-admin-cluster-seq">{c.sequence}</span>
                          <button className="ns-seq-btn" onClick={() => nudgeClusterSeq(p.id, c.id, 1)} title="Move later">▼</button>
                        </div>
                        <input type="text" className="ns-admin-cluster-name-input"
                          value={c.label} onChange={e => updateCluster(p.id, c.id, { label: e.target.value })} />
                        <select className="ns-admin-input-sm" value={c.intent} onChange={e => updateCluster(p.id, c.id, { intent: e.target.value })}>
                          <option value="informational">Informational</option>
                          <option value="commercial">Commercial</option>
                        </select>
                        <select className="ns-admin-input-sm ns-admin-anchor-sel" value={c.anchor_piece} onChange={e => updateCluster(p.id, c.id, { anchor_piece: e.target.value })}>
                          <option value="">— no anchor —</option>
                          {c.pieces.map(piece => <option key={piece.id} value={piece.id}>{piece.title.replace(" (Anchor)","").slice(0,44)}</option>)}
                        </select>
                        <span className="ns-admin-cluster-piece-count">{c.pieces.length}p</span>
                        <button className="ns-admin-cluster-toggle" onClick={() => setExpandedCluster(isClusterOpen ? null : c.id)}>
                          {isClusterOpen ? "▴" : "▾"} pieces
                        </button>
                        {confirmDelete?.clusterId === c.id ? (
                          <span className="ns-confirm-del">
                            <button className="ns-admin-del-confirm" onClick={() => deleteCluster(p.id, c.id)}>✓ Delete</button>
                            <button className="ns-admin-del-cancel" onClick={() => setConfirmDelete(null)}>✕</button>
                          </span>
                        ) : (
                          <button className="ns-admin-del" onClick={() => setConfirmDelete({ clusterId: c.id })}>&times;</button>
                        )}
                      </div>

                      {/* Inline piece list */}
                      {isClusterOpen && (
                        <div className="ns-admin-pieces-inline">
                          {c.pieces.map(piece => (
                            <div key={piece.id} className={`ns-admin-piece-row ${adminTarget?.pieceId===piece.id?"is-target":""}`}>
                              <input type="text" className="ns-admin-input ns-admin-piece-title" value={piece.title}
                                onChange={e => updatePiece(c.id, piece.id, { title: e.target.value })} placeholder="Title" />
                              <input type="text" className="ns-admin-input-sm" value={piece.format}
                                onChange={e => updatePiece(c.id, piece.id, { format: e.target.value })} placeholder="Format" style={{width:110}} />
                              <select className="ns-admin-input-sm" value={piece.assignee} onChange={e => updatePiece(c.id, piece.id, { assignee: e.target.value })}>
                                {allTeam.map(m => <option key={m.id} value={m.id}>{m.name.split(" ")[0]}</option>)}
                              </select>
                              <select className="ns-admin-input-sm" value={piece.status} onChange={e => updatePiece(c.id, piece.id, { status: e.target.value })}>
                                {Object.keys(window.STATUS_META).map(s => <option key={s} value={s}>{window.STATUS_META[s].label}</option>)}
                              </select>
                              {confirmDelete?.pieceId === piece.id ? (
                                <span className="ns-confirm-del">
                                  <button className="ns-admin-del-confirm" onClick={() => deletePiece(c.id, piece.id, piece.status)}>✓</button>
                                  <button className="ns-admin-del-cancel" onClick={() => setConfirmDelete(null)}>✕</button>
                                </span>
                              ) : (
                                <button className="ns-admin-del" onClick={() => setConfirmDelete({ pieceId: piece.id })}>&times;</button>
                              )}
                            </div>
                          ))}
                          <button className="ns-admin-add-piece-btn" onClick={() => addPiece(p.id, c.id)}>+ Add piece to this cluster</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="ns-admin-add-cluster-btn" onClick={() => addCluster(p.id)}>+ Add cluster to {p.label}</button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function AdminTeam({ project, setProject }) {
  const [confirmDelete, setConfirmDelete] = useStateAD(null);

  function updateMember(org, memberId, patch) {
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); Object.assign(next.team[org].find(x=>x.id===memberId), patch); return next; });
  }
  function addMember(org) {
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); next.team[org].push({ id:"m-"+Math.random().toString(36).slice(2,7), name:"New member", role:"Researcher", org }); return next; });
  }
  function deleteMember(org, memberId) {
    if (project.pillars.some(p => p.clusters.some(c => c.pieces.some(pc => pc.assignee===memberId && pc.status!=="not-started")))) {
      alert("Cannot remove a team member with pieces in progress. Reassign first."); setConfirmDelete(null); return;
    }
    setProject(prev => { const next = JSON.parse(JSON.stringify(prev)); next.team[org] = next.team[org].filter(m=>m.id!==memberId); return next; });
    setConfirmDelete(null);
  }

  return (
    <div className="ns-admin-team">
      {["ns","jaggaer"].map(org => (
        <section key={org} className="ns-admin-team-section">
          <header className="ns-admin-team-head">
            <h3>{org==="ns"?"Netscribes":"Jaggaer"}</h3>
            <button className="ns-admin-add" onClick={() => addMember(org)}>+ Add member</button>
          </header>
          <table className="ns-admin-table">
            <thead><tr><th>Name</th><th>Role</th><th style={{width:56,textAlign:"center"}}>Admin</th><th style={{width:40}}></th></tr></thead>
            <tbody>
              {project.team[org].map(m => (
                <tr key={m.id}>
                  <td><input type="text" className="ns-admin-input" value={m.name} onChange={e => updateMember(org,m.id,{name:e.target.value})} /></td>
                  <td><input type="text" className="ns-admin-input" value={m.role} onChange={e => updateMember(org,m.id,{role:e.target.value})} /></td>
                  <td style={{textAlign:"center"}}><input type="checkbox" checked={!!m.admin} onChange={e => updateMember(org,m.id,{admin:e.target.checked})} /></td>
                  <td>
                    {confirmDelete===m.id ? (
                      <span style={{display:"flex",gap:4}}>
                        <button className="ns-admin-del-confirm" onClick={() => deleteMember(org,m.id)}>✓</button>
                        <button className="ns-admin-del-cancel" onClick={() => setConfirmDelete(null)}>✕</button>
                      </span>
                    ) : (
                      <button className="ns-admin-del" onClick={() => setConfirmDelete(m.id)}>&times;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

// ─── Raw JSON ─────────────────────────────────────────────────────────────────
function AdminRaw({ project }) {
  const stripped = { ...project }; delete stripped.conversations;
  return (
    <div>
      <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:12}}>Config · Read-only view</div>
      <pre className="ns-admin-pre">{JSON.stringify(stripped, null, 2)}</pre>
    </div>
  );
}

window.AdminPanel = AdminPanel;
