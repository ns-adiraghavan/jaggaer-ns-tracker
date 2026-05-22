// ══════════════════════════════════════════════════════════════════════════════
// sample-artifacts.jsx — "Sample Artifacts" tab
// External-facing content hub for the Jaggaer × NS engagement.
// Structure: index page → individual articles.
// Article 01: Agent Builder (live S2P demos)
// Article 02: Prompting 101
// Articles 03–05: Filler placeholders
// ══════════════════════════════════════════════════════════════════════════════

const { useState: useStateSA, useRef: useRefSA, useCallback: useCBSA } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function SAEyebrow({ children, light }) {
  return (
    <div style={{
      fontFamily: "Noto Sans, sans-serif",
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: light ? "rgba(255,255,255,0.5)" : "#c8401a",
      marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

function JAINudge({ text, tight }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      padding: tight ? "14px 18px" : "20px 24px",
      background: "#0f1923",
      borderRadius: "3px",
      marginTop: tight ? "16px" : "28px",
    }}>
      <p style={{
        fontFamily: "Noto Sans, sans-serif",
        fontSize: "0.85rem",
        color: "rgba(255,255,255,0.7)",
        margin: 0,
        lineHeight: 1.55,
        maxWidth: "520px",
      }}>
        {text}
      </p>
      <a
        href="https://www.jaggaer.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#c8401a",
          color: "#fff",
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "9px 18px",
          borderRadius: "2px",
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Explore JAI →
      </a>
    </div>
  );
}

function OutputSection({ label, items, color }) {
  return (
    <div>
      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>
        {label}
      </div>
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#333", lineHeight: 1.6 }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE INDEX — the landing page
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLES = [
  {
    id: "agent-builder",
    n: "01",
    category: "Interactive",
    title: "Agent Builder",
    sub: "Live AI-powered S2P tools — contract analysis, supplier risk scanning, RFP generation. Paste your own data and run them.",
    tag: "Live demos",
    tagColor: "#c8401a",
    status: "live",
    readTime: "10 min",
  },
  {
    id: "prompting-101",
    n: "02",
    category: "Guide",
    title: "Prompting 101",
    sub: "How to write prompts that actually work for procurement. The three-part formula, common failure modes, and a library of tested S2P templates.",
    tag: "Practical guide",
    tagColor: "#3b6b88",
    status: "live",
    readTime: "8 min",
  },
  {
    id: "supplier-intelligence",
    n: "03",
    category: "Deep Dive",
    title: "Supplier Intelligence at Scale",
    sub: "From static vendor lists to continuous risk monitoring — how AI changes what's possible across sub-tier supply chains.",
    tag: "Coming soon",
    tagColor: "#888",
    status: "soon",
    readTime: "12 min",
  },
  {
    id: "contracts-unpacked",
    n: "04",
    category: "Workshop",
    title: "Contracts, Unpacked",
    sub: "A clause-by-clause walkthrough of the contract terms most likely to create downstream procurement exposure — and how AI surfaces them automatically.",
    tag: "Coming soon",
    tagColor: "#888",
    status: "soon",
    readTime: "15 min",
  },
  {
    id: "s2p-automation",
    n: "05",
    category: "Research",
    title: "The Automation Opportunity in S2P",
    sub: "Where AI delivers the fastest ROI across the source-to-pay cycle — with benchmarks from early adopters in manufacturing, public sector, and higher education.",
    tag: "Coming soon",
    tagColor: "#888",
    status: "soon",
    readTime: "10 min",
  },
];

function ArticleIndex({ onSelect }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 40px 80px" }}>

        {/* Page hero */}
        <div style={{ marginBottom: "48px", paddingBottom: "36px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Jaggaer Intelligence</SAEyebrow>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.4rem, 4.5vw, 3.4rem)",
            fontWeight: 900,
            color: "#0f1923",
            lineHeight: 1.1,
            marginBottom: "18px",
          }}>
            Sample Artifacts
          </h1>
          <p style={{
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "1rem",
            color: "#6b6560",
            lineHeight: 1.7,
            maxWidth: "560px",
            marginBottom: "0",
          }}>
            A collection of AI-powered content formats — live tools, practical guides, and research — showing what procurement intelligence looks like when it's built for action, not just reading.
          </p>
        </div>

        {/* Article list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {ARTICLES.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} onSelect={onSelect} />
          ))}
        </div>

        {/* Footer nudge */}
        <div style={{ marginTop: "56px", padding: "28px 32px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "8px" }}>
                About this series
              </div>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#555", lineHeight: 1.65, margin: 0, maxWidth: "440px" }}>
                These artifacts are part of Jaggaer's content intelligence programme — research, tools, and guides that show what modern procurement looks like in practice. Each one is built to be used, not just read.
              </p>
            </div>
            <a
              href="https://www.jaggaer.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#0f1923",
                color: "#fff",
                fontFamily: "Noto Sans, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "12px 22px",
                borderRadius: "2px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                alignSelf: "center",
                flexShrink: 0,
              }}
            >
              Visit Jaggaer.com →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article, index, onSelect }) {
  const [hovered, setHoveredSA] = useStateSA(false);
  const isLive = article.status === "live";

  return (
    <div
      onClick={isLive ? () => onSelect(article.id) : undefined}
      onMouseEnter={() => setHoveredSA(true)}
      onMouseLeave={() => setHoveredSA(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "72px 1fr auto",
        gap: "0",
        background: hovered && isLive ? "#faf8f5" : "#fff",
        border: "1px solid #e0dbd4",
        borderRadius: "3px",
        overflow: "hidden",
        cursor: isLive ? "pointer" : "default",
        transition: "background 0.15s, box-shadow 0.15s",
        boxShadow: hovered && isLive ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
        opacity: isLive ? 1 : 0.72,
      }}
    >
      {/* Number column */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isLive ? (hovered ? "#0f1923" : "#f0ece4") : "#f5f5f5",
        transition: "background 0.15s",
        padding: "28px 0",
        borderRight: "1px solid #e0dbd4",
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900,
          fontSize: "1.1rem",
          color: isLive ? (hovered ? "#c8401a" : "#aaa49a") : "#ccc",
          transition: "color 0.15s",
          letterSpacing: "0.02em",
        }}>
          {article.n}
        </span>
      </div>

      {/* Content column */}
      <div style={{ padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#888",
          }}>
            {article.category}
          </span>
          <span style={{
            background: article.tagColor + "14",
            border: `1px solid ${article.tagColor}35`,
            color: article.tagColor,
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "2px",
          }}>
            {article.tag}
          </span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", color: "#bbb" }}>
            {article.readTime}
          </span>
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.15rem",
          fontWeight: 700,
          color: "#0f1923",
          marginBottom: "6px",
          lineHeight: 1.25,
        }}>
          {article.title}
        </h2>
        <p style={{
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.84rem",
          color: "#6b6560",
          lineHeight: 1.6,
          margin: 0,
          maxWidth: "520px",
        }}>
          {article.sub}
        </p>
      </div>

      {/* Arrow column */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderLeft: "1px solid #e0dbd4",
      }}>
        <span style={{
          fontSize: "1.1rem",
          color: isLive ? (hovered ? "#c8401a" : "#ccc") : "#e0e0e0",
          transition: "color 0.15s, transform 0.15s",
          transform: hovered && isLive ? "translateX(3px)" : "none",
        }}>
          →
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE SHELL — wraps any article with back nav + consistent chrome
// ─────────────────────────────────────────────────────────────────────────────

