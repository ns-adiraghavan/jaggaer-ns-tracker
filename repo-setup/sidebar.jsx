// Left sidebar - dark steel. Pillar/cluster nav with stats.
const { useMemo: useMemoSB } = React;

function Sidebar({ project, currentUser, activePillar, setActivePillar, activeCluster, setActiveCluster, view, setView, onSignOut, onToggleAdmin, adminMode, activeMonthId, setActiveMonthId }) {
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
          onClick={() => { setView("tracker"); setActivePillar(null); setActiveCluster(null); }}
          rightMeta={`${stats.approved}/${stats.total}`}
        />

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

        <div className="ns-sidebar-divider"></div>

        <NavSection
          label="Build With Claude"
          active={view === "bwc"}
          onClick={() => setView("bwc")}
          rightMeta="5 apps"
        />
        <NavSection
          label="Sample Artifacts"
          active={view === "sample-artifacts"}
          onClick={() => setView("sample-artifacts")}
          rightMeta="5 articles"
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

function computeStats(project, activeMonthId) {
  const effectiveMonthId = activeMonthId || project.active_month;
  const byPillar = {};
  const byCluster = {};
  let total = 0, approved = 0, awaiting = 0;
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
        if (piece.status === "uploaded" || piece.status === "revised") awaiting++;
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
