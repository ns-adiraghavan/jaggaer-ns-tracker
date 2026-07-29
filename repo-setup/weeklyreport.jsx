// Status Report — two stacked sections:
//   1. "Took live this week / Plan to take live next week" — derived from
//      piece.status_history (or last_updated fallback for older entries).
//   2. "Cycle tracking" — who's end things are pending at within Jaggaer right
//      now, which SEO briefs haven't been shared yet, and a log of NS upload/
//      presented dates so we can see where things are stalled.
//
// All dates display in US Eastern time via formatEST() (tracker.jsx). Stage
// history is stored UTC going forward only — see appendStatusHistory() and the
// June 2026 product decision not to backfill dates we don't actually have.
//
// July 2026 pass: promoted the four counts to a KPI strip at the top,
// enlarged the "Took Live" cards (they're the actual weekly moment), and
// collapsed the two long-tail lists (SEO briefs outstanding + upload log)
// behind expand toggles — Jason's feedback was that brief-stage stuff shouldn't
// dominate the page.

const { useMemo: useMemoWR, useState: useStateWR, useRef: useRefWR } = React;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Pieces genuinely queued to go live next = whatever the LAST reviewer gate
// before "approved" is in the LIVE workflow, plus ad-hoc review (the only gate
// ad-hoc pieces have). This is derived per-render from project.workflow_stages
// (see planNextStageIds in WeeklyReportPanel) rather than hardcoding a stage id
// — so when the workflow is reconfigured (e.g. the CTA / "editors" stage is
// removed, as it was), the report follows automatically instead of going stale.
//
// Terminal stages that mean "already published": a piece is counted as live
// once it reaches "approved" OR the later "live" stage. Both are excluded from
// the pending-at buckets so a published piece never shows as awaiting anyone.
const PUBLISHED_STAGES = new Set(["approved", "live"]);

function allPieces(project) {
  const out = [];
  for (const pillar of project.pillars || []) {
    for (const cluster of pillar.clusters || []) {
      for (const piece of cluster.pieces || []) {
        out.push({ piece, cluster, pillar });
      }
    }
  }
  return out;
}

function memberLookup(project) {
  const all = [...(project.team?.ns || []), ...(project.team?.jaggaer || [])];
  return (id) => {
    if (!id) return null;
    const m = all.find(x => x.id === id);
    return m || { id, name: id, org: "—", role: "" };
  };
}

// Resolves the most recent transition INTO a given stage from a piece's
// status_history. Returns null if the piece never logged entering that stage
// (e.g. it was already there when history-tracking shipped — seeded entries
// carry ts: null and are excluded here on purpose, since we don't know when
// they actually arrived).
function lastEnteredStage(piece, stageId) {
  const history = piece.status_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].stage === stageId && history[i].ts) return history[i];
  }
  return null;
}

function withinLastWeek(isoString) {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  if (isNaN(t)) return false;
  return (Date.now() - t) <= ONE_WEEK_MS && t <= Date.now();
}

