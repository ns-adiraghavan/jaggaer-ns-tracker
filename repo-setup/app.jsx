// Root App. Hydrates from GitHub (or mock), holds project state, routes views.

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

// ── Save Toast ────────────────────────────────────────────────────────────────
function SaveToast({ state }) {
  if (!state) return null;
  const map = {
    saving: { text: "Saving\u2026",           color: "#c08227" },
    saved:  { text: "Saved to GitHub \u2713", color: "#4f7a5b" },
    error:  { text: "Save failed \u2014 check console", color: "#c8401a" },
  };
  const { text, color } = map[state] || map.saved;
  return (
    <div style={{
      position: "fixed", bottom: 52, right: 24, zIndex: 9999,
      background: "#0f1923", border: `1px solid ${color}`,
      borderLeft: `3px solid ${color}`,
      color: "#f5f2ec", fontFamily: "Noto Sans, sans-serif",
      fontSize: "0.78rem", letterSpacing: "0.04em",
      padding: "10px 18px", borderRadius: "2px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      transition: "opacity 0.3s",
      pointerEvents: "none",
    }}>
      {text}
    </div>
  );
}

// ── Session persistence helpers ───────────────────────────────────────────────
const SESSION_KEY = "ns_jaggaer_user";
function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function writeSession(user) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

function App() {
  const [project, setProject] = useStateApp(null);
  const [sha, setSha] = useStateApp(null);
  const [source, setSource] = useStateApp(null);
  const [currentUser, setCurrentUser] = useStateApp(readSession);
  const [view, setView] = useStateApp("tracker");
  const [activePillar, setActivePillar] = useStateApp(null);
  const [activeCluster, setActiveCluster] = useStateApp(null);
  const [adminMode, setAdminMode] = useStateApp(false);
  const [adminTarget, setAdminTarget] = useStateApp(null);
  const [saveState, setSaveState] = useStateApp(null);
  const [activeMonthId, setActiveMonthId] = useStateApp(null);
  const saveTimerRef = useRefApp(null);
  const toastTimerRef = useRefApp(null);
  const firstSaveRef = useRefApp(true);
  // shaRef ensures the save timeout always reads the current SHA,
  // not a stale closure value from a previous render.
  const shaRef = useRefApp(null);

  useEffectApp(() => {
    window.NS_API.loadProject().then(({ project, source, sha }) => {
      // If a session user exists, verify they're still in the roster; evict if not.
      const sessionUser = readSession();
      if (sessionUser) {
        const allMembers = [...project.team.ns, ...project.team.jaggaer];
        const stillValid = allMembers.find(m => m.id === sessionUser.id);
        if (!stillValid) { clearSession(); setCurrentUser(null); }
      }
      setProject(project);
      setSource(source);
      setSha(sha);
      shaRef.current = sha;
    });
  }, []);

  useEffectApp(() => {
    if (!project) return;
    if (firstSaveRef.current) { firstSaveRef.current = false; return; }
    clearTimeout(saveTimerRef.current);
    clearTimeout(toastTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(async () => {
      const r = await window.NS_API.saveProject(project, shaRef.current, "tracker update");
      if (r.ok && r.sha) {
        setSha(r.sha);
        shaRef.current = r.sha;
      }
      setSaveState(r.ok ? "saved" : "error");
      toastTimerRef.current = setTimeout(() => setSaveState(null), 2400);
    }, 800);
    return () => { clearTimeout(saveTimerRef.current); clearTimeout(toastTimerRef.current); };
  }, [project]);

  if (!project) {
    return <div className="ns-loading"><div className="ns-loading-dot"></div><span>Reading project.json\u2026</span></div>;
  }

  if (!currentUser) {
    return <NameSelector project={project} onSelect={m => { writeSession(m); setCurrentUser(m); if (m.admin) setAdminMode(false); }} />;
  }

  return (
    <div className="ns-shell">
      <Sidebar
        project={project}
        currentUser={currentUser}
        activePillar={activePillar}
        setActivePillar={setActivePillar}
        activeCluster={activeCluster}
        setActiveCluster={setActiveCluster}
        view={view}
        setView={setView}
        adminMode={adminMode}
        onToggleAdmin={() => setAdminMode(a => !a)}
        onSignOut={() => { clearSession(); setCurrentUser(null); setAdminMode(false); setView("tracker"); setActivePillar(null); setActiveCluster(null); }}
        activeMonthId={activeMonthId}
        setActiveMonthId={setActiveMonthId}
      />

      <div className="ns-main-col">
        {view === "tracker" && (
          <Tracker
            project={project}
            setProject={setProject}
            currentUser={currentUser}
            activePillar={activePillar}
            activeCluster={activeCluster}
            setActiveCluster={setActiveCluster}
            adminMode={adminMode}
            activeMonthId={activeMonthId}
            onAdminEditPiece={(clusterId, pieceId) => { setView("admin"); setAdminTarget({ kind: "pieces", clusterId, pieceId }); }}
            onAdminEditCluster={(clusterId) => { setView("admin"); setAdminTarget({ kind: "pillars", clusterId }); }}
          />
        )}
        {view === "bwc" && <BWCPanel project={project} />}
        {view === "agent-builder" && <AgentBuilderPanel />}
        {view === "admin" && adminMode && (
          <AdminPanel project={project} setProject={setProject} adminTarget={adminTarget} setAdminTarget={setAdminTarget} />
        )}
        {view === "admin" && !adminMode && (
          <div className="ns-admin-locked">
            <div className="ns-eyebrow ns-eyebrow-dark">ADMIN MODE OFF</div>
            <p>Toggle admin in the sidebar to edit the project config.</p>
          </div>
        )}
        <StatusFooter source={source} project={project} activeMonthId={activeMonthId} />
      </div>

      <SaveToast state={saveState} />
    </div>
  );
}

function StatusFooter({ source, project, activeMonthId }) {
  const stats = window.computeStats(project);
  const activeMonth = (project.months || []).find(m => m.id === (activeMonthId || project.active_month)) || (project.months || [])[0];
  const monthLabel = activeMonth ? activeMonth.label : "Month 1";

  return (
    <footer className="ns-status-bar">
      <div className="ns-status-bar-l">
        <span className="ns-status-bar-rule" style={{ background: source === "github" ? "#4f7a5b" : "#c08227" }}></span>
        <span>{source === "github" ? "Synced with GitHub" : "Mock data \u2014 set GITHUB_TOKEN to sync"}</span>
      </div>
      <div className="ns-status-bar-mid">
        <span>{stats.approved}/{stats.total} approved</span>
        <span className="ns-status-bar-sep">&middot;</span>
        <span>{stats.awaiting} awaiting Jaggaer</span>
      </div>
      <div className="ns-status-bar-r">
        <span>Netscribes &times; Jaggaer &middot; {monthLabel}</span>
      </div>
    </footer>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
