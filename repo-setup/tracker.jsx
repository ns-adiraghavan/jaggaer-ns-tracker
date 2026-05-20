// Tracker v6 — schedule-aware: Priority Actions, overdue/due colouring, real week tracking

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

const STATUS_META = {
  "not-started":      { label: "Not Started",      color: "rgba(17,24,32,0.38)",  bg: "rgba(17,24,32,0.06)" },
  "uploaded":         { label: "Uploaded",          color: "#1e6fa8",              bg: "#e8f2fa" },
  "jaggaer-feedback": { label: "Jaggaer Feedback",  color: "#b05e00",              bg: "#fdf0e0" },
  "revised":          { label: "Revised",           color: "#5a3d9e",              bg: "#f0ecfa" },
  "approved":         { label: "Approved",          color: "#1e7a45",              bg: "#e6f5ec" }
};

const STATUS_ORDER = ["not-started", "uploaded", "jaggaer-feedback", "revised", "approved"];

// ─── Schedule helpers ──────────────────────────────────────────────────────────
function getScheduleContext(project) {
  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
  if (!activeMonth || !activeMonth.start_date) return { currentWeek: 1, startDate: null };
  const start = new Date(activeMonth.start_date);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.min(4, Math.max(1, Math.floor(diffDays / 7) + 1));
  return { currentWeek, startDate: start };
}

function getPieceTiming(piece, currentWeek) {
  const w = piece.schedule_week;
  if (!w) return null;
  if (piece.status === "approved") return "done";
  if (w < currentWeek) return "overdue";
  if (w === currentWeek) return "due";
  return "upcoming";
}

function weeksLate(piece, currentWeek) {
  if (!piece.schedule_week || piece.schedule_week >= currentWeek) return 0;
  return currentWeek - piece.schedule_week;
}

