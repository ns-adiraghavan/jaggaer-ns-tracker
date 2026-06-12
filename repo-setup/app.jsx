// Root App. Hydrates from GitHub (or mock), holds project state, routes views.

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

// ── Error Boundary — catches React render errors that would otherwise leave
//    the app silently blank or stuck at the loading screen ──────────────────
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#0f1923", display: "flex",
          alignItems: "center", justifyContent: "center", padding: "40px",
        }}>
          <div style={{
            background: "#19242f", border: "1px solid #c8401a",
            borderLeft: "4px solid #c8401a", borderRadius: "4px",
            padding: "32px 40px", maxWidth: "640px", width: "100%",
          }}>
            <div style={{
              fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem",
              fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#c8401a", marginBottom: "16px",
            }}>
              Application Error
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: "1.4rem",
              color: "#f5f2ec", marginBottom: "12px",
            }}>
              Something went wrong loading the tracker.
            </div>
            <pre style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
              color: "rgba(245,242,236,0.55)", background: "rgba(0,0,0,0.3)",
              padding: "16px", borderRadius: "3px", overflow: "auto",
              maxHeight: "200px", whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
              {this.state.error.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "20px", background: "#c8401a", border: "none",
                color: "#fff", padding: "10px 24px", borderRadius: "2px",
                fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem",
                fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [loadError, setLoadError] = useStateApp(null);
  const [currentUser, setCurrentUser] = useStateApp(readSession);
  const [view, setView] = useStateApp("tracker");
  const [activePillar, setActivePillar] = useStateApp(null);
  const [activeCluster, setActiveCluster] = useStateApp(null);
  const [adminMode, setAdminMode] = useStateApp(false);
  const [adminTarget, setAdminTarget] = useStateApp(null);
  const [saveState, setSaveState] = useStateApp(null);
  const [activeMonthId, setActiveMonthId] = useStateApp(null);
  const [activeContentType, setActiveContentType] = useStateApp(null);
  const saveTimerRef = useRefApp(null);
  const toastTimerRef = useRefApp(null);
  const firstSaveRef = useRefApp(true);
  const shaRef = useRefApp(null);

  useEffectApp(() => {
    window.NS_API.loadProject().then(({ project, source, sha, error }) => {
      // If a session user exists, verify they're still in the roster; evict if not.
      const sessionUser = readSession();
      if (sessionUser) {
        const allMembers = [...project.team.ns, ...project.team.jaggaer];
        const stillValid = allMembers.find(m => m.id === sessionUser.id);
        if (!stillValid) { clearSession(); setCurrentUser(null); }
      }
      if (window.NS_syncWorkflow) window.NS_syncWorkflow(project);
      setProject(project);
      setSource(source);
      setSha(sha);
      shaRef.current = sha;
      if (error) setLoadError(error);
    }).catch(e => {
      // Should never reach here (loadProject has its own catch), but just in case
      console.error("[App] loadProject uncaught:", e);
      const project = JSON.parse(JSON.stringify(window.MOCK_PROJECT));
      setProject(project);
      setSource("mock");
      setLoadError(e.message);
    });
  }, []);

  useEffectApp(() => {
    if (project && window.NS_syncWorkflow) window.NS_syncWorkflow(project);
  }, [project]);

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
    return (
      <div className="ns-loading">
        <div className="ns-loading-dot"></div>
        <span>Reading project.json\u2026</span>
      </div>
    );
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
        onSignOut={() => { clearSession(); setCurrentUser(null); setAdminMode(false); setView("tracker"); setActivePillar(null); setActiveCluster(null); setActiveContentType(null); }}
        activeMonthId={activeMonthId}
        setActiveMonthId={setActiveMonthId}
        activeContentType={activeContentType}
        setActiveContentType={setActiveContentType}
      />

      <div className="ns-main-col">
        {loadError && source === "mock" && (
          <div style={{
            padding: "8px 24px", background: "#fffbeb",
            borderBottom: "1px solid #fcd34d",
            fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem",
            color: "#92400e", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontWeight: 700 }}>⚠ GitHub sync unavailable</span>
            <span>— showing mock data. Check Vercel environment variables.</span>
          </div>
        )}
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
            activeContentType={activeContentType}
            onAdminEditPiece={(clusterId, pieceId) => { setView("admin"); setAdminTarget({ kind: "pieces", clusterId, pieceId }); }}
            onAdminEditCluster={(clusterId) => { setView("admin"); setAdminTarget({ kind: "pillars", clusterId }); }}
          />
        )}
        {view === "jai-demo" && <JAIDemoPanel onBack={() => setView("tracker")} />}
        {view === "ai-playground" && <AIPlaygroundPanel onBack={() => setView("tracker")} />}
        {view === "style-guide" && <StyleGuidePanel project={project} adminMode={adminMode} />}
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

function JAIDemoPanel({ onBack }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 36px)", // leave room for status bar
      overflow: "hidden",
    }}>
      {/* Back bar — lives in tracker chrome, above the iframe */}
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 20px",
        background: "#fff",
        borderBottom: "1px solid #e8e3da",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "1px solid #e0dbd4",
            borderRadius: "3px",
            padding: "5px 12px",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#444",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          ← Back to Tracker
        </button>
        <div style={{
          width: "1px",
          height: "16px",
          background: "#e0dbd4",
        }} />
        <span style={{
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#888",
        }}>
          JAI Demo — JAGGAER AI for Procurement
        </span>
        <a
          href="/demo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "none",
            border: "1px solid #e0dbd4",
            borderRadius: "3px",
            padding: "5px 12px",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#444",
            textDecoration: "none",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          ↗ Open full page
        </a>
      </div>

      {/* Full-bleed iframe */}
      <iframe
        src="jai-demo.html"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          display: "block",
        }}
        title="JAI Demo"
      />
    </div>
  );
}


function AIPlaygroundPanel({ onBack }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 36px)",
      overflow: "hidden",
    }}>
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 20px",
        background: "#fff",
        borderBottom: "1px solid #e8e3da",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "1px solid #e0dbd4",
            borderRadius: "3px",
            padding: "5px 12px",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#444",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          ← Back to Tracker
        </button>
        <div style={{ width: "1px", height: "16px", background: "#e0dbd4" }} />
        <span style={{
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#888",
        }}>
          AI Playground — Hands-On AI for Procurement
        </span>
        <a
          href="/ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "none",
            border: "1px solid #e0dbd4",
            borderRadius: "3px",
            padding: "5px 12px",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#444",
            textDecoration: "none",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          ↗ Open full page
        </a>
      </div>
      <iframe
        src="ai-playground.html"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          display: "block",
        }}
        title="AI Playground"
      />
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
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
