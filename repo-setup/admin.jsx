// Admin panel — edit project config inline. Writes back via GitHub save path.
// v2: adds drag-and-drop Schedule editor + Month management

const { useState: useStateAD, useRef: useRefAD, useEffect: useEffectAD } = React;

// ─── Pillar colour map for schedule board ─────────────────────────────────────
const PILLAR_COLOURS = {
  "ai-in-s2p":              { bg: "rgba(30,111,168,0.10)", border: "rgba(30,111,168,0.32)", text: "#1e6fa8", tag: "AI" },
  "discrete-manufacturing": { bg: "rgba(91,59,158,0.09)",  border: "rgba(91,59,158,0.28)",  text: "#5a3d9e", tag: "Mfg" },
  "public-sector":          { bg: "rgba(200,64,26,0.08)",  border: "rgba(200,64,26,0.26)",  text: "#c8401a", tag: "Gov" },
  "higher-education":       { bg: "rgba(30,122,69,0.09)",  border: "rgba(30,122,69,0.28)",  text: "#1e7a45", tag: "HE" },
};
function pillarColour(pillarId) {
  return PILLAR_COLOURS[pillarId] || { bg: "rgba(17,24,32,0.06)", border: "rgba(17,24,32,0.20)", text: "#555", tag: "—" };
}