const TIMING_META = {
  overdue:  { color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", label: "Overdue" },
  due:      { color: "#92400e", bg: "#fffbeb", border: "#fcd34d", label: "Due this week" },
  upcoming: { color: "#6b6560", bg: "transparent", border: "transparent", label: "Upcoming" },
  done:     { color: "#1e7a45", bg: "#e6f5ec", border: "#86efac", label: "Done" },
};


const VERDICT_META = {
  "approved":       { label: "Approved",      glyph: "✓" },
  "needs-revision": { label: "Needs Revision", glyph: "↻" },
  "question":       { label: "Question",      glyph: "?" }
};

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

const INTERLINK_MAP = [
  { pillar: "AI in S2P",              cluster: "C1 Getting Started",     anchor: "FAQ: What Can Claude Do Right Now",                  cross: "Link from each sector's AI angle back to Getting Started cluster" },
  { pillar: "AI in S2P",              cluster: "C2 Claude for Contracts", anchor: "P-S: What Happens When You Ask Claude to Audit Contracts", cross: "Manufacturing C2: Sub-tier bankruptcy contracts angle" },
  { pillar: "AI in S2P",              cluster: "C3 Suppliers & Sourcing", anchor: "How-to Guide: 3 S2P Tasks in Claude Right Now",     cross: "Public Sector C2: E-invoicing as a Claude sourcing use case" },
  { pillar: "AI in S2P",              cluster: "C4 Prompt Library",      anchor: "By the Numbers: 20 Fundamental Queries",             cross: "All pillars: prompt library is the master cross-pillar SEO resource" },
  { pillar: "Discrete Manufacturing", cluster: "C1 Tariff & Trade",      anchor: "FAQ: CBAM & Carbon Cost of Supply Chain",            cross: "Public Sector C1: EU AI Act + CBAM as parallel compliance obligations" },
  { pillar: "Discrete Manufacturing", cluster: "C2 Sub-Tier Risk",       anchor: "Whitepaper: Tier 2-4 Supplier Bankruptcy",           cross: "AI in S2P C2: Claude for auditing supplier contracts" },
  { pillar: "Discrete Manufacturing", cluster: "C3 Critical Minerals",   anchor: "Data Snapshot: Steel, Aluminum & Rare Earth Volatility", cross: "Manufacturing C2: Critical minerals as a sub-tier risk driver" },
  { pillar: "Discrete Manufacturing", cluster: "C4 Platform TCO",        anchor: "eBook: The Manufacturing CPO's Platform Evaluation Guide", cross: "Public Sector C3: Platform evaluation — same buyer, different sector" },
  { pillar: "Public Sector",          cluster: "C1 EU AI Act",           anchor: "Whitepaper: AI in Government Procurement",           cross: "Manufacturing C4: Platform evaluation — AI as a buying criterion" },
  { pillar: "Public Sector",          cluster: "C2 E-Invoicing",         anchor: "Data Snapshot: Government Contract Leakage",         cross: "Higher Ed C1: Maverick spend — same problem, different sector" },
  { pillar: "Public Sector",          cluster: "C3 Platform Evaluation", anchor: "Q&A: Head of Procurement Platform Criteria",         cross: "Manufacturing C4 + Higher Ed C3: Cross-pillar platform evaluation" },
  { pillar: "Higher Education",       cluster: "C1 Maverick Spend",      anchor: "Whitepaper: CFO & CPO Maverick Spend Playbook",      cross: "Public Sector C2: Off-contract spend — parallel government problem" },
  { pillar: "Higher Education",       cluster: "C2 Grant Compliance",    anchor: "Checklist: Grant Compliance NSF/NIH/Horizon Europe",  cross: "Higher Ed C3: Platform modernisation as the compliance solution" },
  { pillar: "Higher Education",       cluster: "C3 Platform Modernisation", anchor: "P-S: From Spreadsheets to Platform",              cross: "Manufacturing C4 + Public Sector C3: Platform evaluation cross-pillar" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assigneeName(project, id) {
  if (!id) return "—";
  const all = [...project.team.ns, ...project.team.jaggaer];
  const m = all.find(x => x.id === id);
  return m ? m.name.split(" ")[0] : "—";
}

function StatusChip({ status }) {
  const meta = STATUS_META[status] || STATUS_META["not-started"];
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


// ─── Priority Actions panel ───────────────────────────────────────────────────
function PriorityActions({ project, currentWeek, onOpenPiece }) {
  const overdue = [];
  const duethisweek = [];

  for (const pillar of project.pillars) {
    for (const cluster of pillar.clusters) {
      for (const piece of cluster.pieces) {
        const timing = getPieceTiming(piece, currentWeek);
        if (timing === "overdue") overdue.push({ piece, cluster, pillar, late: weeksLate(piece, currentWeek) });
        if (timing === "due") duethisweek.push({ piece, cluster, pillar });
      }
    }
  }

  if (overdue.length === 0 && duethisweek.length === 0) return null;

  // Sort overdue by most weeks late first
  overdue.sort((a, b) => b.late - a.late);

  return (
    <div style={{
      margin: "0 0 0 0",
      borderBottom: "1px solid #e0dbd4",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px",
        background: overdue.length > 0 ? "#fef2f2" : "#fffbeb",
        borderBottom: "1px solid " + (overdue.length > 0 ? "#fca5a5" : "#fcd34d"),
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: overdue.length > 0 ? "#b91c1c" : "#d97706",
          flexShrink: 0,
          boxShadow: overdue.length > 0 ? "0 0 0 3px rgba(185,28,28,0.15)" : "0 0 0 3px rgba(217,119,6,0.15)",
        }} />
        <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: overdue.length > 0 ? "#b91c1c" : "#92400e" }}>
          Priority Actions
        </div>
        {overdue.length > 0 && (
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", color: "#b91c1c", background: "#fee2e2", padding: "2px 8px", borderRadius: "2px", fontWeight: 600 }}>
            {overdue.length} overdue
          </span>
        )}
        {duethisweek.length > 0 && (
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: "2px", fontWeight: 600 }}>
            {duethisweek.length} due week {currentWeek}
          </span>
        )}
        <div style={{ marginLeft: "auto", fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", color: "#888" }}>
          Week {currentWeek} of 4
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {[...overdue.map(x => ({ ...x, timing: "overdue" })), ...duethisweek.map(x => ({ ...x, timing: "due" }))].map(({ piece, cluster, pillar, timing, late }) => {
          const tm = TIMING_META[timing];
          const feedbackCount = ((project.feedback || {})[piece.id] || []).length;
          return (
            <div
              key={piece.id}
              onClick={() => onOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: "history" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 24px",
                borderLeft: `3px solid ${tm.border}`,
                background: tm.bg,
                borderBottom: "1px solid #f0ece4",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = timing === "overdue" ? "#fee2e2" : "#fef3c7"}
              onMouseLeave={e => e.currentTarget.style.background = tm.bg}
            >
              <div style={{ flexShrink: 0 }}>
                <span style={{
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: tm.color, background: tm.bg,
                  border: `1px solid ${tm.border}`,
                  padding: "2px 7px", borderRadius: "2px",
                  whiteSpace: "nowrap",
                }}>
                  {timing === "overdue" ? `Wk ${piece.schedule_week} · ${late}wk late` : `Wk ${piece.schedule_week} · Due now`}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: 500, color: "#0f1923", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {piece.title}
                </div>
                <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", color: "#888", marginTop: "2px" }}>
                  {pillar.label} · {cluster.label}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <StatusChip status={piece.status} />
                {feedbackCount > 0 && <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "#888" }}>{feedbackCount}✎</span>}
                <span style={{ color: tm.color, fontSize: "0.8rem" }}>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tracker root ─────────────────────────────────────────────────────────────
function Tracker({ project, setProject, currentUser, activePillar, activeCluster, setActiveCluster, adminMode, onAdminEditPiece, onAdminEditCluster }) {
  const stats = window.computeStats(project);
  const { currentWeek } = getScheduleContext(project);
  const pillars = activePillar ? project.pillars.filter(p => p.id === activePillar) : project.pillars;
  const [activeTab, setActiveTab] = useStateTR("tracker");
  const [viewMode, setViewMode] = useStateTR("table");
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
      />
      {activeTab === "tracker" && (
        <PriorityActions project={project} currentWeek={currentWeek} onOpenPiece={setOpenPiece} />
      )}
      {activeTab === "tracker" && viewMode === "cards" && (
        <div className="ns-tracker-body">
          {pillars.map(pillar => (
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
        </div>
      )}
      {activeTab === "tracker" && viewMode === "table" && (
        <CompactTable
          pillars={pillars} project={project}
          setOpenPiece={setOpenPiece}
          currentUser={currentUser} adminMode={adminMode}
          updatePiece={updatePiece} addFeedback={addFeedback}
        />
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
          deletePiece={deletePiece}
          onClose={() => setOpenPiece(null)}
        />
      )}
    </main>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function TrackerHeader({ project, stats, activeCluster, setActiveCluster, activeTab, setActiveTab, viewMode, setViewMode }) {
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
        <div className="ns-tracker-nav-right">
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
  const { currentWeek } = getScheduleContext(project);

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

// ─── Cluster card ─────────────────────────────────────────────────────────────
function ClusterCard({ cluster, pillar, project, clusterIndex, openPiece, setOpenPiece, updatePiece, addFeedback, currentUser, adminMode, onAdminEditPiece, onAdminEditCluster, stagger, currentWeek }) {
  const total = cluster.pieces.length;
  const approved = cluster.pieces.filter(p => p.status === "approved").length;
  const inMotion = cluster.pieces.filter(p => ["uploaded","jaggaer-feedback","revised"].includes(p.status)).length;
  const ready = approved === total && total > 0;
  const anchor = cluster.pieces.find(p => p.id === cluster.anchor_piece);
  const weekSlot = PUBLISHING_SEQUENCE.find(w => w.slots.some(s => s.cluster === cluster.id));
  const overdueCount = cluster.pieces.filter(p => getPieceTiming(p, currentWeek) === "overdue").length;
  const dueCount = cluster.pieces.filter(p => getPieceTiming(p, currentWeek) === "due").length;

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
  const timing = getPieceTiming(piece, currentWeek);
  const tm = timing ? TIMING_META[timing] : null;

  const nsMembers = project.team.ns.map(m => ({ value: m.id, label: m.name }));

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
    <li className={`ns-piece-row ${isLast ? "is-last" : ""} ${isAnchor ? "is-anchor" : ""} ${awaitsJaggaer && isJG ? "awaits" : ""} ${isOpen ? "is-open" : ""} ${timing === "overdue" ? "is-overdue" : ""} ${timing === "due" ? "is-due" : ""}`}
      style={timing === "overdue" ? { borderLeft: "3px solid #fca5a5" } : timing === "due" ? { borderLeft: "3px solid #fcd34d" } : {}}>
      <div className="ns-piece-main" onClick={() => setOpenPiece(isOpen ? null : { clusterId: cluster.id, pieceId: piece.id, mode: action?.mode || "history" })}>
        <div className="ns-piece-l">
          {adminMode ? (
            <InlineCell
              value={piece.status}
              type="select"
              options={STATUS_ORDER.map(s => ({ value: s, label: STATUS_META[s].label }))}
              onSave={val => updatePiece(cluster.id, piece.id, { status: val })}
            >
              <StatusChip status={piece.status} />
            </InlineCell>
          ) : (
            <StatusChip status={piece.status} />
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
              {timing === "overdue" && tm && (
                <><span className="ns-meta-sep">·</span><span style={{ fontFamily:"Noto Sans,sans-serif", fontSize:"0.68rem", fontWeight:700, color: tm.color }}>{weeksLate(piece, currentWeek)}wk overdue</span></>
              )}
              {timing === "due" && tm && (
                <><span className="ns-meta-sep">·</span><span style={{ fontFamily:"Noto Sans,sans-serif", fontSize:"0.68rem", fontWeight:700, color: tm.color }}>Due this week</span></>
              )}
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

// ─── Drawer ───────────────────────────────────────────────────────────────────
function PieceDrawer({ piece, cluster, pillar, project, mode, setMode, updatePiece, addFeedback, deletePiece, currentUser, adminMode, onAdminEditPiece, onClose }) {
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
        {adminMode && <button className={`ns-drawer-tab ${mode==="edit"?"is-active":""}`} onClick={() => setMode("edit")}>Edit</button>}
        {adminMode && <button className={`ns-drawer-tab ns-drawer-tab-delete ${mode==="delete"?"is-active":""}`} onClick={() => setMode("delete")}>Delete</button>}
        <button className="ns-drawer-close" onClick={onClose}>Close ✕</button>
      </div>
      <div className="ns-drawer-body">
        {mode === "upload" && canUpload && <UploadPanel piece={piece} cluster={cluster} pillar={pillar} project={project} currentUser={currentUser} updatePiece={updatePiece} />}
        {mode === "feedback" && canFeedback && <FeedbackForm piece={piece} cluster={cluster} project={project} currentUser={currentUser} updatePiece={updatePiece} addFeedback={addFeedback} onDone={() => setMode("history")} />}
        {mode === "history" && <NotesHistory piece={piece} project={project} />}
        {mode === "details" && <PieceDetails piece={piece} cluster={cluster} pillar={pillar} project={project} />}
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
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
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

// ─── Upload ───────────────────────────────────────────────────────────────────
// FIX 1: Upload path display now shows "deliverable-v{n}.html" to match api.js actual path.
// FIX 2: revision_count increments on first upload too (not just re-uploads after feedback).
//        First upload: not-started → uploaded, rev 0 → 1.
//        Re-upload after feedback: jaggaer-feedback → revised, rev n → n+1.
function UploadPanel({ piece, cluster, pillar, project, currentUser, updatePiece }) {
  const [dragging, setDragging] = useStateTR(false);
  const [stage, setStage] = useStateTR("idle");
  const [filename, setFilename] = useStateTR(null);
  const [bytes, setBytes] = useStateTR(0);
  const [progress, setProgress] = useStateTR(0);
  const inputRef = useRefTR(null);

  const nextRev = (piece.revision_count || 0) + 1;

  async function handleFile(file) {
    setStage("uploading"); setFilename(file.name); setBytes(file.size);
    const reader = new FileReader();
    const contents = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsText(file); });
    for (let i = 0; i <= 100; i += 6) { setProgress(i); await new Promise(r => setTimeout(r, 28)); }
    await window.NS_API.uploadPieceDeliverable(piece, cluster.id, pillar.id, project.active_month, contents, currentUser.id);
    // Always increment revision_count on any upload; status depends on current state
    const newStatus = piece.status === "jaggaer-feedback" ? "revised" : "uploaded";
    updatePiece(cluster.id, piece.id, {
      status: newStatus,
      revision_count: nextRev,
      last_upload: new Date().toISOString(),
      last_upload_by: currentUser.id
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
            <div className="ns-drop-sub">or click to choose · .html, .docx, .md</div>
            <div className="ns-drop-path">→ <code>content/{project.active_month}/{pillar.id}/{cluster.id}/{piece.id}/deliverable-v{nextRev}.html</code></div>
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
            <div className="ns-drop-sub">{filename} · deliverable-v{nextRev}.html · status → {piece.status==="jaggaer-feedback"?"Revised":"Uploaded"}</div>
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

// ─── Piece details ────────────────────────────────────────────────────────────
function PieceDetails({ piece, cluster, pillar, project }) {
  const weekSlot = PUBLISHING_SEQUENCE.find(w => w.slots.some(s => s.cluster === cluster.id));
  const interlinkRow = INTERLINK_MAP.find(r => {
    const clusterShort = cluster.label.split(" ").slice(0,2).join(" ");
    return r.pillar === pillar.label || r.cluster.includes(clusterShort);
  });

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
            <th className="ns-ct-th ns-ct-th-intent">Intent</th>
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
                    <span className="ns-ct-pillar-weight">{Math.round(pillar.weight * 100)}%</span>
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
                const awaitsJG = isJG && (piece.status === "uploaded" || piece.status === "revised");
                const canUploadNS = currentUser.org === "ns" && (piece.status === "not-started" || piece.status === "jaggaer-feedback");
                const hasAction = awaitsJG || canUploadNS;

                rows.push(
                  <tr
                    key={piece.id}
                    className={`ns-ct-piece-row ${awaitsJG ? "awaits-jg" : ""} ${isAnchor ? "is-anchor" : ""} ${adminMode ? "is-admin-row" : ""}`}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#faf9f7" }}
                    onClick={() => setOpenPiece({ clusterId: cluster.id, pieceId: piece.id, mode: awaitsJG ? "feedback" : canUploadNS ? "upload" : "history" })}
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
                      <span className={`ns-ct-intent-badge ${cluster.intent}`}>{cluster.intent === "informational" ? "Info" : "Comm"}</span>
                    </td>
                    <td className="ns-ct-td ns-ct-td-path">
                      {piece.user_paths ? piece.user_paths.map(p => (
                        <span key={p} className="ns-ct-path-pill">{p.replace("Path ","P")}</span>
                      )) : <span className="ns-ct-na">—</span>}
                    </td>

                    {/* Status — inline select for admin */}
                    <td className="ns-ct-td ns-ct-td-status">
                      {adminMode ? (
                        <InlineCell
                          value={piece.status}
                          type="select"
                          options={STATUS_ORDER.map(s => ({ value: s, label: STATUS_META[s].label }))}
                          onSave={val => updatePiece(cluster.id, piece.id, { status: val })}
                        >
                          <StatusChip status={piece.status} />
                        </InlineCell>
                      ) : (
                        <StatusChip status={piece.status} />
                      )}
                      {hasAction && !adminMode && <span className="ns-ct-action-dot" title={awaitsJG ? "Needs your feedback" : "Awaiting upload"} />}
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

window.Tracker = Tracker;
window.STATUS_META = STATUS_META;
window.VERDICT_META = VERDICT_META;
window.PUBLISHING_SEQUENCE = PUBLISHING_SEQUENCE;
