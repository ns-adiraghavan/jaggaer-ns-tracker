// Tracker v3 — publishing sequence, full piece detail, interlink map, tile grid

const { useState: useStateTR, useRef: useRefTR, useMemo: useMemoTR } = React;

const STATUS_META = {
  "not-started":     { label: "Not Started",      color: "rgba(17,24,32,0.38)",  bg: "rgba(17,24,32,0.06)" },
  "uploaded":        { label: "Uploaded",          color: "#1e6fa8",              bg: "#e8f2fa" },
  "jaggaer-feedback":{ label: "Jaggaer Feedback",  color: "#b05e00",              bg: "#fdf0e0" },
  "revised":         { label: "Revised",           color: "#5a3d9e",              bg: "#f0ecfa" },
  "approved":        { label: "Approved",          color: "#1e7a45",              bg: "#e6f5ec" }
};

const VERDICT_META = {
  "approved":       { label: "Approved",      glyph: "✓" },
  "needs-revision": { label: "Needs Revision", glyph: "↻" },
  "question":       { label: "Question",      glyph: "?" }
};

// Publishing sequence from the tracker spreadsheet
const PUBLISHING_SEQUENCE = [
  {
    week: 1,
    label: "Week 1",
    goal: "Capture Claude + S2P and tariff procurement search traffic from day one",
    slots: [
      { pillar: "ai-in-s2p",               cluster: "c1-getting-started",  pieces: 3 },
      { pillar: "discrete-manufacturing",   cluster: "dm1-tariffs",         pieces: 3 },
    ]
  },
  {
    week: 2,
    label: "Week 2",
    goal: "Convert Path 2 users, demonstrate Claude, rank before EU AI Act deadline peaks",
    slots: [
      { pillar: "ai-in-s2p",               cluster: "c2-contracts",        pieces: 2 },
      { pillar: "ai-in-s2p",               cluster: "c3-suppliers",        pieces: 3 },
      { pillar: "public-sector",            cluster: "ps1-eu-ai",           pieces: 2 },
      { pillar: "public-sector",            cluster: "ps2-einvoicing",      pieces: 2 },
    ]
  },
  {
    week: 3,
    label: "Week 3",
    goal: "Build cluster authority on supply chain risk and higher education spend governance",
    slots: [
      { pillar: "discrete-manufacturing",   cluster: "dm2-subtier",         pieces: 3 },
      { pillar: "discrete-manufacturing",   cluster: "dm3-minerals",        pieces: 2 },
      { pillar: "higher-education",         cluster: "he1-maverick",        pieces: 2 },
      { pillar: "higher-education",         cluster: "he2-grants",          pieces: 2 },
    ]
  },
  {
    week: 4,
    label: "Week 4",
    goal: "Convert audiences built in weeks 1–3 to platform evaluation intent",
    slots: [
      { pillar: "ai-in-s2p",               cluster: "c4-prompt-library",   pieces: 2 },
      { pillar: "discrete-manufacturing",   cluster: "dm4-tco",             pieces: 2 },
      { pillar: "public-sector",            cluster: "ps3-eval",            pieces: 1 },
      { pillar: "higher-education",         cluster: "he3-modernisation",   pieces: 1 },
    ]
  }
];

