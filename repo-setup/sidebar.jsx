// Left sidebar - dark steel. Pillar/cluster nav with stats.
const { useMemo: useMemoSB } = React;

function Sidebar({ project, currentUser, activePillar, setActivePillar, activeCluster, setActiveCluster, view, setView, onSignOut, onToggleAdmin, adminMode, activeMonthId, setActiveMonthId, activeContentType, setActiveContentType }) {
  const stats = useMemoSB(() => computeStats(project, activeMonthId), [project, activeMonthId]);
  const months = project.months || [];

  // Only show months that have at least one cluster referencing them
  const populatedMonthIds = new Set();
  for (const p of project.pillars) {
    for (const c of p.clusters) {
      if (c.month_id) populatedMonthIds.add(c.month_id);
      else populatedMonthIds.add(project.active_month); // fallback for untagged clusters
    }
  }
  const populatedMonths = months.filter(m => populatedMonthIds.has(m.id));

  const activeMonth = populatedMonths.find(m => m.id === (activeMonthId || project.active_month)) || populatedMonths[0];
  const monthLabel = activeMonth ? activeMonth.label : 'Month 1';
  const shortLabel = monthLabel.replace('Month ', 'M');
  const [collapsed, setCollapsed] = React.useState(false);
  const [navMode, setNavMode] = React.useState('content-type'); // 'pillar' | 'content-type'

  // Content-type stats — count pieces by content_type field
  const ctStats = React.useMemo(() => {
    const out = { 'msv': { total: 0, approved: 0 }, 'ai-in-s2p': { total: 0, approved: 0 }, 'industry-specific': { total: 0, approved: 0 } };
    for (const p of project.pillars) {
      for (const c of p.clusters) {
        for (const piece of c.pieces) {
          const ct = piece.content_type || 'msv';
          if (out[ct]) {
            out[ct].total++;
            if (piece.status === 'approved') out[ct].approved++;
          }
        }
      }
    }
    return out;
  }, [project]);

  return (
    <aside className={`ns-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* Collapse toggle — always visible */}
      <button
        className="ns-sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>
      <div className="ns-sidebar-inner">
      <div className="ns-sidebar-logos">
        <div className="ns-sidebar-logo-ns">
          <img src="netscribes-logo.png" alt="Netscribes" />
        </div>
        <span className="ns-sidebar-logo-sep">&times;</span>
        <div className="ns-sidebar-logo-jg">
          <img src="jaggaer-logo.png" alt="Jaggaer" />
        </div>
      </div>
      <div className="ns-sidebar-head">
        <div className="ns-sidebar-month">
          <div className="ns-eyebrow ns-eyebrow-light">CURRENT MONTH</div>
          {populatedMonths.length > 1 ? (
            <div className="ns-month-switcher">
              <select
                value={activeMonthId || project.active_month}
                onChange={e => setActiveMonthId && setActiveMonthId(e.target.value)}
              >
                {populatedMonths.map(m => (
                  <option key={m.id} value={m.id}>{m.label.replace('Month ', 'M')}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="ns-month-label" title={monthLabel}>{shortLabel}</div>
          )}
        </div>
      </div>

      <nav className="ns-sidebar-nav">
        <NavSection
          label="Tracker"
          active={view === "tracker"}
          onClick={() => { setView("tracker"); setActivePillar(null); setActiveCluster(null); if (setActiveContentType) setActiveContentType(null); }}
          rightMeta={`${stats.approved}/${stats.total}`}
        />

        {/* Nav mode toggle — Pillar vs Content Type */}
        <div style={{
          display: 'flex', margin: '4px 12px 2px',
          background: '#f0ece4', borderRadius: '3px', padding: '2px',
        }}>
          {[['pillar','By Pillar'],['content-type','By Type']].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setNavMode(mode)}
              style={{
                flex: 1, padding: '4px 0',
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '0.63rem', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                border: 'none', borderRadius: '2px', cursor: 'pointer',
                background: navMode === mode ? '#fff' : 'transparent',
                color: navMode === mode ? '#0f1923' : '#888',
                boxShadow: navMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        {navMode === 'pillar' && (
          <div className="ns-sidebar-pillars">
            {project.pillars.map((p, i) => (
              <PillarNav
                key={p.id}
                pillar={p}
                sequence={i + 1}
                pillarStats={stats.byPillar[p.id]}
                clusterStats={stats.byCluster}
                expanded={activePillar === p.id}
                activeCluster={activeCluster}
                onPillarClick={() => {
                  setView("tracker");
                  setActivePillar(activePillar === p.id ? null : p.id);
                  setActiveCluster(null);
                }}
                onClusterClick={(c) => {
                  setView("tracker");
                  setActivePillar(p.id);
                  setActiveCluster(c.id);
                }}
              />
            ))}
          </div>
        )}

        {navMode === 'content-type' && (
          <div className="ns-sidebar-pillars">
            <ContentTypeNav
              project={project}
              ctStats={ctStats}
              setView={setView}
              setActivePillar={setActivePillar}
              setActiveCluster={setActiveCluster}
              activeContentType={activeContentType}
              setActiveContentType={setActiveContentType}
            />
          </div>
        )}

        <div className="ns-sidebar-divider"></div>

        <NavSection
          label="Sample Artifacts"
          active={view === "sample-artifacts"}
          onClick={() => setView("sample-artifacts")}
          rightMeta="6 articles"
        />
        <NavSection
          label="JAI Demo"
          active={view === "jai-demo"}
          onClick={() => setView("jai-demo")}
          rightMeta="live"
        />
        <NavSection
          label="Style Guide"
          active={view === "style-guide"}
          onClick={() => setView("style-guide")}
          rightMeta="docx"
        />

        {adminMode && (
          <NavSection
            label="Admin"
            active={view === "admin"}
            onClick={() => setView("admin")}
            rightMeta="config"
          />
        )}
      </nav>

      <div className="ns-sidebar-foot">
        <a
          href={`https://github.com/${(window.__CONFIG__ && window.__CONFIG__.GITHUB_REPO) || "ns-adiraghavan/jaggaer-ns-tracker"}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "7px 14px 7px 12px",
            margin: "0 8px 6px",
            borderRadius: "4px",
            background: "transparent",
            border: "1px solid #e0dbd4",
            textDecoration: "none",
            color: "#666",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.68rem",
            fontWeight: 500,
            letterSpacing: "0.02em",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.7 }}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span>GitHub Repo</span>
          <span style={{ marginLeft: "auto", opacity: 0.4, fontSize: "0.6rem" }}>↗</span>
        </a>
        <div className="ns-user-card">
          <div className="ns-user-name">{currentUser.name}</div>
          <div className="ns-user-role">
            <span className={`ns-org-pill ns-org-${currentUser.org}`}>
              {currentUser.org === "ns" ? "NS" : "JG"}
            </span>
            {currentUser.role}
          </div>
        </div>
        <div className="ns-user-actions">
          {currentUser.admin && (
            <button className={`ns-mini-btn ${adminMode ? "is-on" : ""}`} onClick={onToggleAdmin}>
              {adminMode ? "Admin ✓" : "Admin"}
            </button>
          )}
          <button className="ns-mini-btn" onClick={onSignOut}>Switch</button>
        </div>
      </div>
      </div>{/* ns-sidebar-inner */}
    </aside>
  );
}