function AdminPanel({ project, setProject, adminTarget, setAdminTarget }) {
  const [tab, setTab] = useStateAD(adminTarget?.kind || "overview");
  // Draft: local copy of project — changes live here until Save is confirmed.
  const [draft, setDraft] = useStateAD(() => JSON.parse(JSON.stringify(project)));
  const [dirty, setDirty] = useStateAD(false);
  const [saveFlash, setSaveFlash] = useStateAD(null); // "saved" | "reverted" | null

  // Keep draft in sync if upstream project changes (e.g. tracker edits) while we're on a clean slate.
  useEffectAD(() => {
    if (!dirty) setDraft(JSON.parse(JSON.stringify(project)));
  }, [project]);

  function updateDraft(fn) {
    setDraft(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
    setDirty(true);
  }

  function handleSave() {
    setProject(draft);
    setDirty(false);
    setSaveFlash("saved");
    setTimeout(() => setSaveFlash(null), 2000);
  }

  function handleRevert() {
    setDraft(JSON.parse(JSON.stringify(project)));
    setDirty(false);
    setSaveFlash("reverted");
    setTimeout(() => setSaveFlash(null), 2000);
  }

  // Tabs that have editable state — show the save bar when dirty on these tabs
  const editableTabs = ["pillars", "schedule", "months", "team", "bwc", "notifications", "topics"];
  const showSaveBar = editableTabs.includes(tab);

  return (
    <main className="ns-admin">
      <header className="ns-admin-head">
        <div className="ns-admin-eyebrow">Admin · Config Editor</div>
        <h1 className="ns-admin-title">Edit the project, not the code.</h1>
        <p className="ns-admin-deck">
          Pillars, clusters, pieces and the team roster all live in <code>config/project.json</code>.
          Make your changes, then hit Save to commit — or Revert to discard.
        </p>
      </header>

      <nav className="ns-admin-tabs">
        {[["overview","Overview"],["pillars","Pillars & Clusters"],["schedule","Publishing Schedule"],["months","Months"],["team","Team"],["bwc","Build With Claude"],["notifications","Notifications"],["topics","Topic CSV Sync"],["raw","Raw JSON"]].map(([id, label]) => (
          <button key={id} className={`ns-admin-tab ${tab===id?"is-active":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {showSaveBar && (
        <div className="ns-admin-save-bar" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 24px",
          background: dirty ? "rgba(200,64,26,0.07)" : "rgba(79,122,91,0.07)",
          borderBottom: `2px solid ${dirty ? "#c8401a" : "#4f7a5b"}`,
          transition: "all 0.2s",
        }}>
          <span style={{
            fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase",
            color: dirty ? "#c8401a" : "#4f7a5b", fontWeight: 600, flex: 1,
          }}>
            {saveFlash === "saved"    ? "✓ Saved to GitHub" :
             saveFlash === "reverted" ? "↺ Changes reverted" :
             dirty                   ? "Unsaved changes" :
                                       "No unsaved changes"}
          </span>
          <button
            onClick={handleRevert}
            disabled={!dirty}
            style={{
              padding: "6px 16px", fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
              background: "transparent", border: "1px solid rgba(245,242,236,0.2)",
              color: dirty ? "#f5f2ec" : "rgba(245,242,236,0.3)",
              borderRadius: "2px", cursor: dirty ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >Revert</button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            style={{
              padding: "6px 20px", fontSize: "0.78rem", fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
              background: dirty ? "#c8401a" : "rgba(200,64,26,0.2)",
              border: "none", color: "#fff", borderRadius: "2px",
              cursor: dirty ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >Save Changes</button>
        </div>
      )}

      <div className="ns-admin-body">
        {tab === "overview"  && <AdminOverview  project={draft} />}
        {tab === "pillars"   && <AdminPillars   project={draft} setProject={p => { setDraft(p); setDirty(true); }} adminTarget={adminTarget} />}
        {tab === "schedule"  && <AdminSchedule  project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "months"    && <AdminMonths    project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "team"      && <AdminTeam      project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "bwc"           && <AdminBWC           project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "notifications" && <AdminNotifications  project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "topics" && <window.CsvSyncPanel project={draft} setProject={p => { setDraft(p); setDirty(true); }} />}
        {tab === "raw"       && <AdminRaw       project={draft} />}
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
    { num: stats.total,            label: "Pieces Total",    accent: false },
    { num: stats.approved,         label: "Approved",        accent: true  },
    { num: stats.awaiting,         label: "Awaiting Jaggaer",accent: false },
    { num: project.pillars.length, label: "Pillars",         accent: false },
    { num: clusterCount,           label: "Clusters",        accent: false },
    { num: Object.values(stats.byCluster).filter(c => c.ready).length, label: "Publish-Ready", accent: true },
    { num: teamCount,              label: "Team Members",    accent: false },
  ];
  const contentSplit = project.content_type_split || [];
  return (
    <div>
      <div className="ns-admin-overview">
        {tiles.map(t => (
          <div key={t.label} className={`ns-admin-stat-tile ${t.accent?"is-accent":""}`}>
            <div className="ns-admin-stat-num">{t.num}</div>
            <div className="ns-admin-stat-label">{t.label}</div>
          </div>
        ))}
      </div>
      {contentSplit.length > 0 && (
        <div style={{ marginTop: "24px", padding: "16px 20px", background: "#f8f6f2", border: "1px solid #e8e3da", borderRadius: "4px" }}>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>
            Content Type Split
          </div>
          <div style={{ display: "flex", gap: "0", borderRadius: "3px", overflow: "hidden", height: "8px", marginBottom: "14px" }}>
            {contentSplit.map((ct, i) => (
              <div key={ct.id} style={{
                flex: ct.weight,
                background: ct.id === "msv" ? "#1a6a3a" : ct.id === "ai-in-s2p" ? "#1e4fa8" : "#c8401a",
                opacity: 0.75,
              }} title={`${ct.label}: ${Math.round(ct.weight * 100)}%`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {contentSplit.map(ct => (
              <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "1px", flexShrink: 0,
                  background: ct.id === "msv" ? "#1a6a3a" : ct.id === "ai-in-s2p" ? "#1e4fa8" : "#c8401a",
                  opacity: 0.75,
                }} />
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#444" }}>
                  <strong style={{ color: "#111" }}>{Math.round(ct.weight * 100)}%</strong> {ct.label}
                  {ct.pieces_est && <span style={{ color: "#999", marginLeft: "4px" }}>~{ct.pieces_est} pieces</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ClusterChip — must live OUTSIDE AdminSchedule so React doesn't treat it as
//     a new component type on every render (which kills the native drag session).
function ClusterChip({ cluster, pillarId, fromWeek, removable, weekNum, isDraggingThis, stats, onDragStart, onDragEnd, onRemove }) {
  const cs = stats || { approved: 0, total: cluster.pieces?.length || 0 };
  const col = pillarColour(pillarId);
  return (
    <div
      className={`ns-scc ${isDraggingThis ? "is-dragging" : ""}`}
      draggable
      onDragStart={e => onDragStart(e, pillarId, cluster.id, fromWeek)}
      onDragEnd={onDragEnd}
      style={{ background: col.bg, borderColor: col.border }}
    >
      <span className="ns-scc-handle" style={{ pointerEvents: "none" }}>⠿</span>
      <div className="ns-scc-body" style={{ pointerEvents: "none" }}>
        <div className="ns-scc-tags">
          <span className="ns-scc-tag" style={{ color: col.text, background: col.bg, borderColor: col.border }}>{col.tag}</span>
          <span className="ns-scc-intent">{cluster.intent === "informational" ? "Info" : "Comm"}</span>
        </div>
        <div className="ns-scc-name">{cluster.label}</div>
        {cs.total > 0 && (
          <div className="ns-scc-progress">
            <div className="ns-scc-bar"><div className="ns-scc-fill" style={{ width: `${Math.round(cs.approved/cs.total*100)}%`, background: col.text, opacity: 0.7 }}></div></div>
            <span className="ns-scc-frac" style={{ color: col.text }}>{cs.approved}/{cs.total}</span>
          </div>
        )}
      </div>
      {removable && (
        <button className="ns-scc-rm" style={{ pointerEvents: "auto" }} onClick={e => { e.stopPropagation(); onRemove(weekNum, cluster.id); }} title="Remove from week">×</button>
      )}
    </div>
  );
}

// ─── Schedule editor — drag-and-drop cluster → week board ─────────────────────
function AdminSchedule({ project, setProject }) {
  // Seed from window.PUBLISHING_SEQUENCE (exposed by tracker.jsx) if no saved schedule
  function getInitialSchedule() {
    if (project.schedule && project.schedule.length) return project.schedule;
    const SEQ = window.PUBLISHING_SEQUENCE || [];
    return SEQ.map(w => ({
      week: w.week,
      label: w.label,
      goal: w.goal || "",
      slots: (w.slots || []).map(s => ({ pillar: s.pillar, cluster: s.cluster }))
    }));
  }

  const [weeks, setWeeks] = useStateAD(getInitialSchedule);
  // dragging: { pillarId, clusterId, fromWeek }
  const [dragging, setDragging] = useStateAD(null);
  // dragOver: week number | "pool" | null
  const [dragOver, setDragOver] = useStateAD(null);
  // Per-zone enter counters to defeat dragLeave-on-child-enter flickering
  const counters = useRefAD({});

  const assignedClusters = new Set(weeks.flatMap(w => w.slots.map(s => s.cluster)));
  const allClusters = project.pillars.flatMap(p => p.clusters.map(c => ({ ...c, pillarId: p.id })));
  const unscheduled = allClusters.filter(c => !assignedClusters.has(c.id));
  const clusterStats = window.computeStats(project).byCluster;

  function persist(newWeeks) {
    setWeeks(newWeeks);
    setProject(prev => ({ ...prev, schedule: newWeeks }));
  }

  // ── drag enter/leave with counter (defeats child-element flickering) ──
  function onEnter(e, zone) {
    e.preventDefault();
    counters.current[zone] = (counters.current[zone] || 0) + 1;
    setDragOver(zone);
  }
  function onLeave(e, zone) {
    counters.current[zone] = (counters.current[zone] || 1) - 1;
    if (counters.current[zone] <= 0) {
      counters.current[zone] = 0;
      setDragOver(prev => prev === zone ? null : prev);
    }
  }
  function onOver(e) { e.preventDefault(); }

  function handleDragStart(e, pillarId, clusterId, fromWeek) {
    // Reset all counters on new drag
    counters.current = {};
    setDragging({ pillarId, clusterId, fromWeek });
    // Required for Firefox
    e.dataTransfer.setData("text/plain", clusterId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e, toWeek) {
    e.preventDefault();
    counters.current = {};
    setDragOver(null);
    if (!dragging) return;
    const { pillarId, clusterId, fromWeek } = dragging;
    const next = weeks.map(w => ({ ...w, slots: [...w.slots] }));
    if (fromWeek !== "pool") {
      const src = next.find(w => w.week === fromWeek);
      if (src) src.slots = src.slots.filter(s => s.cluster !== clusterId);
    }
    if (toWeek !== "pool") {
      const tgt = next.find(w => w.week === toWeek);
      if (tgt && !tgt.slots.find(s => s.cluster === clusterId)) {
        tgt.slots.push({ pillar: pillarId, cluster: clusterId });
      }
    }
    persist(next);
    setDragging(null);
  }

  function handleDragEnd() {
    counters.current = {};
    setDragging(null);
    setDragOver(null);
  }

  function removeFromWeek(weekNum, clusterId) {
    persist(weeks.map(w => ({ ...w, slots: w.week === weekNum ? w.slots.filter(s => s.cluster !== clusterId) : w.slots })));
  }

  function updateWeekGoal(weekNum, goal) {
    persist(weeks.map(w => w.week === weekNum ? { ...w, goal } : w));
  }

  function addWeek() {
    persist([...weeks, { week: weeks.length + 1, label: `Week ${weeks.length + 1}`, goal: "", slots: [] }]);
  }

  function removeWeek(weekNum) {
    persist(weeks.filter(w => w.week !== weekNum).map((w, i) => ({ ...w, week: i + 1, label: `Week ${i + 1}` })));
  }

  return (
    <div className="ns-admin-schedule">
      <div className="ns-admin-schedule-hd">
        <div>
          <div className="ns-eyebrow ns-eyebrow-dark" style={{ marginBottom: 6 }}>Publishing Schedule Editor</div>
          <p className="ns-admin-schedule-rule">Drag clusters between weeks to reorder. Hit Save Changes above to commit — or Revert to discard.</p>
        </div>
        <button className="ns-schedule-add-week-btn" onClick={addWeek}>+ Add Week</button>
      </div>

      {/* Board: week columns */}
      <div className="ns-schedule-board">
        {weeks.map(week => {
          const isOver = dragOver === week.week;
          return (
            <div
              key={week.week}
              className={`ns-schedule-col ${isOver ? "is-over" : ""}`}
              onDragEnter={e => onEnter(e, week.week)}
              onDragLeave={e => onLeave(e, week.week)}
              onDragOver={onOver}
              onDrop={e => handleDrop(e, week.week)}
            >
              <div className="ns-schedule-col-head">
                <div className="ns-schedule-col-label">
                  <span className="ns-schedule-col-num">{week.label}</span>
                  <span className="ns-schedule-col-count">{week.slots.length}c</span>
                </div>
                {/* Show calendar dates derived from month start_date */}
                {(() => {
                  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
                  if (!activeMonth?.start_date) return null;
                  const start = new Date(activeMonth.start_date);
                  const weekStart = new Date(start.getTime() + (week.week - 1) * 7 * 24 * 60 * 60 * 1000);
                  const weekEnd   = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                  const fmt = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <div style={{
                      fontFamily: "Noto Sans, sans-serif",
                      fontSize: "0.67rem", fontWeight: 600,
                      color: "#c8401a", letterSpacing: "0.02em",
                      marginBottom: "4px",
                    }}>{fmt(weekStart)} – {fmt(weekEnd)}</div>
                  );
                })()}
                <textarea
                  className="ns-schedule-goal-input"
                  value={week.goal}
                  onChange={e => updateWeekGoal(week.week, e.target.value)}
                  placeholder="Publishing goal for this week…"
                  rows={2}
                />
                {weeks.length > 1 && week.slots.length === 0 && (
                  <button className="ns-schedule-rm-week" onClick={() => removeWeek(week.week)}>✕ Remove</button>
                )}
              </div>
              <div className="ns-schedule-col-body">
                {week.slots.map(slot => {
                  const pillar = project.pillars.find(p => p.id === slot.pillar);
                  const cluster = pillar?.clusters.find(c => c.id === slot.cluster);
                  if (!cluster) return null;
                  return (
                    <ClusterChip
                      key={slot.cluster}
                      cluster={cluster} pillarId={slot.pillar}
                      fromWeek={week.week} removable={true} weekNum={week.week}
                      isDraggingThis={dragging?.clusterId === slot.cluster}
                      stats={clusterStats[slot.cluster]}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onRemove={removeFromWeek}
                    />
                  );
                })}
                {week.slots.length === 0 && (
                  <div className={`ns-schedule-col-empty ${isOver ? "is-over" : ""}`}>
                    {isOver ? "Release to add" : "Drop clusters here"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled pool */}
      <div
        className={`ns-schedule-pool ${dragOver === "pool" ? "is-over" : ""}`}
        onDragEnter={e => onEnter(e, "pool")}
        onDragLeave={e => onLeave(e, "pool")}
        onDragOver={onOver}
        onDrop={e => handleDrop(e, "pool")}
      >
        <div className="ns-schedule-pool-hd">
          <span className="ns-eyebrow ns-eyebrow-dark">Unscheduled</span>
          <span className="ns-schedule-pool-count">{unscheduled.length} cluster{unscheduled.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="ns-schedule-pool-chips">
          {unscheduled.length === 0 ? (
            <span className="ns-schedule-pool-done">All clusters scheduled ✓</span>
          ) : (
            unscheduled.map(cluster => (
              <ClusterChip
                key={cluster.id}
                cluster={cluster} pillarId={cluster.pillarId}
                fromWeek="pool" removable={false}
                isDraggingThis={dragging?.clusterId === cluster.id}
                stats={clusterStats[cluster.id]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onRemove={removeFromWeek}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month management ─────────────────────────────────────────────────────────
function AdminMonths({ project, setProject }) {
  const [newLabel, setNewLabel] = useStateAD("");
  const [confirmDelete, setConfirmDelete] = useStateAD(null);

  const months = project.months || [];

  function setActiveMonth(id) {
    setProject(prev => ({ ...prev, active_month: id }));
  }

  function addMonth() {
    const label = newLabel.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const id = "month-" + slug;
    if (months.find(m => m.id === id)) { alert("A month with that ID already exists. Try a different label."); return; }
    setProject(prev => ({
      ...prev,
      months: [...(prev.months || []), { id, label, active: false }]
    }));
    setNewLabel("");
  }

  function updateLabel(id, label) {
    setProject(prev => ({
      ...prev,
      months: (prev.months || []).map(m => m.id === id ? { ...m, label } : m)
    }));
  }

  function updateStartDate(id, start_date) {
    setProject(prev => ({
      ...prev,
      months: (prev.months || []).map(m => m.id === id ? { ...m, start_date } : m)
    }));
  }

  function deleteMonth(id) {
    if (id === project.active_month) { alert("Cannot delete the active month. Switch to another month first."); return; }
    setProject(prev => ({ ...prev, months: (prev.months || []).filter(m => m.id !== id) }));
    setConfirmDelete(null);
  }

  return (
    <div className="ns-admin-months">
      <div className="ns-admin-months-intro">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{ marginBottom: 8 }}>Month Management</div>
        <p className="ns-admin-months-rule">
          Each month is an independent content cycle. The tracker shows the active month by default.
          Add Month 2 here — pillars and clusters carry over from the config, but the piece statuses
          are per-month. Content uploaded in the tracker goes into the active month's folder automatically.
        </p>
      </div>

      <div className="ns-admin-month-list">
        {months.length === 0 && (
          <div className="ns-admin-months-empty">No months defined yet. Add one below.</div>
        )}
        {months.map(m => {
          const isActive = m.id === project.active_month;
          return (
            <div key={m.id} className={`ns-admin-month-row ${isActive ? "is-active" : ""}`}>
              <div className={`ns-admin-month-dot ${isActive ? "is-active" : ""}`}></div>
              <input
                type="text"
                className="ns-admin-input ns-admin-month-label-input"
                value={m.label}
                onChange={e => updateLabel(m.id, e.target.value)}
              />
              <input
                type="date"
                className="ns-admin-input"
                value={m.start_date || ""}
                onChange={e => updateStartDate(m.id, e.target.value)}
                title="Week 1 start date — drives all publishing week date ranges"
                style={{ width: "140px", fontSize: "0.78rem" }}
              />
              <code className="ns-admin-month-id">{m.id}</code>
              <div className="ns-admin-month-actions">
                {isActive ? (
                  <span className="ns-admin-month-active-badge">Active</span>
                ) : (
                  <button className="ns-admin-month-set-btn" onClick={() => setActiveMonth(m.id)}>Set active</button>
                )}
                {!isActive && (
                  confirmDelete === m.id ? (
                    <span className="ns-confirm-del">
                      <button className="ns-admin-del-confirm" onClick={() => deleteMonth(m.id)}>✓ Delete</button>
                      <button className="ns-admin-del-cancel" onClick={() => setConfirmDelete(null)}>✕</button>
                    </span>
                  ) : (
                    <button className="ns-admin-del" onClick={() => setConfirmDelete(m.id)}>&times;</button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ns-admin-month-add-block">
        <div className="ns-eyebrow ns-eyebrow-dark" style={{ marginBottom: 12 }}>Add a New Month</div>
        <div className="ns-admin-month-add-row">
          <input
            type="text"
            className="ns-admin-input"
            placeholder="e.g.  Month 2 — June 2026"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMonth()}
            style={{ flex: 1 }}
          />
          <button
            className={`ns-admin-month-add-btn ${!newLabel.trim() ? "is-disabled" : ""}`}
            onClick={addMonth}
            disabled={!newLabel.trim()}
          >
            + Add Month
          </button>
        </div>
        <p className="ns-admin-month-hint">
          After adding, click "Set active" to switch the tracker to that month. The GitHub folder <code>content/month-2/</code> will be created automatically on first upload.
        </p>
      </div>
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
    if ((cluster?.pieces||[]).some(pc => pc.status && pc.status !== "not-started")) { alert("Cannot delete a cluster with pieces in progress."); setConfirmDelete(null); return; }
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
                      <div className={`ns-admin-cluster-h-row ${isClusterOpen?"is-open":""}`}>
                        <div className="ns-admin-cluster-seq-controls">
                          <button className="ns-seq-btn" onClick={() => nudgeClusterSeq(p.id, c.id, -1)}>▲</button>
                          <span className="ns-admin-cluster-seq">{c.sequence}</span>
                          <button className="ns-seq-btn" onClick={() => nudgeClusterSeq(p.id, c.id, 1)}>▼</button>
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

// ─── Build With Claude app manager ───────────────────────────────────────────
function AdminBWC({ project, setProject }) {
  const [confirmDelete, setConfirmDelete] = useStateAD(null);
  const apps = project.build_with_claude || [];

  const BWC_STATUSES = ["In Progress", "Ready for Review", "Live"];

  function updateApp(id, patch) {
    setProject(prev => ({
      ...prev,
      build_with_claude: (prev.build_with_claude || []).map(a => a.id === id ? { ...a, ...patch } : a),
    }));
  }

  function addApp() {
    const id = "bwc-" + Math.random().toString(36).slice(2, 8);
    setProject(prev => ({
      ...prev,
      build_with_claude: [...(prev.build_with_claude || []), {
        id,
        name: "new-app",
        label: "New App",
        description: "",
        status: "In Progress",
        path: "build-with-claude/new-app",
        updated: new Date().toISOString().slice(0, 10),
      }],
    }));
  }

  function deleteApp(id) {
    setProject(prev => ({
      ...prev,
      build_with_claude: (prev.build_with_claude || []).filter(a => a.id !== id),
    }));
    setConfirmDelete(null);
  }

  return (
    <div className="ns-admin-bwc">
      <div style={{ marginBottom: 20 }}>
        <div className="ns-eyebrow ns-eyebrow-dark" style={{ marginBottom: 8 }}>Build With Claude Apps</div>
        <p style={{ fontSize: "0.85rem", color: "rgba(245,242,236,0.5)", lineHeight: 1.6 }}>
          Manage the app cards shown in the Build With Claude panel. Code lives in the repo — this controls what the panel displays.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {apps.length === 0 && (
          <div style={{ color: "rgba(245,242,236,0.35)", fontSize: "0.85rem", padding: "20px 0" }}>No apps yet.</div>
        )}
        {apps.map((app, i) => (
          <div key={app.id} style={{
            background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.1)",
            borderRadius: 3, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "rgba(245,242,236,0.3)", fontVariant: "small-caps", letterSpacing: "0.08em", width: 24 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <input
                type="text"
                className="ns-admin-input"
                value={app.label || ""}
                onChange={e => updateApp(app.id, { label: e.target.value })}
                placeholder="Display name"
                style={{ flex: 1, fontWeight: 600 }}
              />
              <select
                className="ns-admin-input-sm"
                value={app.status}
                onChange={e => updateApp(app.id, { status: e.target.value })}
              >
                {BWC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {confirmDelete === app.id ? (
                <span className="ns-confirm-del">
                  <button className="ns-admin-del-confirm" onClick={() => deleteApp(app.id)}>✓ Delete</button>
                  <button className="ns-admin-del-cancel" onClick={() => setConfirmDelete(null)}>✕</button>
                </span>
              ) : (
                <button className="ns-admin-del" onClick={() => setConfirmDelete(app.id)}>&times;</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, paddingLeft: 34 }}>
              <input
                type="text"
                className="ns-admin-input"
                value={app.description || ""}
                onChange={e => updateApp(app.id, { description: e.target.value })}
                placeholder="Short description shown on the card"
                style={{ flex: 2 }}
              />
              <input
                type="text"
                className="ns-admin-input"
                value={app.path || ""}
                onChange={e => updateApp(app.id, { path: e.target.value })}
                placeholder="Repo path, e.g. build-with-claude/contract-analyser"
                style={{ flex: 2, fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}
              />
              <input
                type="date"
                className="ns-admin-input-sm"
                value={app.updated || ""}
                onChange={e => updateApp(app.id, { updated: e.target.value })}
                style={{ width: 140 }}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="ns-admin-add-cluster-btn" style={{ marginTop: 16 }} onClick={addApp}>
        + Add app
      </button>
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

// ─── Notifications settings ───────────────────────────────────────────────────
// Stores digest recipients in project.json under project.notifications.
// Written to GitHub like all other config — no separate env var needed for the
// recipient list. RESEND_API_KEY and DIGEST_FROM still live in Vercel env.
function AdminNotifications({ project, setProject }) {
  const notif = project.notifications || {};
  const [digestTo, setDigestTo] = useStateAD(
    Array.isArray(notif.digest_to) ? notif.digest_to.join(", ") : (notif.digest_to || "")
  );
  const [editorsTo, setEditorsTo] = useStateAD(
    Array.isArray(notif.editors_to) ? notif.editors_to.join(", ") : (notif.editors_to || "")
  );
  const [testState, setTestState] = useStateAD(null); // null | "sending" | "sent" | "error"
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  function save() {
    const toArr = s => s.split(",").map(e => e.trim()).filter(Boolean);
    setProject(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        digest_to: toArr(digestTo),
        editors_to: toArr(editorsTo),
      },
    }));
  }

  // Save on blur so the parent draft stays in sync
  function onBlur() { save(); }

  async function sendTestDigest() {
    setTestState("sending");
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      setTestState(res.ok ? "sent" : "error");
      setTimeout(() => setTestState(null), 4000);
    } catch { setTestState("error"); setTimeout(() => setTestState(null), 4000); }
  }

  const inputStyle = {
    ...FONT, width: "100%", padding: "8px 12px",
    fontSize: "0.82rem", border: "1px solid #e0dbd4",
    borderRadius: "3px", background: "#fff", color: "#1a2535",
    boxSizing: "border-box",
  };
  const labelStyle = { ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#888", display: "block", marginBottom: "6px" };
  const hintStyle = { ...FONT, fontSize: "0.72rem", color: "#aaa", marginTop: "5px" };

  return (
    <div style={{ maxWidth: "600px", padding: "8px 0" }}>
      <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "20px" }}>
        Notification Settings
      </div>

      {/* Daily Digest */}
      <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px", padding: "20px 24px", marginBottom: "16px" }}>
        <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 700, color: "#1a2535", marginBottom: "4px" }}>
          Daily Digest
        </div>
        <p style={{ ...FONT, fontSize: "0.78rem", color: "#888", marginBottom: "16px", lineHeight: 1.5 }}>
          Sent at <strong>6pm IST</strong> — only on days where uploads, feedback, or approvals happened.
          Uses Resend (free up to 3,000 emails/month — more than enough for this volume).
        </p>
        <label style={labelStyle}>Recipients (comma-separated)</label>
        <input
          type="text"
          style={inputStyle}
          value={digestTo}
          onChange={e => setDigestTo(e.target.value)}
          onBlur={onBlur}
          placeholder="e.g. indy@jaggaer.com, chahat@netscribes.com"
        />
        <div style={hintStyle}>Everyone listed gets the daily digest. Add both NS and Jaggaer stakeholders.</div>
      </div>

      {/* Send to Editors */}
      <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "4px", padding: "20px 24px", marginBottom: "16px" }}>
        <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 700, color: "#1a2535", marginBottom: "4px" }}>
          Send to Editors
        </div>
        <p style={{ ...FONT, fontSize: "0.78rem", color: "#888", marginBottom: "16px", lineHeight: 1.5 }}>
          Triggered manually when a cluster is fully approved. Sends a formatted handover email with all piece titles and GitHub file links.
        </p>
        <label style={labelStyle}>Digital editors (comma-separated)</label>
        <input
          type="text"
          style={inputStyle}
          value={editorsTo}
          onChange={e => setEditorsTo(e.target.value)}
          onBlur={onBlur}
          placeholder="e.g. editor@jaggaer.com, publishing@jaggaer.com"
        />
        <div style={hintStyle}>These recipients get the cluster handover email when you click "Send to Editors" on an approved cluster.</div>
      </div>

      {/* Setup checklist */}
      <div style={{ background: "#faf8f4", border: "1px solid #e8e3da", borderRadius: "4px", padding: "20px 24px", marginBottom: "16px" }}>
        <div style={{ ...FONT, fontSize: "0.78rem", fontWeight: 700, color: "#1a2535", marginBottom: "12px" }}>Setup checklist</div>
        {[
          ["RESEND_API_KEY", "Add to Vercel env — get from resend.com (free account, no card required)"],
          ["DIGEST_FROM", "Your verified sender email in Resend (can be your own email on free plan)"],
          ["Recipients above", "Set in this panel — saved to project.json, no env var needed"],
          ["vercel.json cron", "Already included — requires Vercel Pro for automatic triggering; or trigger manually via POST /api/digest"],
        ].map(([key, desc]) => (
          <div key={key} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
            <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, color: "#c8401a", flexShrink: 0, minWidth: "140px" }}>{key}</span>
            <span style={{ ...FONT, fontSize: "0.72rem", color: "#666" }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* Manual test trigger */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={sendTestDigest}
          disabled={testState === "sending" || testState === "sent"}
          style={{
            ...FONT, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: testState === "sent" ? "#1e7a45" : testState === "error" ? "#b91c1c" : "#c8401a",
            background: "transparent",
            border: `1px solid ${testState === "sent" ? "#86efac" : testState === "error" ? "#fca5a5" : "#e8cfc8"}`,
            padding: "8px 18px", borderRadius: "3px",
            cursor: testState ? "default" : "pointer",
          }}
        >
          {testState === "sending" ? "Sending…" : testState === "sent" ? "✓ Digest sent" : testState === "error" ? "Send failed" : "Send test digest now →"}
        </button>
        <span style={{ ...FONT, fontSize: "0.7rem", color: "#aaa" }}>Sends immediately to digest recipients — useful for testing the email template</span>
      </div>
    </div>
  );
}

window.AdminPanel = AdminPanel;