// Cross-pillar interlink map from the tracker spreadsheet
const INTERLINK_MAP = [
  { pillar: "AI in S2P",              cluster: "C1 Getting Started",    anchor: "FAQ: What Can Claude Do Right Now",                 cross: "Link from each sector's AI angle back to Getting Started cluster" },
  { pillar: "AI in S2P",              cluster: "C2 Claude for Contracts", anchor: "P-S: What Happens When You Ask Claude to Audit Contracts", cross: "Manufacturing C2: Sub-tier bankruptcy contracts angle" },
  { pillar: "AI in S2P",              cluster: "C3 Suppliers & Sourcing", anchor: "How-to Guide: 3 S2P Tasks in Claude Right Now",    cross: "Public Sector C2: E-invoicing as a Claude sourcing use case" },
  { pillar: "AI in S2P",              cluster: "C4 Prompt Library",     anchor: "By the Numbers: 20 Fundamental Queries",            cross: "All pillars: prompt library is the master cross-pillar SEO resource" },
  { pillar: "Discrete Manufacturing", cluster: "C1 Tariff & Trade",     anchor: "FAQ: CBAM & Carbon Cost of Supply Chain",           cross: "Public Sector C1: EU AI Act + CBAM as parallel compliance obligations" },
  { pillar: "Discrete Manufacturing", cluster: "C2 Sub-Tier Risk",      anchor: "Whitepaper: Tier 2-4 Supplier Bankruptcy",          cross: "AI in S2P C2: Claude for auditing supplier contracts" },
  { pillar: "Discrete Manufacturing", cluster: "C3 Critical Minerals",  anchor: "Data Snapshot: Steel, Aluminum & Rare Earth Volatility", cross: "Manufacturing C2: Critical minerals as a sub-tier risk driver" },
  { pillar: "Discrete Manufacturing", cluster: "C4 Platform TCO",       anchor: "eBook: The Manufacturing CPO's Platform Evaluation Guide", cross: "Public Sector C3: Platform evaluation — same buyer, different sector" },
  { pillar: "Public Sector",          cluster: "C1 EU AI Act",          anchor: "Whitepaper: AI in Government Procurement",          cross: "Manufacturing C4: Platform evaluation — AI as a buying criterion" },
  { pillar: "Public Sector",          cluster: "C2 E-Invoicing",        anchor: "Data Snapshot: Government Contract Leakage",        cross: "Higher Ed C1: Maverick spend — same problem, different sector" },
  { pillar: "Public Sector",          cluster: "C3 Platform Evaluation", anchor: "Q&A: Head of Procurement Platform Criteria",       cross: "Manufacturing C4 + Higher Ed C3: Cross-pillar platform evaluation" },
  { pillar: "Higher Education",       cluster: "C1 Maverick Spend",     anchor: "Whitepaper: CFO & CPO Maverick Spend Playbook",     cross: "Public Sector C2: Off-contract spend — parallel government problem" },
  { pillar: "Higher Education",       cluster: "C2 Grant Compliance",   anchor: "Checklist: Grant Compliance NSF/NIH/Horizon Europe", cross: "Higher Ed C3: Platform modernisation as the compliance solution" },
  { pillar: "Higher Education",       cluster: "C3 Platform Modernisation", anchor: "P-S: From Spreadsheets to Platform",            cross: "Manufacturing C4 + Public Sector C3: Platform evaluation cross-pillar" },
];

