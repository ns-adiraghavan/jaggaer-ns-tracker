// Phase 2 calendar parse + diff — pure functions, testable in node & browser.
// In the browser, XLSX is the global from the SheetJS CDN. In node it's require('xlsx').
(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  if (typeof window !== "undefined") window.NS_PHASE2 = mod;
})(this, function () {
  const CAT_LABEL = { seo: "SEO", geo: "GEO", bofu: "BOFU" };
  const CAT_ORDER = ["geo", "seo", "bofu"];
  const WEEK_RE = /Week\s+(\d+)\s*\(([^)]*)\)/i;

  function normTitle(t) { return String(t || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  function slug(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  function categoryOf(typesrc) {
    const up = String(typesrc || "").toUpperCase();
    if (up.startsWith("SEO")) return "seo";
    if (up.startsWith("GEO")) return "geo";
    if (up.startsWith("BOFU")) return "bofu";
    return "seo";
  }

  // Parse the "Content Calendar" sheet from a SheetJS workbook into flat rows.
  function parseCalendar(XLSX, workbook) {
    const sheet = workbook.Sheets["Content Calendar"];
    if (!sheet) throw new Error('Sheet "Content Calendar" not found. Is this the topics/keywords workbook?');
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
    const rows = [];
    let curWeek = null, curRange = "";
    for (const r of grid) {
      const c0 = String(r[0] == null ? "" : r[0]).trim();
      const m = WEEK_RE.exec(c0);
      if (m) { curWeek = parseInt(m[1], 10); curRange = m[2].trim(); continue; }
      if (/^\d+$/.test(c0) && r[1] && String(r[1]).trim() && String(r[1]).trim() !== "Article / Topic") {
        const title = String(r[1]).trim();
        const typesrc = String(r[2] || "").trim();
        rows.push({
          title, category: categoryOf(typesrc), tier: typesrc,
          week: curWeek, week_range: curRange,
          publish_day: String(r[3] || "").trim(),
          publish_date: String(r[4] || "").trim(),
          sheet_status: String(r[5] || "").trim(),
        });
      }
    }
    return rows;
  }

  // Compute a diff of parsed rows against the current phase-2 category pieces.
  function diff(rows, project) {
    const P2_PILLAR_IDS = ["p2-geo", "p2-seo", "p2-bofu"];
    const current = [];
    for (const p of (project.pillars || [])) {
      if (!P2_PILLAR_IDS.includes(p.id)) continue;
      for (const c of (p.clusters || [])) for (const pc of (c.pieces || [])) current.push(pc);
    }
    const curByTitle = {};
    for (const pc of current) curByTitle[normTitle(pc.title)] = pc;
    const newByTitle = {};
    for (const row of rows) newByTitle[normTitle(row.title)] = row;

    const added = [], updated = [], unchanged = [];
    for (const row of rows) {
      const ex = curByTitle[normTitle(row.title)];
      if (!ex) { added.push(row); continue; }
      const changes = [];
      if ((ex.content_type || "") !== row.category) changes.push({ field: "category", from: (ex.content_type || "—"), to: row.category });
      if ((ex.tier || "") !== row.tier) changes.push({ field: "tier", from: (ex.tier || "—"), to: row.tier });
      if ((ex.schedule_week || null) != row.week) changes.push({ field: "week", from: (ex.schedule_week || "—"), to: row.week });
      if ((ex.planned_publish_date || "") !== row.publish_date) changes.push({ field: "publish", from: (ex.planned_publish_date || "—"), to: row.publish_date });
      if (changes.length) updated.push({ row, ex, changes }); else unchanged.push({ row, ex });
    }
    const offSheet = current.filter(pc => !newByTitle[normTitle(pc.title)]);
    return { added, updated, unchanged, offSheet, counts: { added: added.length, updated: updated.length, unchanged: unchanged.length, offSheet: offSheet.length } };
  }

  // Fields carried over from an existing matched piece (status/feedback/uploads kept).
  const PRESERVE = ["id", "status", "revision_count", "assignee", "status_history",
    "publishing", "last_upload", "last_upload_by", "last_updated", "last_updated_by",
    "return_to_stage", "deliverable", "brief", "user_paths", "primary_keyword",
    "secondary_keyword", "intent", "geography"];

  function weekLabel(w, range) { return range ? ("Week " + w + " · " + range) : ("Week " + w); }

  // Rebuild the three phase-2 category pillars from the sheet, preserving matched
  // pieces' workflow state. Non-destructive: off-sheet pieces are retained in a
  // dedicated "Not in current sheet" cluster within their category.
  function apply(rows, project, monthId) {
    const next = JSON.parse(JSON.stringify(project));
    monthId = monthId || next.phase2_active_month || "p2-month-1";
    const P2_PILLAR_IDS = ["p2-geo", "p2-seo", "p2-bofu"];

    // Index existing phase-2 category pieces by normalized title.
    const curByTitle = {};
    for (const p of next.pillars) {
      if (!P2_PILLAR_IDS.includes(p.id)) continue;
      for (const c of p.clusters) for (const pc of c.pieces) curByTitle[normTitle(pc.title)] = pc;
    }
    const usedTitles = new Set();

    // week ranges for labels
    const weekRange = {};
    for (const row of rows) if (row.week && !weekRange[row.week] && row.week_range) weekRange[row.week] = row.week_range;

    // Build fresh category pillars.
    const built = {};
    for (const cat of CAT_ORDER) built[cat] = {};  // cat -> week -> [pieces]
    for (const row of rows) {
      const cat = row.category, w = row.week || 0;
      const nt = normTitle(row.title);
      usedTitles.add(nt);
      const ex = curByTitle[nt];
      const piece = {
        id: (ex && ex.id) || ("p2-" + cat + "-" + slug(row.title)),
        title: row.title,
        format: (ex && ex.format) || "Article",
        content_type: cat,
        phase: 2,
        tier: row.tier,
        funnel: (ex && ex.funnel) || (cat === "seo" ? "MOFU" : "BOFU"),
        schedule_week: w,
        publish_day: row.publish_day,
        planned_publish_date: row.publish_date,
        status: "not-started",
        assignee: "",
      };
      if (ex) for (const k of PRESERVE) if (ex[k] !== undefined) piece[k] = ex[k];
      if (!built[cat][w]) built[cat][w] = [];
      built[cat][w].push(piece);
    }

    // Off-sheet pieces (kept, flagged) — grouped per category.
    const offByCat = { seo: [], geo: [], bofu: [] };
    for (const nt in curByTitle) {
      if (usedTitles.has(nt)) continue;
      const pc = curByTitle[nt];
      const cat = (pc.content_type && offByCat[pc.content_type]) ? pc.content_type : "geo";
      offByCat[cat].push({ ...pc, off_sheet: true });
    }

    // Assemble the three pillars.
    const newPillars = CAT_ORDER.map(cat => {
      const weeks = Object.keys(built[cat]).map(Number).sort((a, b) => a - b);
      const clusters = weeks.map(w => ({
        id: "p2-" + cat + "-w" + w,
        label: weekLabel(w, weekRange[w]),
        sequence: w, intent: "scheduled", anchor_piece: "", month_id: monthId,
        pieces: built[cat][w],
      }));
      if (offByCat[cat].length) {
        clusters.push({
          id: "p2-" + cat + "-offsheet", label: "Not in current sheet",
          sequence: 99, intent: "off-sheet", anchor_piece: "", month_id: monthId,
          pieces: offByCat[cat],
        });
      }
      return { id: "p2-" + cat, label: CAT_LABEL[cat], phase: 2, clusters };
    });

    // Splice: replace existing p2-* pillars, keep everything else untouched.
    next.pillars = next.pillars.filter(p => !P2_PILLAR_IDS.includes(p.id)).concat(newPillars);
    return next;
  }

  return { parseCalendar, diff, apply, normTitle, slug, CAT_ORDER, CAT_LABEL };
});
