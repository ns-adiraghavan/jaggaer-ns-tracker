// Build With Claude — reads from project.build_with_claude (managed via Admin).

const GITHUB_REPO_BWC = window.__CONFIG__ ? window.__CONFIG__.GITHUB_REPO : "";

// Accent palette — cycles through these by index if no accent set on the app
const BWC_ACCENTS = [
  { bg: "rgba(30,111,168,0.10)",  border: "rgba(30,111,168,0.32)", text: "#1e6fa8" },
  { bg: "rgba(200,64,26,0.09)",   border: "rgba(200,64,26,0.28)",  text: "#c8401a" },
  { bg: "rgba(91,59,158,0.09)",   border: "rgba(91,59,158,0.28)",  text: "#5a3d9e" },
  { bg: "rgba(30,122,69,0.09)",   border: "rgba(30,122,69,0.28)",  text: "#1e7a45" },
  { bg: "rgba(192,130,39,0.10)",  border: "rgba(192,130,39,0.30)", text: "#c08227" },
];

function BWCPanel({ project }) {
  const items = project.build_with_claude || [];

  return (
    <main className="ns-bwc">
      <header className="ns-bwc-head">
        <div className="ns-eyebrow ns-eyebrow-dark">WORKSTREAM B &middot; TECHNICAL BUILD</div>
        <h1 className="ns-bwc-title">
          Build With Claude — apps in flight on the Jaggaer Agent Builder page.
        </h1>
        <div className="ns-bwc-deck">
          App cards are managed in Admin. NS pushes code to <code>/build-with-claude/</code> in the repo directly.
        </div>
      </header>

      {items.length > 0 && (
        <div className="ns-bwc-grid">
          {items.map((app, i) => (
            <BWCCard key={app.id || app.name} app={app} index={i} />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="ns-bwc-empty">No apps yet — add them in Admin → Build With Claude.</div>
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

  const accent = BWC_ACCENTS[index % BWC_ACCENTS.length];

  const githubUrl = app.path
    ? `https://github.com/${GITHUB_REPO_BWC}/tree/main/${app.path}`
    : `https://github.com/${GITHUB_REPO_BWC}/tree/main/build-with-claude/${app.name}`;

  return (
    <article
      className="ns-bwc-card"
      style={{ animationDelay: `${index * 60}ms`, borderTop: `3px solid ${accent.border}` }}
    >
      <div className="ns-bwc-card-num" style={{ color: accent.text }}>{String(index + 1).padStart(2, "0")}</div>
      <div className="ns-bwc-card-body">
        <h3 className="ns-bwc-name" style={{ color: accent.text }}>{app.label || prettyName(app.name)}</h3>
        <p className="ns-bwc-desc">{app.description}</p>
        <div className="ns-bwc-foot">
          <span className="ns-status" style={{ "--rule": statusColor, "--text": statusColor }}>
            <span className="ns-status-rule"></span>
            <span className="ns-status-text">{app.status}</span>
          </span>
          {app.updated && <span className="ns-bwc-updated">updated {app.updated}</span>}
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