// ─── Tracker root ─────────────────────────────────────────────────────────────
function Tracker({ project, setProject, currentUser, activePillar, activeCluster, setActiveCluster, adminMode, onAdminEditPiece, onAdminEditCluster }) {
  const stats = window.computeStats(project);
  const pillars = activePillar ? project.pillars.filter(p => p.id === activePillar) : project.pillars;
  const [activeTab, setActiveTab] = useStateTR("tracker"); // tracker | sequence | interlinks
  const [openPiece, setOpenPiece] = useStateTR(null);

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
      />
      {activeTab === "tracker" && (
        <div className="ns-tracker-body">
          {pillars.map(pillar => (
            <PillarBlock
              key={pillar.id} pillar={pillar}
              sequence={project.pillars.indexOf(pillar) + 1}
              activeCluster={activeCluster} project={project}
              openPiece={openPiece} setOpenPiece={setOpenPiece}
              updatePiece={updatePiece} addFeedback={addFeedback}
              currentUser={currentUser} adminMode={adminMode}
              onAdminEditPiece={onAdminEditPiece} onAdminEditCluster={onAdminEditCluster}
            />
          ))}
        </div>
      )}
      {activeTab === "sequence" && <PublishingSequence project={project} />}
      {activeTab === "interlinks" && <InterlinkMap />}

      {overlayPiece && overlayCluster && overlayPillar && (
        <DrawerOverlay
          piece={overlayPiece} cluster={overlayCluster} pillar={overlayPillar}
          project={project} mode={openPiece.mode || "history"}
          setMode={m => setOpenPiece(prev => ({ ...prev, mode: m }))}
          updatePiece={updatePiece} addFeedback={addFeedback}
          currentUser={currentUser} adminMode={adminMode}
          onAdminEditPiece={onAdminEditPiece}
          onClose={() => setOpenPiece(null)}
        />
      )}
    </main>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function TrackerHeader({ project, stats, activeCluster, setActiveCluster, activeTab, setActiveTab }) {
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
        </div>
        <div className="ns-tracker-head-right">
          <KPI big={stats.approved} small={`/ ${stats.total}`} label="Approved" />
          <KPI big={stats.awaiting} small="" label="Awaiting Jaggaer" />
          <KPI big={readyClusters} small={`/ ${totalClusters}`} label="Clusters Ready" />
        </div>
      </div>

      <div className="ns-tracker-nav-row">
        <div className="ns-tracker-tabs">
          {[["tracker","Content Tracker"],["sequence","Publishing Sequence"],["interlinks","Interlink Map"]].map(([id, label]) => (
            <button key={id} className={`ns-tracker-tab ${activeTab === id ? "is-active" : ""}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {activeCluster && activeTab === "tracker" && (
          <div className="ns-tracker-filter">
            <span className="ns-eyebrow-rule"></span>
            <span>Filtered — one cluster</span>
            <button onClick={() => setActiveCluster(null)} className="ns-link-btn">Show all →</button>
          </div>
        )}
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

  // Determine current week based on how many clusters are publish-ready
  const totalReady = Object.values(clusterStats).filter(c => c.ready).length;
  const currentWeek = totalReady <= 2 ? 1 : totalReady <= 6 ? 2 : totalReady <= 10 ? 3 : 4;

  return (
    <div className="ns-sequence">
      <div className="ns-sequence-intro">
        <div className="ns-eyebrow ns-eyebrow-dark">4-Week Publishing Sequence · Informational clusters first, commercial second</div>
        <p className="ns-sequence-rule">Publish all pieces within a cluster before moving to the next. Add internal links between all pieces in the same cluster.</p>
      </div>
      <div className="ns-sequence-weeks">
        {PUBLISHING_SEQUENCE.map(week => {
          const isCurrent = week.week === currentWeek;
          const weekClusters = week.slots.map(slot => {
            const pillar = project.pillars.find(p => p.id === slot.pillar);
            const cluster = pillar?.clusters.find(c => c.id === slot.cluster);
            const cs = clusterStats[slot.cluster] || { approved: 0, total: slot.pieces, ready: false };
            return { pillar, cluster, cs, slot };
          });
          const weekReady = weekClusters.every(w => w.cs.ready);
          const weekBlocked = weekClusters.some(w => !w.cs.ready);

          return (
            <div key={week.week} className={`ns-week-card ${isCurrent ? "is-current" : ""} ${weekReady ? "is-done" : ""}`}>
              <div className="ns-week-head">
                <div className="ns-week-label-row">
                  <span className="ns-week-num">{week.label}</span>
                  {isCurrent && <span className="ns-week-badge-current">Current</span>}
                  {weekReady && <span className="ns-week-badge-done">Complete</span>}
                  {!weekReady && !isCurrent && week.week < currentWeek && <span className="ns-week-badge-blocked">Behind</span>}
                </div>
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

// ─── Interlink map view ───────────────────────────────────────────────────────
function InterlinkMap() {
  return (
    <div className="ns-interlinks">
      <div className="ns-sequence-intro">
        <div className="ns-eyebrow ns-eyebrow-dark">Internal Linking & Cross-Pillar Interlink Map · SEO Topical Authority Strategy</div>
        <p className="ns-sequence-rule">Every piece links to its cluster anchor. Anchor pieces link back to all supporting pieces. Cross-pillar links multiply authority across the full content ecosystem.</p>
      </div>
      <div className="ns-interlink-table-wrap">
        <table className="ns-interlink-table">
          <thead>
            <tr>
              <th>Pillar</th>
              <th>Cluster</th>
              <th>Anchor Piece</th>
              <th>Cross-Pillar Link Opportunity</th>
            </tr>
          </thead>
          <tbody>
            {INTERLINK_MAP.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "ns-interlink-row-even" : ""}>
                <td className="ns-interlink-pillar">{row.pillar}</td>
                <td className="ns-interlink-cluster">{row.cluster}</td>
                <td className="ns-interlink-anchor">{row.anchor}</td>
                <td className="ns-interlink-cross">{row.cross}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pillar block ─────────────────────────────────────────────────────────────
function PillarBlock({ pillar, sequence, activeCluster, project, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onAdminEditCluster }) {
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
            openPiece={openPiece} setOpenPiece={setOpenPiece}
            updatePiece={updatePiece} addFeedback={addFeedback}
            currentUser={currentUser} adminMode={adminMode}
            onAdminEditPiece={onAdminEditPiece} onAdminEditCluster={onAdminEditCluster}
            stagger={i}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Cluster card ─────────────────────────────────────────────────────────────
function ClusterCard({ cluster, pillar, project, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onAdminEditCluster, stagger }) {
  const total = cluster.pieces.length;
  const approved = cluster.pieces.filter(p => p.status === "approved").length;
  const inMotion = cluster.pieces.filter(p => ["uploaded","jaggaer-feedback","revised"].includes(p.status)).length;
  const ready = approved === total && total > 0;
  const anchor = cluster.pieces.find(p => p.id === cluster.anchor_piece);

  // Find the week this cluster is scheduled in
  const weekSlot = PUBLISHING_SEQUENCE.find(w => w.slots.some(s => s.cluster === cluster.id));

  return (
    <article className={`ns-cluster-card ${ready ? "is-ready" : ""}`} style={{ animationDelay: `${stagger * 60}ms` }}>
      <header className={`ns-cluster-head ${ready ? "is-ready" : ""}`}>
        <div className="ns-cluster-head-meta">
          <div className="ns-cluster-meta-row">
            <span className="ns-cluster-seq-badge">C{String(cluster.sequence).padStart(2, "0")}</span>
            <span className="ns-cluster-dot">·</span>
            <span className="ns-cluster-intent-badge">{cluster.intent === "informational" ? "Informational" : "Commercial"}</span>
            {weekSlot && <span className="ns-cluster-week-badge">Wk {weekSlot.week}</span>}
            {ready && <span className="ns-cluster-ready-badge">Publish-ready</span>}
            {adminMode && <button className="ns-admin-edit" onClick={() => onAdminEditCluster(cluster.id)}>Edit →</button>}
          </div>
          <h3 className="ns-cluster-title">{cluster.label}</h3>
          {anchor && <div className="ns-anchor-cluster">Anchor: {anchor.title.split(":")[0].replace(" (Anchor)","")}</div>}
        </div>
        <ProgressArc total={total} approved={approved} inMotion={inMotion} ready={ready} />
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
          />
        ))}
      </ul>
    </article>
  );
}

// ─── Progress arc ─────────────────────────────────────────────────────────────
function ProgressArc({ total, approved, inMotion, ready }) {
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
  return (
    <div className={`ns-arc-wrap ${ready ? "is-ready" : ""}`}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(240,237,230,0.12)" strokeWidth={stroke} />
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
            stroke="rgba(240,237,230,0.18)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="ns-arc-center">
        <div className="ns-arc-frac">
          <span className="ns-arc-num">{approved}</span>
          <span className="ns-arc-slash">/</span>
          <span className="ns-arc-tot">{total}</span>
        </div>
        <div className="ns-arc-label">{ready ? "Ready" : "Done"}</div>
      </div>
    </div>
  );
}

// ─── Piece row ────────────────────────────────────────────────────────────────
function PieceRow({ piece, cluster, pillar, isAnchor, isLast, project, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece }) {
  const isOpen = openPiece && openPiece.pieceId === piece.id;
  const feedback = (project.feedback || {})[piece.id] || [];
  const isNS = currentUser.org === "ns";
  const isJG = currentUser.org === "jaggaer";

  function primaryAction() {
    if (isNS && (piece.status === "not-started" || piece.status === "jaggaer-feedback"))
      return { label: piece.status === "jaggaer-feedback" ? "Upload Revision" : "Upload", mode: "upload" };
    if (isJG && (piece.status === "uploaded" || piece.status === "revised"))
      return { label: "Leave Feedback", mode: "feedback" };
    return null;
  }
  const action = primaryAction();
  const awaitsJaggaer = piece.status === "uploaded" || piece.status === "revised";

  return (
    <li className={`ns-piece-row ${isLast ? "is-last" : ""} ${isAnchor ? "is-anchor" : ""} ${awaitsJaggaer && isJG ? "awaits" : ""} ${isOpen ? "is-open" : ""}`}>
      <div className="ns-piece-main" onClick={() => setOpenPiece(isOpen ? null : { clusterId: cluster.id, pieceId: piece.id, mode: action?.mode || "history" })}>
        <div className="ns-piece-l">
          <StatusChip status={piece.status} />
          <div className="ns-piece-text">
            <div className="ns-piece-title-row">
              {isAnchor && <span className="ns-anchor-mark" title="Anchor piece">◆</span>}
              <h4 className="ns-piece-title">{piece.title}</h4>
            </div>
            <div className="ns-piece-meta">
              <span>{piece.format}</span>
              <span className="ns-meta-sep">·</span>
              <span>{assigneeName(project, piece.assignee)}</span>
              {piece.geography && piece.geography !== "all" && <><span className="ns-meta-sep">·</span><span className="ns-piece-geo">{piece.geography.toUpperCase()}</span></>}
              {piece.revision_count > 0 && <><span className="ns-meta-sep">·</span><span>rev {piece.revision_count}</span></>}
              {feedback.length > 0 && <><span className="ns-meta-sep">·</span><span>{feedback.length} note{feedback.length === 1 ? "" : "s"}</span></>}
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

function StatusChip({ status }) {
  const meta = STATUS_META[status] || STATUS_META["not-started"];
  return (
    <span className="ns-status-chip" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function assigneeName(project, id) {
  const all = [...project.team.ns, ...project.team.jaggaer];
  const m = all.find(x => x.id === id);
  return m ? m.name.split(" ")[0] : id;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function PieceDrawer({ piece, cluster, pillar, project, mode, setMode, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onClose }) {
  const feedback = (project.feedback || {})[piece.id] || [];
  const isNS = currentUser.org === "ns";
  const isJG = currentUser.org === "jaggaer";
  const canUpload = isNS && (piece.status === "not-started" || piece.status === "jaggaer-feedback");
  const canFeedback = isJG && (piece.status === "uploaded" || piece.status === "revised");

  return (
    <div className="ns-piece-drawer">
      <div className="ns-drawer-tabs">
        {canUpload && <button className={`ns-drawer-tab ${mode==="upload"?"is-active":""}`} onClick={() => setMode("upload")}>Upload</button>}
        {canFeedback && <button className={`ns-drawer-tab ${mode==="feedback"?"is-active":""}`} onClick={() => setMode("feedback")}>Leave Feedback</button>}
        <button className={`ns-drawer-tab ${mode==="history"?"is-active":""}`} onClick={() => setMode("history")}>
          Notes {feedback.length > 0 && <span className="ns-tab-count">{feedback.length}</span>}
        </button>
        <button className={`ns-drawer-tab ${mode==="details"?"is-active":""}`} onClick={() => setMode("details")}>Details</button>
        {adminMode && <button className="ns-drawer-tab" onClick={() => onAdminEditPiece(cluster.id, piece.id)}>Edit →</button>}
        <button className="ns-drawer-close" onClick={onClose}>Close ✕</button>
      </div>
      <div className="ns-drawer-body">
        {mode === "upload" && canUpload && <UploadPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} />}
        {mode === "feedback" && canFeedback && <FeedbackForm piece={piece} cluster={cluster} project={project} currentUser={currentUser} updatePiece={updatePiece} addFeedback={addFeedback} onDone={() => setMode("history")} />}
        {mode === "history" && <NotesHistory piece={piece} project={project} />}
        {mode === "details" && <PieceDetails piece={piece} cluster={cluster} pillar={pillar} project={project} />}
      </div>
    </div>
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function UploadPanel({ piece, cluster, pillar, project, currentUser, updatePiece }) {
  const [dragging, setDragging] = useStateTR(false);
  const [stage, setStage] = useStateTR("idle");
  const [filename, setFilename] = useStateTR(null);
  const [bytes, setBytes] = useStateTR(0);
  const [progress, setProgress] = useStateTR(0);
  const inputRef = useRefTR(null);

  async function handleFile(file) {
    setStage("uploading"); setFilename(file.name); setBytes(file.size);
    const reader = new FileReader();
    const contents = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsText(file); });
    for (let i = 0; i <= 100; i += 6) { setProgress(i); await new Promise(r => setTimeout(r, 28)); }
    await window.NS_API.uploadPieceDeliverable(piece, cluster.id, pillar.id, project.active_month, contents, currentUser.id);
    const newStatus = piece.status === "jaggaer-feedback" ? "revised" : "uploaded";
    const newRev = piece.status === "jaggaer-feedback" ? (piece.revision_count || 0) + 1 : (piece.revision_count || 0);
    updatePiece(cluster.id, piece.id, { status: newStatus, revision_count: newRev, last_upload: new Date().toISOString(), last_upload_by: currentUser.id });
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
            <div className="ns-drop-sub">or click to choose · .html, .docx, .md</div>
            <div className="ns-drop-path">→ <code>content/{project.active_month}/{pillar.id}/{cluster.id}/{piece.id}/v{(piece.revision_count||0)+1}.html</code></div>
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
            <div className="ns-drop-sub">{filename} · status → {piece.status==="jaggaer-feedback"?"Revised":"Uploaded"}</div>
            <div className="ns-drop-path">Jaggaer will see this in their queue.</div>
          </>)}
          <input ref={inputRef} type="file" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>
      <div className="ns-upload-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Conventions</div>
        <ul className="ns-upload-rules">
          <li>One file per upload. Re-uploads create a new versioned file.</li>
          <li>Versions are preserved — nothing is overwritten.</li>
          <li>Status moves to <strong>{piece.status==="jaggaer-feedback"?"Revised":"Uploaded"}</strong>; Jaggaer is cued.</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Feedback form ────────────────────────────────────────────────────────────
function FeedbackForm({ piece, cluster, project, currentUser, updatePiece, addFeedback, onDone }) {
  const [verdict, setVerdict] = useStateTR("approved");
  const [body, setBody] = useStateTR("");
  const [submitting, setSubmitting] = useStateTR(false);

  async function submit() {
    if (!body.trim() && verdict !== "approved") return;
    setSubmitting(true);
    const entry = { id: "fb-"+Math.random().toString(36).slice(2,8), author: currentUser.id, verdict, body: body.trim() || "(no note)", ts: new Date().toISOString() };
    addFeedback(piece.id, entry);
    updatePiece(cluster.id, piece.id, { status: verdict === "approved" ? "approved" : "jaggaer-feedback" });
    await new Promise(r => setTimeout(r, 300));
    setSubmitting(false); setBody(""); onDone();
  }

  return (
    <div className="ns-feedback">
      <div className="ns-feedback-l">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Your Verdict</div>
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
          placeholder={verdict==="approved" ? "Anything for NS on the way out — optional." : verdict==="needs-revision" ? "What needs to change and where. Be specific — section, paragraph, claim." : "Ask the writer something. They'll see it in their queue."}>
        </textarea>
        <div className="ns-feedback-actions">
          <button className="ns-feedback-submit" disabled={submitting||(verdict!=="approved"&&!body.trim())} onClick={submit}>
            {submitting ? "Submitting…" : `Submit · ${verdict==="approved"?"→ Approved":"→ Jaggaer Feedback"}`}
          </button>
        </div>
      </div>
      <div className="ns-feedback-r">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:10}}>Process</div>
        <ol className="ns-feedback-process">
          <li><strong>Approved</strong> — counts toward cluster completion.</li>
          <li><strong>Needs revision</strong> — NS sees note, re-uploads.</li>
          <li><strong>Question</strong> — open thread; status stays.</li>
        </ol>
        <div style={{marginTop:16}}>
          <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:8}}>Cluster State</div>
          <div className="ns-feedback-cluster-state">
            {cluster.pieces.filter(p => p.status==="approved").length} of {cluster.pieces.length} approved.
            {cluster.pieces.every(p => p.status==="approved" || p.id===piece.id) && verdict==="approved" && (
              <div className="ns-feedback-readymsg">Approving this piece marks the cluster <strong>publish-ready</strong>.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notes history ────────────────────────────────────────────────────────────
function NotesHistory({ piece, project }) {
  const feedback = (project.feedback || {})[piece.id] || [];
  if (!feedback.length) return (
    <div className="ns-history-empty">
      <div className="ns-eyebrow ns-eyebrow-dark">No Notes Yet</div>
      <div className="ns-history-empty-text">Feedback will appear here as an attributed thread.</div>
    </div>
  );
  return (
    <div>
      <div className="ns-eyebrow ns-eyebrow-dark" style={{marginBottom:12}}>Review Thread</div>
      <div className="ns-history-list">
        {feedback.map((f, i) => <FeedbackCard key={f.id} entry={f} project={project} ordinal={i+1} />)}
      </div>
    </div>
  );
}

function FeedbackCard({ entry, project, ordinal }) {
  const all = [...project.team.ns, ...project.team.jaggaer];
  const author = all.find(a => a.id === entry.author) || { name: entry.author, org: "ns", role: "" };
  const v = VERDICT_META[entry.verdict] || { label: entry.verdict, glyph: "•" };
  const date = new Date(entry.ts);
  const dateStr = date.toLocaleDateString("en-GB", { day:"numeric", month:"short" }) + " · " + date.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
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

// ─── Piece details — full data from tracker ───────────────────────────────────
function PieceDetails({ piece, cluster, pillar, project }) {
  // Find the week this piece's cluster is scheduled
  const weekSlot = PUBLISHING_SEQUENCE.find(w => w.slots.some(s => s.cluster === cluster.id));
  // Find interlink info for this cluster
  const interlinkRow = INTERLINK_MAP.find(r => {
    const clusterShort = cluster.label.split(" ").slice(0,2).join(" ");
    return r.pillar === pillar.label || r.cluster.includes(clusterShort);
  });

  const rows = [
    ["Pillar",            pillar.label],
    ["Cluster",           cluster.label],
    ["Intent",            cluster.intent === "informational" ? "Informational" : "Commercial"],
    ["Publishing week",   weekSlot ? weekSlot.label : "—"],
    ["Format",            piece.format],
    ["Assignee",          (() => { const all=[...project.team.ns,...project.team.jaggaer]; return all.find(x=>x.id===piece.assignee)?.name || piece.assignee; })()],
    ["Geography",         (piece.geography || "all").toUpperCase()],
    ["User path",         piece.user_paths ? piece.user_paths.join(", ") : "—"],
    ["Primary keyword",   piece.primary_keyword || "—"],
    ["Secondary keyword", piece.secondary_keyword || "—"],
    ["Anchor piece",      piece.id === cluster.anchor_piece ? "Yes — this is the cluster anchor" : "No"],
    ["Revision count",    piece.revision_count || 0],
    ["Status",            STATUS_META[piece.status]?.label || piece.status],
  ];
  if (interlinkRow) rows.push(["Cross-pillar link", interlinkRow.cross]);

  return (
    <div className="ns-details">
      <dl className="ns-detail-list">
        {rows.map(([k, v]) => (
          <div className="ns-detail-row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Drawer overlay ───────────────────────────────────────────────────────────
function DrawerOverlay({ piece, cluster, pillar, project, mode, setMode, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onClose }) {
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
          currentUser={currentUser} adminMode={adminMode}
          onAdminEditPiece={onAdminEditPiece} onClose={onClose}
        />
      </div>
    </div>
  );
}

window.Tracker = Tracker;
window.STATUS_META = STATUS_META;
window.VERDICT_META = VERDICT_META;
