// reporting.jsx — "Reporting" tab: one place for brief / approval / go-live dates, so nobody
// re-keys them into a spreadsheet. Logic lives in reporting_logic.js (window.NS_REPORTING).
//
//   • Dates per article, matching the tracking sheet: Brief Given, NS Content, Article Approval,
//     Article Publish (+ Month/Week, Brief given by, Funnel Stage, Cluster, Live Link).
//     Brief / NS content / approval fill in automatically from the workflow history; Article Publish is
//     the same field as Publishing Info → "Launch date" (entered once, shows in both places).
//     Jovana, Rishabh and admins can enter or correct them here.
//   • Filters: date range (on any of the 3 dates), brief owner, status, content type (+ phase, search).
//   • Summary view (KPIs, by owner / status / type / month) and Articles table.
//   • Download the filtered view as CSV or Excel (Excel adds a Summary sheet).
// Names are RP-prefixed (scripts load without a bundler — avoid global collisions).

const { useState: useRPState, useMemo: useRPMemo } = React;
const RPFONT = { fontFamily: "Noto Sans, sans-serif" };
const RP_INK = "#0f1923", RP_MUTED = "#6b7280", RP_LINE = "#e3ded6", RP_SOFT = "#f6f3ee", RP_ACCENT = "#c8401a";

// Columns shown on screen (export uses the full list in reporting_logic.js → COLUMNS).
const RP_SCREEN_COLS = ["mw", "title", "topic", "owner", "funnel", "status", "brief", "ns", "approved", "live", "url"];
const RP_DATE_FIELDS = [["brief", "Brief given"], ["ns", "NS content"], ["approved", "Article approval"], ["live", "Article publish"]];

function rpStatusLabel(piece, project) {
  try { if (window.NS_statusLabelFor) { const l = window.NS_statusLabelFor(piece, project); if (l) return l; } } catch {}
  try { if (typeof STATUS_META !== "undefined" && STATUS_META[piece.status]) return STATUS_META[piece.status].label; } catch {}
  return piece.status || "—";
}
function rpCtLabel(ct) {
  const d = window.CT_DISPLAY && window.CT_DISPLAY[ct];
  return d ? d.label : (ct || "—");
}
function rpFmtDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return "—";
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function rpFmtMonth(s) {
  const m = /^(\d{4})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : s;
}
const rpNum = v => (v == null ? "—" : v);

function rpDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function RPChips({ options, value, onChange }) {
  const set = new Set(value);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
      {options.map(o => {
        const on = set.has(o.id);
        return (
          <button key={String(o.id)} type="button"
            onClick={() => onChange(on ? value.filter(x => x !== o.id) : [...value, o.id])}
            style={{
              ...RPFONT, fontSize: "0.72rem", fontWeight: on ? 700 : 500, padding: "4px 10px", borderRadius: "999px", cursor: "pointer",
              border: `1px solid ${on ? RP_INK : RP_LINE}`, background: on ? RP_INK : "#fff", color: on ? "#fff" : "#444",
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function RPField({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: RP_MUTED, marginBottom: "5px" }}>{label}</div>
      {children}
    </div>
  );
}

function RPTile({ big, label, sub }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${RP_LINE}`, borderRadius: "4px", padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 600, color: RP_INK, lineHeight: 1 }}>{big}</div>
      <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: RP_MUTED, marginTop: "7px" }}>{label}</div>
      {sub ? <div style={{ fontSize: "0.7rem", color: RP_MUTED, marginTop: "3px" }}>{sub}</div> : null}
    </div>
  );
}

function RPBreakdown({ title, rows, labelHead }) {
  const th = { textAlign: "right", padding: "8px 10px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: RP_MUTED, borderBottom: `1px solid ${RP_LINE}`, whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "8px 10px", fontSize: "0.8rem", color: RP_INK, borderBottom: `1px solid ${RP_SOFT}`, fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ background: "#fff", border: `1px solid ${RP_LINE}`, borderRadius: "4px", overflowX: "auto" }}>
      <div style={{ padding: "12px 14px 4px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: RP_INK }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", ...RPFONT }}>
        <thead><tr>
          <th style={{ ...th, textAlign: "left" }}>{labelHead}</th>
          <th style={th}>Articles</th><th style={th}>Briefs</th><th style={th}>NS content</th><th style={th}>Approved</th><th style={th}>Published</th>
          <th style={th} title="Average days from brief requested to approved">Avg brief→appr.</th>
          <th style={th} title="Average days from approved to live publication">Avg appr.→live</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td style={{ ...td, textAlign: "left", color: RP_MUTED }} colSpan={8}>No articles match the current filters.</td></tr>}
          {rows.map(g => (
            <tr key={g.key}>
              <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{g.label}</td>
              <td style={td}>{g.articles}</td><td style={td}>{g.briefs}</td><td style={td}>{g.ns}</td><td style={td}>{g.approved}</td><td style={td}>{g.live}</td>
              <td style={td}>{rpNum(g.avgBriefToApproved)}</td><td style={td}>{rpNum(g.avgApprovedToLive)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportingPanel({ project, setProject, currentUser, adminMode, onOpenPiece }) {
  const R = window.NS_REPORTING;
  const [tab, setTab] = useRPState("summary");           // summary | articles
  const [dateField, setDateField] = useRPState("brief");
  const [from, setFrom] = useRPState("");
  const [to, setTo] = useRPState("");
  const [owners, setOwners] = useRPState([]);
  const [statuses, setStatuses] = useRPState([]);
  const [types, setTypes] = useRPState([]);
  const [phases, setPhases] = useRPState([]);
  const [q, setQ] = useRPState("");
  const [sort, setSort] = useRPState({ key: "brief", dir: "desc" });
  const [notice, setNotice] = useRPState(null);

  const canEdit = !!currentUser && (R.DATE_EDITORS.includes(currentUser.id) || !!adminMode || !!currentUser.admin);

  const allRows = useRPMemo(() => R.buildRows(project, {
    statusLabel: p => rpStatusLabel(p, project),
    reviewOwnerFn: p => (window.NS_reviewOwnerId ? window.NS_reviewOwnerId(p, project) : null),
    ctLabel: rpCtLabel,
  }), [project]);

  const filters = { dateField, from, to, owners, statuses, types, phases, q };
  const rows = useRPMemo(() => R.applyFilters(allRows, filters), [allRows, dateField, from, to, owners, statuses, types, phases, q]);
  const summary = useRPMemo(() => R.summarize(rows), [rows]);

  const sorted = useRPMemo(() => {
    const col = R.COLUMNS.find(c => c.key === sort.key) || R.COLUMNS[0];
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      const ex = x === "" || x == null, ey = y === "" || y == null;
      if (ex && ey) return 0;
      if (ex) return 1;            // blanks always last
      if (ey) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, sort]);

  // Filter option lists come from the data actually present.
  const statusOptions = useRPMemo(() => {
    const seen = new Map();
    allRows.forEach(r => { if (!seen.has(r.status)) seen.set(r.status, r.statusLabel); });
    let order = [];
    try { if (typeof STATUS_ORDER !== "undefined") order = STATUS_ORDER; } catch {}
    return [...seen.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).map(([id, label]) => ({ id, label }));
  }, [allRows]);
  const typeOptions = useRPMemo(() => {
    const seen = new Map();
    allRows.forEach(r => { if (!seen.has(r.ct)) seen.set(r.ct, r.ctLabel); });
    return [...seen.entries()].filter(([id]) => id).map(([id, label]) => ({ id, label }));
  }, [allRows]);
  const ownerOptions = [...R.OWNERS.map(o => ({ id: o.id, label: o.name })), { id: R.NONE, label: "Unassigned" }];
  const phaseOptions = [1, 2, 3].map(n => ({ id: n, label: "Phase " + n }));

  const hasFilters = !!(from || to || owners.length || statuses.length || types.length || phases.length || q);
  function clearFilters() { setFrom(""); setTo(""); setOwners([]); setStatuses([]); setTypes([]); setPhases([]); setQ(""); }

  // ── edits (write straight into project state; the app's autosave persists them) ──
  function patchPiece(pieceId, fn) {
    setProject(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const p of next.pillars) for (const c of p.clusters) {
        const pc = c.pieces.find(x => x.id === pieceId);
        if (pc) fn(pc);
      }
      return next;
    });
  }
  function setDate(row, field, value) {
    if (!canEdit) return;
    const now = new Date().toISOString();
    patchPiece(row.piece.id, pc => {
      if (field === "live") {
        pc.publishing = { ...(pc.publishing || {}), launch_date: value || "", updated_at: now };
        if (value && !pc.publishing.published_by) {
          const first = String(currentUser.name || "").split(/\s+/)[0];
          if (first) pc.publishing.published_by = first;
        }
      } else {
        const key = field === "brief" ? "brief_requested" : field === "ns" ? "ns_content" : "approved";
        pc.reporting = { ...(pc.reporting || {}) };
        if (value) pc.reporting[key] = value; else delete pc.reporting[key];   // cleared → falls back to the automatic date
        pc.reporting.updated_at = now; pc.reporting.updated_by = currentUser.id;
      }
    });
  }
  function setTopic(row, value) {
    if (!canEdit || value === row.topicCluster) return;
    const now = new Date().toISOString();
    patchPiece(row.piece.id, pc => {
      pc.reporting = { ...(pc.reporting || {}) };
      if (value.trim()) pc.reporting.topic_cluster = value.trim(); else delete pc.reporting.topic_cluster;
      pc.reporting.updated_at = now; pc.reporting.updated_by = currentUser.id;
    });
  }
  function setOwner(row, id) {
    if (!canEdit) return;
    const now = new Date().toISOString();
    patchPiece(row.piece.id, pc => {
      pc.reporting = { ...(pc.reporting || {}) };
      if (id) pc.reporting.brief_owner = id; else delete pc.reporting.brief_owner;
      pc.reporting.updated_at = now; pc.reporting.updated_by = currentUser.id;
    });
  }

  // ── exports ──
  const stamp = new Date().toISOString().slice(0, 10);
  function filterLines() {
    const lines = [];
    const dfl = RP_DATE_FIELDS.find(d => d[0] === dateField)[1];
    if (from || to) lines.push(`${dfl}: ${from || "…"} to ${to || "…"}`);
    if (owners.length) lines.push("Brief owner: " + owners.map(id => (ownerOptions.find(o => o.id === id) || {}).label).join(", "));
    if (statuses.length) lines.push("Status: " + statuses.map(id => (statusOptions.find(o => o.id === id) || {}).label).join(", "));
    if (types.length) lines.push("Content type: " + types.map(id => (typeOptions.find(o => o.id === id) || {}).label).join(", "));
    if (phases.length) lines.push("Phase: " + phases.join(", "));
    if (q) lines.push("Search: " + q);
    return lines.length ? lines : ["None (all articles)"];
  }
  function exportCSV() {
    rpDownload(`Jaggaer_Reporting_${stamp}.csv`, new Blob(["﻿" + R.toCSV(sorted)], { type: "text/csv;charset=utf-8" }));
  }
  function exportXLSX() {
    if (!window.XLSX) { setNotice("Excel export library didn't load — use CSV, or refresh and try again."); return; }
    const X = window.XLSX;
    const m = R.toMatrix(sorted);
    const dateCols = R.COLUMNS.map((c, i) => (c.type === "date" ? i : -1)).filter(i => i >= 0);
    const aoa = [m.header].concat(m.data.map(line => line.map((v, i) => {
      if (dateCols.includes(i) && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, mo, d] = v.split("-").map(Number); return new Date(y, mo - 1, d); }
      return v;
    })));
    const ws = X.utils.aoa_to_sheet(aoa, { cellDates: true });
    dateCols.forEach(ci => { for (let r = 1; r < aoa.length; r++) { const ref = X.utils.encode_cell({ r, c: ci }); if (ws[ref] && ws[ref].t === "d") ws[ref].z = "yyyy-mm-dd"; } });
    ws["!cols"] = R.COLUMNS.map(c => ({ wch: c.key === "title" ? 56 : c.key === "url" ? 44 : c.key === "mw" ? 14 : c.type === "date" ? 16 : 18 }));
    ws["!freeze"] = { xSplit: 1, ySplit: 1 };
    ws["!autofilter"] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(aoa.length - 1, 0), c: m.header.length - 1 } }) };

    const s = summary;
    const grp = (title, head, g) => [[title], [head, "Articles", "Briefs", "NS content", "Approved", "Published", "Avg days brief→approved", "Avg days approved→live"]]
      .concat(g.map(x => [x.label, x.articles, x.briefs, x.ns, x.approved, x.live, x.avgBriefToApproved == null ? "" : x.avgBriefToApproved, x.avgApprovedToLive == null ? "" : x.avgApprovedToLive]), [[]]);
    const sa = [["Jaggaer × Netscribes — Reporting summary"], ["Generated", stamp], ["Filters"].concat(filterLines()), [],
      ["Articles in view", s.total], ["Briefs given", s.briefs], ["NS content delivered", s.ns], ["Articles approved", s.approved], ["Published (date entered)", s.live],
      ["Avg days brief → approved", s.avgBriefToApproved == null ? "" : s.avgBriefToApproved], ["Avg days approved → live", s.avgApprovedToLive == null ? "" : s.avgApprovedToLive],
      ["Live status but no live date", s.liveMissingDate], []]
      .concat(grp("By brief owner", "Brief owner", s.byOwner), grp("By status", "Status", s.byStatus), grp("By content type", "Content type", s.byType),
        [["By month (date falls in month)"], ["Month", "Briefs given", "NS content", "Approval", "Publish"]], s.byMonth.map(x => [x.month, x.briefs, x.ns, x.approved, x.live]));
    const ss = X.utils.aoa_to_sheet(sa);
    ss["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 24 }, { wch: 24 }];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Articles");
    X.utils.book_append_sheet(wb, ss, "Summary");
    X.writeFile(wb, `Jaggaer_Reporting_${stamp}.xlsx`);
  }

  // ── presentation helpers ──
  const inputStyle = { ...RPFONT, fontSize: "0.78rem", padding: "6px 8px", border: `1px solid ${RP_LINE}`, borderRadius: "3px", background: "#fff", color: RP_INK, minWidth: 0 };
  const btn = (primary) => ({ ...RPFONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", padding: "8px 14px", borderRadius: "3px", cursor: "pointer",
    border: `1px solid ${primary ? RP_INK : RP_LINE}`, background: primary ? RP_INK : "#fff", color: primary ? "#fff" : RP_INK });

  // Plain render helper (not a component) so inputs keep focus across re-renders.
  function renderDate(row, field) {
    const d = row[field];
    const label = RP_DATE_FIELDS.find(x => x[0] === field)[1];
    if (!canEdit) return <span style={{ color: d.date ? RP_INK : "#b5b0a6" }}>{rpFmtDate(d.date)}</span>;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <input type="date" key={row.piece.id + field + d.date} defaultValue={d.date || ""} aria-label={`${label}: ${row.title}`}
          onChange={e => { const v = e.target.value; if (v === "" || (v >= "2000-01-01" && v <= "2100-12-31")) setDate(row, field, v); }}
          style={{ ...inputStyle, padding: "3px 5px", fontSize: "0.74rem", width: "128px", borderColor: d.date ? RP_LINE : "#e8c9bd" }} />
        {d.src === "auto" && <span title="Filled in automatically from the workflow history — pick a date to override" style={{ fontSize: "0.58rem", fontWeight: 700, color: RP_MUTED, letterSpacing: "0.06em" }}>AUTO</span>}
      </span>
    );
  }

  const thStyle = { textAlign: "left", padding: "9px 10px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: RP_MUTED, borderBottom: `1.5px solid ${RP_LINE}`, background: RP_SOFT, whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1, cursor: "pointer", userSelect: "none" };
  const tdStyle = { padding: "8px 10px", fontSize: "0.8rem", color: RP_INK, borderBottom: `1px solid ${RP_SOFT}`, verticalAlign: "middle" };
  const screenCols = RP_SCREEN_COLS.map(k => R.COLUMNS.find(c => c.key === k));

  return (
    <div style={{ ...RPFONT, padding: "28px 32px 80px", maxWidth: "1280px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "4px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: RP_INK, margin: 0 }}>Reporting</h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={btn(false)} onClick={exportCSV}>⬇ CSV</button>
          <button type="button" style={btn(true)} onClick={exportXLSX}>⬇ Excel</button>
        </div>
      </div>
      <p style={{ fontSize: "0.82rem", color: RP_MUTED, margin: "0 0 16px", maxWidth: "760px" }}>
        Brief, NS-content, approval and publish dates for every article (same columns as the Jaggaer tracking sheet) — kept here instead of a separate spreadsheet.
        Brief, NS-content and approval dates fill in from the workflow; <strong>Article Publish</strong> is the same date as <em>Launch date</em> in Publishing Info.
        {canEdit ? " You can enter or correct the dates below." : " Jovana, Rishabh and admins enter or correct the dates."}
      </p>
      {notice && <div style={{ background: "#fef3e8", border: "1px solid #f0d4a8", color: "#784212", padding: "8px 12px", borderRadius: "3px", fontSize: "0.78rem", marginBottom: "12px" }}>{notice} <button type="button" onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#784212", fontWeight: 700 }}>✕</button></div>}

      {/* Filters */}
      <div style={{ background: "#fff", border: `1px solid ${RP_LINE}`, borderRadius: "4px", padding: "14px 16px", marginBottom: "16px", display: "grid", gap: "14px" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <RPField label="Date range on">
            <select value={dateField} onChange={e => setDateField(e.target.value)} style={inputStyle}>
              {RP_DATE_FIELDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </RPField>
          <RPField label="From"><input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={inputStyle} /></RPField>
          <RPField label="To"><input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={inputStyle} /></RPField>
          <RPField label="Search"><input type="search" value={q} placeholder="Title, cluster, keyword" onChange={e => setQ(e.target.value)} style={{ ...inputStyle, width: "200px" }} /></RPField>
          <div style={{ flex: 1 }} />
          {hasFilters && <button type="button" onClick={clearFilters} style={{ ...btn(false), padding: "6px 12px" }}>Clear filters</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
          <RPField label="Brief given by"><RPChips options={ownerOptions} value={owners} onChange={setOwners} /></RPField>
          <RPField label="Status"><RPChips options={statusOptions} value={statuses} onChange={setStatuses} /></RPField>
          <RPField label="Content type"><RPChips options={typeOptions} value={types} onChange={setTypes} /></RPField>
          <RPField label="Phase"><RPChips options={phaseOptions} value={phases} onChange={setPhases} /></RPField>
        </div>
      </div>

      {/* View switch */}
      <div style={{ display: "flex", gap: "4px", background: "#f0ece4", borderRadius: "3px", padding: "2px", width: "fit-content", marginBottom: "16px" }}>
        {[["summary", "Summary"], ["articles", `Articles (${rows.length})`]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            ...RPFONT, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", border: "none", borderRadius: "2px", cursor: "pointer",
            background: tab === id ? "#fff" : "transparent", color: tab === id ? RP_INK : "#888", boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {tab === "summary" && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            <RPTile big={summary.total} label="Articles in view" sub={hasFilters ? `of ${allRows.length} total` : null} />
            <RPTile big={summary.briefs} label="Briefs given" />
            <RPTile big={summary.ns} label="NS content delivered" />
            <RPTile big={summary.approved} label="Approved" />
            <RPTile big={summary.live} label="Published (date entered)" sub={summary.liveMissingDate ? `${summary.liveMissingDate} marked Live with no date` : null} />
            <RPTile big={rpNum(summary.avgBriefToApproved)} label="Avg days brief → approved" />
            <RPTile big={rpNum(summary.avgApprovedToLive)} label="Avg days approved → live" />
          </div>
          <RPBreakdown title="By brief given by" labelHead="Owner" rows={summary.byOwner} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "16px" }}>
            <RPBreakdown title="By status" labelHead="Status" rows={summary.byStatus} />
            <RPBreakdown title="By content type" labelHead="Type" rows={summary.byType} />
          </div>
          <div style={{ background: "#fff", border: `1px solid ${RP_LINE}`, borderRadius: "4px", overflowX: "auto" }}>
            <div style={{ padding: "12px 14px 4px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: RP_INK }}>By month <span style={{ color: RP_MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>— each count uses its own date</span></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Month", "Briefs given", "NS content", "Approval", "Publish"].map((h, i) => (
                <th key={h} style={{ textAlign: i ? "right" : "left", padding: "8px 10px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: RP_MUTED, borderBottom: `1px solid ${RP_LINE}` }}>{h}</th>))}</tr></thead>
              <tbody>
                {summary.byMonth.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, color: RP_MUTED }}>No dates recorded for the current filters.</td></tr>}
                {summary.byMonth.map(m => (
                  <tr key={m.month}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{rpFmtMonth(m.month)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{m.briefs}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{m.ns}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{m.approved}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{m.live}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "articles" && (
        <div style={{ background: "#fff", border: `1px solid ${RP_LINE}`, borderRadius: "4px", overflow: "auto", maxHeight: "calc(100vh - 340px)", minHeight: "240px" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead><tr>
              {screenCols.map(c => (
                <th key={c.key} style={thStyle} onClick={() => setSort(s => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))}>
                  {c.label}{sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </th>))}
            </tr></thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={screenCols.length} style={{ ...tdStyle, color: RP_MUTED, padding: "24px 14px" }}>No articles match the current filters.</td></tr>}
              {sorted.map(r => (
                <tr key={r.piece.id}>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: RP_MUTED }}>{r.monthWeek || "—"}</td>
                  <td style={{ ...tdStyle, minWidth: "260px", maxWidth: "380px" }}>
                    {onOpenPiece
                      ? <button type="button" onClick={() => onOpenPiece(r.clusterId, r.piece.id)} style={{ ...RPFONT, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: RP_INK, fontWeight: 600, fontSize: "0.8rem", textDecoration: "underline", textDecorationColor: RP_LINE }}>{r.title}</button>
                      : <strong>{r.title}</strong>}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {canEdit
                      ? <input type="text" key={r.piece.id + "topic" + r.topicCluster} defaultValue={r.topicCluster} placeholder="e.g. Tail Spend" aria-label={`Cluster: ${r.title}`}
                          onBlur={e => setTopic(r, e.target.value)} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                          style={{ ...inputStyle, padding: "3px 6px", fontSize: "0.74rem", width: "130px" }} />
                      : (r.topicCluster || <span style={{ color: "#b5b0a6" }}>—</span>)}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {canEdit
                      ? <select value={r.owner.id} onChange={e => setOwner(r, e.target.value)} aria-label={`Brief given by: ${r.title}`} style={{ ...inputStyle, padding: "3px 5px", fontSize: "0.74rem" }}>
                          <option value="">Unassigned</option>
                          {R.OWNERS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      : (r.owner.name || <span style={{ color: "#b5b0a6" }}>Unassigned</span>)}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.funnel || <span style={{ color: "#b5b0a6" }}>—</span>}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.statusLabel}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{renderDate(r, "brief")}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{renderDate(r, "ns")}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{renderDate(r, "approved")}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{renderDate(r, "live")}</td>
                  <td style={{ ...tdStyle, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.liveUrl ? <a href={r.liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: RP_ACCENT }}>{r.liveUrl.replace(/^https?:\/\/(www\.)?/, "")}</a> : <span style={{ color: "#b5b0a6" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: "0.72rem", color: RP_MUTED, marginTop: "12px" }}>
        Downloads include every column (content type, pillar, format, priority, days between stages, revisions, NS assignee, etc.) for the {rows.length} article{rows.length === 1 ? "" : "s"} currently in view.
      </p>
    </div>
  );
}
window.ReportingPanel = ReportingPanel;
