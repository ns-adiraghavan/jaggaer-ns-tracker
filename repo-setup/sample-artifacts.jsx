// ══════════════════════════════════════════════════════════════════════════════
// sample-artifacts.jsx  v3 — substantive S2P intelligence hub
// Six articles. Live AI where relevant. JAI contrast is shown, not asserted.
// ══════════════════════════════════════════════════════════════════════════════

const { useState: useStateSA, useRef: useRefSA, useEffect: useEffSA, useCallback: useCBSA } = React;

// ─── Shared primitives ────────────────────────────────────────────────────────

function SAEyebrow({ children, light }) {
  return (
    <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: light ? "rgba(255,255,255,0.5)" : "#c8401a", marginBottom: "10px" }}>
      {children}
    </div>
  );
}

function JAINudge({ text, tight }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", padding: tight ? "14px 18px" : "20px 24px", background: "#0f1923", borderRadius: "3px", marginTop: tight ? "16px" : "28px" }}>
      <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.55, maxWidth: "520px" }}>{text}</p>
      <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#c8401a", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
        Explore JAI →
      </a>
    </div>
  );
}

// JAI vs DIY comparison panel — used in Agent Builder after each demo
function JAIvsClaudePanel({ rows }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  return (
    <div style={{ marginTop: "28px", border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#0f1923" }}>
        {["", "Claude (what you just saw)", "JAI (what procurement teams need)"].map((h, i) => (
          <div key={i} style={{ padding: "10px 16px", ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 2 ? "#c8401a" : "rgba(255,255,255,0.5)", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>{h}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #e0dbd4", background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
          <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#555", borderRight: "1px solid #e0dbd4" }}>{row[0]}</div>
          <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", color: "#777", borderRight: "1px solid #e0dbd4" }}>{row[1]}</div>
          <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", color: "#0f1923", fontWeight: 500 }}>{row[2]}</div>
        </div>
      ))}
      <div style={{ padding: "12px 16px", background: "#faf0ee", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e0dbd4" }}>
        <span style={{ ...FONT, fontSize: "0.75rem", color: "#555" }}>Ready to see JAI work on your actual contracts, suppliers, and spend data?</span>
        <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#c8401a", color: "#fff", ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>Book a demo →</a>
      </div>
    </div>
  );
}

function OutputSection({ label, items, color }) {
  return (
    <div>
      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>{label}</div>
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#333", lineHeight: 1.6 }}>{item}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Article index ─────────────────────────────────────────────────────────────

const ARTICLES = [
  { id: "agent-builder", n: "01", category: "Interactive", title: "Agent Builder", sub: "Four live AI-powered S2P tools — contract analysis, supplier risk scanning, RFP generation, invoice exception detection. Paste your own data and run them. Then see what JAI does with the same capability at scale.", tag: "Live demos", tagColor: "#c8401a", status: "live", readTime: "12 min" },
  { id: "prompting-101", n: "02", category: "Guide", title: "Prompting 101 for S2P", sub: "The four-part formula, six ready-to-use templates, common failure modes — and an interactive builder that assembles a prompt in real time from the blocks you choose.", tag: "Interactive guide", tagColor: "#3b6b88", status: "live", readTime: "10 min" },
  { id: "supply-chain-profiler", n: "03", category: "Personalisation", title: "Supply Chain Risk Profile", sub: "Four questions about your organisation. A full risk briefing in return — sector context, primary pressure, technology gap analysis, and a platform capability matrix tailored to where you are.", tag: "Personalised", tagColor: "#3b6b88", status: "live", readTime: "4 min" },
  { id: "myth-scorer", n: "04", category: "Assessment", title: "The Procurement Myth Scorer", sub: "Six beliefs still running inside most procurement teams. Rate how true each one is at your organisation — get an exposure score, the specific gaps, and a side-by-side of what it takes to close them with and without a platform.", tag: "Interactive", tagColor: "#4f7a5b", status: "live", readTime: "5 min" },
  { id: "clause-annotator", n: "05", category: "Document Intelligence", title: "Clause Annotator", sub: "Paste any contract clause. Get it back with risk flags highlighted inline, obligations extracted, and recommended actions — live AI on your actual text. Then see what portfolio-scale contract intelligence looks like.", tag: "Live AI", tagColor: "#c8401a", status: "live", readTime: "3 min" },
  { id: "prompt-sandbox", n: "06", category: "Sandbox", title: "S2P Prompt Sandbox", sub: "Six procurement scenarios with pre-loaded context and editable prompts. Run them live. Every prompt is yours to keep — and you'll see exactly how long building each one manually takes vs. what JAI does automatically.", tag: "Live AI", tagColor: "#6b5b8e", status: "live", readTime: "6 min" },
];

function ArticleIndex({ onSelect }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 40px 80px" }}>
        <div style={{ marginBottom: "48px", paddingBottom: "36px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Jaggaer Intelligence</SAEyebrow>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.4rem, 4.5vw, 3.4rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "18px" }}>Sample Artifacts</h1>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px" }}>
            Six AI-powered formats that show what procurement intelligence looks like when it's built for action. Each one is interactive — tools you use, not slides you read.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {ARTICLES.map((article, i) => <ArticleCard key={article.id} article={article} index={i} onSelect={onSelect} />)}
        </div>
        <div style={{ marginTop: "56px", padding: "28px 32px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "8px" }}>About this series</div>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#555", lineHeight: 1.65, margin: 0, maxWidth: "440px" }}>
                These artifacts are part of Jaggaer's content intelligence programme — interactive tools that show what modern S2P looks like in practice. Each one is built to be used, not just read.
              </p>
            </div>
            <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#0f1923", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 22px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", alignSelf: "center", flexShrink: 0 }}>
              Visit Jaggaer.com →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article, onSelect }) {
  const [hovered, setHoveredSA] = useStateSA(false);
  return (
    <div onClick={() => onSelect(article.id)} onMouseEnter={() => setHoveredSA(true)} onMouseLeave={() => setHoveredSA(false)}
      style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", background: hovered ? "#faf8f5" : "#fff", border: "1px solid #e0dbd4", borderRadius: "3px", overflow: "hidden", cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s", boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.06)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: hovered ? "#0f1923" : "#f0ece4", transition: "background 0.15s", padding: "28px 0", borderRight: "1px solid #e0dbd4" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.1rem", color: hovered ? "#c8401a" : "#aaa49a", transition: "color 0.15s", letterSpacing: "0.02em" }}>{article.n}</span>
      </div>
      <div style={{ padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888" }}>{article.category}</span>
          <span style={{ background: article.tagColor + "14", border: `1px solid ${article.tagColor}35`, color: article.tagColor, fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "2px" }}>{article.tag}</span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", color: "#bbb" }}>{article.readTime}</span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#0f1923", marginBottom: "6px", lineHeight: 1.25 }}>{article.title}</h2>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.84rem", color: "#6b6560", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>{article.sub}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", borderLeft: "1px solid #e0dbd4" }}>
        <span style={{ fontSize: "1.1rem", color: hovered ? "#c8401a" : "#ccc", transition: "color 0.15s, transform 0.15s", transform: hovered ? "translateX(3px)" : "none" }}>→</span>
      </div>
    </div>
  );
}

function ArticleShell({ article, onBack, children }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ padding: "12px 40px", background: "#faf8f5", borderBottom: "1px solid #e0dbd4", display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#c8401a", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", gap: "5px", fontWeight: 500 }}>← Sample Artifacts</button>
        <span style={{ color: "#ddd8cf", fontSize: "0.7rem" }}>/</span>
        <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#888", fontWeight: 500 }}>{article.n} — {article.title}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ background: article.tagColor + "14", border: `1px solid ${article.tagColor}35`, color: article.tagColor, fontFamily: "Noto Sans, sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "2px" }}>{article.tag}</span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "#bbb" }}>{article.readTime}</span>
        </div>
      </div>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 40px 80px" }}>{children}</div>
    </div>
  );
}

// ─── ARTICLE 01 — Agent Builder ────────────────────────────────────────────────
// Four demos: Contracts · Suppliers · RFP · Invoice Exceptions
// After each result: JAI vs Claude comparison table (shown, not just asserted)

const DEMO_TABS = [
  { id: "contracts", label: "Contracts" },
  { id: "suppliers", label: "Supplier Risk" },
  { id: "rfp",       label: "RFP Builder" },
  { id: "invoice",   label: "Invoice Exceptions" },
];

const DEMO_SYSTEM_PROMPTS = {
  contracts: `You are an expert procurement contracts analyst. Analyse the clause and return raw JSON only — no markdown, no preamble:
{"expiry_dates":[],"auto_renewal":null,"risky_obligations":[],"concerning_sections":[],"summary":""}`,
  suppliers: `You are a procurement sourcing strategist. Analyse for concentration risk. Return raw JSON only:
{"risk_flags":[],"alternatives":[{"category":"","region":"","rationale":"","example_suppliers":[]}],"diversification_priority":""}`,
  rfp: `You are a senior procurement writer. Generate a professional RFP structure. Return raw JSON only:
{"rfp_title":"","background":"","scope_of_work":[],"evaluation_criteria":[{"criterion":"","weight":"","description":""}],"submission_requirements":[],"key_dates":[{"milestone":"","date":""}],"questions":[]}`,
  invoice: `You are an AP and procurement analyst. Analyse the invoice data and return raw JSON only:
{"exception_count":0,"exceptions":[{"invoice_id":"","vendor":"","issue_type":"","description":"","amount_at_risk":"","action":""}],"clean_count":0,"summary":"","risk_total":""}`,
};

const DEMO_PLACEHOLDERS = {
  contracts: `Paste a contract clause or excerpt here. Example:\n\n"This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal no less than 90 days prior to the end of the then-current term. Licensor reserves the right to adjust pricing at renewal with 60 days' advance notice."`,
  suppliers: `Paste your supplier list here. Example:\n\nSupplier A — Taiwan — Semiconductors\nSupplier B — Taiwan — PCB Manufacturing\nSupplier C — Germany — Precision Machining\nSupplier D — China — Rare Earth Materials\nSupplier E — China — Battery Cells`,
  rfp: `Describe your sourcing requirement here. Example:\n\nWe need to source a fleet management software solution for 200 commercial vehicles across our US and Germany operations. Must integrate with SAP and provide real-time GPS tracking, maintenance scheduling, and driver behaviour analytics.`,
  invoice: `Paste invoice line data here. Example:\n\nINV-2041 | Acme Logistics | $14,200 | PO-889 approved for $12,000 | Facilities\nINV-2042 | TechSupply Co | $8,450 | No PO on file | IT Hardware\nINV-2043 | Office Depot | $320 | PO-901 approved $320 | Office Supplies\nINV-2044 | CloudSoft Inc | $22,000 | Contract expired 30 days ago | Software\nINV-2045 | Acme Logistics | $14,200 | Duplicate of INV-2041 | Facilities`,
};

const MOCK_OUTPUTS = {
  contracts: {
    summary: "Auto-renewing agreement with 90-day exit notice window and unilateral pricing adjustment rights — moderate buyer risk with compounding exposure if renewal is missed.",
    expiry_dates: ["Initial term end: not specified — agreement runs until notice of non-renewal", "Non-renewal notice must be given no less than 90 days before term end", "Pricing adjustment notice: 60 days prior to renewal"],
    auto_renewal: "Agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal at least 90 days before the end of the current term.",
    risky_obligations: ["Licensor may adjust pricing at each renewal with only 60 days' notice — buyer has limited time to renegotiate or exit", "90-day non-renewal window is tight for procurement teams without automated contract tracking", "No cap on pricing adjustment magnitude — unconstrained upward repricing at renewal"],
    concerning_sections: ["Auto-renewal clause: flag for calendar alert 120 days before term end", "Unilateral pricing adjustment: recommend negotiating a maximum annual increase percentage (CPI + X%)"],
  },
  suppliers: {
    diversification_priority: "High — heavy concentration in Taiwan (semiconductors, PCB) and China (rare earth, batteries) creates compounding single-event risk across two critical categories",
    risk_flags: ["Taiwan concentration: Semiconductors + PCB both exposed to same geopolitical and natural disaster risk profile", "China concentration: Rare Earth Materials and Battery Cells subject to export controls and tariff volatility", "No Americas-based source in any critical category"],
    alternatives: [
      { category: "Semiconductors", region: "South Korea / Japan", rationale: "Mature fab capacity outside Taiwan cross-strait risk zone", example_suppliers: ["Samsung Foundry", "Renesas Electronics", "Tower Semiconductor"] },
      { category: "Rare Earth Materials", region: "Australia / Canada", rationale: "Lynas and MP Materials are the two largest non-China producers by volume", example_suppliers: ["Lynas Rare Earths", "MP Materials", "Mkango Resources"] },
      { category: "Battery Cells", region: "South Korea / USA", rationale: "Samsung SDI and Panasonic provide credible non-China alternatives for most cell formats", example_suppliers: ["Samsung SDI", "Panasonic", "SK On"] },
    ],
  },
  rfp: {
    rfp_title: "Request for Proposal: Fleet Management Software — US & Germany Operations",
    background: "We are seeking a fleet management software solution for 200 commercial vehicles across US and Germany operations. The solution must integrate with SAP S/4HANA and provide real-time visibility, predictive maintenance, and driver analytics.",
    scope_of_work: ["Real-time GPS tracking and geofencing for all 200 vehicles across both geographies", "Bi-directional SAP S/4HANA integration for cost centre allocation and PO generation", "Predictive maintenance scheduling based on telematics data", "Driver behaviour analytics including speed, braking, idling, and fatigue indicators", "Regulatory compliance for EU tachograph rules and US FMCSA hours-of-service"],
    evaluation_criteria: [
      { criterion: "Functional fit", weight: "30%", description: "Coverage of all stated requirements; SAP integration depth" },
      { criterion: "Total Cost of Ownership (3yr)", weight: "25%", description: "Implementation, licensing, and ongoing support costs" },
      { criterion: "Data security & residency", weight: "20%", description: "GDPR compliance; SOC 2 Type II; EU data residency options" },
      { criterion: "Implementation approach", weight: "15%", description: "Realism of timeline; change management support; references" },
      { criterion: "Vendor stability", weight: "10%", description: "Financial health; roadmap credibility; customer retention" },
    ],
    submission_requirements: ["Executive summary (max 3 pages)", "SAP integration architecture diagram", "3-year TCO model with assumptions", "Two comparable customer references (fleet >100 vehicles)"],
    key_dates: [{ milestone: "Proposals due", date: "Week 5" }, { milestone: "Shortlist announced", date: "Week 7" }, { milestone: "Demos / site visits", date: "Weeks 8–9" }, { milestone: "Award decision", date: "Week 11" }],
    questions: ["Describe your SAP S/4HANA integration — native connector or middleware? What does the data sync latency look like?", "How does your platform handle multi-jurisdiction compliance within a single instance?", "What is your average time-to-value for a 200-vehicle deployment?"],
  },
  invoice: {
    summary: "5 invoices processed. 3 exceptions identified totalling $36,400 at risk. Immediate action required on duplicate payment and expired contract.",
    exception_count: 3,
    clean_count: 2,
    risk_total: "$36,400",
    exceptions: [
      { invoice_id: "INV-2041/2045", vendor: "Acme Logistics", issue_type: "Duplicate", description: "INV-2045 appears to be a duplicate of INV-2041 — same vendor, amount, and cost centre.", amount_at_risk: "$14,200", action: "Hold INV-2045. Request vendor confirmation before processing." },
      { invoice_id: "INV-2042", vendor: "TechSupply Co", issue_type: "No PO", description: "Invoice submitted with no purchase order on file — maverick spend outside approved channels.", amount_at_risk: "$8,450", action: "Escalate to budget holder for retroactive PO or rejection." },
      { invoice_id: "INV-2044", vendor: "CloudSoft Inc", issue_type: "Expired Contract", description: "Software contract expired 30 days ago. Invoice received for services rendered under expired terms.", amount_at_risk: "$13,750", action: "Do not pay until contract status is resolved. Engage vendor for renewal or termination." },
    ],
  },
};

const JAI_CONTRAST = {
  contracts: [
    ["Scope", "One clause at a time, on demand", "Entire portfolio — continuous, automatic"],
    ["Trigger", "Someone thinks to check", "System alerts before renewal windows close"],
    ["Pricing cap tracking", "Manually noted in analysis", "Tracked against indexed benchmarks across all contracts"],
    ["Volume", "Minutes per clause", "Thousands of contracts processed simultaneously"],
    ["Integration", "Standalone output", "Flags surfaced inside your procurement workflow"],
  ],
  suppliers: [
    ["Coverage", "Suppliers you paste manually", "Full approved supplier list, updated continuously"],
    ["Risk signals", "Geographic concentration (visible)", "Financial health, ESG violations, news events, sanctions"],
    ["Frequency", "When you run it", "Real-time monitoring — alerts when risk profile changes"],
    ["Sub-tier", "Not covered", "Tier 2 and Tier 3 supplier mapping and monitoring"],
    ["Action", "Suggestions to act on manually", "Workflow triggers that kick off alternative sourcing"],
  ],
  rfp: [
    ["Input", "Free-text brief you provide", "Your category data, past contracts, approved vendor list"],
    ["Evaluation weights", "Generic defaults", "Tuned to your organisation's category and risk priorities"],
    ["Templates", "Generated from scratch each time", "Institutional library of approved templates by category"],
    ["Compliance", "Not checked", "Regulatory and policy compliance built into the structure"],
    ["Cycle time", "First draft in minutes", "Full sourcing event launched and managed end-to-end"],
  ],
  invoice: [
    ["Coverage", "Invoices you paste manually", "100% of AP inbound — no sampling, no batch delay"],
    ["Rule types", "Patterns the AI notices", "150+ configurable exception rules with org-specific thresholds"],
    ["Integration", "Standalone output", "Exceptions surfaced directly in your ERP workflow"],
    ["Learning", "Static analysis", "Exception patterns improve with your organisation's data over time"],
    ["Escalation", "Manual follow-up", "Auto-escalation routing based on exception type and value"],
  ],
};

function ContractOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.summary && <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a" }}><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>Summary: </span><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444" }}>{data.summary}</span></div>}
      {data.expiry_dates?.length > 0 && <OutputSection label="Expiry & Renewal Dates" items={data.expiry_dates} color="#3b6b88" />}
      {data.auto_renewal && <OutputSection label="Auto-Renewal Terms" items={[data.auto_renewal]} color="#c08227" />}
      {data.risky_obligations?.length > 0 && <OutputSection label="Risky Obligations" items={data.risky_obligations} color="#c8401a" />}
      {data.concerning_sections?.length > 0 && <OutputSection label="Recommended Actions" items={data.concerning_sections} color="#6b5b8e" />}
    </div>
  );
}

function SupplierOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.diversification_priority && <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a" }}><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>Priority: </span><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444" }}>{data.diversification_priority}</span></div>}
      {data.risk_flags?.length > 0 && <OutputSection label="Risk Flags" items={data.risk_flags} color="#c8401a" />}
      {data.alternatives?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>Alternative Supplier Recommendations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.alternatives.map((alt, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "3px", padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "#0f1923" }}>{alt.category}</span>
                  <span style={{ background: "#f0e6e1", color: "#c8401a", fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "2px" }}>{alt.region}</span>
                </div>
                <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#555", margin: "0 0 8px" }}>{alt.rationale}</p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {alt.example_suppliers?.map((s, j) => <span key={j} style={{ background: "#f5f2ec", border: "1px solid #e0dbd4", color: "#555", fontSize: "0.72rem", fontFamily: "Noto Sans, sans-serif", padding: "3px 9px", borderRadius: "2px" }}>{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RFPOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.rfp_title && <div style={{ padding: "14px 18px", background: "#0f1923", borderRadius: "3px" }}><span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>{data.rfp_title}</span></div>}
      {data.background && <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#444", lineHeight: 1.7 }}>{data.background}</div>}
      {data.scope_of_work?.length > 0 && <OutputSection label="Scope of Work" items={data.scope_of_work} color="#3b6b88" />}
      {data.evaluation_criteria?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>Evaluation Criteria</div>
          {data.evaluation_criteria.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "8px", alignItems: "flex-start", padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "3px" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#c8401a", fontSize: "1rem", minWidth: "42px", flexShrink: 0 }}>{c.weight}</span>
              <div><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>{c.criterion}</span><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#666" }}> — {c.description}</span></div>
            </div>
          ))}
        </div>
      )}
      {data.submission_requirements?.length > 0 && <OutputSection label="Submission Requirements" items={data.submission_requirements} color="#4f7a5b" />}
      {data.key_dates?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>Key Dates</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {data.key_dates.map((d, i) => <div key={i} style={{ padding: "8px 14px", background: "#f5f2ec", border: "1px solid #e0dbd4", borderRadius: "3px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem" }}><strong style={{ color: "#0f1923" }}>{d.date}</strong> — {d.milestone}</div>)}
          </div>
        </div>
      )}
      {data.questions?.length > 0 && <OutputSection label="Supplier Questions" items={data.questions} color="#6b5b8e" />}
    </div>
  );
}

