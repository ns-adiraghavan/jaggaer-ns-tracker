// Build With Claude â€” read-only panel. Lists /build-with-claude/ folder.

const { useState: useStateBWC, useEffect: useEffectBWC } = React;

const GITHUB_REPO = window.__CONFIG__ ? window.__CONFIG__.GITHUB_REPO : "";
const BWC_BASE = `https://github.com/${GITHUB_REPO}/tree/main/build-with-claude`;

function BWCPanel({ project }) {
  const [items, setItems] = useStateBWC(null);

  useEffectBWC(() => {
    window.NS_API.listBuildWithClaude().then(setItems);
  }, []);

  return (
    <main className="ns-bwc">
      <header className="ns-bwc-head">
        <div className="ns-eyebrow ns-eyebrow-dark">WORKSTREAM B &middot; TECHNICAL BUILD</div>
        <h1 className="ns-bwc-title">
          <em>Build With Claude</em><span className="ns-bwc-title-tail"> &mdash; apps in flight on the Jaggaer Agent Builder page.</span>
        </h1>
        <div className="ns-bwc-deck">
          Read-only here. NS pushes to <code>/build-with-claude/</code> in the repo. This panel reflects what&apos;s there.
        </div>
      </header>

      {items === null && (
        <div className="ns-bwc-loading">Reading from GitHub&hellip;</div>
      )}

      {items && items.length > 0 && (
        <div className="ns-bwc-grid">
          {items.map((app, i) => (
            <BWCCard key={app.name} app={app} index={i} />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="ns-bwc-empty">No apps in <code>/build-with-claude/</code> yet.</div>
      )}
    </main>
  );
}

function BWCCard({ app, index }) {
  const statusColor = app.status === "Live"
    ? "#4f7a5b"
    : app.status === "Ready for Review"
      ? "#c08227"
      : "#3b6b88";

  // Build the real GitHub link from the app path
  const githubUrl = app.path
    ? `https://github.com/${GITHUB_REPO}/tree/main/${app.path}`
    : `${BWC_BASE}/${app.name}`;

  return (
    <article className="ns-bwc-card" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="ns-bwc-card-num">{String(index + 1).padStart(2, "0")}</div>
      <div className="ns-bwc-card-body">
        <h3 className="ns-bwc-name">{prettyName(app.name)}</h3>
        <p className="ns-bwc-desc">{app.description}</p>
        <div className="ns-bwc-foot">
          <span className="ns-status" style={{ "--rule": statusColor, "--text": statusColor }}>
            <span className="ns-status-rule"></span>
            <span className="ns-status-text">{app.status}</span>
          </span>
          <span className="ns-bwc-updated">updated {app.updated}</span>
        </div>
      </div>
      <a
        className="ns-bwc-link"
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        open in repo &#8594;
      </a>
    </article>
  );
}

function prettyName(slug) {
  return slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

window.BWCPanel = BWCPanel;