function WeeklyReportPanel({ project, currentUser }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const getMember = memberLookup(project);
  const stages = getWorkflowStages(project);
  const stageLabel = (id) => {
    if (id === "ad-hoc-review") return getAdHocReviewStage(project).label;
    return stages.find(s => s.id === id)?.label || id;
  };

  // ── Derive the "last gate before published" from the LIVE workflow ──────
  // The stage immediately before "approved" is the final reviewer gate. When
  // the workflow changes (CTA/editors removed, Ed review added, etc.) this
  // tracks it, so the report never references a stage that no longer exists.
  const approvedIdx = stages.findIndex(s => s.id === "approved");
  const preApprovedStage = approvedIdx > 0 ? stages[approvedIdx - 1] : null;
  const adHocReviewStage = getAdHocReviewStage(project);
  const planNextStageIds = new Set([preApprovedStage?.id, "ad-hoc-review"].filter(Boolean));
  const planNextNames = [preApprovedStage?.label, adHocReviewStage.label].filter(Boolean);
  const planNextJoin = planNextNames.join(" or ");
  const planNextSub  = planNextNames.length ? "at " + planNextNames.join(" / ") : "final gate";

  // Collapsed by default — brief-stage / upload-log detail is background noise
  // most weeks. The counts stay visible; the row detail expands on demand.
  const [briefsOpen, setBriefsOpen] = useStateWR(false);
  const [logOpen, setLogOpen] = useStateWR(false);

  // Pending-at buckets are now stacked and collapsible too (July 2026) — side
  // by side they truncated badly, and most weeks you only want to open one.
  // Jaggaer opens by default: it's the bucket that needs chasing.
  const [jgOpen, setJgOpen] = useStateWR(true);
  const [nsOpen, setNsOpen] = useStateWR(false);

  // KPI tiles scroll to their section. Opening a collapsed target first, then
  // scrolling, is intentional — scrolling to a collapsed header is useless.
  const refTookLive = useRefWR(null);
  const refPlanNext = useRefWR(null);
  const refJaggaer = useRefWR(null);
  const refNS = useRefWR(null);

  function scrollTo(ref) {
    // rAF so the scroll runs after any expand-triggered re-layout.
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const data = useMemoWR(() => {
    const items = allPieces(project);

    // ── Took live — total to date ────────────────────────────────────────
    // All approved pieces, newest first. No 7-day window — this is cumulative
    // progress, not a rolling snapshot.
    const tookLive = items.filter(({ piece }) => PUBLISHED_STAGES.has(piece.status))
    .map(({ piece, cluster, pillar }) => {
      const entered = lastEnteredStage(piece, "approved");
      return { piece, cluster, pillar, ts: entered ? entered.ts : piece.last_updated, approvedBy: entered ? entered.by : piece.last_updated_by };
    }).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));

    // ── Published last week ──────────────────────────────────────────────
    // Approved pieces whose approval timestamp falls within the last 7 days.
    const publishedLastWeek = tookLive.filter(({ ts }) => withinLastWeek(ts));

    // ── Plan to take live next ───────────────────────────────────────────
    // Pieces sitting at the last reviewer gate before approved (derived from
    // the live workflow) or at ad-hoc review. One reviewer action away from live.
    const planNextWeek = items.filter(({ piece }) =>
      planNextStageIds.has(piece.status)
    ).map(({ piece, cluster, pillar }) => {
      const entered = lastEnteredStage(piece, piece.status);
      return { piece, cluster, pillar, enteredTs: entered ? entered.ts : null, enteredBy: entered ? entered.by : null };
    });

    // ── Cycle tracking: pending at ───────────────────────────────────────
    // Bucket every non-terminal piece by whose court it's currently in.
    const pendingAtJaggaer = [];
    const pendingAtNS = [];
    for (const { piece, cluster, pillar } of items) {
      // SME Review (stage-nq11b) has its own dedicated tab — exclude from
      // both Pending at Jaggaer and Pending at NS to avoid double-counting.
      if (PUBLISHED_STAGES.has(piece.status) || piece.status === "not-started" || piece.status === "stage-nq11b") continue;
      const stage = piece.status === "ad-hoc-review" ? getAdHocReviewStage(project) : stages.find(s => s.id === piece.status);
      if (!stage) continue;
      const actors = Array.isArray(stage.actor) ? stage.actor : (stage.actor ? [stage.actor] : []);
      const isNSTurn = actors.includes("ns");
      const isJGTurn = actors.includes("jaggaer") || actors.some(a => typeof a === "string" && a.startsWith("person:"));
      const entered = lastEnteredStage(piece, piece.status);
      const row = {
        piece, cluster, pillar,
        stageId: piece.status,
        sinceTs: entered ? entered.ts : null,
        reviewerNames: actors.filter(a => typeof a === "string" && a.startsWith("person:")).map(a => getMember(a.slice(7))?.name).filter(Boolean),
      };
      // When both orgs are listed (e.g. brief-uploaded), NS takes priority —
      // the ball is in NS's court to start writing.
      if (isNSTurn) pendingAtNS.push(row);
      else if (isJGTurn) pendingAtJaggaer.push(row);
    }
    // Oldest-waiting first within each bucket — surfaces stalls.
    const byAge = (a, b) => {
      const ta = a.sinceTs ? new Date(a.sinceTs).getTime() : 0;
      const tb = b.sinceTs ? new Date(b.sinceTs).getTime() : 0;
      return ta - tb; // unlogged (0) sorts first — likely the oldest, pre-tracking pieces
    };
    pendingAtJaggaer.sort(byAge);
    pendingAtNS.sort(byAge);

    // ── SEO briefs not yet shared ────────────────────────────────────────
    // "Which SEO briefs still remain to be shared" = pieces NS can't start
    // writing yet because Jaggaer hasn't attached a brief. That's anything
    // still sitting at not-started / SME-review with no brief_files — pieces
    // already in writing-or-later by definition already have what they need,
    // even if the brief_files upload technically lagged the status change.
    // Ad-Hoc Articles skip the brief flow entirely and are excluded.
    const PRE_WRITING_STAGES = new Set(["not-started", "stage-nq11b"]);
    const briefsOutstanding = items.filter(({ piece }) =>
      piece.content_type !== "ad-hoc" &&
      PRE_WRITING_STAGES.has(piece.status) &&
      (!piece.brief_files || piece.brief_files.length === 0)
    );

    // ── Upload / brief presentation log ──────────────────────────────────
    // Every brief_files entry and every status_history "writing" entry (NS
    // upload), newest first, so we can see the cadence and spot gaps.
    const uploadLog = [];
    for (const { piece, cluster, pillar } of items) {
      for (const bf of (piece.brief_files || [])) {
        uploadLog.push({ piece, cluster, pillar, type: "brief", ts: bf.uploaded_at, by: bf.uploaded_by, filename: bf.filename });
      }
      for (const h of (piece.status_history || [])) {
        if (h.stage === "writing" && h.ts) {
          uploadLog.push({ piece, cluster, pillar, type: "upload", ts: h.ts, by: h.by });
        }
      }
    }
    uploadLog.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    return { tookLive, publishedLastWeek, planNextWeek, pendingAtJaggaer, pendingAtNS, briefsOutstanding, uploadLog };
  }, [project]);

  return (
    <main className="ns-tracker" style={{ padding: "28px 32px", maxWidth: "1100px" }}>
      <header style={{ marginBottom: "22px" }}>
        <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
          Status Report
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: "#1a2535", margin: 0 }}>
          Took live, planned, and where things are stalled.
        </h1>
        <p style={{ ...FONT, fontSize: "0.8rem", color: "#888", marginTop: "8px", maxWidth: "640px", lineHeight: 1.5 }}>
          Dates shown in US Eastern time. Stage-history tracking started this week — pieces already mid-pipeline show their current stage with no logged date, rather than a backfilled guess.
        </p>
      </header>

      {/* ── KPI strip — this week's shape at a glance ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "26px" }}>
        <KpiTile label="Published to date" count={data.tookLive.length} accent="#1e7a45" sub="total to date"
          onClick={() => scrollTo(refTookLive)} />
        <KpiTile label="Published last week" count={data.publishedLastWeek.length} accent="#0e6655" sub="last 7 days"
          onClick={() => scrollTo(refTookLive)} />
        <KpiTile label="To publish this week" count={data.planNextWeek.length} accent="#1e6fa8" sub={planNextSub}
          onClick={() => scrollTo(refPlanNext)} />
        <KpiTile label="Awaiting JAGGAER review" count={data.pendingAtJaggaer.length} accent="#c8401a" sub="awaiting review"
          onClick={() => { setJgOpen(true); scrollTo(refJaggaer); }} />
        <KpiTile label="Awaiting Netscribes" count={data.pendingAtNS.length} accent="#6c3483" sub="awaiting action"
          onClick={() => { setNsOpen(true); scrollTo(refNS); }} />
      </div>

      {/* ── Took live — the hero section ──────────────────────────────── */}
      <div ref={refTookLive} style={{ scrollMarginTop: "16px" }} />
      <SectionHeader accent="#1e7a45" eyebrow="Published to date" count={data.tookLive.length} />
      {data.tookLive.length === 0 ? (
        <EmptyCard text="No pieces approved yet." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px", marginBottom: "28px" }}>
          {data.tookLive.map(({ piece, cluster, pillar, ts, approvedBy }) => (
            <LivePieceCard
              key={piece.id}
              piece={piece} cluster={cluster} pillar={pillar}
              ts={ts} approvedBy={approvedBy}
              getMember={getMember}
              perfData={project.performanceData || {}}
            />
          ))}
        </div>
      )}

      {/* ── Planned next — tighter row layout ─────────────────────────── */}
      <div ref={refPlanNext} style={{ scrollMarginTop: "16px" }} />
      <SectionHeader accent="#1e6fa8" eyebrow="To publish this week" count={data.planNextWeek.length}
        subtitle={`Sitting at ${planNextJoin || "the final gate"} — the last gate before published.`} />
      {data.planNextWeek.length === 0 ? (
        <EmptyCard text={`Nothing at ${planNextJoin || "the final gate"} right now.`} />
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e3da", borderRadius: "3px", marginBottom: "36px" }}>
          {data.planNextWeek.map(({ piece, cluster, pillar, enteredTs }) => (
            <ReportRow key={piece.id}
              title={piece.title} sub={`${pillar.label} · ${cluster.label}`}
              badge={stageLabel(piece.status)} badgeColor={STATUS_META[piece.status]?.color}
              right={enteredTs ? `since ${formatEST(enteredTs)}` : "stage date not logged"}
            />
          ))}
        </div>
      )}

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div style={{ height: "1px", background: "#e8e3da", margin: "8px 0 28px" }} />

      <header style={{ marginBottom: "18px" }}>
        <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6c3483", marginBottom: "6px" }}>
          Cycle Tracking
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#1a2535", margin: 0 }}>
          Who's end things are pending at — and what's stalled.
        </h2>
      </header>

      {/* Stacked, not side by side — full-width rows stop the titles truncating,
          and each bucket collapses independently. */}
      <div ref={refJaggaer} style={{ scrollMarginTop: "16px" }} />
      <CollapsibleSection
        accent="#c8401a"
        eyebrow="Awaiting JAGGAER review"
        count={data.pendingAtJaggaer.length}
        subtitle="Waiting on a Jaggaer reviewer to act. Oldest-waiting first."
        emptyText="Nothing waiting on Jaggaer right now."
        open={jgOpen} setOpen={setJgOpen}
      >
        {data.pendingAtJaggaer.map(({ piece, cluster, pillar, stageId, sinceTs, reviewerNames }) => (
          <ReportRow key={piece.id} compact
            title={piece.title} sub={`${pillar.label} · ${cluster.label}`}
            badge={stageLabel(stageId)} badgeColor={STATUS_META[stageId]?.color}
            right={sinceTs ? `since ${formatEST(sinceTs)}` : "date not logged"}
            rightSub={reviewerNames.length ? reviewerNames.join(", ") : null}
          />
        ))}
      </CollapsibleSection>

      <div ref={refNS} style={{ scrollMarginTop: "16px" }} />
      <CollapsibleSection
        accent="#1e6fa8"
        eyebrow="Awaiting Netscribes"
        count={data.pendingAtNS.length}
        subtitle="Waiting on NS to write, revise, or upload. Oldest-waiting first."
        emptyText="Nothing waiting on NS right now."
        open={nsOpen} setOpen={setNsOpen}
      >
        {data.pendingAtNS.map(({ piece, cluster, pillar, stageId, sinceTs }) => (
          <ReportRow key={piece.id} compact
            title={piece.title} sub={`${pillar.label} · ${cluster.label}`}
            badge={stageLabel(stageId)} badgeColor={STATUS_META[stageId]?.color}
            right={sinceTs ? `since ${formatEST(sinceTs)}` : "date not logged"}
          />
        ))}
      </CollapsibleSection>

      {/* ── Collapsed: SEO briefs outstanding ─────────────────────────── */}
      <CollapsibleSection
        accent="#b05e00"
        eyebrow="SEO Briefs Not Yet Shared"
        count={data.briefsOutstanding.length}
        subtitle="Pieces with no brief/keyword file attached yet. Excludes Ad-Hoc Articles."
        emptyText="Every in-flight piece has a brief attached."
        open={briefsOpen} setOpen={setBriefsOpen}
      >
        {data.briefsOutstanding.map(({ piece, cluster, pillar }) => (
          <ReportRow key={piece.id} compact
            title={piece.title} sub={`${pillar.label} · ${cluster.label}`}
            badge={stageLabel(piece.status)} badgeColor={STATUS_META[piece.status]?.color}
          />
        ))}
      </CollapsibleSection>

      {/* ── Collapsed: upload/brief log ───────────────────────────────── */}
      <CollapsibleSection
        accent="#7d6608"
        eyebrow="Upload & Brief Log"
        count={data.uploadLog.length}
        subtitle="Every NS deliverable upload and every Jaggaer brief/keyword file, newest first."
        emptyText="No logged uploads yet."
        open={logOpen} setOpen={setLogOpen}
      >
        {data.uploadLog.slice(0, 40).map((entry, i) => (
          <ReportRow key={i} compact
            title={entry.piece.title}
            sub={`${entry.pillar.label} · ${entry.cluster.label}`}
            badge={entry.type === "brief" ? "Brief" : "Deliverable"}
            badgeColor={entry.type === "brief" ? "#0e6655" : "#1e6fa8"}
            right={`${formatEST(entry.ts, { hour: "2-digit", minute: "2-digit" })} EST`}
            rightSub={entry.by ? getMember(entry.by)?.name : null}
          />
        ))}
        {data.uploadLog.length > 40 && (
          <div style={{ ...FONT, fontSize: "0.72rem", color: "#aaa", padding: "8px 14px" }}>
            + {data.uploadLog.length - 40} earlier entries not shown.
          </div>
        )}
      </CollapsibleSection>
    </main>
  );
}

