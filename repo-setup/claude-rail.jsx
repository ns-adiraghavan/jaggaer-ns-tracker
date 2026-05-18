// The Claude conversation rail. Always-visible right column.
// Feels like a colleague who knows the project — not a chatbot widget.

const { useState: useStateCR, useRef: useRefCR, useEffect: useEffectCR } = React;

function ClaudeRail({ project, currentUser }) {
  const [messages, setMessages] = useStateCR([]);
  const [draft, setDraft] = useStateCR("");
  const [busy, setBusy] = useStateCR(false);
  const scrollRef = useRefCR(null);

  useEffectCR(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const suggested = [
    "What's blocking publishing next?",
    "Which clusters are publish-ready?",
    "Summarise Jaggaer's feedback on contracts",
    "What does Indy still need to review?",
    "Are we on track for Month 1?"
  ];

  async function send(text) {
    const content = (text || draft).trim();
    if (!content || busy) return;
    setDraft("");
    const userMsg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    const systemPrompt = buildSystemPrompt(project, currentUser);
    try {
      const reply = await window.NS_API.askClaude(next, systemPrompt);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "I couldn't reach the model just now. The project state is still loaded — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <aside className="ns-rail">
      <header className="ns-rail-head">
        <div className="ns-rail-head-l">
          <div className="ns-rail-mark">
            <span className="ns-rail-dot"></span>
          </div>
          <div>
            <div className="ns-eyebrow ns-eyebrow-dark">PROJECT INTELLIGENCE</div>
            <div className="ns-rail-title">Claude</div>
          </div>
        </div>
        <div className="ns-rail-state">
          <span className="ns-rail-state-rule"></span>
          <span>reads project state · {project.pillars.reduce((n, p) => n + p.clusters.reduce((m, c) => m + c.pieces.length, 0), 0)} pieces</span>
        </div>
      </header>

      <div className="ns-rail-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ns-rail-empty">
            <div className="ns-rail-empty-quote">
              <em>"You don't need to dig through lists. Ask."</em>
            </div>
            <div className="ns-eyebrow ns-eyebrow-dark ns-rail-empty-eyebrow">START HERE</div>
            <ul className="ns-rail-suggested">
              {suggested.map(s => (
                <li key={s}>
                  <button className="ns-rail-suggest" onClick={() => send(s)}>
                    {s} <span className="ns-rail-suggest-arrow">⟶</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <RailMessage key={i} message={m} currentUser={currentUser} />
        ))}
        {busy && (
          <div className="ns-rail-msg ns-rail-msg-assistant">
            <div className="ns-rail-msg-head">Claude</div>
            <div className="ns-rail-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="ns-rail-composer">
        <textarea
          className="ns-rail-input"
          placeholder={`Ask about the project, ${currentUser.name.split(" ")[0]}…`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={2}
        ></textarea>
        <button className="ns-rail-send" onClick={() => send()} disabled={busy || !draft.trim()}>
          send ⟶
        </button>
      </div>
    </aside>
  );
}

function RailMessage({ message, currentUser }) {
  if (message.role === "user") {
    return (
      <div className="ns-rail-msg ns-rail-msg-user">
        <div className="ns-rail-msg-head">{currentUser.name.split(" ")[0]}</div>
        <div className="ns-rail-msg-body">{message.content}</div>
      </div>
    );
  }
  return (
    <div className="ns-rail-msg ns-rail-msg-assistant">
      <div className="ns-rail-msg-head">Claude</div>
      <div className="ns-rail-msg-body">{message.content}</div>
    </div>
  );
}

function buildSystemPrompt(project, currentUser) {
  // Serialise the full project state into a compact, readable brief Claude can reason over.
  const teamLookup = {};
  [...project.team.ns, ...project.team.jaggaer].forEach(m => teamLookup[m.id] = m);

  const pillarLines = [];
  for (const p of project.pillars) {
    pillarLines.push(`\n## PILLAR — ${p.label} (${Math.round(p.weight*100)}%, ${p.geography})`);
    for (const c of p.clusters) {
      const approved = c.pieces.filter(x => x.status === "approved").length;
      const ready = approved === c.pieces.length;
      pillarLines.push(`  ### Cluster ${c.sequence}: ${c.label} — ${c.intent} — ${approved}/${c.pieces.length} approved${ready ? " ⚑ PUBLISH-READY" : ""}`);
      pillarLines.push(`     Anchor: ${c.pieces.find(x => x.id === c.anchor_piece)?.title || "—"}`);
      for (const piece of c.pieces) {
        const meta = window.STATUS_META[piece.status];
        const fb = (project.feedback || {})[piece.id] || [];
        pillarLines.push(`     - [${meta?.label || piece.status}] "${piece.title}" · ${piece.format} · ${teamLookup[piece.assignee]?.name || piece.assignee}${piece.revision_count ? ` · rev ${piece.revision_count}` : ""}${fb.length ? ` · ${fb.length} note(s)` : ""}`);
        for (const f of fb) {
          const a = teamLookup[f.author] || { name: f.author };
          pillarLines.push(`        ↳ ${a.name} [${f.verdict}]: ${f.body.slice(0, 240)}`);
        }
      }
    }
  }

  return `You are the in-project AI colleague embedded in the Netscribes × Jaggaer editorial tracker.

You answer questions about the current state of the project in a direct, calm, editorial tone. You are talking to ${currentUser.name} (${currentUser.role}, ${currentUser.org === "ns" ? "Netscribes" : "Jaggaer"}). Be concise: status answers are a few lines, not paragraphs. Use plain prose, no bullet lists unless asked. Refer to people by first name. Never invent piece titles, statuses or counts — they are listed below; if it's not in the list, say so.

PROJECT STRUCTURE — Month 1 (May 2026). 30 pieces across 4 pillars. Status lifecycle: Uploaded → Jaggaer Feedback → Revised → Approved. A cluster is publish-ready when all its pieces are Approved. Informational clusters publish first (audience build), commercial second (convert).

CURRENT STATE:
${pillarLines.join("\n")}

When asked about blockers, look for pieces in Uploaded / Revised waiting on Jaggaer, or Jaggaer Feedback waiting on NS. When asked about publish-readiness, count approved/total per cluster and respect the sequence numbers. When asked about a person, filter by their assignments or their feedback authorship.`;
}

window.ClaudeRail = ClaudeRail;
window.buildSystemPrompt = buildSystemPrompt;