function NavSection({ label, active, onClick, rightMeta }) {
  return (
    <button
      className={`ns-nav-section ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="ns-nav-section-rule"></span>
      <span className="ns-nav-section-label">{label}</span>
      <span className="ns-nav-section-meta">{rightMeta}</span>
    </button>
  );
}

function PillarNav({ pillar, sequence, pillarStats, clusterStats, expanded, activeCluster, onPillarClick, onClusterClick }) {
  return (
    <div className="ns-pillar-nav">
      <button className="ns-pillar-nav-head" onClick={onPillarClick}>
        <span className="ns-pillar-nav-sub">P{String(sequence).padStart(2, "0")}</span>
        <span className="ns-pillar-nav-label">{pillar.label}</span>
        <span className="ns-pillar-nav-frac">{pillarStats.approved}/{pillarStats.total}</span>
      </button>
      {expanded && (
        <ul className="ns-cluster-nav-list">
          {pillar.clusters.map(c => {
            const cs = clusterStats[c.id];
            const isActive = activeCluster === c.id;
            return (
              <li key={c.id}>
                <button
                  className={`ns-cluster-nav-row ${isActive ? "is-active" : ""}`}
                  onClick={() => onClusterClick(c)}
                >
                  <span className="ns-cluster-nav-seq">{String(c.sequence).padStart(2, "0")}</span>
                  <span className="ns-cluster-nav-label">{c.label}</span>
                  <span className="ns-cluster-nav-frac">{cs.approved}/{cs.total}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


function ContentTypeNav({ project, ctStats, setView, setActivePillar, setActiveCluster, activeContentType, setActiveContentType }) {
  const CT_META = {
    'msv':               { label: 'MSV-Driven',        color: '#1a6a3a', bg: '#eaf4ee', border: '#b8dfc8', desc: 'Broad · High search volume' },
    'ai-in-s2p':         { label: 'AI in S2P (Claude)', color: '#1e4fa8', bg: '#eaf0fb', border: '#bad0f0', desc: 'Claude-focused · JAI traffic' },
    'industry-specific': { label: 'Industry-Specific',  color: '#784212', bg: '#fef3e8', border: '#f0d4a8', desc: 'Vertical · Sales enablement' },
  };

  const [expanded, setExpanded] = React.useState({});

  // Group pieces by content_type, with pillar + cluster context
  const byType = { 'msv': [], 'ai-in-s2p': [], 'industry-specific': [] };
  for (const pillar of project.pillars) {
    for (const cluster of pillar.clusters) {
      for (const piece of cluster.pieces) {
        const ct = piece.content_type || 'msv';
        if (byType[ct]) byType[ct].push({ piece, cluster, pillar });
      }
    }
  }

  return (
    <div>
      {Object.entries(CT_META).map(([ctId, meta]) => {
        const items = byType[ctId] || [];
        const approvedCount = items.filter(x => x.piece.status === 'approved').length;
        const isOpen = expanded[ctId];
        return (
          <div key={ctId} style={{ marginBottom: '2px' }}>
            <button
              onClick={() => {
              setExpanded(e => ({ ...e, [ctId]: !e[ctId] }));
              // Toggle content type filter on the tracker
              if (activeContentType === ctId) {
                setActiveContentType(null);
                setActivePillar(null);
                setActiveCluster(null);
              } else {
                setActiveContentType(ctId);
                setActivePillar(null);
                setActiveCluster(null);
                setView('tracker');
              }
            }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 12px',
                background: isOpen ? meta.bg : 'transparent',
                border: 'none', borderLeft: `3px solid ${isOpen ? meta.color : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f0ece4'; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Noto Sans, sans-serif',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: isOpen ? meta.color : '#555',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{meta.label}</div>
                <div style={{
                  fontFamily: 'Noto Sans, sans-serif',
                  fontSize: '0.62rem', color: '#999', marginTop: '1px',
                }}>{meta.desc}</div>
              </div>
              <span style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '0.62rem', color: '#999', flexShrink: 0,
              }}>{approvedCount}/{items.length}</span>
              <span style={{ color: '#bbb', fontSize: '0.65rem', flexShrink: 0 }}>{isOpen ? '▾' : '›'}</span>
            </button>

            {isOpen && (
              <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 4px 0' }}>
                {items.map(({ piece, cluster, pillar }) => {
                  const sm = { 'approved': '#1e7a45', 'uploaded': '#1e6fa8', 'jaggaer-feedback': '#b05e00', 'revised': '#5a3d9e', 'not-started': '#ccc' };
                  const dotColor = sm[piece.status] || '#ccc';
                  return (
                    <li key={piece.id}>
                      <button
                        onClick={() => {
                          setView('tracker');
                          setActivePillar(null);
                          setActiveCluster(null);
                          // contentType filter handled by Tracker directly
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '7px',
                          padding: '5px 12px 5px 22px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f2ec'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: dotColor, flexShrink: 0, marginTop: '4px',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'Noto Sans, sans-serif',
                            fontSize: '0.68rem', color: '#333', lineHeight: 1.3,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>{piece.title}</div>
                          <div style={{
                            fontFamily: 'Noto Sans, sans-serif',
                            fontSize: '0.6rem', color: '#aaa', marginTop: '2px',
                          }}>{pillar.label.split(' ')[0]} · {cluster.label}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function computeStats(project, activeMonthId) {
  const effectiveMonthId = activeMonthId || project.active_month;
  const byPillar = {};
  const byCluster = {};
  let total = 0, approved = 0, awaiting = 0;
  // "Awaiting Jaggaer" = pieces sitting at a Jaggaer-side stage. Derived from the
  // live workflow so it can't drift when stages are renamed/reordered.
  const wf = (project.workflow_stages && project.workflow_stages.length) ? project.workflow_stages : [];
  const stageById = {}; wf.forEach(s => { stageById[s.id] = s; });
  const jids = new Set((project.team && project.team.jaggaer || []).map(m => "person:" + m.id));
  function jaggaerSide(actor) {
    if (!actor) return false;
    const a = Array.isArray(actor) ? actor : [actor];
    return a.some(x => x === "jaggaer" || jids.has(x));
  }
  for (const p of project.pillars) {
    let pT = 0, pA = 0;
    for (const c of p.clusters) {
      // Only count clusters belonging to the active month
      if ((c.month_id || project.active_month) !== effectiveMonthId) {
        byCluster[c.id] = { total: 0, approved: 0, ready: false };
        continue;
      }
      let cT = c.pieces.length, cA = 0;
      for (const piece of c.pieces) {
        total++;
        if (piece.status === "approved") { approved++; pA++; cA++; }
        const st = stageById[piece.status];
        if (st && piece.status !== "approved" && piece.status !== "not-started" && jaggaerSide(st.actor)) awaiting++;
      }
      byCluster[c.id] = { total: cT, approved: cA, ready: cA === cT && cT > 0 };
      pT += cT;
    }
    byPillar[p.id] = { total: pT, approved: pA };
  }
  return { total, approved, awaiting, byPillar, byCluster };
}

window.Sidebar = Sidebar;
window.computeStats = computeStats;
