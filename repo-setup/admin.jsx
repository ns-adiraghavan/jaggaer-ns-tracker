// Admin mode â€” direct edits to project.json: clusters, pieces, team.
// Writes back via the same GitHub save path used for status changes.
// UX principles: inline editing, delete with guards, add-piece from cluster view.

const { useState: useStateAD, useRef: useRefAD } = React;

function AdminPanel({ project, setProject, adminTarget, setAdminTarget }) {
  const [tab, setTab] = useStateAD(adminTarget?.kind || "overview");

  return (
    <main className="ns-admin">
      <header className="ns-admin-head">
        <div className="ns-eyebrow ns-eyebrow-dark">ADMIN &middot; CONFIG EDITOR</div>
        <h1 className="ns-admin-title">
          Edit the project, <em>not the code.</em>
        </h1>
        <p className="ns-admin-deck">
          Pillars, clusters, pieces and the team roster all live in <code>config/project.json</code>.
          Changes commit on save.
        </p>
      </header>

      <nav className="ns-admin-tabs">
        {[
          ["overview", "Overview"],
          ["pillars",  "Pillars & Clusters"],
          ["pieces",   "Pieces"],
          ["team",     "Team"],
          ["raw",      "Raw JSON"]
        ].map(([id, label]) => (
          <button
            key={id}
            className={`ns-admin-tab ${tab === id ? "is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="ns-admin-body">
        {tab === "overview" && <AdminOverview project={project} />}
        {tab === "pillars"  && <AdminPillars  project={project} setProject={setProject} />}
        {tab === "pieces"   && <AdminPieces   project={project} setProject={setProject} adminTarget={adminTarget} setAdminTarget={setAdminTarget} />}
        {tab === "team"     && <AdminTeam     project={project} setProject={setProject} />}
        {tab === "raw"      && <AdminRaw      project={project} />}
      </div>
    </main>
  );
}

// â”€â”€â”€ Overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminOverview({ project }) {
  const stats = window.computeStats(project);
  const clusterCount = project.pillars.reduce((n, p) => n + p.clusters.length, 0);
  const teamCount = project.team.ns.length + project.team.jaggaer.length;
  return (
    <div className="ns-admin-overview">
      <div className="ns-admin-stat">
        <div className="ns-admin-stat-num">{stats.total}</div>
        <div className="ns-admin-stat-label">PIECES TOTAL</div>
      </div>
      <div className="ns-admin-stat">
        <div className="ns-admin-stat-num">{project.pillars.length}</div>
        <div className="ns-admin-stat-label">PILLARS</div>
      </div>
      <div className="ns-admin-stat">
        <div className="ns-admin-stat-num">{clusterCount}</div>
        <div className="ns-admin-stat-label">CLUSTERS</div>
      </div>
      <div className="ns-admin-stat">
        <div className="ns-admin-stat-num">{teamCount}</div>
        <div className="ns-admin-stat-label">TEAM</div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Pillars & Clusters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminPillars({ project, setProject }) {
  const [expandedPillar, setExpandedPillar] = useStateAD(project.pillars[0]?.id || null);
  const [confirmDelete, setConfirmDelete] = useStateAD(null); // {type:"cluster"|"pillar", pillarId, clusterId}

  function updateCluster(pillarId, clusterId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x => x.id === pillarId);
      const c = p.clusters.find(x => x.id === clusterId);
      Object.assign(c, patch);
      return next;
    });
  }

  function updatePillar(pillarId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x => x.id === pillarId);
      Object.assign(p, patch);
      return next;
    });
  }

  function addCluster(pillarId) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x => x.id === pillarId);
      const newId = "c" + Math.random().toString(36).slice(2, 7);
      const maxSeq = p.clusters.reduce((m, c) => Math.max(m, c.sequence || 0), 0);
      p.clusters.push({
        id: newId,
        label: "New Cluster",
        sequence: maxSeq + 1,
        intent: "informational",
        anchor_piece: "",
        pieces: []
      });
      return next;
    });
  }

  function deleteCluster(pillarId, clusterId) {
    const proj = project;
    const pillar = proj.pillars.find(p => p.id === pillarId);
    const cluster = pillar?.clusters.find(c => c.id === clusterId);
    const hasActive = (cluster?.pieces || []).some(pc => pc.status && pc.status !== "not-started");
    if (hasActive) {
      alert("Cannot delete a cluster that has pieces in progress. Remove or reassign pieces first.");
      setConfirmDelete(null);
      return;
    }
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next.pillars.find(x => x.id === pillarId);
      p.clusters = p.clusters.filter(c => c.id !== clusterId);
      return next;
    });
    setConfirmDelete(null);
  }

  return (
    <div className="ns-admin-pillars">
      {project.pillars.map((p, pi) => (
        <section key={p.id} className="ns-admin-pillar-section">
          {/* Pillar header â€” inline editable */}
          <div
            className="ns-admin-pillar-h-row"
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, cursor: "pointer" }}
            onClick={() => setExpandedPillar(expandedPillar === p.id ? null : p.id)}
          >
            <span style={{
              fontFamily: "DM Sans, sans-serif", fontSize: "0.7rem", fontWeight: 700,
              letterSpacing: "0.1em", color: "#c8401a", minWidth: 28
            }}>
              P{String(pi + 1).padStart(2, "0")}
            </span>
            <input
              type="text"
              className="ns-admin-input"
              style={{ fontWeight: 600, fontSize: "0.9rem", flex: 1 }}
              value={p.label}
              onClick={e => e.stopPropagation()}
              onChange={e => updatePillar(p.id, { label: e.target.value })}
              placeholder="Pillar label"
            />
            <input
              type="number"
              className="ns-admin-input ns-admin-num"
              value={Math.round((p.weight || 0) * 100)}
              onClick={e => e.stopPropagation()}
              onChange={e => updatePillar(p.id, { weight: (parseInt(e.target.value) || 0) / 100 })}
              title="Weight %"
              style={{ width: 60 }}
            />
            <span style={{ color: "#999", fontSize: "0.75rem" }}>%</span>
            <span style={{ color: "#999", fontSize: "0.8rem", marginLeft: 4 }}>
              {expandedPillar === p.id ? "â–´" : "â–¾"}
            </span>
          </div>

          {expandedPillar === p.id && (
            <>
              <table className="ns-admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>Seq</th>
                    <th>Cluster</th>
                    <th style={{ width: 140 }}>Intent</th>
                    <th style={{ width: 200 }}>Anchor Piece</th>
                    <th style={{ width: 60 }}>Pieces</th>
                    <th style={{ width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {p.clusters.map(c => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="number"
                          className="ns-admin-input ns-admin-num"
                          value={c.sequence}
                          onChange={e => updateCluster(p.id, c.id, { sequence: parseInt(e.target.value) || 1 })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="ns-admin-input"
                          value={c.label}
                          onChange={e => updateCluster(p.id, c.id, { label: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="ns-admin-input"
                          value={c.intent}
                          onChange={e => updateCluster(p.id, c.id, { intent: e.target.value })}
                        >
                          <option value="informational">informational</option>
                          <option value="commercial">commercial</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="ns-admin-input"
                          value={c.anchor_piece}
                          onChange={e => updateCluster(p.id, c.id, { anchor_piece: e.target.value })}
                        >
                          <option value="">â€” none â€”</option>
                          {c.pieces.map(piece => (
                            <option key={piece.id} value={piece.id}>{piece.title.slice(0, 48)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="ns-admin-pieces-cell">{c.pieces.length}</td>
                      <td>
                        {confirmDelete?.clusterId === c.id ? (
                          <span style={{ display: "flex", gap: 4 }}>
                            <button
                              className="ns-admin-del-confirm"
                              onClick={() => deleteCluster(p.id, c.id)}
                              title="Confirm delete"
                            >âœ“</button>
                            <button
                              className="ns-admin-del-cancel"
                              onClick={() => setConfirmDelete(null)}
                            >âœ•</button>
                          </span>
                        ) : (
                          <button
                            className="ns-admin-del"
                            onClick={() => setConfirmDelete({ type: "cluster", pillarId: p.id, clusterId: c.id })}
                            title="Delete cluster"
                          >&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="ns-admin-add"
                style={{ marginTop: 8 }}
                onClick={() => addCluster(p.id)}
              >
                + add cluster
              </button>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

// â”€â”€â”€ Pieces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminPieces({ project, setProject, adminTarget, setAdminTarget }) {
  const [filter, setFilter] = useStateAD(adminTarget?.clusterId || "");
  const [confirmDelete, setConfirmDelete] = useStateAD(null); // pieceId

  function updatePiece(clusterId, pieceId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) {
        const c = p.clusters.find(x => x.id === clusterId);
        if (!c) continue;
        const pc = c.pieces.find(x => x.id === pieceId);
        if (pc) Object.assign(pc, patch);
      }
      return next;
    });
  }

  function addPiece(clusterId) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) {
        const c = p.clusters.find(x => x.id === clusterId);
        if (!c) continue;
        const newId = "piece-" + Math.random().toString(36).slice(2, 8);
        c.pieces.push({
          id: newId,
          title: "New piece â€” click to rename",
          format: "Article",
          assignee: project.team.ns[0]?.id || "",
          status: "not-started",
          primary_keyword: "",
          geography: "all"
        });
      }
      return next;
    });
  }

  function deletePiece(clusterId, pieceId, status) {
    if (status && status !== "not-started") {
      alert("Cannot delete a piece that is in progress. Change its status to 'not-started' first, or ask a colleague to remove it.");
      setConfirmDelete(null);
      return;
    }
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) {
        const c = p.clusters.find(x => x.id === clusterId);
        if (!c) continue;
        c.pieces = c.pieces.filter(x => x.id !== pieceId);
      }
      return next;
    });
    setConfirmDelete(null);
  }

  // Build flat rows
  const flatRows = [];
  for (const pillar of project.pillars) {
    for (const cluster of pillar.clusters) {
      if (filter && cluster.id !== filter) continue;
      for (const piece of cluster.pieces) {
        flatRows.push({ pillar, cluster, piece });
      }
    }
  }

  const allTeam = [...project.team.ns, ...project.team.jaggaer];
  const filteredCluster = project.pillars.flatMap(p => p.clusters).find(c => c.id === filter);

  return (
    <div className="ns-admin-pieces">
      <div className="ns-admin-filter">
        <select className="ns-admin-input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All clusters</option>
          {project.pillars.map(p =>
            p.clusters.map(c => (
              <option key={c.id} value={c.id}>{p.label} &middot; {c.label}</option>
            ))
          )}
        </select>
        <span className="ns-admin-count">{flatRows.length} pieces</span>
        {filter && (
          <button
            className="ns-admin-add"
            onClick={() => addPiece(filter)}
          >
            + add piece to cluster
          </button>
        )}
      </div>

      <table className="ns-admin-table">
        <thead>
          <tr>
            <th>Pillar</th>
            <th>Cluster</th>
            <th>Title</th>
            <th style={{ width: 120 }}>Format</th>
            <th style={{ width: 130 }}>Assignee</th>
            <th style={{ width: 140 }}>Status</th>
            <th style={{ width: 48 }}></th>
          </tr>
        </thead>
        <tbody>
          {flatRows.map(({ pillar, cluster, piece }) => (
            <tr key={piece.id} className={adminTarget?.pieceId === piece.id ? "is-target" : ""}>
              <td className="ns-admin-dim">{pillar.label}</td>
              <td className="ns-admin-dim">{cluster.label}</td>
              <td>
                <input
                  type="text"
                  className="ns-admin-input ns-admin-input-wide"
                  value={piece.title}
                  onChange={e => updatePiece(cluster.id, piece.id, { title: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="ns-admin-input"
                  value={piece.format}
                  onChange={e => updatePiece(cluster.id, piece.id, { format: e.target.value })}
                />
              </td>
              <td>
                <select
                  className="ns-admin-input"
                  value={piece.assignee}
                  onChange={e => updatePiece(cluster.id, piece.id, { assignee: e.target.value })}
                >
                  {allTeam.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="ns-admin-input"
                  value={piece.status}
                  onChange={e => updatePiece(cluster.id, piece.id, { status: e.target.value })}
                >
                  {Object.keys(window.STATUS_META).map(s => (
                    <option key={s} value={s}>{window.STATUS_META[s].label}</option>
                  ))}
                </select>
              </td>
              <td>
                {confirmDelete === piece.id ? (
                  <span style={{ display: "flex", gap: 4 }}>
                    <button
                      className="ns-admin-del-confirm"
                      onClick={() => deletePiece(cluster.id, piece.id, piece.status)}
                      title="Confirm delete"
                    >âœ“</button>
                    <button
                      className="ns-admin-del-cancel"
                      onClick={() => setConfirmDelete(null)}
                    >âœ•</button>
                  </span>
                ) : (
                  <button
                    className="ns-admin-del"
                    onClick={() => setConfirmDelete(piece.id)}
                    title="Delete piece"
                  >&times;</button>
                )}
              </td>
            </tr>
          ))}
          {/* Ghost "add piece" row when a cluster is selected */}
          {filter && (
            <tr className="ns-admin-ghost-row" onClick={() => addPiece(filter)} style={{ cursor: "pointer", opacity: 0.5 }}>
              <td className="ns-admin-dim">&nbsp;</td>
              <td className="ns-admin-dim">{filteredCluster?.label || ""}</td>
              <td colSpan={5} style={{ fontStyle: "italic", fontSize: "0.8rem", color: "#999", padding: "10px 8px" }}>
                + add a piece to this cluster
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// â”€â”€â”€ Team â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminTeam({ project, setProject }) {
  const [confirmDelete, setConfirmDelete] = useStateAD(null); // memberId

  function updateMember(org, memberId, patch) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const arr = next.team[org];
      const m = arr.find(x => x.id === memberId);
      if (m) Object.assign(m, patch);
      return next;
    });
  }

  function addMember(org) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const id = "m-" + Math.random().toString(36).slice(2, 7);
      next.team[org].push({ id, name: "New member", role: "Researcher", org });
      return next;
    });
  }

  function deleteMember(org, memberId) {
    // Guard: check if this member has active pieces assigned
    const hasActivePieces = project.pillars.some(p =>
      p.clusters.some(c =>
        c.pieces.some(pc => pc.assignee === memberId && pc.status !== "not-started")
      )
    );
    if (hasActivePieces) {
      alert("Cannot remove a team member who has pieces in progress. Reassign their pieces first.");
      setConfirmDelete(null);
      return;
    }
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.team[org] = next.team[org].filter(m => m.id !== memberId);
      return next;
    });
    setConfirmDelete(null);
  }

  return (
    <div className="ns-admin-team">
      {["ns", "jaggaer"].map(org => (
        <section key={org} className="ns-admin-team-section">
          <header className="ns-admin-team-head">
            <h3>{org === "ns" ? "Netscribes" : "Jaggaer"}</h3>
            <button className="ns-admin-add" onClick={() => addMember(org)}>+ add member</button>
          </header>
          <table className="ns-admin-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th style={{ width: 60 }}>Admin</th><th style={{ width: 48 }}></th></tr>
            </thead>
            <tbody>
              {project.team[org].map(m => (
                <tr key={m.id}>
                  <td>
                    <input
                      type="text"
                      className="ns-admin-input"
                      value={m.name}
                      onChange={e => updateMember(org, m.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="ns-admin-input"
                      value={m.role}
                      onChange={e => updateMember(org, m.id, { role: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!m.admin}
                      onChange={e => updateMember(org, m.id, { admin: e.target.checked })}
                    />
                  </td>
                  <td>
                    {confirmDelete === m.id ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button
                          className="ns-admin-del-confirm"
                          onClick={() => deleteMember(org, m.id)}
                          title="Confirm remove"
                        >âœ“</button>
                        <button
                          className="ns-admin-del-cancel"
                          onClick={() => setConfirmDelete(null)}
                        >âœ•</button>
                      </span>
                    ) : (
                      <button
                        className="ns-admin-del"
                        onClick={() => setConfirmDelete(m.id)}
                        title="Remove member"
                      >&times;</button>
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

// â”€â”€â”€ Raw JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminRaw({ project }) {
  const stripped = { ...project };
  delete stripped.conversations;
  return (
    <div className="ns-admin-raw">
      <div className="ns-eyebrow ns-eyebrow-dark">CONFIG &middot; READ-ONLY VIEW</div>
      <pre className="ns-admin-pre">{JSON.stringify(stripped, null, 2)}</pre>
    </div>
  );
}

window.AdminPanel = AdminPanel;