function InvoiceOutput({ data }) {
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const TYPE_COLORS = { "Duplicate": "#b91c1c", "No PO": "#92400e", "Expired Contract": "#6b5b8e", "Over-billed": "#1e4fa8" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#e0dbd4", borderRadius: "3px", overflow: "hidden" }}>
        {[
          ["Invoices Reviewed", data.exception_count + data.clean_count],
          ["Exceptions Found", data.exception_count, "#b91c1c"],
          ["Passed Clean", data.clean_count, "#1e7a45"],
          ["$ At Risk", data.risk_total, "#c8401a"],
        ].map(([label, val, color], i) => (
          <div key={i} style={{ padding: "16px 18px", background: "#fff" }}>
            <div style={{ ...FONT, fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", fontWeight: 900, color: color || "#0f1923", lineHeight: 1 }}>{val}</div>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>
      {data.summary && <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a" }}><span style={{ ...FONT, fontSize: "0.85rem", color: "#444" }}>{data.summary}</span></div>}
      {data.exceptions?.length > 0 && (
        <div>
          <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b91c1c", marginBottom: "10px" }}>Exceptions Requiring Action</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.exceptions.map((ex, i) => {
              const col = TYPE_COLORS[ex.issue_type] || "#c8401a";
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd4", borderLeft: `3px solid ${col}`, borderRadius: "0 3px 3px 0", padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ ...FONT, fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace", color: "#888" }}>{ex.invoice_id}</span>
                    <span style={{ ...FONT, fontSize: "0.82rem", fontWeight: 700, color: "#0f1923" }}>{ex.vendor}</span>
                    <span style={{ background: col + "18", border: `1px solid ${col}40`, color: col, ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "2px" }}>{ex.issue_type}</span>
                    <span style={{ ...FONT, fontSize: "0.82rem", fontWeight: 700, color: col, marginLeft: "auto" }}>{ex.amount_at_risk}</span>
                  </div>
                  <p style={{ ...FONT, fontSize: "0.82rem", color: "#555", lineHeight: 1.6, margin: "0 0 8px" }}>{ex.description}</p>
                  <div style={{ padding: "8px 12px", background: "#faf8f5", borderRadius: "2px" }}>
                    <span style={{ ...FONT, fontSize: "0.75rem", fontWeight: 600, color: "#0f1923" }}>Action: </span>
                    <span style={{ ...FONT, fontSize: "0.75rem", color: "#555" }}>{ex.action}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DemoPane({ demoId }) {
  const [input, setInput] = useStateSA("");
  const [loading, setLoading] = useStateSA(false);
  const [result, setResult] = useStateSA(null);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function runDemo() {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: DEMO_SYSTEM_PROMPTS[demoId],
          messages: [{ role: "user", content: input }],
        }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const raw = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch {
      await new Promise(r => setTimeout(r, 1400));
      setResult(MOCK_OUTPUTS[demoId]);
    }
    setLoading(false);
  }

  const labels = { contracts: "contract text", suppliers: "supplier list", rfp: "sourcing requirement", invoice: "invoice data" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c08227" }} />
        <span style={{ ...FONT, fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>Live AI analysis — paste your own data or use the placeholder text as-is.</span>
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={DEMO_PLACEHOLDERS[demoId]} rows={8}
        style={{ width: "100%", background: "#faf8f5", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, marginBottom: "12px", outline: "none", boxSizing: "border-box" }} />
      <button onClick={runDemo} disabled={loading || !input.trim()}
        style={{ background: input.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "11px 28px", ...FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: input.trim() && !loading ? "pointer" : "not-allowed", marginBottom: "24px", transition: "background 0.2s" }}>
        {loading ? "Analysing…" : `Analyse ${labels[demoId]}`}
      </button>
      {result && (
        <div>
          <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "16px" }}>Analysis Output</div>
          {demoId === "contracts" && <ContractOutput data={result} />}
          {demoId === "suppliers" && <SupplierOutput data={result} />}
          {demoId === "rfp" && <RFPOutput data={result} />}
          {demoId === "invoice" && <InvoiceOutput data={result} />}
          <JAIvsClaudePanel rows={JAI_CONTRAST[demoId]} />
        </div>
      )}
    </div>
  );
}

function AgentBuilderArticle() {
  const [activeDemo, setActiveDemo] = useStateSA("contracts");
  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Interactive · Agent Builder</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>Four S2P Problems. Live AI. Real Output.</h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px" }}>
          Paste your own contract clause, supplier list, sourcing brief, or invoice data — and get structured intelligence back in seconds. Each demo shows what Claude can do on a single input, and what JAI does with the same capability connected to your full procurement stack.
        </p>
      </div>
      <div style={{ marginBottom: "24px" }}>
        <SAEyebrow>Select a use case</SAEyebrow>
        <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", marginBottom: "24px" }}>
          {DEMO_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveDemo(tab.id)}
              style={{ background: "transparent", border: "none", borderBottom: activeDemo === tab.id ? "2px solid #c8401a" : "2px solid transparent", padding: "12px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: activeDemo === tab.id ? 600 : 400, color: activeDemo === tab.id ? "#0f1923" : "#6b6560", cursor: "pointer", marginBottom: "-1px", transition: "color 0.15s", letterSpacing: "0.03em" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "28px" }}>
          <DemoPane key={activeDemo} demoId={activeDemo} />
        </div>
      </div>
      <LegalBlock />
    </div>
  );
}

// ─── ARTICLE 02 — Prompting 101 ────────────────────────────────────────────────
// Interactive prompt builder + 6 templates + failure modes + JAI contrast

const PROMPT_PRINCIPLES = [
  { n: "01", title: "Set the role", body: "Claude performs better when it knows what kind of expert it's acting as. \"You are a procurement contracts analyst\" produces tighter, more specialised output than starting cold. The role sets the interpretive frame — everything that follows inherits it.", example: { bad: "Review this contract", good: "You are a procurement contracts analyst. Review this clause and list every obligation that creates financial exposure for the buyer, in order of severity." } },
  { n: "02", title: "Be specific about the task", body: "Vague asks return vague answers. The difference between a useful output and a generic one is almost always in how precisely the task is defined. Name the decision you're trying to make, the question you need answered, the risk you want assessed — not the category.", example: { bad: "Tell me about supplier risk", good: "For each country in this supplier list where we have more than one critical supplier, flag the concentration risk and estimate the production impact if that geography became unavailable for 30 days." } },
  { n: "03", title: "Specify the output format", body: "Without a format instruction, Claude chooses its own structure — which is often longer than you need and harder to act on. Tell it how to respond: numbered list, table, JSON, bullet points, one paragraph. This single change makes outputs significantly more usable downstream.", example: { bad: "Summarise this contract", good: "Summarise this contract. Return: (1) a one-sentence overall risk assessment, (2) three key obligations for the buyer, (3) any clauses that should be reviewed by legal. Use bullet points. Maximum 150 words." } },
  { n: "04", title: "Add context, not just content", body: "The more Claude understands about your situation, the more useful its answer. Don't just paste the document — tell Claude why you're asking. Your role, your organisation's context, the decision that depends on this answer. Context shapes interpretation in ways that dramatically affect output quality.", example: { bad: "Is this supplier risky?", good: "I'm a procurement manager at a mid-size manufacturer with 60% of critical components sourced from Southeast Asia. Review this supplier profile and tell me whether this is an acceptable addition or a risk concentration issue. We cannot tolerate more than 40% single-country exposure in any category." } },
];

const PROMPT_TEMPLATES = [
  { label: "Contract Review", tag: "Contracts", tagColor: "#3b6b88", prompt: `You are a procurement contracts analyst. Review the clause below and identify:\n1. Any auto-renewal terms and the exact notice window required to exit\n2. Obligations that create financial exposure for the buyer\n3. Pricing rights — can the vendor increase unilaterally? Is there a cap?\n4. Any clauses that should be reviewed by legal before signing\n\nReturn findings as numbered lists under each heading. Quote the relevant language where it matters.\n\n[Paste clause here]`, note: "The structure — role, numbered task, quote instruction — is what gets you precise results instead of a generic paragraph." },
  { label: "Supplier Risk Scan", tag: "Supplier Risk", tagColor: "#b91c1c", prompt: `I'm a procurement manager at a discrete manufacturer. Here is our supplier list by category and country:\n\n[Paste supplier list]\n\nFor each category where we have geographic concentration risk (>50% from one country), flag it and:\n1. Name the specific disruption scenario\n2. Estimate production impact window if that geography is unavailable for 60 days\n3. Suggest two alternative supplier geographies with example vendors\n\nReturn as a table. Prioritise rows by production impact.`, note: "Giving Claude a clear threshold (>50%), a specific disruption scenario, and a table format makes this immediately actionable." },
  { label: "RFP First Draft", tag: "Sourcing", tagColor: "#6b5b8e", prompt: `You are a senior procurement manager drafting an RFP for the following sourcing requirement:\n\n[Describe what you're buying, volume, key integrations, and compliance requirements]\n\nWrite:\n1. A scope of work section (bullet points, no jargon)\n2. An evaluation criteria table with percentage weightings that total 100%\n3. Five specific questions for suppliers to address\n\nFormat with clear section headers. Language should be formal but plain — avoid procurement jargon that suppliers outside the industry won't understand.`, note: "Specifying what to include, the weighting constraint, and the tone gets you something close to publishable on the first pass." },
  { label: "Spend Analysis Briefing", tag: "Spend Intelligence", tagColor: "#9a5d1a", prompt: `You are a procurement analyst. I'm going to paste a summary of our indirect spend data for last quarter.\n\nAnalyse it and return:\n1. The top 3 categories with the highest maverick spend risk (and why)\n2. Any category where supplier consolidation is feasible based on spend distribution\n3. One specific category I should prioritise for a Q4 spend review — with your reasoning\n\nFormat: numbered lists. Each finding should be one clear statement plus one sentence of evidence.\n\n[Paste spend data here]`, note: "Framing as prioritisation rather than full analysis keeps the output focused and decision-ready." },
  { label: "Invoice Exception Check", tag: "AP / Finance", tagColor: "#1e4fa8", prompt: `You are an AP analyst reviewing invoice exceptions. Here is a batch of invoices:\n\n[Paste invoice data — vendor, amount, PO reference, cost centre]\n\nFor each invoice, flag if it has any of these issues:\n- Amount exceeds approved PO by more than 5%\n- No PO reference on file\n- Duplicate of a previous invoice\n- Contract or PO has expired\n\nReturn a table with columns: Invoice ID | Vendor | Issue Type | Amount at Risk | Recommended Action.\nFor clean invoices, list them separately at the bottom.`, note: "Defining the exact exception rules and the output table structure turns this into a reusable AP checklist." },
  { label: "Negotiation Brief", tag: "Contracts", tagColor: "#4f7a5b", prompt: `You are a procurement negotiation advisor. Here is the context for an upcoming vendor renewal:\n\n[Paste: vendor name, contract value, term length, current performance, our leverage, competitive alternatives]\n\nPrepare a concise negotiation brief:\n1. Our position — strengths and weaknesses\n2. Three specific asks to lead with (in priority order)\n3. Our BATNA — what we do if negotiations fail\n4. One concession we can offer that costs us little but signals goodwill\n\nKeep it under 400 words. This is for internal use before the call.`, note: "Explicit word limit and internal framing signals Claude to be direct, not comprehensive." },
];

const PROMPT_BUILDER_BLOCKS = {
  role: ["procurement contracts analyst", "supply chain risk specialist", "senior procurement manager", "AP exception reviewer", "sourcing strategist"],
  task: ["identify all auto-renewal and exit terms", "flag geographic concentration risks by category", "draft a scope of work and evaluation criteria", "classify invoice exceptions and recommend actions", "prepare a negotiation brief"],
  context: ["I am a procurement manager at a discrete manufacturer", "I lead sourcing for a pharma company with strict compliance requirements", "I manage indirect spend for a higher education institution", "I'm a CPO at a public sector organisation"],
  format: ["Return as a numbered list", "Return as a table", "Return as JSON", "Return as bullet points under section headers", "Return in under 200 words"],
};

function Prompting101Article() {
  const [activeTemplate, setActiveTemplate] = useStateSA(0);
  const [copied, setCopied] = useStateSA(false);
  const [activePrinciple, setActivePrinciple] = useStateSA(null);
  const [builderSelections, setBuilderSelections] = useStateSA({ role: "", task: "", context: "", format: "" });
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  function handleCopy() {
    navigator.clipboard?.writeText(PROMPT_TEMPLATES[activeTemplate].prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const assembled = [
    builderSelections.role && `You are a ${builderSelections.role}.`,
    builderSelections.context && `Context: ${builderSelections.context}.`,
    builderSelections.task && `Task: ${builderSelections.task}.`,
    builderSelections.format && `${builderSelections.format}.`,
  ].filter(Boolean).join(" ");

  const blocksComplete = Object.values(builderSelections).filter(Boolean).length;

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Guide · Prompting 101</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>How to Write Prompts<br />That Actually Work</h1>
        <p style={{ ...FONT, fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px", marginBottom: "20px" }}>The four principles, an interactive prompt builder, six ready-to-use S2P templates, and the failure modes that produce bad output. Apply these once and they work across every procurement use case.</p>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[["4 principles", "#c8401a"], ["Interactive builder", "#3b6b88"], ["6 templates", "#4f7a5b"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ ...FONT, fontSize: "0.82rem", color: "#555" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1 — Four principles */}
      <div style={{ marginBottom: "56px" }}>
        <SAEyebrow>The Framework</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px" }}>Four Principles. One Formula.</h2>
        <p style={{ ...FONT, fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "560px", marginBottom: "28px" }}>Every effective procurement prompt applies some combination of these four moves. Learn them once — they work across contracts, suppliers, RFPs, spend data.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {PROMPT_PRINCIPLES.map((p, i) => (
            <div key={p.n} style={{ border: "1px solid #e0dbd4", borderRadius: "3px", overflow: "hidden", background: activePrinciple === i ? "#fff" : "#faf8f5" }}>
              <button onClick={() => setActivePrinciple(activePrinciple === i ? null : i)}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 22px", display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "center", gap: "16px", cursor: "pointer" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.5rem", color: "#c8401a", lineHeight: 1 }}>{p.n}</span>
                <span style={{ ...FONT, fontSize: "0.92rem", fontWeight: 600, color: "#0f1923" }}>{p.title}</span>
                <span style={{ color: "#c8401a", fontSize: "1rem", transform: activePrinciple === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
              </button>
              {activePrinciple === i && (
                <div style={{ padding: "0 22px 22px" }}>
                  <p style={{ ...FONT, fontSize: "0.88rem", color: "#444", lineHeight: 1.75, marginBottom: "20px" }}>{p.body}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b91c1c", marginBottom: "8px" }}>Weak</div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#7f1d1d", lineHeight: 1.6, margin: 0 }}>{p.example.bad}</p>
                    </div>
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#166534", marginBottom: "8px" }}>Strong</div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#14532d", lineHeight: 1.6, margin: 0 }}>{p.example.good}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — Interactive prompt builder */}
      <div style={{ marginBottom: "56px" }}>
        <SAEyebrow>Interactive Builder</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px" }}>Build a Prompt in Real Time</h2>
        <p style={{ ...FONT, fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "560px", marginBottom: "28px" }}>Click one option per block. Watch the assembled prompt update as you go. When you're done, copy it and run it in Claude.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {Object.entries(PROMPT_BUILDER_BLOCKS).map(([block, options]) => (
            <div key={block} style={{ border: "1px solid #e0dbd4", borderRadius: "4px", padding: "16px 18px", background: "#fff" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "10px" }}>
                {block === "role" ? "Role" : block === "task" ? "Task" : block === "context" ? "Context" : "Output Format"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {options.map(opt => (
                  <button key={opt} onClick={() => setBuilderSelections(s => ({ ...s, [block]: s[block] === opt ? "" : opt }))}
                    style={{ ...FONT, textAlign: "left", padding: "7px 12px", fontSize: "0.78rem", background: builderSelections[block] === opt ? "#0f1923" : "#faf8f5", border: `1px solid ${builderSelections[block] === opt ? "#0f1923" : "#e0dbd4"}`, borderRadius: "2px", cursor: "pointer", color: builderSelections[block] === opt ? "#fff" : "#444", transition: "all 0.12s" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0f1923", borderRadius: "4px", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,64,26,0.9)" }}>
              Assembled Prompt — {blocksComplete}/4 blocks
            </div>
            {assembled && (
              <button onClick={() => { navigator.clipboard?.writeText(assembled); }}
                style={{ ...FONT, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>
                Copy
              </button>
            )}
          </div>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", color: assembled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
            {assembled || "Select options above to build your prompt…"}
          </pre>
          {assembled && (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)", ...FONT, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
              JAI builds prompts like this automatically from your procurement data — no manual selection required. Every query is pre-structured with the right role, context, and format for your specific situation.
            </div>
          )}
        </div>
      </div>

      <JAINudge text="JAI applies all four of these principles automatically — every query is pre-structured with the right role, context, and format for your procurement data. No prompt engineering required." />

      {/* Section 3 — Template library */}
      <div style={{ marginBottom: "56px", marginTop: "56px" }}>
        <SAEyebrow>Prompt Library</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px" }}>Six Ready-to-Use S2P Templates</h2>
        <p style={{ ...FONT, fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "540px", marginBottom: "28px" }}>Copy any of these, replace the bracketed placeholders with your content, and run it. Each prompt is annotated with why it's structured the way it is.</p>

        <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", background: "#faf8f5", overflowX: "auto" }}>
            {PROMPT_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => setActiveTemplate(i)}
                style={{ background: "transparent", border: "none", borderBottom: activeTemplate === i ? "2px solid #c8401a" : "2px solid transparent", padding: "12px 18px", ...FONT, fontSize: "0.78rem", fontWeight: activeTemplate === i ? 600 : 400, color: activeTemplate === i ? "#0f1923" : "#6b6560", cursor: "pointer", marginBottom: "-1px", whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ background: PROMPT_TEMPLATES[activeTemplate].tagColor + "18", color: PROMPT_TEMPLATES[activeTemplate].tagColor, ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "2px", border: `1px solid ${PROMPT_TEMPLATES[activeTemplate].tagColor}40` }}>{PROMPT_TEMPLATES[activeTemplate].tag}</span>
              <button onClick={handleCopy} style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: "2px", padding: "6px 14px", ...FONT, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", color: copied ? "#4f7a5b" : "#6b6560", cursor: "pointer" }}>{copied ? "✓ Copied" : "Copy prompt"}</button>
            </div>
            <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", background: "#faf8f5", border: "1px solid #e8e3da", borderRadius: "3px", padding: "18px", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: "0 0 16px" }}>{PROMPT_TEMPLATES[activeTemplate].prompt}</pre>
            <div style={{ padding: "12px 16px", background: "#f5f2ec", borderLeft: "3px solid #c08227" }}>
              <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#0f1923" }}>Why it works: </span>
              <span style={{ ...FONT, fontSize: "0.78rem", color: "#555" }}>{PROMPT_TEMPLATES[activeTemplate].note}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — Common mistakes */}
      <div style={{ marginBottom: "48px" }}>
        <SAEyebrow>Failure Modes</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px" }}>Four Mistakes That Kill Output Quality</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            ["Starting with no context", "Always open with role + situation. Two sentences of context changes the quality of everything that follows."],
            ["Asking for 'a summary' without saying what kind", "Decide what you need: executive summary, risk summary, one-sentence verdict, structured list. Name it."],
            ["Pasting a document with no question", "Claude needs a question, not just content. 'Here's the contract' plus the document returns less than 'Here's the contract — what are the renewal terms?'"],
            ["Accepting the first output without refining", "The first response is a draft. 'Make this more concise', 'focus only on financial risk', 'reformat as a table' — iterating takes 10 seconds and transforms the output."],
          ].map(([mistake, fix], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "20px", padding: "20px 24px", background: i % 2 === 0 ? "#fff" : "#faf8f5", border: "1px solid #e0dbd4", borderTop: i === 0 ? "1px solid #e0dbd4" : "none" }}>
              <div style={{ paddingTop: "2px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, color: "#b91c1c" }}>✕</span>
                </div>
              </div>
              <div>
                <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 600, color: "#b91c1c", marginBottom: "6px" }}>{mistake}</div>
                <div style={{ ...FONT, fontSize: "0.85rem", color: "#444", lineHeight: 1.6 }}><span style={{ fontWeight: 600, color: "#4f7a5b" }}>Fix: </span>{fix}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cheat sheet */}
      <div style={{ marginBottom: "48px", padding: "28px 32px", background: "#0f1923", borderRadius: "4px" }}>
        <SAEyebrow light>Quick Reference</SAEyebrow>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: "20px" }}>The Prompt Checklist</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[["Role", "Who is Claude acting as?"], ["Task", "What specifically needs doing?"], ["Context", "Why does this matter / what's the situation?"], ["Format", "How should the output be structured?"]].map(([label, desc]) => (
            <div key={label} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "3px" }}>
              <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "5px" }}>{label}</div>
              <div style={{ ...FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <p style={{ ...FONT, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "420px", lineHeight: 1.55 }}>JAI builds all four into every query automatically — your procurement data, the right framing, the right format. No checklist needed.</p>
          <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#c8401a", color: "#fff", ...FONT, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 18px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap" }}>Explore JAI →</a>
        </div>
      </div>
      <LegalBlock />
    </div>
  );
}

// ─── ARTICLE 03 — Supply Chain Risk Profiler ──────────────────────────────────
// 4 questions → full risk briefing with capability gap matrix and peer benchmarks

const PROFILER_QUESTIONS = [
  { id: "industry", q: "What best describes your industry?", options: [{ value: "auto", label: "Automotive / OEM" }, { value: "indmfg", label: "Industrial Manufacturing" }, { value: "pharma", label: "Pharma / Life Sciences" }, { value: "public", label: "Public Sector / Government" }, { value: "highered", label: "Higher Education" }] },
  { id: "pain", q: "Where is your biggest procurement pressure right now?", options: [{ value: "risk", label: "Supplier risk & disruption" }, { value: "cost", label: "Cost control & maverick spend" }, { value: "compliance", label: "Compliance & audit trail" }, { value: "speed", label: "Sourcing cycle time" }] },
  { id: "maturity", q: "How would you describe your current procurement technology?", options: [{ value: "spreadsheets", label: "Mostly spreadsheets / manual" }, { value: "erp", label: "ERP with basic procurement module" }, { value: "platform", label: "Dedicated procurement platform" }, { value: "advanced", label: "Platform + some AI / automation" }] },
  { id: "org_size", q: "How large is your procurement team?", options: [{ value: "solo", label: "Just me / 1–3 people" }, { value: "small", label: "4–10 people" }, { value: "mid", label: "11–30 people" }, { value: "large", label: "30+ people" }] },
];

const PROFILER_CONTENT = {
  headline: { auto: "Automotive procurement is navigating its hardest decade. Tariffs, EV transition costs, and sub-tier opacity are compounding simultaneously.", indmfg: "Industrial manufacturers are running procurement systems built for a stable world into a volatile one. The gap is showing in disruption frequency.", pharma: "Pharmaceutical procurement carries compliance obligations that most platforms weren't designed to handle — and regulators are paying attention to the documentation trail.", public: "Public sector procurement is under dual pressure: tighter audit requirements and a mandate to demonstrate AI governance before competitors do.", highered: "University procurement is the last sector where maverick spend is still treated as a culture problem rather than a systems problem." },
  pain: {
    risk: { label: "Supplier Risk", color: "#b91c1c", insight: "Most organisations discover supplier problems after they've reached operations. The gap between 'qualified' and 'currently safe' is where disruption lives — and it's unmapped in most ERP stacks.", action: "Sub-tier mapping and continuous financial health monitoring close this gap. The question is whether you find problems in the data or in a production stoppage.", stat: "93% of executives report high confidence in supplier oversight — yet identify Tier 2/3 as their primary blind spot." },
    cost: { label: "Cost Control", color: "#92400e", insight: "Maverick spend averages 20–30% of indirect spend in organisations without catalogue enforcement. It's not a behaviour problem — it's a visibility problem. You can't govern what you can't see.", action: "Spend analytics connected to real-time purchasing data makes off-contract spend visible before month-end, not after. That's the difference between prevention and reporting.", stat: "Organisations with real-time spend visibility reduce maverick spend by 35–50% within the first 12 months." },
    compliance: { label: "Compliance", color: "#1e4fa8", insight: "Audit trails built from manual processes have gaps. When regulators or internal audit request documentation, the scramble to reconstruct decisions is where procurement leaders lose credibility.", action: "AI-assisted documentation captures decision rationale at the point of decision — not reconstructed later. The audit trail builds itself.", stat: "Only 38% of procurement organisations can produce a complete audit trail for a sourcing decision within 24 hours." },
    speed: { label: "Cycle Time", color: "#4f7a5b", insight: "The average RFQ cycle runs 6–12 weeks. Most of that time is coordination, not decision-making. The work that takes days should take hours; the work that takes hours should be automatic.", action: "Guided sourcing and automated bid evaluation compress the cycle by 50–70% in categories where the criteria are consistent.", stat: "AI-guided sourcing reduces sourcing event cycle times by 50–70% — running in production at leading manufacturers today." },
  },
  maturity: {
    spreadsheets: "The first step isn't replacing spreadsheets — it's making the spend visible. A platform that aggregates purchasing data across your organisation gives you the baseline everything else depends on. Without it, every AI capability is working blind.",
    erp: "ERP modules were built to record transactions, not to surface intelligence. The capability gap — risk signals, market data, supplier performance — is structural, not a configuration problem. Dedicated procurement platforms fill exactly this gap.",
    platform: "The platform is the foundation. The next question is whether it's producing intelligence or just automating existing manual processes. AI layer on top of clean procurement data is where the compounding returns come from — and it's available now.",
    advanced: "You're ahead of most. The question shifts from 'whether AI' to 'which AI capabilities deliver the highest ROI' and where you're still running manual processes that should be automated. The gap is likely in cross-platform data flows.",
  },
  org_size: {
    solo: "Small procurement teams get the highest per-person ROI from AI — every manual task automated is a meaningful share of total capacity freed up.",
    small: "A team of 4–10 can realistically pilot AI in one category before scaling. The risk is that early wins aren't connected to a platform — generating effort twice.",
    mid: "At 11–30 people, the coordination overhead of manual processes starts to compound. AI-assisted sourcing and exception management pays back faster at this scale.",
    large: "Large procurement teams face the opposite problem: fragmented tools, inconsistent process, and data scattered across systems. Platform consolidation comes before AI leverage.",
  },
};

// Platform capability gap matrix — tailored to maturity level
const CAPABILITY_GAPS = {
  spreadsheets: [
    ["Spend visibility", "Manual aggregation, lagging", "Real-time across all cost centres"],
    ["Supplier risk monitoring", "Periodic manual review", "Continuous, automated signals"],
    ["Contract management", "Shared folder / email", "Expiry alerts, obligation tracking"],
    ["RFQ / sourcing", "Email-based, manual scoring", "Guided events with AI scoring"],
    ["Invoice exceptions", "Sampled AP check", "100% automated exception detection"],
  ],
  erp: [
    ["Spend visibility", "Transaction data, no classification", "Category intelligence and trend analysis"],
    ["Supplier risk monitoring", "Not in ERP scope", "Financial health, ESG, geopolitical signals"],
    ["Contract management", "Date fields only", "Full lifecycle with obligation extraction"],
    ["RFQ / sourcing", "Basic PO workflow", "Competitive sourcing events at scale"],
    ["AI / intelligence layer", "None", "Embedded across all procurement workflows"],
  ],
  platform: [
    ["AI-generated insights", "Manual query-based", "Proactive, surfaced automatically"],
    ["Sub-tier supplier visibility", "Tier 1 only", "Tier 2 and Tier 3 mapping"],
    ["Market intelligence", "External research", "Real-time market pricing signals"],
    ["Cross-category spend optimisation", "Category-by-category", "Portfolio-level opportunity identification"],
    ["Predictive risk alerts", "Reactive notifications", "Pre-emptive risk scoring and escalation"],
  ],
  advanced: [
    ["Data integration depth", "Point-to-point connections", "Unified procurement data fabric"],
    ["Autonomous sourcing", "AI-assisted decisions", "AI-led events with human approval gates"],
    ["Supplier relationship intelligence", "Transactional performance data", "360° relationship health scoring"],
    ["Regulatory compliance automation", "Manual policy checks", "Auto-flagging against live regulatory feeds"],
    ["Procurement ROI attribution", "Reported quarterly", "Real-time savings and risk avoidance tracking"],
  ],
};

function SupplyChainProfilerArticle() {
  const [answers, setAnswers] = useStateSA({});
  const [step, setStep] = useStateSA(0);
  const [done, setDone] = useStateSA(false);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  function pick(qid, val) {
    const next = { ...answers, [qid]: val };
    setAnswers(next);
    if (step < PROFILER_QUESTIONS.length - 1) setTimeout(() => setStep(s => s + 1), 280);
    else setTimeout(() => setDone(true), 380);
  }

  function reset() { setAnswers({}); setStep(0); setDone(false); }

  if (done && answers.industry) {
    const pain = PROFILER_CONTENT.pain[answers.pain];
    const maturityText = PROFILER_CONTENT.maturity[answers.maturity];
    const orgText = PROFILER_CONTENT.org_size[answers.org_size];
    const headline = PROFILER_CONTENT.headline[answers.industry];
    const gapRows = CAPABILITY_GAPS[answers.maturity] || CAPABILITY_GAPS.erp;

    const labelMap = { auto:"Automotive", indmfg:"Industrial Mfg", pharma:"Pharma", public:"Public Sector", highered:"Higher Ed", risk:"Supplier Risk", cost:"Cost Control", compliance:"Compliance", speed:"Cycle Time", spreadsheets:"Spreadsheets", erp:"ERP Module", platform:"Dedicated Platform", advanced:"Platform + AI", solo:"1–3 people", small:"4–10 people", mid:"11–30 people", large:"30+ people" };

    return (
      <div>
        <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Personalisation · Supply Chain Risk Profile</SAEyebrow>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.15, marginBottom: "16px" }}>Your Risk Profile</h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {["industry","pain","maturity","org_size"].map(k => <span key={k} style={{ ...FONT, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "#f0ece4", color: "#6b6560", padding: "3px 10px", borderRadius: "2px" }}>{labelMap[answers[k]]}</span>)}
            <button onClick={reset} style={{ ...FONT, background: "transparent", border: "none", fontSize: "0.68rem", color: "#c8401a", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, padding: "3px 0 3px 8px" }}>Start over ↺</button>
          </div>
        </div>

        {/* Sector context */}
        <div style={{ marginBottom: "24px", padding: "24px 28px", background: "#0f1923", borderRadius: "4px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,64,26,0.9)", marginBottom: "12px" }}>Sector Context</div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontStyle: "italic", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, margin: 0 }}>{headline}</p>
        </div>

        {/* Primary pressure */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "3px", height: "32px", background: pain.color, flexShrink: 0, borderRadius: "2px" }} />
            <div>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "2px" }}>Your Primary Pressure</div>
              <div style={{ ...FONT, fontSize: "1rem", fontWeight: 700, color: pain.color }}>{pain.label}</div>
            </div>
          </div>
          {/* Peer stat */}
          <div style={{ padding: "12px 16px", background: pain.color + "0d", border: `1px solid ${pain.color}25`, borderRadius: "3px", marginBottom: "12px" }}>
            <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 600, color: pain.color }}>Industry data: </span>
            <span style={{ ...FONT, fontSize: "0.78rem", color: "#555" }}>{pain.stat}</span>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderLeft: `3px solid ${pain.color}`, borderRadius: "0 4px 4px 0", padding: "20px 24px", marginBottom: "12px" }}>
            <p style={{ ...FONT, fontSize: "0.9rem", color: "#333", lineHeight: 1.75, margin: 0 }}>{pain.insight}</p>
          </div>
          <div style={{ background: "#f5f2ec", padding: "16px 20px", borderRadius: "3px" }}>
            <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 700, color: "#0f1923" }}>What closes it: </span>
            <span style={{ ...FONT, fontSize: "0.78rem", color: "#555", lineHeight: 1.65 }}>{pain.action}</span>
          </div>
        </div>

        {/* Technology position */}
        <div style={{ marginBottom: "24px", padding: "20px 24px", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "8px" }}>Your Technology Position</div>
          <p style={{ ...FONT, fontSize: "0.88rem", color: "#444", lineHeight: 1.7, margin: "0 0 12px" }}>{maturityText}</p>
          <div style={{ ...FONT, fontSize: "0.82rem", color: "#666", fontStyle: "italic", borderTop: "1px solid #e0dbd4", paddingTop: "10px" }}>{orgText}</div>
        </div>

        {/* Capability gap matrix */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>Where You Are vs. Where You Could Be</div>
          <div style={{ border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#0f1923" }}>
              {["Capability", "Your current state", "With JAI"].map((h, i) => (
                <div key={i} style={{ padding: "10px 16px", ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 2 ? "#c8401a" : "rgba(255,255,255,0.5)", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>{h}</div>
              ))}
            </div>
            {gapRows.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #e0dbd4", background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", fontWeight: 600, color: "#0f1923", borderRight: "1px solid #e0dbd4" }}>{row[0]}</div>
                <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", color: "#888", borderRight: "1px solid #e0dbd4" }}>{row[1]}</div>
                <div style={{ padding: "12px 16px", ...FONT, fontSize: "0.78rem", color: "#1e7a45", fontWeight: 500 }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </div>

        <JAINudge text="JAI connects directly to your procurement data — supplier risk signals, spend analytics, contract intelligence — built on the same AI you just saw in action. No spreadsheets, no manual monitoring." />
        <LegalBlock />
      </div>
    );
  }

  const current = PROFILER_QUESTIONS[step];
  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Personalisation · Supply Chain Risk Profile</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>Your Supply Chain<br />Risk Profile</h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>Four questions. A full briefing tailored to your situation — sector context, primary pressure, technology gap analysis, and the platform capability matrix that shows where you are vs. where you could be.</p>
      </div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "36px" }}>
        {PROFILER_QUESTIONS.map((_, i) => <div key={i} style={{ height: "3px", flex: 1, background: i <= step ? "#c8401a" : "#e0dbd4", borderRadius: "2px", transition: "background 0.3s" }} />)}
      </div>
      {step > 0 && (
        <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {PROFILER_QUESTIONS.slice(0, step).map(q => {
            const opt = q.options.find(o => o.value === answers[q.id]);
            return <div key={q.id} style={{ display: "flex", gap: "12px", alignItems: "center", opacity: 0.5 }}><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", color: "#888" }}>{q.q}</span><span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "#0f1923", background: "#f0ece4", padding: "2px 8px", borderRadius: "2px" }}>{opt?.label}</span></div>;
          })}
        </div>
      )}
      <div key={step}>
        <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1.05rem", fontWeight: 600, color: "#0f1923", marginBottom: "20px", lineHeight: 1.4 }}>
          <span style={{ color: "#c8401a", marginRight: "8px", fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>{step + 1}.</span>{current.q}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {current.options.map(opt => (
            <button key={opt.value} onClick={() => pick(current.id, opt.value)}
              style={{ fontFamily: "Noto Sans, sans-serif", textAlign: "left", padding: "14px 20px", background: answers[current.id] === opt.value ? "#0f1923" : "#fff", border: `1px solid ${answers[current.id] === opt.value ? "#0f1923" : "#e0dbd4"}`, borderRadius: "3px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 500, color: answers[current.id] === opt.value ? "#fff" : "#0f1923", transition: "all 0.15s" }}
              onMouseEnter={e => { if (answers[current.id] !== opt.value) { e.currentTarget.style.background = "#faf8f5"; e.currentTarget.style.borderColor = "#c8401a"; } }}
              onMouseLeave={e => { if (answers[current.id] !== opt.value) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0dbd4"; } }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ARTICLE 04 — Myth Scorer ─────────────────────────────────────────────────
// 6 myths → exposure score → gap analysis with DIY vs JAI time-to-close estimates

const MYTHS = [
  { id: "erp", myth: "Our ERP handles procurement. We don't need a separate platform.", reality: "ERP records transactions. It doesn't monitor supplier risk, surface market intelligence, or automate sourcing decisions. The capability gap is structural, not a configuration problem.", risk: "Platform gap", riskColor: "#1e4fa8", diy: "12–18 months: evaluate, procure, and implement a dedicated module or standalone tool", jai: "Connect in weeks: JAI layers over your ERP — no rip-and-replace, no data migration" },
  { id: "qualified", myth: "Our vendors are qualified. We reviewed them three years ago.", reality: "A supplier that passed assessment in 2022 may now face financial instability, regulatory violations, or new geopolitical exposure. Qualification is a moment in time. Risk is continuous — and the pace of change has accelerated.", risk: "Supplier risk", riskColor: "#b91c1c", diy: "Ongoing manual effort: re-qualification programme requires headcount, process, and tool investment", jai: "Continuous monitoring: JAI tracks financial health, ESG flags, and news signals across your full supplier base automatically" },
  { id: "direct", myth: "AI-driven sourcing works for indirect spend. Direct materials are too complex.", reality: "Complexity is exactly why direct materials need intelligent sourcing. Managing lead times, quality, pricing volatility, and geopolitical risk simultaneously is the problem AI is built for — not the reason to avoid it.", risk: "Missed capability", riskColor: "#92400e", diy: "Build internal capability: hire analysts, build category models, run pilots — 2–3 years to mature", jai: "Deploy in the highest-impact category first: sourcing cycle compression of 50–70% is achievable in 90 days" },
  { id: "maverick", myth: "Maverick spend is a people problem. Training will fix it.", reality: "Maverick spend is a systems problem. When approved channels are harder to use than alternatives, people use alternatives. The fix is catalogue quality and approval friction — not culture training.", risk: "Cost leakage", riskColor: "#4f7a5b", diy: "Programme investment: catalogue build, change management, 6–12 month cycle before measurable impact", jai: "Catalogue enforcement and spend analytics connected from day one — off-contract spend visible immediately" },
  { id: "tco", myth: "Our current platform is good enough. Switching costs are too high.", reality: "The question isn't switching cost — it's accumulating cost of staying. Every month of supplier opacity, manual RFQ, and reactive risk management has a compounding price that rarely shows up in a single budget line.", risk: "TCO blind spot", riskColor: "#6b5b8e", diy: "Build the TCO model first: quantify cost of current state before deciding. Most teams haven't done this calculation.", jai: "JAI TCO model available: we can run the numbers against your current state — most organisations find payback in under 18 months" },
  { id: "ai", myth: "We're not ready for AI in procurement. It's too early.", reality: "Your peers are 18–24 months into deployment. The window for first-mover advantage in AI-enabled procurement is closing, not opening. 'Not ready' is rarely about technology — it's about prioritisation.", risk: "Competitive lag", riskColor: "#c8401a", diy: "Catch-up trajectory: 12–18 months to get to where early adopters are today — with the gap widening monthly", jai: "Start where the ROI is highest: contract intelligence, invoice exceptions, or spend analytics — all available without a full transformation programme" },
];

function MythScorerArticle() {
  const [ratings, setRatings] = useStateSA({});
  const [submitted, setSubmitted] = useStateSA(false);
  const [revealed, setRevealed] = useStateSA({});
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const SCALE = ["False at our org", "Mostly false", "Unsure", "Mostly true", "Completely true"];
  const allRated = MYTHS.every(m => ratings[m.id] !== undefined);

  if (submitted) {
    const totalScore = MYTHS.reduce((sum, m) => sum + (ratings[m.id] || 1), 0);
    const pct = Math.round((totalScore / (MYTHS.length * 5)) * 100);
    const exposedMyths = MYTHS.filter(m => (ratings[m.id] || 1) >= 4);
    const okMyths = MYTHS.filter(m => (ratings[m.id] || 1) <= 2);
    const riskLevel = pct >= 65 ? { label: "High Exposure", color: "#b91c1c", bg: "#fef2f2", desc: "Multiple active vulnerabilities. The beliefs above are creating real, compounding cost." }
      : pct >= 40 ? { label: "Moderate Exposure", color: "#92400e", bg: "#fffbeb", desc: "Some gaps, some strength. The beliefs you endorsed are the ones worth pressure-testing first." }
      : { label: "Low Exposure", color: "#1e7a45", bg: "#f0fdf4", desc: "Your procurement operation is well-positioned. The areas you flagged are worth monitoring." };

    return (
      <div>
        <div style={{ marginBottom: "32px", paddingBottom: "28px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Assessment · Myth Scorer</SAEyebrow>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.15 }}>Your Exposure Score</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "28px", alignItems: "center", marginBottom: "32px", padding: "28px 32px", background: riskLevel.bg, border: `1px solid ${riskLevel.color}30`, borderRadius: "4px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "3.2rem", color: riskLevel.color, lineHeight: 1 }}>{pct}</div>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: riskLevel.color, opacity: 0.7 }}>/100</div>
          </div>
          <div>
            <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 700, color: riskLevel.color, marginBottom: "6px" }}>{riskLevel.label}</div>
            <p style={{ ...FONT, fontSize: "0.85rem", color: "#444", lineHeight: 1.65, margin: 0 }}>{riskLevel.desc}</p>
          </div>
        </div>

        {exposedMyths.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b91c1c", marginBottom: "12px" }}>Active Exposure — {exposedMyths.length} belief{exposedMyths.length > 1 ? "s" : ""} creating real risk</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {exposedMyths.map(m => (
                <div key={m.id} style={{ background: "#fff", border: "1px solid #e0dbd4", borderLeft: `3px solid ${m.riskColor}`, borderRadius: "0 3px 3px 0", overflow: "hidden" }}>
                  <button onClick={() => setRevealed(r => ({ ...r, [m.id]: !r[m.id] }))}
                    style={{ ...FONT, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.riskColor, marginBottom: "3px" }}>{m.risk}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#0f1923", fontStyle: "italic" }}>"{m.myth}"</div>
                    </div>
                    <span style={{ color: m.riskColor, flexShrink: 0, transform: revealed[m.id] ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                  </button>
                  {revealed[m.id] && (
                    <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f0ece4" }}>
                      <p style={{ ...FONT, fontSize: "0.84rem", color: "#444", lineHeight: 1.7, margin: "12px 0 16px" }}>{m.reality}</p>
                      {/* DIY vs JAI time-to-close */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ padding: "12px 14px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "3px" }}>
                          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "6px" }}>Without JAI</div>
                          <p style={{ ...FONT, fontSize: "0.78rem", color: "#555", lineHeight: 1.55, margin: 0 }}>{m.diy}</p>
                        </div>
                        <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "3px" }}>
                          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#166534", marginBottom: "6px" }}>With JAI</div>
                          <p style={{ ...FONT, fontSize: "0.78rem", color: "#14532d", lineHeight: 1.55, margin: 0 }}>{m.jai}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {okMyths.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1e7a45", marginBottom: "10px" }}>Well-positioned — {okMyths.length} area{okMyths.length > 1 ? "s" : ""} where you're ahead</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {okMyths.map(m => <span key={m.id} style={{ ...FONT, fontSize: "0.78rem", background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", padding: "5px 12px", borderRadius: "2px", fontWeight: 500 }}>✓ {m.risk}</span>)}
            </div>
          </div>
        )}

        <JAINudge text="JAI addresses every exposure area above — supplier risk monitoring, spend intelligence, AI-driven sourcing — connected to your procurement data, not layered on top of it." />
        <button onClick={() => { setRatings({}); setSubmitted(false); setRevealed({}); }} style={{ ...FONT, marginTop: "20px", background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0" }}>← Retake assessment</button>
        <LegalBlock />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Assessment · Procurement Myth Scorer</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>Six Beliefs. One Score.</h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>Rate each belief based on how true it is at your organisation. You'll get an exposure score — and the specific gaps worth addressing first, with side-by-side estimates of what it takes to close them with and without a platform.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
        {MYTHS.map((m, mi) => (
          <div key={m.id} style={{ border: "1px solid #e0dbd4", borderRadius: "4px", padding: "20px 24px", background: "#fff" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.2rem", color: "#c8401a", lineHeight: 1, flexShrink: 0 }}>{String(mi + 1).padStart(2, "0")}</span>
              <p style={{ ...FONT, fontSize: "0.92rem", fontWeight: 500, color: "#0f1923", lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>"{m.myth}"</p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {SCALE.map((label, si) => {
                const val = si + 1;
                const selected = ratings[m.id] === val;
                return (
                  <button key={si} onClick={() => setRatings(r => ({ ...r, [m.id]: val }))} title={label}
                    style={{ flex: 1, height: "32px", background: selected ? "#0f1923" : "#f0ece4", border: selected ? "1px solid #0f1923" : "1px solid #e0dbd4", borderRadius: "2px", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#e0dbd4"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "#f0ece4"; }} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              <span style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>False at our org</span>
              <span style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>Completely true</span>
            </div>
            {ratings[m.id] && <div style={{ marginTop: "8px", ...FONT, fontSize: "0.72rem", color: "#888" }}>Rated: <strong style={{ color: "#0f1923" }}>{SCALE[ratings[m.id] - 1]}</strong></div>}
          </div>
        ))}
      </div>
      <button onClick={() => setSubmitted(true)} disabled={!allRated}
        style={{ ...FONT, width: "100%", padding: "14px 0", background: allRated ? "#c8401a" : "#e0dbd4", color: "#fff", border: "none", borderRadius: "3px", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: allRated ? "pointer" : "not-allowed", transition: "background 0.2s" }}>
        {allRated ? "See my exposure score →" : `Rate all ${MYTHS.length} beliefs to continue`}
      </button>
    </div>
  );
}

// ─── ARTICLE 05 — Clause Annotator ───────────────────────────────────────────
// Live AI annotation + portfolio-scale simulation showing JAI's advantage

const CLAUSE_EXAMPLES = [
  { label: "Auto-renewal trap", text: `This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal no less than 90 days prior to the end of the then-current term. Licensor reserves the right to adjust pricing at renewal with 60 days' advance notice. Failure to provide timely notice shall constitute acceptance of the renewed term and any applicable price adjustments.` },
  { label: "Liability limitation", text: `In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability, even if such party has been advised of the possibility of such damages. The total liability of either party shall not exceed the fees paid in the three months preceding the claim.` },
  { label: "IP assignment", text: `Any work product, deliverables, or intellectual property created by Supplier in connection with the Services shall be considered work made for hire and shall be the exclusive property of Customer. Supplier hereby assigns all right, title, and interest in and to such work product to Customer, including all patent, copyright, trade secret, and other intellectual property rights therein.` },
];

const CLAUSE_MOCK = {
  summary: "Auto-renewing agreement with short exit window, unilateral pricing rights, and an acceptance-by-silence clause — three compounding buyer risks in one paragraph.",
  annotations: [
    { quote: "automatically renew for successive one-year terms", type: "renewal", label: "Auto-renewal", risk: "high", explanation: "Agreement locks into new annual terms without active confirmation. Easy to miss without automated tracking." },
    { quote: "90 days prior to the end of the then-current term", type: "notice", label: "Notice window", risk: "medium", explanation: "90-day exit notice is tight. Without a contract management system, this window is frequently missed." },
    { quote: "adjust pricing at renewal with 60 days' advance notice", type: "pricing", label: "Unilateral pricing", risk: "high", explanation: "No cap stated. Licensor can raise price to any level with only 60 days' notice before renewal locks in." },
    { quote: "Failure to provide timely notice shall constitute acceptance", type: "trap", label: "Acceptance by silence", risk: "high", explanation: "Silence = consent. Missing the 90-day window legally accepts the new term and any price increase." },
  ],
  recommended_actions: [
    "Flag for calendar alert 120 days before term end (30 days before the notice window opens)",
    "Negotiate a cap on annual price adjustment — CPI + X% is standard market practice",
    "Add a confirmation-required clause to remove the acceptance-by-silence provision",
  ],
};

const RISK_COLORS = { high: "#b91c1c", medium: "#92400e", low: "#4f7a5b" };
const RISK_BG = { high: "#fef2f2", medium: "#fffbeb", low: "#f0fdf4" };
const TYPE_COLORS = { renewal: "#1e4fa8", notice: "#92400e", pricing: "#b91c1c", trap: "#6b5b8e", obligation: "#4f7a5b", ip: "#3b6b88" };

// Simulated portfolio view — what JAI sees at scale
const PORTFOLIO_MOCK = [
  { id: "CTR-0041", vendor: "CloudSoft Inc", issue: "Auto-renewal", risk: "high", days: 14, value: "$84K/yr" },
  { id: "CTR-0078", vendor: "DataVault Ltd", issue: "Unilateral pricing", risk: "high", days: 31, value: "$210K/yr" },
  { id: "CTR-0102", vendor: "Acme Logistics", issue: "No liability cap", risk: "high", days: 45, value: "$440K/yr" },
  { id: "CTR-0115", vendor: "TechSupply Co", issue: "Auto-renewal", risk: "medium", days: 62, value: "$36K/yr" },
  { id: "CTR-0134", vendor: "OfficeMax Pro", issue: "Notice window: 120d", risk: "medium", days: 88, value: "$18K/yr" },
];

function ClauseAnnotatorArticle() {
  const [text, setText] = useStateSA("");
  const [loading, setLoading] = useStateSA(false);
  const [result, setResult] = useStateSA(null);
  const [activeAnnotation, setActiveAnnotation] = useStateSA(null);
  const [showPortfolio, setShowPortfolio] = useStateSA(false);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function analyse() {
    if (!text.trim()) return;
    setLoading(true); setResult(null); setActiveAnnotation(null); setShowPortfolio(false);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are a procurement contracts analyst. Analyse the clause and return ONLY raw JSON, no markdown:\n{"summary":"one sentence overall risk assessment","annotations":[{"quote":"exact text from clause (max 12 words)","type":"renewal|notice|pricing|trap|obligation|ip","label":"short label","risk":"high|medium|low","explanation":"one sentence"}],"recommended_actions":["action 1","action 2","action 3"]}\nInclude 3-5 annotations. Quote exactly from the clause text.`,
          messages: [{ role: "user", content: `Analyse this contract clause:\n\n${text}` }],
        }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const raw = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      setResult(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch {
      await new Promise(r => setTimeout(r, 900));
      setResult(CLAUSE_MOCK);
    }
    setLoading(false);
  }

  function buildAnnotated(clauseText, annotations) {
    if (!annotations?.length) return [{ text: clauseText, annotation: null }];
    let parts = [{ text: clauseText, annotation: null }];
    for (const ann of annotations) {
      const next = [];
      for (const part of parts) {
        if (part.annotation) { next.push(part); continue; }
        const idx = part.text.toLowerCase().indexOf(ann.quote.toLowerCase());
        if (idx === -1) { next.push(part); continue; }
        if (idx > 0) next.push({ text: part.text.slice(0, idx), annotation: null });
        next.push({ text: part.text.slice(idx, idx + ann.quote.length), annotation: ann });
        if (idx + ann.quote.length < part.text.length) next.push({ text: part.text.slice(idx + ann.quote.length), annotation: null });
      }
      parts = next;
    }
    return parts;
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Document Intelligence · Clause Annotator</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>Paste a Clause.<br />Get It Back Annotated.</h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>Risk flags highlighted inline. Obligations extracted. Renewal traps called out. Paste your own clause or use an example — then see what the same intelligence looks like across an entire contract portfolio.</p>
      </div>

      {!result && (
        <>
          <div style={{ marginBottom: "12px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", marginRight: "4px" }}>Try an example:</span>
            {CLAUSE_EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex.text)} style={{ ...FONT, background: "#f0ece4", border: "1px solid #e0dbd4", color: "#555", fontSize: "0.72rem", fontWeight: 500, padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>{ex.label}</button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste a contract clause here — renewal terms, liability caps, IP assignment, payment terms..." rows={8}
            style={{ width: "100%", background: "#faf8f5", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, marginBottom: "12px", outline: "none", boxSizing: "border-box" }} />
          <button onClick={analyse} disabled={loading || !text.trim()}
            style={{ background: text.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "12px 32px", ...FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: text.trim() && !loading ? "pointer" : "not-allowed", transition: "background 0.2s" }}>
            {loading ? "Analysing…" : "Annotate clause →"}
          </button>
        </>
      )}

      {loading && <div style={{ padding: "48px 0", textAlign: "center" }}><div style={{ ...FONT, fontSize: "0.88rem", color: "#888" }}>Reading clause structure…</div></div>}

      {result && (
        <div>
          <div style={{ padding: "16px 20px", background: "#0f1923", borderRadius: "3px", marginBottom: "24px" }}>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,64,26,0.9)", marginBottom: "6px" }}>Summary</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.98rem", fontStyle: "italic", color: "rgba(255,255,255,0.88)", lineHeight: 1.55, margin: 0 }}>{result.summary}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "20px", marginBottom: "24px" }}>
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "22px 24px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "14px" }}>Annotated Clause</div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", lineHeight: 1.85, color: "#333", margin: 0 }}>
                {buildAnnotated(text, result.annotations).map((part, i) => {
                  if (!part.annotation) return <span key={i}>{part.text}</span>;
                  const col = TYPE_COLORS[part.annotation.type] || "#c8401a";
                  const isActive = activeAnnotation === part.annotation.label;
                  return <mark key={i} onClick={() => setActiveAnnotation(isActive ? null : part.annotation.label)} style={{ background: isActive ? col + "30" : col + "18", borderBottom: `2px solid ${col}`, cursor: "pointer", padding: "1px 0", borderRadius: "1px", transition: "background 0.15s", fontFamily: "'JetBrains Mono', monospace" }} title={part.annotation.label}>{part.text}</mark>;
                })}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "6px" }}>Flags</div>
              {result.annotations?.map((ann, i) => {
                const col = TYPE_COLORS[ann.type] || "#c8401a";
                const isActive = activeAnnotation === ann.label;
                return (
                  <div key={i} onClick={() => setActiveAnnotation(isActive ? null : ann.label)}
                    style={{ padding: "10px 12px", background: isActive ? RISK_BG[ann.risk] : "#fff", border: `1px solid ${isActive ? RISK_COLORS[ann.risk] : "#e0dbd4"}`, borderLeft: `3px solid ${col}`, borderRadius: "0 3px 3px 0", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, color: col }}>{ann.label}</span>
                      <span style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: RISK_COLORS[ann.risk], background: RISK_BG[ann.risk], padding: "1px 5px", borderRadius: "1px" }}>{ann.risk}</span>
                    </div>
                    {isActive && <p style={{ ...FONT, fontSize: "0.75rem", color: "#555", lineHeight: 1.55, margin: 0 }}>{ann.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {result.recommended_actions?.length > 0 && (
            <div style={{ marginBottom: "28px", padding: "20px 24px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Recommended Actions</div>
              <ol style={{ paddingLeft: "18px", margin: 0 }}>
                {result.recommended_actions.map((a, i) => <li key={i} style={{ ...FONT, fontSize: "0.85rem", color: "#333", lineHeight: 1.7, marginBottom: "4px" }}>{a}</li>)}
              </ol>
            </div>
          )}

          {/* Portfolio simulation */}
          <div style={{ marginBottom: "28px" }}>
            <button onClick={() => setShowPortfolio(!showPortfolio)}
              style={{ width: "100%", background: "transparent", border: "1px solid #e0dbd4", borderRadius: showPortfolio ? "4px 4px 0 0" : "4px", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
              <div>
                <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>What JAI sees at scale</div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#0f1923" }}>You just analysed one clause. Here's what a portfolio looks like.</span>
              </div>
              <span style={{ color: "#c8401a", fontSize: "1.1rem", transform: showPortfolio ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
            </button>
            {showPortfolio && (
              <div style={{ border: "1px solid #e0dbd4", borderTop: "none", borderRadius: "0 0 4px 4px", background: "#fff", overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", background: "#faf8f5", borderBottom: "1px solid #e0dbd4" }}>
                  <p style={{ ...FONT, fontSize: "0.82rem", color: "#555", lineHeight: 1.6, margin: 0 }}>JAI runs this analysis across every contract in your portfolio — continuously. Below is a simulation of what surfaces automatically: contracts approaching renewal windows, with risk flags already identified, sorted by urgency and value at risk.</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#0f1923" }}>
                        {["Contract", "Vendor", "Flag", "Risk", "Days to window", "Annual value"].map((h, i) => (
                          <th key={i} style={{ padding: "10px 14px", textAlign: "left", ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PORTFOLIO_MOCK.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #e0dbd4", background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                          <td style={{ padding: "12px 14px", ...FONT, fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "#888" }}>{row.id}</td>
                          <td style={{ padding: "12px 14px", ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#0f1923" }}>{row.vendor}</td>
                          <td style={{ padding: "12px 14px", ...FONT, fontSize: "0.78rem", color: "#555" }}>{row.issue}</td>
                          <td style={{ padding: "12px 14px" }}><span style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: RISK_COLORS[row.risk], background: RISK_BG[row.risk], padding: "2px 7px", borderRadius: "2px" }}>{row.risk}</span></td>
                          <td style={{ padding: "12px 14px", ...FONT, fontSize: "0.82rem", color: row.days <= 30 ? "#b91c1c" : "#555", fontWeight: row.days <= 30 ? 700 : 400 }}>{row.days}d</td>
                          <td style={{ padding: "12px 14px", ...FONT, fontSize: "0.82rem", fontWeight: 600, color: "#0f1923" }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "14px 22px", background: "#faf0ee", borderTop: "1px solid #e0dbd4", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <span style={{ ...FONT, fontSize: "0.78rem", color: "#555" }}>This view updates continuously. JAI alerts your team before the 14-day window closes — not after.</span>
                  <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#c8401a", color: "#fff", ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap" }}>See JAI contracts →</a>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => { setResult(null); setActiveAnnotation(null); setShowPortfolio(false); }} style={{ ...FONT, background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0" }}>← Analyse another clause</button>
          <LegalBlock />
        </div>
      )}
    </div>
  );
}

// ─── ARTICLE 06 — S2P Prompt Sandbox ─────────────────────────────────────────
// 6 scenarios, editable prompts, live AI, time-cost callout

const SANDBOX_SCENARIOS = [
  { id: "subtier", label: "Sub-Tier Risk Scan", tag: "Supplier Risk", tagColor: "#b91c1c", buildTime: "~8 min to write from scratch", context: `SUPPLIER LIST — Q3 2026\n\nCategory: Semiconductors\n  • TSMC (Taiwan) — critical, sole source\n  • Samsung Foundry (South Korea) — secondary\n\nCategory: Rare Earth Materials\n  • China Rare Earth Holdings (China) — 80% of volume\n  • Lynas (Australia) — 20% of volume\n\nCategory: Battery Cells\n  • CATL (China) — critical, sole source\n\nCategory: Precision Machining\n  • Schuler Group (Germany)\n  • DMG Mori (Germany / Japan)`, defaultPrompt: `You are a supply chain risk analyst for a discrete manufacturer. Review the supplier list above.\n\nIdentify the top 3 geographic concentration risks and for each one:\n1. Name the risk scenario (what event would trigger disruption)\n2. Estimate the production impact window\n3. Suggest one qualified alternative supplier geography\n\nReturn as a numbered list. Be direct — no hedging.` },
  { id: "rfp", label: "RFP Scope Builder", tag: "Sourcing", tagColor: "#4f7a5b", buildTime: "~12 min to write from scratch", context: `SOURCING BRIEF\n\nRequirement: Procurement analytics platform\nOrganisation: Mid-size pharmaceutical manufacturer, ~$800M revenue\nCurrent state: SAP ERP with manual spend reporting in Excel\nKey needs:\n  — Spend visibility across 12 cost centres\n  — Supplier performance tracking\n  — Contract expiry alerts\n  — GDPR-compliant data handling (EU HQ)\nTimeline: Go-live within 9 months\nBudget envelope: Not disclosed to suppliers at this stage`, defaultPrompt: `You are a senior procurement manager drafting an RFP for the requirement above.\n\nWrite the Scope of Work section and the Evaluation Criteria table (with percentage weightings that total 100%).\n\nFor evaluation criteria, include at least 5 criteria. Ensure the weightings reflect a pharmaceutical manufacturer's priorities — compliance and data security should carry significant weight.\n\nFormat: use clear headers. Keep language formal but plain.` },
  { id: "negotiation", label: "Negotiation Brief", tag: "Contracts", tagColor: "#6b5b8e", buildTime: "~10 min to write from scratch", context: `CONTRACT RENEWAL — CONTEXT\n\nVendor: Logistics platform SaaS provider\nCurrent contract: $240K/year, 3-year term expiring in 11 weeks\nUsage: 80% of licensed seats actively used\nVendor relationship: Strong — no service incidents in 3 years\nMarket context: Two comparable platforms launched in 2025; one is 20% cheaper\nOur leverage: Long-term customer, strong reference value, considering expansion to 2 more business units`, defaultPrompt: `You are a procurement negotiation advisor. Based on the context above, prepare a concise negotiation brief.\n\nInclude:\n1. Our negotiating position (strengths and weaknesses)\n2. Three specific asks we should lead with\n3. Our BATNA (best alternative to a negotiated agreement)\n4. One concession we can offer that costs us little but signals goodwill\n\nBe direct. This is for internal use before a vendor call. Under 400 words.` },
  { id: "spend", label: "Spend Classification", tag: "Spend Intelligence", tagColor: "#9a5d1a", buildTime: "~7 min to write from scratch", context: `INDIRECT SPEND — Q3 SAMPLE\n\nLine 1: $4,200 — Office Depot — Stationery\nLine 2: $18,400 — Amazon Business — Unclassified\nLine 3: $8,900 — WeWork — Facilities\nLine 4: $1,200 — Uber Eats — Unclassified\nLine 5: $42,000 — IBM — IT Services\nLine 6: $3,100 — Local Courier Co — Logistics\nLine 7: $780 — Staples — Unclassified\nLine 8: $15,200 — Microsoft — Software\nLine 9: $2,400 — Marriott — T&E\nLine 10: $6,800 — Unidentified Vendor — Unclassified`, defaultPrompt: `You are a spend analytics specialist. Classify each line item into a standard procurement category (IT, Facilities, T&E, MRO, Professional Services, Office Supplies, Logistics, or Other).\n\nFor lines marked "Unclassified", make your best inference from the vendor name and amount.\n\nReturn a table: Line | Vendor | Amount | Category | Confidence (High/Medium/Low) | Notes\n\nAt the bottom, flag any lines that may represent maverick spend and explain why.` },
  { id: "onboarding", label: "Supplier Onboarding Checklist", tag: "Supplier Management", tagColor: "#1e4fa8", buildTime: "~9 min to write from scratch", context: `NEW SUPPLIER ONBOARDING REQUEST\n\nVendor: Precision Components Ltd\nCategory: Direct materials — aerospace-grade fasteners\nAnnual spend estimate: $1.2M\nGeography: UK-based manufacturer, ships to US facilities\nCompliance requirements: AS9100D (aerospace quality), ITAR (export control), modern slavery disclosure\nExisting supplier in category: Yes — this is an alternative/backup source\nIT integration needed: EDI for PO transmission`, defaultPrompt: `You are a supplier onboarding specialist. Based on the supplier profile above, generate a complete onboarding checklist.\n\nOrganise by phase:\n1. Pre-qualification (before first PO)\n2. Documentation & compliance (within 30 days)\n3. System integration (within 60 days)\n4. Performance baseline (first 90 days)\n\nFor each item, note who owns it (Procurement, Legal, IT, Finance, or Supplier) and flag any items specific to the aerospace/ITAR context.\n\nReturn as a numbered checklist under each phase header.` },
  { id: "dispute", label: "Invoice Dispute Brief", tag: "AP / Finance", tagColor: "#c8401a", buildTime: "~6 min to write from scratch", context: `INVOICE DISPUTE — CONTEXT\n\nVendor: CloudSoft Inc\nInvoice: INV-2044, $22,000\nIssue: Invoice received for services rendered under an expired contract (expired 30 days ago)\nOriginal contract value: $18,000/year for SaaS licence\nNew amount claimed: $22,000 — vendor claims "service expansion" not documented in original contract\nRelationship: 4-year vendor, contract renewal currently in negotiation\nBusiness dependency: Platform used daily by 45 users — switching cost is high`, defaultPrompt: `You are a procurement specialist handling a vendor invoice dispute. Based on the context above, draft a professional dispute communication to the vendor.\n\nThe communication should:\n1. State our position clearly (we will not pay until contract status is resolved)\n2. Reference the specific contractual issue (expired terms, undocumented expansion)\n3. Propose a resolution path (either retroactive contract amendment or reduction to original terms)\n4. Maintain the relationship — this vendor is business-critical\n\nTone: firm but constructive. Format: professional email. Under 300 words.` },
];

const SANDBOX_MOCKS = {
  subtier: `**Top 3 Geographic Concentration Risks**\n\n**1. Taiwan — Semiconductors (TSMC sole source)**\nRisk scenario: Cross-strait military escalation or major earthquake closes TSMC fabs.\nProduction impact: 6–18 months — semiconductor lead times mean no quick alternative.\nAlternative geography: South Korea (Samsung Foundry, SK Hynix) or Japan (Renesas) for less advanced nodes.\n\n**2. China — Rare Earth Materials (80% volume from single country)**\nRisk scenario: Export controls or tariff escalation — already precedented in 2024.\nProduction impact: 3–9 months depending on inventory buffer.\nAlternative geography: Australia — Lynas already at 20%; expand to 60–80% with contract commitment.\n\n**3. China — Battery Cells (CATL sole source)**\nRisk scenario: US/EU tariff action on Chinese battery components; CATL is the primary target.\nProduction impact: 9–24 months — no immediate alternative at equivalent scale.\nAlternative geography: South Korea (Samsung SDI, SK On) or Japan (Panasonic). Qualification lead time: 12+ months. Start now.`,
  rfp: `**Scope of Work**\n\nThe selected vendor shall deliver a procurement analytics platform providing full spend visibility, supplier performance management, and contract lifecycle alerts across all twelve cost centres. Core deliverables: (1) automated spend classification updated weekly minimum; (2) supplier performance dashboard with configurable KPIs; (3) contract expiry alerts at 90/60/30-day intervals; (4) SAP ERP integration via certified connector; (5) GDPR-compliant architecture with EU data residency.\n\n**Evaluation Criteria**\n\n| Criterion | Weight | Description |\n|---|---|---|\n| Data security & GDPR | 25% | SOC 2 Type II, EU residency, DPA terms |\n| SAP integration depth | 20% | Native connector vs middleware |\n| Functional coverage | 20% | Spend analytics, supplier mgmt, contract alerts |\n| Total Cost of Ownership (3yr) | 20% | Licensing, implementation, support |\n| Implementation timeline | 15% | Credible plan for 9-month go-live |`,
  negotiation: `**Negotiation Brief — CloudSoft Renewal**\n\n**Our Position**\nStrengths: 3-year tenure (reference value), 80% seat utilisation, expansion potential (2 BUs = 60%+ upside).\nWeaknesses: 11 weeks to expiry creates time pressure; strong relationship signals we won't switch easily.\n\n**Three Asks — in Priority Order**\n1. 15% unit price reduction — anchor to the 20% cheaper competitor; accept 10% as walk-away.\n2. Price freeze on expansion seats for 24 months at renewal rate.\n3. Quarterly SLAs with service credits — governance leverage without threatening the relationship.\n\n**BATNA**\nMigrate to [Competitor]. 6-month implementation. Credible threat — reference in context, not as ultimatum.\n\n**Concession to Offer**\nExtend to a 2-year term in exchange for price reduction. Costs us flexibility; signals commitment. Vendors value long-term revenue certainty.`,
  spend: `| Line | Vendor | Amount | Category | Confidence | Notes |\n|---|---|---|---|---|---|\n| 1 | Office Depot | $4,200 | Office Supplies | High | Standard stationery supplier |\n| 2 | Amazon Business | $18,400 | Mixed — flag | Medium | Split probable: IT accessories + office supplies — classify after PO review |\n| 3 | WeWork | $8,900 | Facilities | High | Co-working / flexible office |\n| 4 | Uber Eats | $1,200 | T&E | High | Likely team meals — maverick if no events policy |\n| 5 | IBM | $42,000 | IT Services | High | Consistent with consulting or managed services |\n| 6 | Local Courier Co | $3,100 | Logistics | High | Last-mile delivery |\n| 7 | Staples | $780 | Office Supplies | High | Standard |\n| 8 | Microsoft | $15,200 | Software | High | Likely M365 or Azure |\n| 9 | Marriott | $2,400 | T&E | High | Business travel accommodation |\n| 10 | Unidentified Vendor | $6,800 | Other | Low | Cannot classify — requires vendor lookup |\n\n**Potential Maverick Spend Flags**\n- Line 4 (Uber Eats $1,200): No PO reference likely; may be personal card expense pushed through AP.\n- Line 2 (Amazon Business $18,400): High value, unclassified — possible off-catalogue IT hardware purchase.`,
  onboarding: `**Supplier Onboarding Checklist — Precision Components Ltd**\n\n**Phase 1: Pre-Qualification (Before First PO)**\n1. [Procurement] Confirm AS9100D certification is current and covers fastener categories required — AEROSPACE-SPECIFIC\n2. [Legal] ITAR registration verification — confirm supplier is registered with DDTC before any technical data exchange — ITAR-CRITICAL\n3. [Procurement] Financial health check — D&B or equivalent; flag if credit score below threshold\n4. [Procurement] Reference check with two existing aerospace customers\n5. [Legal] Modern slavery disclosure and supply chain transparency statement\n\n**Phase 2: Documentation & Compliance (Within 30 Days)**\n6. [Legal] Execute Master Supply Agreement with UK/US governing law clause\n7. [Legal] ITAR Technical Assistance Agreement (TAA) if sharing controlled technical drawings — ITAR-CRITICAL\n8. [Finance] Vendor banking and payment terms setup in ERP\n9. [Procurement] Quality Control Plan approval — AS9100D First Article Inspection process\n10. [Supplier] Submit Certificate of Conformance template for first shipment\n\n**Phase 3: System Integration (Within 60 Days)**\n11. [IT + Supplier] EDI connection setup — test PO transmission and acknowledgement\n12. [IT] Supplier portal access provisioned\n\n**Phase 4: Performance Baseline (First 90 Days)**\n13. [Procurement] First three POs tracked: on-time delivery, quality acceptance rate, invoice accuracy\n14. [Procurement] 90-day performance review — scorecard established for ongoing QBRs`,
  dispute: `Subject: Invoice INV-2044 — Payment Hold Pending Contract Resolution\n\nDear [Vendor Contact],\n\nThank you for submitting invoice INV-2044 for $22,000. We are writing to formally notify you that payment is on hold pending resolution of two contractual issues we need to address together.\n\nFirst, our records show that the service agreement underpinning this invoice expired on [expiry date], approximately 30 days prior to the invoice date. Services rendered after contract expiry require a valid agreement before we can process payment under our internal controls.\n\nSecond, the invoiced amount of $22,000 exceeds the annual contract value of $18,000. We have no documentation on file authorising a "service expansion" at this price point. Any scope changes to our agreement require a signed amendment prior to delivery.\n\nWe value our four-year partnership and want to resolve this quickly. We propose two paths forward:\n\n1. Retroactive contract amendment: We execute a renewal agreement at the new rate, backdated to cover the service period. This requires approval on our side — we can expedite given the circumstances.\n2. Invoice revision: You reissue at the original contracted rate of $18,000, which we can process against a short-term bridge agreement while we complete the renewal negotiation.\n\nPlease confirm your preferred path by [date]. We are ready to move on this quickly.\n\nBest regards,\n[Name]`,
};

function PromptSandboxArticle() {
  const [scenario, setScenario] = useStateSA(SANDBOX_SCENARIOS[0].id);
  const [prompts, setPrompts] = useStateSA(() => Object.fromEntries(SANDBOX_SCENARIOS.map(s => [s.id, s.defaultPrompt])));
  const [loading, setLoading] = useStateSA(false);
  const [result, setResult] = useStateSA(null);
  const [copied, setCopied] = useStateSA(false);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };
  const sc = SANDBOX_SCENARIOS.find(s => s.id === scenario);
  const prompt = prompts[scenario];

  async function run() {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: `CONTEXT:\n${sc.context}\n\n---\n\n${prompt}` }],
        }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      setResult(data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "No response returned.");
    } catch {
      await new Promise(r => setTimeout(r, 1100));
      setResult(SANDBOX_MOCKS[scenario] || "Output unavailable.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard?.writeText(prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Sandbox · S2P Prompt Builder</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>Build a Prompt. Run It Live.<br />Take It Away.</h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>Six procurement scenarios with pre-loaded context and editable prompts. Edit the prompt until it does exactly what you need, then run it live. Every prompt is yours to keep.</p>
      </div>

      {/* Scenario selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
        {SANDBOX_SCENARIOS.map(s => (
          <button key={s.id} onClick={() => { setScenario(s.id); setResult(null); }}
            style={{ ...FONT, padding: "8px 14px", background: scenario === s.id ? "#0f1923" : "#fff", border: `1px solid ${scenario === s.id ? "#0f1923" : "#e0dbd4"}`, borderRadius: "3px", cursor: "pointer", fontSize: "0.78rem", fontWeight: scenario === s.id ? 600 : 400, color: scenario === s.id ? "#fff" : "#555", transition: "all 0.15s" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: scenario === s.id ? "rgba(200,64,26,0.85)" : s.tagColor, marginRight: "6px" }}>{s.tag}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Build time callout */}
      <div style={{ marginBottom: "16px", padding: "10px 16px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "3px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 600, color: "#888" }}>Manual build time:</span>
          <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, color: "#b91c1c" }}>{sc.buildTime}</span>
        </div>
        <span style={{ color: "#e0dbd4" }}>·</span>
        <span style={{ ...FONT, fontSize: "0.72rem", color: "#555" }}>JAI generates this automatically from your live procurement data — no prompt writing, no copy-paste.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "16px 18px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "10px" }}>Pre-loaded Context</div>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "#555", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{sc.context}</pre>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa" }}>Your Prompt — edit freely</div>
            <button onClick={copyPrompt} style={{ ...FONT, background: "transparent", border: "1px solid #e0dbd4", borderRadius: "2px", padding: "3px 10px", fontSize: "0.65rem", fontWeight: 600, color: copied ? "#4f7a5b" : "#888", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>{copied ? "✓ Copied" : "Copy"}</button>
          </div>
          <textarea value={prompt} onChange={e => setPrompts(p => ({ ...p, [scenario]: e.target.value }))}
            style={{ flex: 1, minHeight: "220px", background: "#fff", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.74rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      <button onClick={run} disabled={loading || !prompt.trim()}
        style={{ background: prompt.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "12px 32px", ...FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: prompt.trim() && !loading ? "pointer" : "not-allowed", transition: "background 0.2s", marginBottom: "24px" }}>
        {loading ? "Running…" : "Run prompt →"}
      </button>

      {result && (
        <div>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Output</div>
          <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "24px 28px", marginBottom: "20px" }}>
            <pre style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#333", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{result}</pre>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "28px", padding: "14px 18px", background: "#f5f2ec", borderRadius: "3px" }}>
            <span style={{ ...FONT, fontSize: "0.78rem", color: "#555" }}>This prompt is yours — copy it and run it in Claude whenever you need it.</span>
            <button onClick={copyPrompt} style={{ ...FONT, background: "#0f1923", color: "#fff", border: "none", borderRadius: "2px", padding: "6px 14px", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}>{copied ? "✓ Copied" : "Copy prompt →"}</button>
          </div>
          <JAINudge text="JAI runs prompts like these automatically — across your live procurement data, on a schedule, with outputs surfaced where your team actually works. No copy-paste required." />
          <LegalBlock />
        </div>
      )}
    </div>
  );
}

// ─── Shared legal footer ──────────────────────────────────────────────────────

function LegalBlock() {
  return (
    <div style={{ padding: "20px 24px", background: "#f0ece4", border: "1px solid #ddd8cf", borderRadius: "3px", marginTop: "48px" }}>
      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "8px" }}>Legal Notice</div>
      <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "#888", lineHeight: 1.7, margin: 0 }}>This page is not affiliated with, endorsed by, or produced in partnership with Anthropic. Claude™ is a product of Anthropic, PBC. All Claude capabilities referenced here are based on publicly available features. Use of Claude is subject to Anthropic's Terms of Service and Usage Policies.</p>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function SampleArtifactsPanel() {
  const [activeArticle, setActiveArticle] = useStateSA(null);
  const article = activeArticle ? ARTICLES.find(a => a.id === activeArticle) : null;
  if (!activeArticle) return <ArticleIndex onSelect={setActiveArticle} />;
  return (
    <ArticleShell article={article} onBack={() => setActiveArticle(null)}>
      {activeArticle === "agent-builder"        && <AgentBuilderArticle />}
      {activeArticle === "prompting-101"         && <Prompting101Article />}
      {activeArticle === "supply-chain-profiler" && <SupplyChainProfilerArticle />}
      {activeArticle === "myth-scorer"           && <MythScorerArticle />}
      {activeArticle === "clause-annotator"      && <ClauseAnnotatorArticle />}
      {activeArticle === "prompt-sandbox"        && <PromptSandboxArticle />}
    </ArticleShell>
  );
}

window.SampleArtifactsPanel = SampleArtifactsPanel;
