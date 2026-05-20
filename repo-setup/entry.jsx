// Entry: name selector. Roster pulled from project.team. No password — just attribution.
const { useState } = React;

function NameSelector({ project, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const ns = project.team.ns;
  const jaggaer = project.team.jaggaer;

  // Compute dynamic footer values from project state
  const totalPieces = (project.pillars || []).reduce(
    (n, p) => n + (p.clusters || []).reduce((m, c) => m + (c.pieces || []).length, 0),
    0
  );
  const bwcCount = (project.build_with_claude || []).length;
  const activeMonth = (project.months || []).find(m => m.id === project.active_month) || (project.months || [])[0];
  const monthLabel = activeMonth ? activeMonth.label : "Month 1";

  return (
    <div className="ns-entry-root">
      <div className="ns-entry-frame">
        <header className="ns-entry-header">
          <div className="ns-entry-logos">
            <div className="ns-entry-logo-ns">
              <img src="netscribes-logo.png" alt="Netscribes" />
            </div>
            <span className="ns-entry-logo-sep">&times;</span>
            <div className="ns-entry-logo-jg">
              <img src="jaggaer-logo.png" alt="Jaggaer" />
            </div>
          </div>
          <h1 className="ns-entry-title">
            The project<br/>
            <span className="accent-word">tracker.</span>
          </h1>
          <p className="ns-entry-deck">
            A single editorial workspace for content delivery, review and approval.
            Select your name to enter.
          </p>
        </header>

        <div className="ns-entry-roster">
          <RosterColumn
            label="Netscribes"
            members={ns}
            hovered={hovered}
            setHovered={setHovered}
            onSelect={onSelect}
          />
          <RosterColumn
            label="Jaggaer"
            members={jaggaer}
            hovered={hovered}
            setHovered={setHovered}
            onSelect={onSelect}
          />
        </div>

        <footer className="ns-entry-foot">
          <span>{monthLabel}</span>
          <span className="ns-entry-foot-mid">{totalPieces} pieces in flight</span>
          <span>Build With Claude &middot; {bwcCount > 0 ? `${bwcCount} apps` : "apps in progress"}</span>
        </footer>
      </div>
    </div>
  );
}

function RosterColumn({ label, members, hovered, setHovered, onSelect }) {
  return (
    <div className="ns-roster-col">
      <div className="ns-roster-label">
        <span className="ns-roster-rule"></span>
        {label.toUpperCase()}
      </div>
      <ul className="ns-roster-list">
        {members.map(m => {
          const isAdmin = !!m.admin;
          const isHover = hovered === m.id;
          return (
            <li
              key={m.id}
              className={`ns-roster-row ${isHover ? "is-hover" : ""}`}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(m)}
            >
              <span className="ns-roster-name">
                {m.name}
                {isAdmin && <span className="ns-roster-admin">&middot; admin</span>}
              </span>
              <span className="ns-roster-role">{m.role}</span>
              <span className="ns-roster-arrow">&#8594;</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

window.NameSelector = NameSelector;
