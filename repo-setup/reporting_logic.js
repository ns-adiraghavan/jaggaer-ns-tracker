// Reporting tab — pure logic (derive dates/owner, filter, summarise, export rows).
// Works in node (tests) and the browser (window.NS_REPORTING). No React, no DOM.
//
// Reporting dates per article (they mirror the Jaggaer tracking sheet's Dates block):
//   brief given      = piece.reporting.brief_requested  (manual)  → else earliest brief upload → else first "brief-uploaded" status entry
//   NS content       = piece.reporting.ns_content       (manual)  → else first time the piece entered a review stage (NS delivered the draft)
//   article approval = piece.reporting.approved         (manual)  → else latest "approved" status entry
//   article publish  = piece.publishing.launch_date     (the SAME field as Publishing Info — never entered twice)
// Also: Month/Week (derived from the brief date: Oct 16 → "Oct/Week 3", week = ceil(day/7)), Funnel stage
// (piece.funnel) and Topic cluster (piece.reporting.topic_cluster, free text — the app's own clusters are weekly).
// Dates are plain "YYYY-MM-DD" strings so there is no timezone drift in the report.
(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  if (typeof window !== "undefined") window.NS_REPORTING = mod;
})(this, function () {
  // Brief owners offered in the report (ids from project.team.jaggaer).
  const OWNERS = [
    { id: "m-pifrn", name: "Visnja" },
    { id: "m-14bwv", name: "Prashanth" },
    { id: "m-72umx", name: "Rishabh" },
  ];
  // Who may enter/correct the three dates (plus admins — decided in the UI).
  const DATE_EDITORS = ["m-izu4e", "m-72umx"]; // Jovana, Rishabh
  const NONE = "__none"; // filter token for "no brief owner"

  const pad = n => String(n).padStart(2, "0");
  function ymd(v) {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dayNum(s) { // days since epoch for a YYYY-MM-DD string
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null;
  }
  function daysBetween(a, b) {
    const x = dayNum(a), y = dayNum(b);
    return x == null || y == null || y < x ? null : y - x;
  }

  function historyTs(piece, stage, which) {
    const h = (Array.isArray(piece.status_history) ? piece.status_history : []).filter(e => e && e.stage === stage && e.ts);
    if (!h.length) return "";
    const sorted = h.map(e => e.ts).sort();
    return which === "last" ? sorted[sorted.length - 1] : sorted[0];
  }

  function briefDate(piece) {
    const man = piece.reporting && piece.reporting.brief_requested;
    if (man) return { date: ymd(man), src: "manual" };
    const ups = (Array.isArray(piece.brief_files) ? piece.brief_files : []).map(b => b && b.uploaded_at).filter(Boolean).sort();
    if (ups.length) return { date: ymd(ups[0]), src: "auto" };
    const h = historyTs(piece, "brief-uploaded", "first");
    return h ? { date: ymd(h), src: "auto" } : { date: "", src: "" };
  }
  function approvedDate(piece) {
    const man = piece.reporting && piece.reporting.approved;
    if (man) return { date: ymd(man), src: "manual" };
    const h = historyTs(piece, "approved", "last");
    return h ? { date: ymd(h), src: "auto" } : { date: "", src: "" };
  }
  function nsDate(piece) {
    const man = piece.reporting && piece.reporting.ns_content;
    if (man) return { date: ymd(man), src: "manual" };
    const ts = ["marketing-review", "ad-hoc-review"].map(st => historyTs(piece, st, "first")).filter(Boolean).sort();
    return ts.length ? { date: ymd(ts[0]), src: "auto" } : { date: "", src: "" };
  }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function monthWeek(date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
    return m ? MONTHS[+m[2] - 1] + "/Week " + Math.ceil(+m[3] / 7) : "";
  }
  function liveDate(piece) {
    const d = piece.publishing && piece.publishing.launch_date;
    return d ? { date: ymd(d), src: "manual" } : { date: "", src: "" };
  }
  // reviewOwnerFn(piece) = window.NS_reviewOwnerId (Visnja/Prashanth tag or default) — optional.
  function ownerOf(piece, reviewOwnerFn) {
    const man = piece.reporting && piece.reporting.brief_owner;
    let id = "", src = "";
    if (man && OWNERS.some(o => o.id === man)) { id = man; src = "manual"; }
    else {
      let r = null;
      try { r = reviewOwnerFn ? reviewOwnerFn(piece) : null; } catch (e) {}
      if (r && OWNERS.some(o => o.id === r)) { id = r; src = "auto"; }
      else {
        const bf = (Array.isArray(piece.brief_files) ? piece.brief_files : []).find(b => b && OWNERS.some(o => o.id === b.uploaded_by));
        if (bf) { id = bf.uploaded_by; src = "auto"; }
      }
    }
    const o = OWNERS.find(x => x.id === id);
    return { id, name: o ? o.name : "", src };
  }

  // opts: { statusLabel(piece), reviewOwnerFn, ctLabel(contentType) }
  function buildRows(project, opts) {
    opts = opts || {};
    const team = [].concat((project.team && project.team.ns) || [], (project.team && project.team.jaggaer) || []);
    const nameOf = id => { const m = team.find(x => x.id === id); return m ? m.name : (id || ""); };
    const rows = [];
    for (const pl of project.pillars || []) for (const cl of pl.clusters || []) for (const pc of cl.pieces || []) {
      const b = briefDate(pc), n = nsDate(pc), a = approvedDate(pc), l = liveDate(pc), o = ownerOf(pc, opts.reviewOwnerFn);
      const ct = pc.content_type || "";
      rows.push({
        piece: pc, clusterId: cl.id, pillarId: pl.id,
        title: pc.title || "", pillar: pl.label || "", cluster: cl.label || "",
        ct, ctLabel: opts.ctLabel ? opts.ctLabel(ct) : ct, format: pc.format || "", phase: pc.phase || pl.phase || 1,
        owner: o, status: pc.status || "",
        statusLabel: opts.statusLabel ? opts.statusLabel(pc) : (pc.status || ""),
        priority: pc.priority || "", assignee: nameOf(pc.assignee),
        brief: b, ns: n, approved: a, live: l,
        monthWeek: monthWeek(b.date), funnel: pc.funnel || "", topicCluster: (pc.reporting && pc.reporting.topic_cluster) || "",
        daysBriefToApproved: daysBetween(b.date, a.date),
        daysApprovedToLive: daysBetween(a.date, l.date),
        liveUrl: (pc.publishing && pc.publishing.live_url) || pc.url || "",
        publishedBy: (pc.publishing && pc.publishing.published_by) || "",
        revisions: pc.revision_count || 0,
        keyword: pc.primary_keyword || "", geography: pc.geography || "",
        planned: pc.planned_publish_date || "",
      });
    }
    return rows;
  }

  // f: { dateField: "brief"|"approved"|"live", from, to, owners[], statuses[], types[], phases[], q }
  // Empty arrays = no restriction. A date range excludes rows with no date in the chosen field.
  function applyFilters(rows, f) {
    f = f || {};
    const q = (f.q || "").trim().toLowerCase();
    const df = f.dateField || "brief";
    return rows.filter(r => {
      if (f.owners && f.owners.length && !f.owners.includes(r.owner.id || NONE)) return false;
      if (f.statuses && f.statuses.length && !f.statuses.includes(r.status)) return false;
      if (f.types && f.types.length && !f.types.includes(r.ct)) return false;
      if (f.phases && f.phases.length && !f.phases.includes(r.phase)) return false;
      if (q && !(r.title + " " + r.cluster + " " + r.keyword).toLowerCase().includes(q)) return false;
      if (f.from || f.to) {
        const d = r[df].date;
        if (!d) return false;
        if (f.from && d < f.from) return false;
        if (f.to && d > f.to) return false;
      }
      return true;
    });
  }

  const avg = xs => { const v = xs.filter(x => x != null); return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null; };
  function group(rows, keyFn, labelFn) {
    const m = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      if (!m.has(k)) m.set(k, { key: k, label: labelFn(r), rows: [] });
      m.get(k).rows.push(r);
    }
    return [...m.values()].map(g => ({
      key: g.key, label: g.label, articles: g.rows.length,
      briefs: g.rows.filter(r => r.brief.date).length,
      ns: g.rows.filter(r => r.ns.date).length,
      approved: g.rows.filter(r => r.approved.date).length,
      live: g.rows.filter(r => r.live.date).length,
      avgBriefToApproved: avg(g.rows.map(r => r.daysBriefToApproved)),
      avgApprovedToLive: avg(g.rows.map(r => r.daysApprovedToLive)),
    }));
  }
  function byMonth(rows) {
    const m = {};
    const bump = (d, k) => { if (!d) return; const mo = d.slice(0, 7); (m[mo] = m[mo] || { month: mo, briefs: 0, ns: 0, approved: 0, live: 0 })[k]++; };
    for (const r of rows) { bump(r.brief.date, "briefs"); bump(r.ns.date, "ns"); bump(r.approved.date, "approved"); bump(r.live.date, "live"); }
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month));
  }
  function summarize(rows) {
    return {
      total: rows.length,
      briefs: rows.filter(r => r.brief.date).length,
      ns: rows.filter(r => r.ns.date).length,
      approved: rows.filter(r => r.approved.date).length,
      live: rows.filter(r => r.live.date).length,
      avgBriefToApproved: avg(rows.map(r => r.daysBriefToApproved)),
      avgApprovedToLive: avg(rows.map(r => r.daysApprovedToLive)),
      liveMissingDate: rows.filter(r => r.status === "live" && !r.live.date).length,
      byOwner: group(rows, r => r.owner.id || NONE, r => r.owner.name || "Unassigned"),
      byStatus: group(rows, r => r.status, r => r.statusLabel || r.status),
      byType: group(rows, r => r.ct || "—", r => r.ctLabel || r.ct || "—"),
      byMonth: byMonth(rows),
    };
  }

  // One column list drives the on-screen table, the CSV and the Excel export.
  // To add/remove/reorder report columns, edit this array only.
  const COLUMNS = [
    // — same order as the Jaggaer tracking sheet (Sheet1) —
    { key: "mw",       label: "Month/Week",          type: "text", get: r => r.monthWeek },
    { key: "title",    label: "Article/Topic",       type: "text", get: r => r.title },
    { key: "kw",       label: "Primary Keyword",     type: "text", get: r => r.keyword },
    { key: "topic",    label: "Cluster",             type: "text", get: r => r.topicCluster },
    { key: "owner",    label: "Brief given by",      type: "text", get: r => r.owner.name || "Unassigned" },
    { key: "funnel",   label: "Funnel Stage",        type: "text", get: r => r.funnel },
    { key: "brief",    label: "Brief Given",         type: "date", get: r => r.brief.date },
    { key: "ns",       label: "NS Content",          type: "date", get: r => r.ns.date },
    { key: "approved", label: "Article Approval",    type: "date", get: r => r.approved.date },
    { key: "live",     label: "Article Publish",     type: "date", get: r => r.live.date },
    { key: "url",      label: "Live Link",           type: "text", get: r => r.liveUrl },
    // — extra context —
    { key: "status",   label: "Status",              type: "text", get: r => r.statusLabel },
    { key: "ct",       label: "Content type",        type: "text", get: r => r.ctLabel },
    { key: "pillar",   label: "Pillar",              type: "text", get: r => r.pillar },
    { key: "cluster",  label: "App cluster / week",  type: "text", get: r => r.cluster },
    { key: "format",   label: "Format",              type: "text", get: r => r.format },
    { key: "phase",    label: "Phase",               type: "num",  get: r => r.phase },
    { key: "priority", label: "Priority",            type: "text", get: r => r.priority },
    { key: "d1",       label: "Days brief → approved", type: "num", get: r => r.daysBriefToApproved },
    { key: "d2",       label: "Days approved → live",  type: "num", get: r => r.daysApprovedToLive },
    { key: "pubby",    label: "Published by",        type: "text", get: r => r.publishedBy },
    { key: "rev",      label: "Revisions",           type: "num",  get: r => r.revisions },
    { key: "assignee", label: "NS assignee",         type: "text", get: r => r.assignee },
    { key: "geo",      label: "Geography",           type: "text", get: r => r.geography },
    { key: "planned",  label: "Planned publish date", type: "text", get: r => r.planned },
  ];

  function toMatrix(rows, columns) {
    columns = columns || COLUMNS;
    return { header: columns.map(c => c.label), data: rows.map(r => columns.map(c => { const v = c.get(r); return v == null ? "" : v; })) };
  }
  function csvCell(v) {
    const s = String(v == null ? "" : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(rows, columns) {
    const m = toMatrix(rows, columns);
    return [m.header].concat(m.data).map(line => line.map(csvCell).join(",")).join("\r\n");
  }

  return { OWNERS, DATE_EDITORS, NONE, COLUMNS, ymd, daysBetween, briefDate, approvedDate, liveDate, ownerOf, buildRows, applyFilters, summarize, toMatrix, toCSV };
});