// ─── KPI tile ───────────────────────────────────────────────────────────────
function KpiTile({ label, count, accent, sub, onClick }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const [hover, setHover] = useStateWR(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left", width: "100%", font: "inherit",
        background: "#fff", border: "1px solid #e8e3da", borderLeft: `3px solid ${accent}`,
        padding: "12px 14px", borderRadius: "3px",
        cursor: onClick ? "pointer" : "default",
        borderColor: hover && onClick ? accent : "#e8e3da",
        borderLeftColor: accent,
        boxShadow: hover && onClick ? "0 2px 10px rgba(26,47,78,0.08)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}>
      <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", fontWeight: 600, color: "#1a2535", lineHeight: 1, marginTop: "3px" }}>
        {count}
      </div>
      <div style={{ ...FONT, fontSize: "0.66rem", color: "#999", marginTop: "3px" }}>{sub}</div>
    </button>
  );
}

// ─── Section header (simple, no wrapping box) ───────────────────────────────
function SectionHeader({ accent, eyebrow, count, subtitle }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", borderLeft: `3px solid ${accent}`, paddingLeft: "10px" }}>
        <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent }}>
          {eyebrow}
        </span>
        <span style={{ ...FONT, fontSize: "0.72rem", color: "#aaa" }}>· {count}</span>
      </div>
      {subtitle && (
        <div style={{ ...FONT, fontSize: "0.72rem", color: "#999", paddingLeft: "13px", marginTop: "3px", lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ─── Live-piece card — the actual "we shipped this" moment ──────────────────
function LivePieceCard({ piece, cluster, pillar, ts, approvedBy, getMember, perfData }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const dateStr = ts ? formatEST(ts) : "date not logged";
  const timeStr = ts ? formatEST(ts, { hour: "2-digit", minute: "2-digit" }) : "";
  const approver = approvedBy ? getMember(approvedBy)?.name : null;
  const liveUrl = piece.publishing?.live_url;

  // Search Console numbers, if Jaggaer has uploaded an export for this URL.
  const slugFn = window.NS_perfSlug;
  const perfKey = liveUrl && slugFn ? slugFn(liveUrl) : null;
  const perf = perfKey && perfData ? perfData[perfKey] : null;
  const impressions = perf?.summary?.impressions;

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e3da", borderLeft: "3px solid #1e7a45",
      borderRadius: "3px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px",
    }}>
      <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999" }}>
        {pillar.label} · {cluster.label}
      </div>
      <div style={{ ...FONT, fontSize: "0.9rem", fontWeight: 600, color: "#1a2535", lineHeight: 1.35 }}>
        {piece.title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px", marginTop: "auto" }}>
        <div>
          <div style={{ ...FONT, fontSize: "0.72rem", color: "#1e7a45", fontWeight: 600 }}>
            Approved {dateStr}{timeStr && ` · ${timeStr} EST`}
          </div>
          {approver && (
            <div style={{ ...FONT, fontSize: "0.68rem", color: "#aaa", marginTop: "1px" }}>
              by {approver}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {typeof impressions === "number" && impressions > 0 && (
            <span style={{ ...FONT, fontSize: "0.66rem", fontWeight: 600, color: "#666", background: "#f5f2ec", padding: "3px 7px", borderRadius: "2px", whiteSpace: "nowrap" }}>
              {Math.round(impressions).toLocaleString("en-US")} impr.
            </span>
          )}
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...FONT, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a2f4e", textDecoration: "none", whiteSpace: "nowrap" }}>
              Open ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible section (for briefs + upload log) ──────────────────────────
function CollapsibleSection({ accent, eyebrow, count, subtitle, emptyText, open, setOpen, children }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const isEmpty = count === 0;
  return (
    <div style={{ marginBottom: "18px" }}>
      <button
        onClick={() => !isEmpty && setOpen(!open)}
        disabled={isEmpty}
        style={{
          width: "100%", textAlign: "left", background: "#fff",
          border: "1px solid #e8e3da", borderLeft: `3px solid ${accent}`,
          borderRadius: "3px", padding: "12px 14px",
          cursor: isEmpty ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: "12px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent }}>
              {eyebrow}
            </span>
            <span style={{ ...FONT, fontSize: "0.72rem", color: "#aaa" }}>· {count}</span>
          </div>
          <div style={{ ...FONT, fontSize: "0.72rem", color: "#999", marginTop: "3px", lineHeight: 1.4 }}>
            {isEmpty ? emptyText : subtitle}
          </div>
        </div>
        {!isEmpty && (
          <span style={{ ...FONT, fontSize: "0.7rem", color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {open ? "Hide" : "Show"} <span style={{ marginLeft: "3px" }}>{open ? "▲" : "▼"}</span>
          </span>
        )}
      </button>
      {open && !isEmpty && (
        <div style={{ background: "#fff", border: "1px solid #e8e3da", borderTop: "none", borderRadius: "0 0 3px 3px", marginTop: "-1px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Empty card ─────────────────────────────────────────────────────────────
function EmptyCard({ text }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{
      background: "#fff", border: "1px dashed #d7d1c8",
      borderRadius: "3px", padding: "18px", marginBottom: "28px",
      ...FONT, fontSize: "0.78rem", color: "#aaa",
    }}>
      {text}
    </div>
  );
}

// ─── Row (used inside the tighter lists) ────────────────────────────────────
function ReportRow({ title, sub, badge, badgeColor, right, rightSub, compact }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  // badgeColor may be a 6-digit hex (#rrggbb) or an rgba(...) string — build a
  // light background tint safely rather than string-concatenating an alpha
  // suffix onto whatever format the source happens to be in.
  const resolvedColor = badgeColor || "#888888";
  const badgeBg = /^#([0-9a-f]{6})$/i.test(resolvedColor) ? `${resolvedColor}1a` : "rgba(17,24,32,0.08)";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      padding: compact ? "8px 12px" : "10px 14px",
      borderBottom: "1px solid #f0ece4",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...FONT, fontSize: compact ? "0.78rem" : "0.82rem", fontWeight: 600, color: "#1a2535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ ...FONT, fontSize: "0.7rem", color: "#999", marginTop: "1px" }}>{sub}</div>
      </div>
      {badge && (
        <span style={{
          ...FONT, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          color: resolvedColor, background: badgeBg,
          padding: "3px 8px", borderRadius: "2px", whiteSpace: "nowrap", flexShrink: 0,
        }}>{badge}</span>
      )}
      {right && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ ...FONT, fontSize: "0.7rem", color: "#666", whiteSpace: "nowrap" }}>{right}</div>
          {rightSub && <div style={{ ...FONT, fontSize: "0.66rem", color: "#aaa", whiteSpace: "nowrap" }}>{rightSub}</div>}
        </div>
      )}
    </div>
  );
}

window.WeeklyReportPanel = WeeklyReportPanel;