function ArticleShell({ article, onBack, children }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {/* Breadcrumb bar */}
      <div style={{
        padding: "12px 40px",
        background: "#faf8f5",
        borderBottom: "1px solid #e0dbd4",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.78rem",
            color: "#c8401a",
            cursor: "pointer",
            padding: "0",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontWeight: 500,
          }}
        >
          ← Sample Artifacts
        </button>
        <span style={{ color: "#ddd8cf", fontSize: "0.7rem" }}>/</span>
        <span style={{
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.78rem",
          color: "#888",
          fontWeight: 500,
        }}>
          {article.n} — {article.title}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: article.tagColor + "14",
            border: `1px solid ${article.tagColor}35`,
            color: article.tagColor,
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "2px",
          }}>
            {article.tag}
          </span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "#bbb" }}>{article.readTime}</span>
        </div>
      </div>

      {/* Article content */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 40px 80px" }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 01 — Agent Builder
// All the original agent-builder content, repackaged as an article.
// ─────────────────────────────────────────────────────────────────────────────

// Demo data
const DEMO_TABS = [
  { id: "contracts", label: "Contracts" },
  { id: "suppliers", label: "Suppliers" },
  { id: "rfp", label: "RFP / Sourcing" },
];

const DEMO_SYSTEM_PROMPTS = {
  contracts: `You are an expert procurement contracts analyst. Analyse the clause and return raw JSON only:\n{"expiry_dates":[],"auto_renewal":null,"risky_obligations":[],"concerning_sections":[],"summary":""}`,
  suppliers: `You are a procurement sourcing strategist. Analyse for concentration risk. Return raw JSON only:\n{"risk_flags":[],"alternatives":[{"category":"","region":"","rationale":"","example_suppliers":[]}],"diversification_priority":""}`,
  rfp: `You are a procurement writer. Generate a professional RFP. Return raw JSON only:\n{"rfp_title":"","background":"","scope_of_work":[],"evaluation_criteria":[{"criterion":"","weight":"","description":""}],"submission_requirements":[],"key_dates":[{"milestone":"","date":""}],"questions":[]}`,
};

const DEMO_PLACEHOLDERS = {
  contracts: `Paste a contract clause or excerpt here. Example:\n\n"This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal no less than 90 days prior to the end of the then-current term. Licensor reserves the right to adjust pricing at renewal with 60 days' advance notice."`,
  suppliers: `Paste your supplier list here. Example:\n\nSupplier A — Taiwan — Semiconductors\nSupplier B — Taiwan — PCB Manufacturing\nSupplier C — Germany — Precision Machining\nSupplier D — China — Rare Earth Materials\nSupplier E — China — Battery Cells`,
  rfp: `Describe your sourcing requirement here. Example:\n\nWe need to source a fleet management software solution for 200 commercial vehicles across our US and Germany operations. Must integrate with SAP and provide real-time GPS tracking, maintenance scheduling, and driver behaviour analytics.`,
};

const MOCK_OUTPUTS = {
  contracts: {
    summary: "Auto-renewing agreement with 90-day exit notice window and unilateral pricing adjustment rights at renewal — moderate buyer risk.",
    expiry_dates: [
      "Initial term end: not specified — agreement runs until notice of non-renewal",
      "Non-renewal notice must be given no less than 90 days before term end",
      "Pricing adjustment notice: 60 days prior to renewal",
    ],
    auto_renewal: "Agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal at least 90 days before the end of the current term.",
    risky_obligations: [
      "Licensor may adjust pricing at each renewal with only 60 days' notice — buyer has limited time to renegotiate or exit",
      "90-day non-renewal notice window is tight for procurement teams without automated contract tracking",
      "No cap on pricing adjustment magnitude — unconstrained upward repricing at renewal",
    ],
    concerning_sections: [
      "Auto-renewal clause: recommend flagging for calendar alert 120 days before term end",
      "Unilateral pricing adjustment: no stated cap or CPI linkage — recommend negotiating a maximum annual increase percentage",
    ],
  },
  suppliers: {
    diversification_priority: "High — heavy concentration in Taiwan (semiconductors, PCB) and China (rare earth, batteries) creates compounding single-event risk",
    risk_flags: [
      "Taiwan concentration: Semiconductors + PCB both exposed to same geopolitical and natural disaster risk profile",
      "China concentration: Rare Earth Materials and Battery Cells subject to export controls and tariff volatility",
      "No Americas-based source for any category except Precision Machining",
    ],
    alternatives: [
      { category: "Semiconductors", region: "South Korea / Japan", rationale: "Mature fab capacity outside Taiwan cross-strait risk zone", example_suppliers: ["Samsung Foundry", "SK Hynix", "Renesas Electronics"] },
      { category: "Rare Earth Materials", region: "Australia / Canada", rationale: "Lynas and MP Materials are the two largest non-China producers", example_suppliers: ["Lynas Rare Earths", "MP Materials", "Mkango Resources"] },
    ],
  },
  rfp: {
    rfp_title: "Request for Proposal: Fleet Management Software — US & Germany Operations",
    background: "We are seeking a fleet management software solution for 200 commercial vehicles across US and Germany operations. The solution must integrate with SAP S/4HANA and provide real-time visibility, predictive maintenance, and driver analytics.",
    scope_of_work: [
      "Real-time GPS tracking and geofencing for all 200 vehicles across both geographies",
      "Bi-directional SAP S/4HANA integration for cost centre allocation and PO generation",
      "Predictive maintenance scheduling based on telematics data",
      "Driver behaviour analytics including speed, braking, idling, and fatigue indicators",
      "Regulatory compliance for EU tachograph rules and US FMCSA hours-of-service",
    ],
    evaluation_criteria: [
      { criterion: "Functional fit", weight: "30%", description: "Coverage of all stated requirements; SAP integration depth" },
      { criterion: "Total Cost of Ownership", weight: "25%", description: "3-year TCO including implementation, licensing, and support" },
      { criterion: "Security & data residency", weight: "20%", description: "GDPR compliance; SOC 2 Type II; EU data residency options" },
    ],
    submission_requirements: ["Executive summary (max 3 pages)", "SAP integration architecture diagram", "3-year TCO model", "Two comparable customer references"],
    key_dates: [{ milestone: "Proposals due", date: "Week 5" }, { milestone: "Shortlist announced", date: "Week 7" }, { milestone: "Award decision", date: "Week 11" }],
    questions: [
      "Describe your SAP S/4HANA integration architecture — native connector or middleware?",
      "How does your platform handle multi-jurisdiction compliance simultaneously within one instance?",
      "What is your data residency model for EU customers?",
    ],
  },
};

function ContractOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.summary && (
        <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a" }}>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>Summary: </span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444" }}>{data.summary}</span>
        </div>
      )}
      {data.expiry_dates?.length > 0 && <OutputSection label="Expiry & Renewal Dates" items={data.expiry_dates} color="#3b6b88" />}
      {data.auto_renewal && <OutputSection label="Auto-Renewal Terms" items={[data.auto_renewal]} color="#c08227" />}
      {data.risky_obligations?.length > 0 && <OutputSection label="Risky Obligations" items={data.risky_obligations} color="#c8401a" />}
      {data.concerning_sections?.length > 0 && <OutputSection label="Sections for Legal Review" items={data.concerning_sections} color="#6b5b8e" />}
    </div>
  );
}

function SupplierOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.diversification_priority && (
        <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a" }}>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>Diversification Priority: </span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444" }}>{data.diversification_priority}</span>
        </div>
      )}
      {data.risk_flags?.length > 0 && <OutputSection label="Risk Flags" items={data.risk_flags} color="#c8401a" />}
      {data.alternatives?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>Alternative Supplier Suggestions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.alternatives.map((alt, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "3px", padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "#0f1923" }}>{alt.category}</span>
                  <span style={{ background: "#f0e6e1", color: "#c8401a", fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "2px" }}>{alt.region}</span>
                </div>
                <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#555", margin: "0 0 8px" }}>{alt.rationale}</p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {alt.example_suppliers?.map((s, j) => (
                    <span key={j} style={{ background: "#f5f2ec", border: "1px solid #e0dbd4", color: "#555", fontSize: "0.72rem", fontFamily: "Noto Sans, sans-serif", padding: "3px 9px", borderRadius: "2px" }}>{s}</span>
                  ))}
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
      {data.rfp_title && (
        <div style={{ padding: "14px 18px", background: "#0f1923", borderRadius: "3px" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>{data.rfp_title}</span>
        </div>
      )}
      {data.background && <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#444", lineHeight: 1.7 }}>{data.background}</div>}
      {data.scope_of_work?.length > 0 && <OutputSection label="Scope of Work" items={data.scope_of_work} color="#3b6b88" />}
      {data.evaluation_criteria?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>Evaluation Criteria</div>
          {data.evaluation_criteria.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "6px", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#c8401a", fontSize: "0.9rem", minWidth: "42px", flexShrink: 0 }}>{c.weight}</span>
              <div>
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>{c.criterion}</span>
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#666" }}> — {c.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.submission_requirements?.length > 0 && <OutputSection label="Submission Requirements" items={data.submission_requirements} color="#4f7a5b" />}
      {data.questions?.length > 0 && <OutputSection label="Supplier Questions" items={data.questions} color="#6b5b8e" />}
    </div>
  );
}

function DemoPane({ demoId }) {
  const [input, setInput] = useStateSA("");
  const [loading, setLoading] = useStateSA(false);
  const [result, setResult] = useStateSA(null);

  const runDemo = useCBSA(() => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => { setResult(MOCK_OUTPUTS[demoId]); setLoading(false); }, 1400);
  }, [demoId, input]);

  const labels = { contracts: "contract text", suppliers: "supplier list", rfp: "sourcing requirement" };
  const jaiNudges = {
    contracts: "This is one clause. JAI runs this analysis across your entire contract portfolio — automatically, continuously, connected to your procurement data.",
    suppliers: "JAI monitors your full supplier base in real time. Risk flags like these surface before they reach operations, not after.",
    rfp: "JAI generates and manages sourcing events at scale — with your organisation's data, categories, and approval workflows built in.",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c08227" }} />
        <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>
          Demo mode — representative output shown. Live API analysis activates once the key is integrated.
        </span>
      </div>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={DEMO_PLACEHOLDERS[demoId]}
        rows={8}
        style={{ width: "100%", background: "#faf8f5", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
      />
      <button
        onClick={runDemo}
        disabled={loading || !input.trim()}
        style={{ background: input.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "11px 28px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: input.trim() && !loading ? "pointer" : "not-allowed", marginBottom: "24px", transition: "background 0.2s" }}
      >
        {loading ? "Analysing…" : `Analyse ${labels[demoId]}`}
      </button>
      {result && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "16px" }}>
            Analysis Output
          </div>
          {demoId === "contracts" && <ContractOutput data={result} />}
          {demoId === "suppliers" && <SupplierOutput data={result} />}
          {demoId === "rfp" && <RFPOutput data={result} />}
          <JAINudge text={jaiNudges[demoId]} />
        </div>
      )}
    </div>
  );
}

function AgentBuilderArticle() {
  const [activeDemo, setActiveDemo] = useStateSA("contracts");

  return (
    <div>
      {/* Article hero */}
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Interactive · Agent Builder</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          S2P Use Case Demos
        </h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px", marginBottom: "0" }}>
          Three live AI-powered tools built for procurement. Paste your own data — a contract clause, a supplier list, or a sourcing brief — and see what structured intelligence looks like in practice.
        </p>
      </div>

      {/* Demo tabs */}
      <div style={{ marginBottom: "24px" }}>
        <SAEyebrow>Try it now</SAEyebrow>
        <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", marginBottom: "24px" }}>
          {DEMO_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDemo(tab.id)}
              style={{ background: "transparent", border: "none", borderBottom: activeDemo === tab.id ? "2px solid #c8401a" : "2px solid transparent", padding: "12px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: activeDemo === tab.id ? 600 : 400, color: activeDemo === tab.id ? "#0f1923" : "#6b6560", cursor: "pointer", letterSpacing: "0.04em", marginBottom: "-1px", transition: "color 0.15s" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "28px 28px" }}>
          <DemoPane key={activeDemo} demoId={activeDemo} />
        </div>
      </div>

      {/* "Without the prompting" bridge */}
      <div style={{ margin: "32px 0 48px", padding: "24px 28px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px", display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>Want this without the setup?</div>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#0f1923", lineHeight: 1.6, margin: 0 }}>
            JAI does everything you just saw — across your entire contract portfolio, supplier base, and sourcing pipeline — with no prompt writing required. Pre-built for S2P, connected to your data, running continuously.
          </p>
        </div>
        <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#0f1923", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "13px 22px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          See JAI →
        </a>
      </div>

      {/* Getting Started — collapsible */}
      <CollapsibleBlock
        eyebrow="Setup Guide"
        title="Getting Started with Claude"
        content={<GettingStartedContent />}
      />

      {/* Legal */}
      <LegalBlock />
    </div>
  );
}

function CollapsibleBlock({ eyebrow, title, content }) {
  const [open, setOpen] = useStateSA(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", background: "transparent", border: "1px solid #e0dbd4", borderRadius: open ? "4px 4px 0 0" : "4px", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
      >
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>{eyebrow}</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#0f1923" }}>{title}</span>
        </div>
        <span style={{ color: "#c8401a", fontSize: "1.1rem", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ border: "1px solid #e0dbd4", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "28px 24px", background: "#fff" }}>
          {content}
        </div>
      )}
    </div>
  );
}

const INSTALL_STEPS = [
  { n: "01", title: "Go to claude.ai", body: "Open your browser and navigate to claude.ai. You'll land on the login page." },
  { n: "02", title: "Create or sign in", body: "Sign up with a work email address, or log in if you already have an account. A free account gives you access to Claude's core capabilities immediately." },
  { n: "03", title: "Choose your plan", body: "For professional procurement use, Claude Pro gives you significantly higher usage limits. For team-wide rollout, ask your IT admin about the Claude for Work (Teams) plan." },
  { n: "04", title: "Try your first S2P prompt", body: 'Paste a supplier contract clause and ask "What are the renewal terms and exit conditions here?" That\'s the fastest way to see the value.' },
];

function GettingStartedContent() {
  const [answer, setAnswer] = useStateSA(null);
  return (
    <div>
      {answer === null && (
        <div style={{ marginBottom: "24px", padding: "20px 22px", background: "#f5f2ec", border: "1px solid #ddd8cf", borderRadius: "3px" }}>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.95rem", fontWeight: 500, color: "#0f1923", marginBottom: "16px" }}>
            Do you have IT permissions to sign up for new software tools?
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setAnswer("yes")} style={{ background: "#c8401a", color: "#fff", border: "none", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>Yes — show me the steps</button>
            <button onClick={() => setAnswer("no")} style={{ background: "transparent", color: "#0f1923", border: "1px solid #c4bdb5", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>No / Not sure</button>
          </div>
        </div>
      )}
      {answer === "no" && (
        <div style={{ marginBottom: "24px", borderLeft: "3px solid #c8401a", paddingLeft: "18px" }}>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", color: "#0f1923", lineHeight: 1.7, marginBottom: "8px" }}>
            <strong>No installation needed.</strong> You've already seen what Claude can do in the demos above — no account required.
          </p>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#6b6560", lineHeight: 1.6, marginBottom: "16px" }}>
            When you're ready to request access through IT, come back and select "Yes". Or — skip the setup entirely and let JAI handle it for your team.
          </p>
          <JAINudge text="JAI integrates into your existing procurement environment — no individual signups or IT tickets required." tight />
          <button onClick={() => setAnswer(null)} style={{ background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0", marginTop: "14px" }}>← Back</button>
        </div>
      )}
      {answer === "yes" && (
        <div>
          {INSTALL_STEPS.map((step, i) => (
            <div key={step.n} style={{ display: "flex", gap: "24px", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: "36px", height: "36px", background: "#0f1923", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.72rem", fontWeight: 700, color: "#c8401a" }}>{step.n}</span>
                </div>
                {i < INSTALL_STEPS.length - 1 && <div style={{ width: "1px", flex: 1, background: "#e0dbd4", margin: "4px 0" }}></div>}
              </div>
              <div style={{ paddingBottom: "28px" }}>
                <h4 style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#0f1923", marginBottom: "6px" }}>{step.title}</h4>
                <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#6b6560", lineHeight: 1.65 }}>{step.body}</p>
              </div>
            </div>
          ))}
          <button onClick={() => setAnswer(null)} style={{ background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0" }}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 02 — Prompting 101
// New article. External-facing. Practical. Subtle JAI pull-through.
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_PRINCIPLES = [
  {
    n: "01",
    title: "Set the role",
    icon: "◈",
    body: "Claude performs better when it knows what kind of expert it's acting as. "You are a procurement contracts analyst" produces tighter, more specialised output than starting cold. The role sets the frame — everything that follows inherits it.",
    example: { bad: "Review this contract", good: "You are a procurement contracts analyst. Review this clause and list every obligation that creates financial exposure for the buyer." },
  },
  {
    n: "02",
    title: "Be specific about the task",
    icon: "◉",
    body: "Vague asks return vague answers. The difference between a useful output and a generic one is almost always in how precisely the task is defined. Ask for exactly what you need — name the decision you're trying to make, the question you need answered, the risk you want assessed.",
    example: { bad: "Tell me about supplier risk", good: "For each country in this supplier list where we have more than one critical supplier, flag the concentration risk and estimate the production impact if that geography became unavailable for 30 days." },
  },
  {
    n: "03",
    title: "Specify the output format",
    icon: "◎",
    body: "Without a format instruction, Claude chooses its own structure — which is often longer than you need and harder to act on. Tell it how to respond: numbered list, table, JSON, bullet points, one paragraph. This single change makes outputs significantly more useful.",
    example: { bad: "Summarise this contract", good: "Summarise this contract. Return: (1) a one-sentence overall risk assessment, (2) three key obligations for the buyer, (3) any clauses that should be reviewed by legal. Use bullet points." },
  },
  {
    n: "04",
    title: "Provide context, not just content",
    icon: "◐",
    body: "The more Claude understands about your situation, the more useful its answer. Don't just paste the document — tell Claude why you're asking. Your role, your organisation's context, the decision that depends on this answer. This context shapes interpretation.",
    example: { bad: "Is this supplier risky?", good: "I'm a procurement manager at a mid-size manufacturer with 60% of our critical components sourced from Southeast Asia. Review this supplier profile and tell me whether this is an acceptable addition to our supplier base or a risk concentration issue." },
  },
];

const PROMPT_TEMPLATES = [
  {
    label: "Contract Review",
    tag: "Contracts",
    tagColor: "#3b6b88",
    prompt: `You are a procurement contracts analyst. Review the clause below and identify:
1. Any auto-renewal terms and the exact notice window required to exit
2. Obligations that create financial exposure for the buyer
3. Any clauses that should be reviewed by legal before signing

Return your findings as a numbered list under each heading. Be specific — quote the relevant language where relevant.

[Paste clause here]`,
    note: "The structure — role, numbered task, output format — is what gets you precise results instead of a generic paragraph.",
  },
  {
    label: "Supplier Risk Scan",
    tag: "Suppliers",
    tagColor: "#4f7a5b",
    prompt: `I'm a procurement manager at a discrete manufacturer. Here is our current supplier list by category and country:

[Paste supplier list]

For each category where we have geographic concentration risk, flag it and suggest two or three alternative supplier geographies with example vendors. Prioritise risks by potential production impact. Return as a table.`,
    note: "Giving Claude your role, specific criteria (geographic concentration), and output format (table) makes the response immediately actionable.",
  },
  {
    label: "RFP First Draft",
    tag: "RFP / Sourcing",
    tagColor: "#6b5b8e",
    prompt: `Draft a professional RFP for the following sourcing requirement:

[Describe what you're buying, volume, key integrations, and compliance requirements]

Include: a scope of work section, evaluation criteria with weightings, submission requirements, and 4–5 questions for suppliers to address. Format with clear section headers. Keep language formal but plain — no procurement jargon.`,
    note: "Specifying what to include and the tone gets you something close to publishable on the first pass.",
  },
  {
    label: "Spend Analysis Briefing",
    tag: "Spend Intelligence",
    tagColor: "#9a5d1a",
    prompt: `You are a procurement analyst. I'm going to paste a summary of our indirect spend data for Q3.

Analyse it and tell me:
1. The top three categories by spend that appear to have the highest maverick spend risk
2. Any category where supplier consolidation looks feasible based on spend distribution
3. A one-paragraph recommendation for where to focus a spend review in Q4

[Paste spend data here]`,
    note: "Framing the ask as a prioritisation exercise — not a full analysis — keeps the output focused and decision-ready.",
  },
];

const COMMON_MISTAKES = [
  {
    mistake: "Starting with no context",
    fix: "Always open with role + situation. Two sentences of context changes the quality of everything that follows.",
  },
  {
    mistake: "Asking for 'a summary' without saying what kind",
    fix: "Decide what you actually need: executive summary, risk summary, one-sentence verdict, structured list. Name it.",
  },
  {
    mistake: "Pasting a document with no question",
    fix: "Claude needs a question, not just content. 'Here's the contract' plus the document returns less than 'Here's the contract — what are the renewal terms?'",
  },
  {
    mistake: "Accepting the first output without refining",
    fix: "The first response is a draft. 'Make this more concise', 'focus only on financial risk', 'reformat as a table' — iterating takes 10 seconds and transforms the output.",
  },
];

function Prompting101Article() {
  const [activeTemplate, setActiveTemplate] = useStateSA(0);
  const [copied, setCopied] = useStateSA(false);
  const [activePrinciple, setActivePrinciple] = useStateSA(null);

  function handleCopy() {
    navigator.clipboard?.writeText(PROMPT_TEMPLATES[activeTemplate].prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Article hero */}
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Guide · Prompting 101</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          How to Write Prompts<br />That Actually Work
        </h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px", marginBottom: "20px" }}>
          Most people underuse Claude because their prompts are too vague. This guide covers the four principles that produce useful, structured, immediately actionable outputs — with templates you can use today.
        </p>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[["4 principles", "#c8401a"], ["12 templates", "#3b6b88"], ["Common mistakes", "#4f7a5b"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#555" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1 — The four principles */}
      <div style={{ marginBottom: "56px" }}>
        <SAEyebrow>The Framework</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px", lineHeight: 1.2 }}>
          Four Principles. One Formula.
        </h2>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "560px", marginBottom: "28px" }}>
          Every effective prompt for procurement work applies some combination of these four moves. Learn them once and they work across contracts, suppliers, RFPs, spend data — anything.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {PROMPT_PRINCIPLES.map((p, i) => (
            <div
              key={p.n}
              style={{ border: "1px solid #e0dbd4", borderRadius: "3px", overflow: "hidden", background: activePrinciple === i ? "#fff" : "#faf8f5" }}
            >
              <button
                onClick={() => setActivePrinciple(activePrinciple === i ? null : i)}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 22px", display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "center", gap: "16px", cursor: "pointer" }}
              >
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.5rem", color: "#c8401a", lineHeight: 1 }}>{p.n}</span>
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.92rem", fontWeight: 600, color: "#0f1923" }}>{p.title}</span>
                <span style={{ color: "#c8401a", fontSize: "1rem", fontWeight: 300, transform: activePrinciple === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
              </button>

              {activePrinciple === i && (
                <div style={{ padding: "0 22px 22px" }}>
                  <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#444", lineHeight: 1.75, marginBottom: "20px" }}>{p.body}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b91c1c", marginBottom: "8px" }}>Weak</div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#7f1d1d", lineHeight: 1.6, margin: 0 }}>{p.example.bad}</p>
                    </div>
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#166534", marginBottom: "8px" }}>Strong</div>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#14532d", lineHeight: 1.6, margin: 0 }}>{p.example.good}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* JAI nudge #1 */}
      <JAINudge text="JAI applies these principles automatically — every query is pre-structured with the right role, context, and format for your procurement data. No prompt engineering required." />

      {/* Section 2 — Template library */}
      <div style={{ marginBottom: "56px", marginTop: "56px" }}>
        <SAEyebrow>Prompt Library</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px", lineHeight: 1.2 }}>
          Ready-to-Use S2P Templates
        </h2>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "540px", marginBottom: "28px" }}>
          Copy any of these, replace the bracketed placeholders with your content, and run it. Each prompt is annotated with why it's structured the way it is.
        </p>

        <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", background: "#faf8f5", overflowX: "auto" }}>
            {PROMPT_TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveTemplate(i)}
                style={{ background: "transparent", border: "none", borderBottom: activeTemplate === i ? "2px solid #c8401a" : "2px solid transparent", padding: "12px 20px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: activeTemplate === i ? 600 : 400, color: activeTemplate === i ? "#0f1923" : "#6b6560", cursor: "pointer", marginBottom: "-1px", whiteSpace: "nowrap", letterSpacing: "0.03em" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Template body */}
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ background: PROMPT_TEMPLATES[activeTemplate].tagColor + "18", color: PROMPT_TEMPLATES[activeTemplate].tagColor, fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "2px", border: `1px solid ${PROMPT_TEMPLATES[activeTemplate].tagColor}40` }}>
                {PROMPT_TEMPLATES[activeTemplate].tag}
              </span>
              <button
                onClick={handleCopy}
                style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: "2px", padding: "6px 14px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", color: copied ? "#4f7a5b" : "#6b6560", cursor: "pointer", transition: "color 0.2s" }}
              >
                {copied ? "✓ Copied" : "Copy prompt"}
              </button>
            </div>

            <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", background: "#faf8f5", border: "1px solid #e8e3da", borderRadius: "3px", padding: "18px", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: "0 0 16px" }}>
              {PROMPT_TEMPLATES[activeTemplate].prompt}
            </pre>

            <div style={{ padding: "12px 16px", background: "#f5f2ec", borderLeft: "3px solid #c08227", borderRadius: "0 3px 3px 0" }}>
              <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#0f1923" }}>Why it works: </span>
              <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#555" }}>{PROMPT_TEMPLATES[activeTemplate].note}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 — Common mistakes */}
      <div style={{ marginBottom: "56px" }}>
        <SAEyebrow>Failure Modes</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px", lineHeight: 1.2 }}>
          Four Mistakes That Kill Output Quality
        </h2>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "540px", marginBottom: "28px" }}>
          Most bad Claude outputs are caused by one of these. Each one has a one-line fix.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {COMMON_MISTAKES.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "20px", padding: "20px 24px", background: i % 2 === 0 ? "#fff" : "#faf8f5", border: "1px solid #e0dbd4", borderTop: i === 0 ? "1px solid #e0dbd4" : "none" }}>
              <div style={{ paddingTop: "2px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", fontWeight: 700, color: "#b91c1c" }}>✕</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", fontWeight: 600, color: "#b91c1c", marginBottom: "6px" }}>{m.mistake}</div>
                <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, color: "#4f7a5b" }}>Fix: </span>{m.fix}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* One-liner cheat sheet */}
      <div style={{ marginBottom: "48px", padding: "28px 32px", background: "#0f1923", borderRadius: "4px" }}>
        <SAEyebrow light>Quick Reference</SAEyebrow>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: "20px" }}>The Prompt Checklist</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            ["Role", "Who is Claude acting as?"],
            ["Task", "What specifically needs doing?"],
            ["Context", "Why does this matter / what's the situation?"],
            ["Format", "How should the output be structured?"],
          ].map(([label, desc]) => (
            <div key={label} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "3px" }}>
              <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "5px" }}>{label}</div>
              <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "420px", lineHeight: 1.55 }}>
            JAI builds all four of these into every query automatically — your procurement data, the right framing, the right format. No checklist needed.
          </p>
          <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#c8401a", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 18px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            Explore JAI →
          </a>
        </div>
      </div>

      {/* Legal */}
      <LegalBlock />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILLER ARTICLES 03–05
// ─────────────────────────────────────────────────────────────────────────────

function FillerArticle({ article }) {
  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>{article.category} · {article.title}</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          {article.title}
        </h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "560px" }}>
          {article.sub}
        </p>
      </div>

      <div style={{ padding: "56px 40px", background: "#faf8f5", border: "1px dashed #c4bdb5", borderRadius: "4px", textAlign: "center" }}>
        <div style={{ width: "52px", height: "52px", background: "#e0dbd4", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.3rem", color: "#888" }}>◌</span>
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f1923", marginBottom: "12px" }}>
          Coming Soon
        </h3>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "400px", margin: "0 auto 24px" }}>
          This article is currently in production. It will appear here when ready.
        </p>
        <a
          href="https://www.jaggaer.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", background: "#0f1923", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "11px 22px", borderRadius: "2px", textDecoration: "none" }}
        >
          Visit Jaggaer.com →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared legal footer
// ─────────────────────────────────────────────────────────────────────────────

function LegalBlock() {
  return (
    <div style={{ padding: "20px 24px", background: "#f0ece4", border: "1px solid #ddd8cf", borderRadius: "3px", marginTop: "48px" }}>
      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "8px" }}>
        Legal Notice
      </div>
      <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "#888", lineHeight: 1.7, margin: 0 }}>
        This page is not affiliated with, endorsed by, or produced in partnership with Anthropic. Claude™ is a product of Anthropic, PBC. All Claude capabilities referenced here are based on publicly available features. Use of Claude is subject to Anthropic's Terms of Service and Usage Policies.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — SampleArtifactsPanel
// ─────────────────────────────────────────────────────────────────────────────

function SampleArtifactsPanel() {
  const [activeArticle, setActiveArticle] = useStateSA(null);

  const article = activeArticle ? ARTICLES.find(a => a.id === activeArticle) : null;

  if (!activeArticle) {
    return <ArticleIndex onSelect={setActiveArticle} />;
  }

  return (
    <ArticleShell article={article} onBack={() => setActiveArticle(null)}>
      {activeArticle === "agent-builder"    && <AgentBuilderArticle />}
      {activeArticle === "prompting-101"    && <Prompting101Article />}
      {activeArticle === "supplier-intelligence" && <FillerArticle article={article} />}
      {activeArticle === "contracts-unpacked"    && <FillerArticle article={article} />}
      {activeArticle === "s2p-automation"        && <FillerArticle article={article} />}
    </ArticleShell>
  );
}

window.SampleArtifactsPanel = SampleArtifactsPanel;

// ══════════════════════════════════════════════════════════════════════════════
// WIRING — what needs to change in the other files:
//
// index.html:
//   REMOVE: <script type="text/babel" ... src="agent-builder.jsx"></script>
//   ADD:    <script type="text/babel" ... src="sample-artifacts.jsx"></script>
//
// sidebar.jsx — NavSection label:
//   CHANGE: label="Agent Builder"
//   TO:     label="Sample Artifacts"
//   AND:    onClick={() => setView("sample-artifacts")}
//
// app.jsx:
//   CHANGE: {view === "agent-builder" && <AgentBuilderPanel />}
//   TO:     {view === "sample-artifacts" && <SampleArtifactsPanel />}
//
// ══════════════════════════════════════════════════════════════════════════════
