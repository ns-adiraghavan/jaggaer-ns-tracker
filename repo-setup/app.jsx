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
// localStorage so an authenticated browser stays signed in across tabs (e.g. a
// piece link opened in a new tab) and across restarts, until explicit sign-out.
// sessionStorage fallback on read keeps existing sessions valid after deploy.
const SESSION_KEY = "ns_jaggaer_user";
function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function writeSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch {}
}


// ── Mobile bottom tabbar + slide-up nav sheet ─────────────────────────────
// Rendered inside the shell on ≤768px. The desktop sidebar handles nav on wider screens.
function MobileNav({ view, setView, currentUser, adminMode, onSignOut, project }) {
  const [sheetOpen, setSheetOpen] = useStateApp(false);

  const MAIN_TABS = [
    { id: "tracker",      icon: "📋", label: "Tracker" },
    { id: "weekly-report",icon: "📅", label: "Weekly" },
    { id: "performance",  icon: "📈", label: "Stats" },
    { id: "more",         icon: "☰",  label: "More" },
  ];

  function handleTab(id) {
    if (id === "more") { setSheetOpen(s => !s); return; }
    setView(id);
    setSheetOpen(false);
  }

  const SHEET_ITEMS = [
    { id: "ai-playground",  label: "AI Playground" },
    { id: "content-flow",   label: "Content Flow" },
    { id: "style-guide",    label: "Style Guide" },
    ...(adminMode ? [{ id: "admin", label: "Admin" }] : []),
  ];

  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
  const monthLabel = activeMonth ? activeMonth.label : "";

  return (
    <>
      {/* Bottom tab bar */}
      <div className="ns-mob-tabbar">
        {MAIN_TABS.map(t => (
          <button
            key={t.id}
            className={"ns-mob-tab" + (view === t.id || (t.id === "more" && sheetOpen) ? " is-active" : "")}
            onClick={() => handleTab(t.id)}
          >
            <span className="ns-mob-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Backdrop + slide-up sheet */}
      <div
        className={"ns-mob-nav-backdrop" + (sheetOpen ? " is-open" : "")}
        onClick={e => { if (e.target === e.currentTarget) setSheetOpen(false); }}
      >
        <div className="ns-mob-nav-sheet">
          {/* User strip */}
          <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #e8e3da" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 600, color: "var(--ink)" }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "3px" }}>
              {currentUser.role} {monthLabel && <span style={{ color: "var(--ink-4)" }}>· {monthLabel}</span>}
            </div>
          </div>

          {/* Sheet nav items */}
          <div style={{ padding: "8px 0" }}>
            {SHEET_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setSheetOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "14px 20px",
                  fontSize: "14px", fontWeight: view === item.id ? 600 : 400,
                  color: view === item.id ? "var(--accent)" : "var(--ink-2)",
                  background: view === item.id ? "var(--accent-soft)" : "none",
                  border: "none", cursor: "pointer", display: "block",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sign out */}
          <div style={{ padding: "12px 20px 28px", borderTop: "1px solid #e8e3da" }}>
            <button
              onClick={() => { setSheetOpen(false); onSignOut(); }}
              style={{
                width: "100%", padding: "12px", border: "1px solid var(--surface-3)",
                borderRadius: "var(--radius)", background: "var(--surface)",
                fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--ink-3)", cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [loginOrg, setLoginOrg] = useStateApp(() => window.NS_LOGIN ? window.NS_LOGIN.readLoginSession() : null);
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
  const projectRef = useRefApp(null);
  const suppressAutoSaveRef = useRefApp(false);

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
    if (suppressAutoSaveRef.current) { suppressAutoSaveRef.current = false; return; }
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

  // Keep a live mirror of project so imperative savers read the latest snapshot.
  useEffectApp(() => { projectRef.current = project; }, [project]);

  // Immediate, CONFIRMED save for a single comment. The comment panel calls this
  // instead of relying on the debounced background save, so the reviewer sees a
  // real GitHub result (saved / not saved) rather than an optimistic checkmark.
  useEffectApp(() => {
    window.NS_saveFeedbackNow = async (pieceId, entry) => {
      const base = projectRef.current;
      if (!base) return { ok: false, error: "no-project" };
      const next = JSON.parse(JSON.stringify(base));
      if (!next.feedback) next.feedback = {};
      if (!next.feedback[pieceId]) next.feedback[pieceId] = [];
      next.feedback[pieceId].push(entry);
      projectRef.current = next;
      suppressAutoSaveRef.current = true;
      setProject(next);
      clearTimeout(saveTimerRef.current);
      clearTimeout(toastTimerRef.current);
      setSaveState("saving");
      const r = await window.NS_API.saveProject(next, shaRef.current, "comment " + pieceId);
      if (r.ok && r.sha) {
        shaRef.current = r.sha;
        setSha(r.sha);
        if (r.project) {
          projectRef.current = r.project;
          suppressAutoSaveRef.current = true;
          setProject(r.project);
        }
      }
      if (!r.ok) {
        // Save failed — roll back the optimistic add so a retry does not duplicate it.
        projectRef.current = base;
        suppressAutoSaveRef.current = true;
        setProject(base);
      }
      setSaveState(r.ok ? "saved" : "error");
      toastTimerRef.current = setTimeout(() => setSaveState(null), 3000);
      return r;
    };
    return () => { try { delete window.NS_saveFeedbackNow; } catch (e) {} };
  }, []);

  // Warn before leaving if a save is still in flight.
  useEffectApp(() => {
    const onBeforeUnload = (e) => {
      if (saveState === "saving") { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  // ── Login gate — must pass before anything else is shown ──────────────────
  if (!loginOrg) {
    return (
      <LoginGate onUnlock={org => setLoginOrg(org)} />
    );
  }

  if (!project) {
    return (
      <div className="ns-loading">
        <div className="ns-loading-dot"></div>
        <span>Reading project.json\u2026</span>
      </div>
    );
  }

  if (!currentUser) {
    return <NameSelector project={project} loginOrg={loginOrg} onSelect={m => {
      writeSession(m);
      setCurrentUser(m);
      if (m.admin) setAdminMode(false);
      // If user arrived via a piece link, redirect back to it after login
      const returnPiece = sessionStorage.getItem("ns_piece_return");
      if (returnPiece) {
        sessionStorage.removeItem("ns_piece_return");
        window.location.href = `/piece/${encodeURIComponent(returnPiece)}`;
      }
    }} />;
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
        onSignOut={() => { clearSession(); if (window.NS_LOGIN) window.NS_LOGIN.clearLoginSession(); setLoginOrg(null); setCurrentUser(null); setAdminMode(false); setView("tracker"); setActivePillar(null); setActiveCluster(null); setActiveContentType(null); }}
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
        {view === "weekly-report" && <WeeklyReportPanel project={project} currentUser={currentUser} />}
        {view === "performance" && <PerformancePanel project={project} setProject={setProject} currentUser={currentUser} adminMode={adminMode} />}
        {view === "ai-playground" && <AIPlaygroundPanel onBack={() => setView("tracker")} project={project} setProject={setProject} currentUser={currentUser} saveState={saveState} />}
        {view === "style-guide" && <StyleGuidePanel project={project} adminMode={adminMode} />}
        {view === "content-flow" && <ContentFlowPanel project={project} adminMode={adminMode} />}
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

      <MobileNav
        view={view}
        setView={setView}
        currentUser={currentUser}
        adminMode={adminMode}
        project={project}
        onSignOut={() => { clearSession(); if (window.NS_LOGIN) window.NS_LOGIN.clearLoginSession(); setLoginOrg(null); setCurrentUser(null); setAdminMode(false); setView("tracker"); setActivePillar(null); setActiveCluster(null); setActiveContentType(null); }}
      />
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


function AIPlaygroundPanel({ onBack, project, setProject, currentUser, saveState }) {
  const { useState: useStateAP, useEffect: useEffectAP, useRef: useRefAP } = React;
  const [commentMode, setCommentMode] = useStateAP(false);
  const [draft, setDraft] = useStateAP(null); // { x, y, text }
  const [activePin, setActivePin] = useStateAP(null); // comment id being viewed
  const [showResolved, setShowResolved] = useStateAP(false);
  const overlayRef = useRefAP(null);
  const inputRef = useRefAP(null);

  const comments = (project && project.playground_comments) || [];
  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  const postComment = (text) => {
    if (!draft || !text.trim()) return;
    const next = {
      id: "pc-" + Date.now(),
      x: draft.x,
      y: draft.y,
      author_id: currentUser ? currentUser.id : "unknown",
      author_name: currentUser ? currentUser.name : "Team",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    setProject(p => ({ ...p, playground_comments: [...(p.playground_comments || []), next] }));
    setDraft(null);
    setCommentMode(false);
  };

  const resolveComment = (id) => {
    setProject(p => ({
      ...p,
      playground_comments: (p.playground_comments || []).map(c =>
        c.id === id ? { ...c, resolved: true } : c
      ),
    }));
    setActivePin(null);
  };

  const deleteComment = (id) => {
    setProject(p => ({
      ...p,
      playground_comments: (p.playground_comments || []).filter(c => c.id !== id),
    }));
    setActivePin(null);
  };

  const handleOverlayClick = (e) => {
    if (!commentMode) return;
    // If clicking on an existing pin, ignore (handled by pin onClick)
    if (e.target !== e.currentTarget) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraft({ x, y, text: "" });
    setActivePin(null);
  };

  // Focus textarea when draft appears
  useEffectAP(() => {
    if (draft && inputRef.current) {
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [!!draft]);

  // Escape key handling
  useEffectAP(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (draft) { setDraft(null); return; }
      if (activePin) { setActivePin(null); return; }
      if (commentMode) setCommentMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, activePin, commentMode]);

  // Close popover on outside click
  useEffectAP(() => {
    if (!activePin) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-pin]") && !e.target.closest("[data-popover]")) {
        setActivePin(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [activePin]);

  const btnBase = {
    display: "flex", alignItems: "center", gap: "6px",
    background: "none", border: "1px solid #e0dbd4", borderRadius: "3px",
    padding: "5px 12px", fontFamily: "Noto Sans, sans-serif",
    fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#444", cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 36px)", overflow: "hidden" }}>

      {/* ── Top chrome bar ─────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 16px", background: "#fff", borderBottom: "1px solid #e8e3da",
      }}>
        <button
          onClick={onBack}
          style={{ ...btnBase, fontSize: "0.72rem" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
        >
          ← Back
        </button>

        <div style={{ width: "1px", height: "16px", background: "#e0dbd4" }} />

        <span style={{
          fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem",
          fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888",
        }}>
          AI Playground
        </span>

        {/* ── Comment controls ─── */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>

          {/* Resolved toggle — only when there are resolved comments */}
          {resolvedComments.length > 0 && (
            <button
              onClick={() => setShowResolved(v => !v)}
              style={{
                ...btnBase,
                color: showResolved ? "#5300CE" : "#888",
                borderColor: showResolved ? "#5300CE" : "#e0dbd4",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              title="Toggle resolved comments"
            >
              {showResolved ? "Hide resolved" : `${resolvedComments.length} resolved`}
            </button>
          )}

          {/* Active comment count pill */}
          {activeComments.length > 0 && (
            <div style={{
              background: "#5300CE", color: "#fff", borderRadius: "12px",
              padding: "2px 10px", fontFamily: "Noto Sans, sans-serif",
              fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.04em",
              userSelect: "none",
            }}>
              {activeComments.length} comment{activeComments.length !== 1 ? "s" : ""}
            </div>
          )}

          {/* Comment mode toggle */}
          <button
            onClick={() => { setCommentMode(m => !m); setDraft(null); setActivePin(null); }}
            style={{
              ...btnBase,
              background: commentMode ? "#5300CE" : "none",
              color: commentMode ? "#fff" : "#5300CE",
              border: `1px solid ${commentMode ? "#5300CE" : "#c8a8f0"}`,
            }}
            onMouseEnter={e => {
              if (!commentMode) { e.currentTarget.style.background = "#f3edfc"; }
            }}
            onMouseLeave={e => {
              if (!commentMode) { e.currentTarget.style.background = "none"; }
            }}
          >
            {commentMode ? "✕ Cancel" : "＋ Comment"}
          </button>

          <div style={{ width: "1px", height: "16px", background: "#e0dbd4" }} />

          <a
            href="/ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnBase, textDecoration: "none" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f2ec"; e.currentTarget.style.borderColor = "#c8c0b4"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#e0dbd4"; }}
          >
            ↗ Open full page
          </a>

          {/* ── Inline save indicator — visible here because SaveToast is behind the iframe ── */}
          {saveState && (() => {
            const cfg = {
              saving: { text: "Saving\u2026",            color: "#c08227", bg: "#fffbeb" },
              saved:  { text: "Saved \u2713",            color: "#1e7a45", bg: "#f0faf4" },
              error:  { text: "Save failed \u2014 retry", color: "#c8401a", bg: "#fff5f5" },
            }[saveState] || null;
            if (!cfg) return null;
            return (
              <span style={{
                fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem",
                fontWeight: 600, letterSpacing: "0.04em",
                color: cfg.color, background: cfg.bg,
                border: `1px solid ${cfg.color}`,
                borderRadius: "3px", padding: "3px 10px",
                transition: "opacity 0.3s",
                pointerEvents: "none",
              }}>
                {cfg.text}
              </span>
            );
          })()}
        </div>
      </div>

      {/* ── Comment mode instruction banner ───────────────────────────── */}
      {commentMode && (
        <div style={{
          flexShrink: 0, background: "#5300CE", color: "rgba(255,255,255,0.92)",
          padding: "5px 16px", fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.7rem", letterSpacing: "0.04em",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "16px",
        }}>
          <span>Click anywhere on the page to drop a comment pin</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span style={{ opacity: 0.7 }}>Esc to cancel</span>
        </div>
      )}

      {/* ── iframe + overlay container ─────────────────────────────────── */}
      <div
        ref={overlayRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onClick={commentMode ? handleOverlayClick : undefined}
      >
        {/* iframe */}
        <iframe
          src="ai-playground.html"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            border: "none", display: "block",
            // Don't block pointer events on iframe in browse mode
            pointerEvents: commentMode ? "none" : "auto",
          }}
          title="AI Playground"
        />

        {/* Invisible capture layer in comment mode (sits over the iframe) */}
        {commentMode && (
          <div style={{
            position: "absolute", inset: 0,
            cursor: "crosshair", background: "rgba(83,0,206,0.04)",
            zIndex: 10,
          }} />
        )}

        {/* ── Comment pins (always rendered) ─────────────────────────── */}
        {[...activeComments, ...(showResolved ? resolvedComments : [])].map((c, i) => {
          const isResolved = c.resolved;
          const isActive = activePin === c.id;
          const pinIndex = activeComments.indexOf(c); // number only active ones
          const pinLabel = isResolved ? "✓" : (pinIndex + 1);

          // Determine popover direction — flip left if pin is in right 40% of area
          const flipLeft = c.x > 60;

          return (
            <div
              key={c.id}
              data-pin={c.id}
              style={{
                position: "absolute",
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: commentMode ? 5 : 20,
                pointerEvents: commentMode ? "none" : "auto",
              }}
            >
              {/* Pin circle */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!commentMode) setActivePin(isActive ? null : c.id);
                }}
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: isResolved ? "#aaa" : "#5300CE",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isResolved ? "0.55rem" : "0.65rem", fontWeight: 700,
                  boxShadow: isActive ? "0 0 0 3px rgba(83,0,206,0.3), 0 2px 10px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.25)",
                  border: isActive ? "2px solid #E22B83" : "2px solid #fff",
                  cursor: commentMode ? "crosshair" : "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  userSelect: "none",
                }}
              >
                {pinLabel}
              </div>

              {/* Popover */}
              {isActive && (
                <div
                  data-popover="true"
                  style={{
                    position: "absolute",
                    ...(flipLeft
                      ? { right: "34px", top: "-8px" }
                      : { left: "34px", top: "-8px" }),
                    background: "#fff",
                    border: "1px solid #e0dbd4",
                    borderLeft: isResolved ? "3px solid #aaa" : "3px solid #5300CE",
                    borderRadius: "4px",
                    padding: "12px 14px",
                    minWidth: "220px", maxWidth: "280px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
                    zIndex: 30,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{
                    fontFamily: "Noto Sans, sans-serif", fontSize: "0.66rem",
                    fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: isResolved ? "#888" : "#5300CE", marginBottom: "6px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{c.author_name}</span>
                    {isResolved && <span style={{ color: "#aaa", fontWeight: 400 }}>resolved</span>}
                  </div>
                  <div style={{
                    fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem",
                    color: "#222", lineHeight: 1.55, marginBottom: "10px",
                    opacity: isResolved ? 0.6 : 1,
                  }}>
                    {c.text}
                  </div>
                  <div style={{
                    fontFamily: "Noto Sans, sans-serif", fontSize: "0.64rem",
                    color: "#bbb", marginBottom: "10px",
                  }}>
                    {new Date(c.timestamp).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!isResolved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveComment(c.id); }}
                        style={{
                          background: "none", border: "1px solid #e0dbd4",
                          borderRadius: "2px", padding: "3px 10px",
                          fontFamily: "Noto Sans, sans-serif", fontSize: "0.64rem",
                          fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                          color: "#666", cursor: "pointer",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#5300CE"; e.currentTarget.style.color = "#5300CE"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0dbd4"; e.currentTarget.style.color = "#666"; }}
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteComment(c.id); }}
                      style={{
                        background: "none", border: "1px solid #e0dbd4",
                        borderRadius: "2px", padding: "3px 10px",
                        fontFamily: "Noto Sans, sans-serif", fontSize: "0.64rem",
                        fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: "#c8401a", cursor: "pointer",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8401a"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0dbd4"; }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Draft pin + input form ──────────────────────────────────── */}
        {draft && (
          <div
            style={{
              position: "absolute",
              left: `${draft.x}%`,
              top: `${draft.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 40,
              pointerEvents: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Draft pin */}
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "#E22B83", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700,
              boxShadow: "0 0 0 3px rgba(226,43,131,0.25), 0 2px 10px rgba(0,0,0,0.25)",
              border: "2px solid #fff",
              userSelect: "none",
            }}>
              +
            </div>

            {/* Input card */}
            <div style={{
              position: "absolute",
              ...(draft.x > 60
                ? { right: "34px", top: "-8px" }
                : { left: "34px", top: "-8px" }),
              background: "#fff",
              border: "1px solid #e0dbd4", borderLeft: "3px solid #E22B83",
              borderRadius: "4px", padding: "12px 14px",
              minWidth: "240px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
              zIndex: 50,
            }}>
              <div style={{
                fontFamily: "Noto Sans, sans-serif", fontSize: "0.66rem",
                fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#E22B83", marginBottom: "8px",
              }}>
                {currentUser ? currentUser.name : "Comment"}
              </div>
              <textarea
                ref={inputRef}
                value={draft.text}
                onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(draft.text); }
                  if (e.key === "Escape") { setDraft(null); }
                }}
                placeholder="Leave a comment…"
                rows={3}
                style={{
                  width: "100%", border: "1px solid #e0dbd4",
                  borderRadius: "2px", padding: "6px 8px",
                  fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem",
                  color: "#111", resize: "none",
                  boxSizing: "border-box", outline: "none",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDraft(null)}
                  style={{
                    background: "none", border: "1px solid #e0dbd4",
                    borderRadius: "2px", padding: "4px 10px",
                    fontFamily: "Noto Sans, sans-serif", fontSize: "0.64rem",
                    fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "#888", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => postComment(draft.text)}
                  disabled={!draft.text.trim()}
                  style={{
                    background: draft.text.trim() ? "#5300CE" : "#ddd",
                    border: "none", borderRadius: "2px", padding: "4px 14px",
                    fontFamily: "Noto Sans, sans-serif", fontSize: "0.64rem",
                    fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "#fff", cursor: draft.text.trim() ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
