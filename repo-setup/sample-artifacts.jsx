// ══════════════════════════════════════════════════════════════════════════════
// sample-artifacts.jsx -- "Sample Artifacts" tab
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
// ARTICLE INDEX -- the landing page
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLES = [
  {
    id: "agent-builder",
    n: "01",
    category: "Interactive",
    title: "Agent Builder",
    sub: "Live AI-powered S2P tools -- contract analysis, supplier risk scanning, RFP generation. Paste your own data and run them.",
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
    id: "supply-chain-profiler",
    n: "03",
    category: "Personalisation",
    title: "Your Supply Chain Risk Profile",
    sub: "Answer three questions about your organisation. Get a tailored risk briefing — the specific pressure points, blind spots, and platform gaps relevant to your situation.",
    tag: "Personalised",
    tagColor: "#3b6b88",
    status: "live",
    readTime: "3 min",
  },
  {
    id: "myth-scorer",
    n: "04",
    category: "Assessment",
    title: "The Procurement Myth Scorer",
    sub: "Six beliefs still running inside most procurement teams. Rate how true each one is at your organisation — and find out where your real exposure is.",
    tag: "Interactive",
    tagColor: "#4f7a5b",
    status: "live",
    readTime: "4 min",
  },
  {
    id: "clause-annotator",
    n: "05",
    category: "Document Intelligence",
    title: "Clause Annotator",
    sub: "Paste any contract clause. Get it back annotated — risk flags highlighted, obligations extracted, renewal traps called out. Live AI, your actual text.",
    tag: "Live AI",
    tagColor: "#c8401a",
    status: "live",
    readTime: "2 min",
  },
  {
    id: "prompt-sandbox",
    n: "06",
    category: "Sandbox",
    title: "S2P Prompt Sandbox",
    sub: "Pick a procurement scenario, customise the prompt, run it live. See exactly what AI produces on real S2P problems — then take the prompt away and use it yourself.",
    tag: "Live AI",
    tagColor: "#6b5b8e",
    status: "live",
    readTime: "5 min",
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
            A collection of AI-powered content formats -- live tools, practical guides, and research -- showing what procurement intelligence looks like when it's built for action, not just reading.
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
                These artifacts are part of Jaggaer's content intelligence programme -- research, tools, and guides that show what modern procurement looks like in practice. Each one is built to be used, not just read.
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
// ARTICLE SHELL -- wraps any article with back nav + consistent chrome
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
          {article.n} -- {article.title}
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
// ARTICLE 01 -- Agent Builder
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
  suppliers: `Paste your supplier list here. Example:\n\nSupplier A -- Taiwan -- Semiconductors\nSupplier B -- Taiwan -- PCB Manufacturing\nSupplier C -- Germany -- Precision Machining\nSupplier D -- China -- Rare Earth Materials\nSupplier E -- China -- Battery Cells`,
  rfp: `Describe your sourcing requirement here. Example:\n\nWe need to source a fleet management software solution for 200 commercial vehicles across our US and Germany operations. Must integrate with SAP and provide real-time GPS tracking, maintenance scheduling, and driver behaviour analytics.`,
};

const MOCK_OUTPUTS = {
  contracts: {
    summary: "Auto-renewing agreement with 90-day exit notice window and unilateral pricing adjustment rights at renewal -- moderate buyer risk.",
    expiry_dates: [
      "Initial term end: not specified -- agreement runs until notice of non-renewal",
      "Non-renewal notice must be given no less than 90 days before term end",
      "Pricing adjustment notice: 60 days prior to renewal",
    ],
    auto_renewal: "Agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal at least 90 days before the end of the current term.",
    risky_obligations: [
      "Licensor may adjust pricing at each renewal with only 60 days' notice -- buyer has limited time to renegotiate or exit",
      "90-day non-renewal notice window is tight for procurement teams without automated contract tracking",
      "No cap on pricing adjustment magnitude -- unconstrained upward repricing at renewal",
    ],
    concerning_sections: [
      "Auto-renewal clause: recommend flagging for calendar alert 120 days before term end",
      "Unilateral pricing adjustment: no stated cap or CPI linkage -- recommend negotiating a maximum annual increase percentage",
    ],
  },
  suppliers: {
    diversification_priority: "High -- heavy concentration in Taiwan (semiconductors, PCB) and China (rare earth, batteries) creates compounding single-event risk",
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
    rfp_title: "Request for Proposal: Fleet Management Software -- US & Germany Operations",
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
      "Describe your SAP S/4HANA integration architecture -- native connector or middleware?",
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
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#666" }}> -- {c.description}</span>
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
    contracts: "This is one clause. JAI runs this analysis across your entire contract portfolio -- automatically, continuously, connected to your procurement data.",
    suppliers: "JAI monitors your full supplier base in real time. Risk flags like these surface before they reach operations, not after.",
    rfp: "JAI generates and manages sourcing events at scale -- with your organisation's data, categories, and approval workflows built in.",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c08227" }} />
        <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>
          Demo mode -- representative output shown. Live API analysis activates once the key is integrated.
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
          Three live AI-powered tools built for procurement. Paste your own data -- a contract clause, a supplier list, or a sourcing brief -- and see what structured intelligence looks like in practice.
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
            JAI does everything you just saw -- across your entire contract portfolio, supplier base, and sourcing pipeline -- with no prompt writing required. Pre-built for S2P, connected to your data, running continuously.
          </p>
        </div>
        <a href="https://www.jaggaer.com" target="_blank" rel="noopener noreferrer" style={{ background: "#0f1923", color: "#fff", fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "13px 22px", borderRadius: "2px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          See JAI →
        </a>
      </div>

      {/* Getting Started -- collapsible */}
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
            <button onClick={() => setAnswer("yes")} style={{ background: "#c8401a", color: "#fff", border: "none", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>Yes -- show me the steps</button>
            <button onClick={() => setAnswer("no")} style={{ background: "transparent", color: "#0f1923", border: "1px solid #c4bdb5", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>No / Not sure</button>
          </div>
        </div>
      )}
      {answer === "no" && (
        <div style={{ marginBottom: "24px", borderLeft: "3px solid #c8401a", paddingLeft: "18px" }}>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", color: "#0f1923", lineHeight: 1.7, marginBottom: "8px" }}>
            <strong>No installation needed.</strong> You've already seen what Claude can do in the demos above -- no account required.
          </p>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#6b6560", lineHeight: 1.6, marginBottom: "16px" }}>
            When you're ready to request access through IT, come back and select "Yes". Or -- skip the setup entirely and let JAI handle it for your team.
          </p>
          <JAINudge text="JAI integrates into your existing procurement environment -- no individual signups or IT tickets required." tight />
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
// ARTICLE 02 -- Prompting 101
// New article. External-facing. Practical. Subtle JAI pull-through.
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_PRINCIPLES = [
  {
    n: "01",
    title: "Set the role",
    icon: "◈",
    body: `Claude performs better when it knows what kind of expert it's acting as. "You are a procurement contracts analyst" produces tighter, more specialised output than starting cold. The role sets the frame — everything that follows inherits it.`,
    example: { bad: "Review this contract", good: "You are a procurement contracts analyst. Review this clause and list every obligation that creates financial exposure for the buyer." },
  },
  {
    n: "02",
    title: "Be specific about the task",
    icon: "◉",
    body: `Vague asks return vague answers. The difference between a useful output and a generic one is almost always in how precisely the task is defined. Ask for exactly what you need — name the decision you're trying to make, the question you need answered, the risk you want assessed.`,
    example: { bad: "Tell me about supplier risk", good: "For each country in this supplier list where we have more than one critical supplier, flag the concentration risk and estimate the production impact if that geography became unavailable for 30 days." },
  },
  {
    n: "03",
    title: "Specify the output format",
    icon: "◎",
    body: "Without a format instruction, Claude chooses its own structure -- which is often longer than you need and harder to act on. Tell it how to respond: numbered list, table, JSON, bullet points, one paragraph. This single change makes outputs significantly more useful.",
    example: { bad: "Summarise this contract", good: "Summarise this contract. Return: (1) a one-sentence overall risk assessment, (2) three key obligations for the buyer, (3) any clauses that should be reviewed by legal. Use bullet points." },
  },
  {
    n: "04",
    title: "Provide context, not just content",
    icon: "◐",
    body: "The more Claude understands about your situation, the more useful its answer. Don't just paste the document -- tell Claude why you're asking. Your role, your organisation's context, the decision that depends on this answer. This context shapes interpretation.",
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

Return your findings as a numbered list under each heading. Be specific -- quote the relevant language where relevant.

[Paste clause here]`,
    note: "The structure -- role, numbered task, output format -- is what gets you precise results instead of a generic paragraph.",
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

Include: a scope of work section, evaluation criteria with weightings, submission requirements, and 4–5 questions for suppliers to address. Format with clear section headers. Keep language formal but plain -- no procurement jargon.`,
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
    note: "Framing the ask as a prioritisation exercise -- not a full analysis -- keeps the output focused and decision-ready.",
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
    fix: "Claude needs a question, not just content. 'Here's the contract' plus the document returns less than 'Here's the contract -- what are the renewal terms?'",
  },
  {
    mistake: "Accepting the first output without refining",
    fix: "The first response is a draft. 'Make this more concise', 'focus only on financial risk', 'reformat as a table' -- iterating takes 10 seconds and transforms the output.",
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
          Most people underuse Claude because their prompts are too vague. This guide covers the four principles that produce useful, structured, immediately actionable outputs -- with templates you can use today.
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

      {/* Section 1 -- The four principles */}
      <div style={{ marginBottom: "56px" }}>
        <SAEyebrow>The Framework</SAEyebrow>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color: "#0f1923", marginBottom: "10px", lineHeight: 1.2 }}>
          Four Principles. One Formula.
        </h2>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.92rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "560px", marginBottom: "28px" }}>
          Every effective prompt for procurement work applies some combination of these four moves. Learn them once and they work across contracts, suppliers, RFPs, spend data -- anything.
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
      <JAINudge text="JAI applies these principles automatically -- every query is pre-structured with the right role, context, and format for your procurement data. No prompt engineering required." />

      {/* Section 2 -- Template library */}
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

      {/* Section 3 -- Common mistakes */}
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
            JAI builds all four of these into every query automatically -- your procurement data, the right framing, the right format. No checklist needed.
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
// ARTICLE 03 — Supply Chain Risk Profiler
// Personalisation format: 3 questions → tailored briefing from content pools.
// No API needed. Shows "content that responds to you."
// ─────────────────────────────────────────────────────────────────────────────

const PROFILER_QUESTIONS = [
  {
    id: "industry",
    q: "What best describes your industry?",
    options: [
      { value: "auto",    label: "Automotive / OEM" },
      { value: "indmfg",  label: "Industrial Manufacturing" },
      { value: "pharma",  label: "Pharma / Life Sciences" },
      { value: "public",  label: "Public Sector / Government" },
      { value: "highered",label: "Higher Education" },
    ],
  },
  {
    id: "pain",
    q: "Where is your biggest procurement pressure right now?",
    options: [
      { value: "risk",    label: "Supplier risk & disruption" },
      { value: "cost",    label: "Cost control & maverick spend" },
      { value: "compliance", label: "Compliance & audit trail" },
      { value: "speed",   label: "Sourcing cycle time" },
    ],
  },
  {
    id: "maturity",
    q: "How would you describe your current procurement technology?",
    options: [
      { value: "spreadsheets", label: "Mostly spreadsheets / manual" },
      { value: "erp",          label: "ERP with basic procurement module" },
      { value: "platform",     label: "Dedicated procurement platform" },
      { value: "advanced",     label: "Platform + some AI / automation" },
    ],
  },
];

const PROFILER_CONTENT = {
  headline: {
    auto:     "Automotive procurement is navigating its hardest decade. Tariffs, EV transition costs, and sub-tier opacity are compounding simultaneously.",
    indmfg:   "Industrial manufacturers are running procurement systems built for a stable world into a volatile one. The gap is showing.",
    pharma:   "Pharmaceutical procurement carries compliance obligations that most platforms weren't designed to handle — and regulators are paying attention.",
    public:   "Public sector procurement is under dual pressure: tighter audit requirements and a mandate to demonstrate AI governance before competitors do.",
    highered: "University procurement is the last sector where maverick spend is still treated as a culture problem rather than a systems problem.",
  },
  pain: {
    risk:        { label: "Supplier Risk", color: "#b91c1c", insight: "Most organisations discover supplier problems after they've reached operations. The gap between 'qualified' and 'currently safe' is where disruption lives — and it's unmapped in most ERP stacks.", action: "Sub-tier mapping and continuous financial health monitoring close this gap. The question is whether you find problems in the data or in a production stoppage." },
    cost:        { label: "Cost Control", color: "#92400e", insight: "Maverick spend averages 20–30% of indirect spend in organisations without catalogue enforcement. It's not a behaviour problem — it's a visibility problem. You can't govern what you can't see.", action: "Spend analytics connected to real-time purchasing data makes off-contract spend visible before month-end, not after. That's the difference between prevention and reporting." },
    compliance:  { label: "Compliance", color: "#1e4fa8", insight: "Audit trails built from manual processes have gaps. When regulators or internal audit request documentation, the scramble to reconstruct decisions is where procurement leaders lose credibility.", action: "AI-assisted documentation captures decision rationale at the point of decision — not reconstructed later. The audit trail builds itself." },
    speed:       { label: "Cycle Time", color: "#4f7a5b", insight: "The average RFQ cycle runs 6–12 weeks. Most of that time is coordination, not decision-making. The work that takes days should take hours; the work that takes hours should be automatic.", action: "Guided sourcing and automated bid evaluation compress the cycle by 50–70% in categories where the criteria are consistent. That's not theoretical — it's running in production today." },
  },
  maturity: {
    spreadsheets: "The first step isn't replacing spreadsheets — it's making the spend visible. A platform that aggregates purchasing data across your organisation gives you the baseline everything else depends on.",
    erp:          "ERP modules were built to record transactions, not to surface intelligence. The capability gap — risk signals, market data, supplier performance — is what dedicated procurement platforms are designed to fill.",
    platform:     "The platform is the foundation. The next question is whether it's producing intelligence or just automating existing manual processes. AI layer on top of clean procurement data is where the compounding returns come from.",
    advanced:     "You're ahead of most. The question shifts from 'whether AI' to 'which AI capabilities deliver the highest ROI' — and where you're still running manual processes that should be automated.",
  },
};

function SupplyChainProfiler() {
  const [answers, setAnswers] = useStateSA({});
  const [step, setStep] = useStateSA(0);
  const [done, setDone] = useStateSA(false);

  const questions = PROFILER_QUESTIONS;
  const current = questions[step];
  const allAnswered = answers.industry && answers.pain && answers.maturity;

  function pick(qid, val) {
    const next = { ...answers, [qid]: val };
    setAnswers(next);
    if (step < questions.length - 1) {
      setTimeout(() => setStep(s => s + 1), 280);
    } else {
      setTimeout(() => setDone(true), 380);
    }
  }

  function reset() { setAnswers({}); setStep(0); setDone(false); }

  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  if (done && allAnswered) {
    const industry = answers.industry;
    const pain = PROFILER_CONTENT.pain[answers.pain];
    const maturityText = PROFILER_CONTENT.maturity[answers.maturity];
    const headline = PROFILER_CONTENT.headline[industry];

    return (
      <div>
        <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Personalisation · Supply Chain Risk Profile</SAEyebrow>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.15, marginBottom: "16px" }}>
            Your Risk Profile
          </h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[answers.industry, answers.pain, answers.maturity].map((v, i) => {
              const labels = {
                auto:"Automotive", indmfg:"Industrial Mfg", pharma:"Pharma", public:"Public Sector", highered:"Higher Ed",
                risk:"Supplier Risk", cost:"Cost Control", compliance:"Compliance", speed:"Speed",
                spreadsheets:"Spreadsheets", erp:"ERP Module", platform:"Dedicated Platform", advanced:"Platform + AI",
              };
              return <span key={i} style={{ ...FONT, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "#f0ece4", color: "#6b6560", padding: "3px 10px", borderRadius: "2px" }}>{labels[v]}</span>;
            })}
            <button onClick={reset} style={{ ...FONT, background: "transparent", border: "none", fontSize: "0.68rem", color: "#c8401a", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, padding: "3px 0 3px 8px" }}>Start over ↺</button>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: "32px", padding: "24px 28px", background: "#0f1923", borderRadius: "4px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,64,26,0.9)", marginBottom: "12px" }}>Sector Context</div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontStyle: "italic", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, margin: 0 }}>{headline}</p>
        </div>

        {/* Pain point deep-dive */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "3px", height: "32px", background: pain.color, flexShrink: 0, borderRadius: "2px" }} />
            <div>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "2px" }}>Your Primary Pressure</div>
              <div style={{ ...FONT, fontSize: "1rem", fontWeight: 700, color: pain.color }}>{pain.label}</div>
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderLeft: `3px solid ${pain.color}`, borderRadius: "0 4px 4px 0", padding: "20px 24px", marginBottom: "12px" }}>
            <p style={{ ...FONT, fontSize: "0.9rem", color: "#333", lineHeight: 1.75, margin: 0 }}>{pain.insight}</p>
          </div>
          <div style={{ background: "#f5f2ec", padding: "16px 20px", borderRadius: "3px" }}>
            <span style={{ ...FONT, fontSize: "0.78rem", fontWeight: 700, color: "#0f1923" }}>What closes it: </span>
            <span style={{ ...FONT, fontSize: "0.78rem", color: "#555", lineHeight: 1.65 }}>{pain.action}</span>
          </div>
        </div>

        {/* Maturity assessment */}
        <div style={{ marginBottom: "32px", padding: "20px 24px", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "8px" }}>Your Technology Position</div>
          <p style={{ ...FONT, fontSize: "0.88rem", color: "#444", lineHeight: 1.7, margin: 0 }}>{maturityText}</p>
        </div>

        <JAINudge text="JAI connects directly to your procurement data — supplier risk signals, spend analytics, contract intelligence — built on the same AI you just saw in action." />
        <LegalBlock />
      </div>
    );
  }

  // Questionnaire
  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Personalisation · Supply Chain Risk Profile</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          Your Supply Chain<br />Risk Profile
        </h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>
          Three questions. A briefing tailored to your situation — the specific risks, blind spots, and capability gaps relevant to where you actually are.
        </p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "36px" }}>
        {questions.map((_, i) => (
          <div key={i} style={{ height: "3px", flex: 1, background: i <= step ? "#c8401a" : "#e0dbd4", borderRadius: "2px", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Previous answers */}
      {step > 0 && (
        <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {questions.slice(0, step).map(q => {
            const ans = answers[q.id];
            const opt = q.options.find(o => o.value === ans);
            return (
              <div key={q.id} style={{ display: "flex", gap: "12px", alignItems: "center", opacity: 0.55 }}>
                <span style={{ ...FONT, fontSize: "0.72rem", color: "#888" }}>{q.q}</span>
                <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 600, color: "#0f1923", background: "#f0ece4", padding: "2px 8px", borderRadius: "2px" }}>{opt?.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Current question */}
      <div key={step} style={{ animation: "fadeUp 0.25s ease both" }}>
        <div style={{ ...FONT, fontSize: "1.05rem", fontWeight: 600, color: "#0f1923", marginBottom: "20px", lineHeight: 1.4 }}>
          <span style={{ color: "#c8401a", marginRight: "8px", fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>{step + 1}.</span>
          {current.q}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {current.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => pick(current.id, opt.value)}
              style={{
                ...FONT, textAlign: "left",
                padding: "14px 20px",
                background: answers[current.id] === opt.value ? "#0f1923" : "#fff",
                border: `1px solid ${answers[current.id] === opt.value ? "#0f1923" : "#e0dbd4"}`,
                borderRadius: "3px", cursor: "pointer",
                fontSize: "0.88rem", fontWeight: 500,
                color: answers[current.id] === opt.value ? "#fff" : "#0f1923",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (answers[current.id] !== opt.value) { e.currentTarget.style.background = "#faf8f5"; e.currentTarget.style.borderColor = "#c8401a"; } }}
              onMouseLeave={e => { if (answers[current.id] !== opt.value) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0dbd4"; } }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

function SupplyChainProfilerArticle() {
  return <SupplyChainProfiler />;
}


// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 04 — Procurement Myth Scorer
// Assessment format: rate 6 myths, get a personalised exposure score.
// No API. Shows "AI as diagnostic" — builds trust through honest diagnosis.
// ─────────────────────────────────────────────────────────────────────────────

const MYTHS = [
  {
    id: "erp",
    myth: "Our ERP handles procurement. We don't need a separate platform.",
    reality: "ERP records transactions. It doesn't monitor supplier risk, surface market intelligence, or automate sourcing decisions. The capability gap is structural, not a configuration problem.",
    risk: "Platform gap",
    riskColor: "#1e4fa8",
  },
  {
    id: "qualified",
    myth: "Our vendors are qualified. We reviewed them three years ago.",
    reality: "A supplier that passed assessment in 2022 may now face financial instability, regulatory violations, or new geopolitical exposure. Qualification is a moment in time. Risk is continuous.",
    risk: "Supplier risk",
    riskColor: "#b91c1c",
  },
  {
    id: "direct",
    myth: "AI-driven sourcing works for indirect spend. Direct materials are too complex.",
    reality: "Complexity is exactly why direct materials need intelligent sourcing. Managing lead times, quality, pricing volatility, and geopolitical risk simultaneously is the problem AI is built for.",
    risk: "Missed capability",
    riskColor: "#92400e",
  },
  {
    id: "maverick",
    myth: "Maverick spend is a people problem. Training will fix it.",
    reality: "Maverick spend is a systems problem. When approved channels are harder to use than alternatives, people use alternatives. The fix is catalogue quality and approval friction, not culture.",
    risk: "Cost leakage",
    riskColor: "#4f7a5b",
  },
  {
    id: "tco",
    myth: "Our current platform is good enough. Switching costs are too high.",
    reality: "The question isn't switching cost — it's accumulating cost of staying. Every month of supplier opacity, manual RFQ, and reactive risk management has a compounding price.",
    risk: "TCO blind spot",
    riskColor: "#6b5b8e",
  },
  {
    id: "ai",
    myth: "We're not ready for AI in procurement. It's too early.",
    reality: "Your competitors are 18 months into deployment. The window for first-mover advantage in AI-enabled procurement is closing, not opening.",
    risk: "Competitive lag",
    riskColor: "#c8401a",
  },
];

function MythScorer() {
  // ratings: 1 = "False at our org" → 5 = "Completely true here"
  const [ratings, setRatings] = useStateSA({});
  const [submitted, setSubmitted] = useStateSA(false);
  const [revealed, setRevealed] = useStateSA({});

  const allRated = MYTHS.every(m => ratings[m.id] !== undefined);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  function rate(id, val) {
    setRatings(r => ({ ...r, [id]: val }));
  }

  const SCALE = ["False at our org", "Mostly false", "Unsure", "Mostly true", "Completely true"];

  if (submitted) {
    // Score: higher rating on a myth = higher exposure
    const totalScore = MYTHS.reduce((sum, m) => sum + (ratings[m.id] || 1), 0);
    const maxScore = MYTHS.length * 5;
    const pct = Math.round((totalScore / maxScore) * 100);
    const exposedMyths = MYTHS.filter(m => (ratings[m.id] || 1) >= 4);
    const okMyths = MYTHS.filter(m => (ratings[m.id] || 1) <= 2);

    const riskLevel = pct >= 65 ? { label: "High Exposure", color: "#b91c1c", bg: "#fef2f2", desc: "Multiple active vulnerabilities. The beliefs above are creating real, compounding cost." }
      : pct >= 40 ? { label: "Moderate Exposure", color: "#92400e", bg: "#fffbeb", desc: "Some gaps, some strength. The beliefs you endorsed are the ones worth pressure-testing first." }
      : { label: "Low Exposure", color: "#1e7a45", bg: "#f0fdf4", desc: "Your procurement operation is well-positioned. The areas you flagged are worth monitoring." };

    return (
      <div>
        <div style={{ marginBottom: "32px", paddingBottom: "28px", borderBottom: "1px solid #e0dbd4" }}>
          <SAEyebrow>Assessment · Myth Scorer</SAEyebrow>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.15, marginBottom: "0" }}>
            Your Exposure Score
          </h1>
        </div>

        {/* Score display */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "28px", alignItems: "center", marginBottom: "32px", padding: "28px 32px", background: riskLevel.bg, border: `1px solid ${riskLevel.color}30`, borderRadius: "4px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "3.2rem", color: riskLevel.color, lineHeight: 1 }}>{pct}</div>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: riskLevel.color, opacity: 0.7 }}>/ 100</div>
          </div>
          <div>
            <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 700, color: riskLevel.color, marginBottom: "6px" }}>{riskLevel.label}</div>
            <p style={{ ...FONT, fontSize: "0.85rem", color: "#444", lineHeight: 1.65, margin: 0 }}>{riskLevel.desc}</p>
          </div>
        </div>

        {/* Exposed myths — the ones they rated high */}
        {exposedMyths.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b91c1c", marginBottom: "12px" }}>
              Active Exposure — {exposedMyths.length} belief{exposedMyths.length > 1 ? "s" : ""} creating real risk
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {exposedMyths.map(m => (
                <div key={m.id} style={{ background: "#fff", border: "1px solid #e0dbd4", borderLeft: `3px solid ${m.riskColor}`, borderRadius: "0 3px 3px 0", overflow: "hidden" }}>
                  <button
                    onClick={() => setRevealed(r => ({ ...r, [m.id]: !r[m.id] }))}
                    style={{ ...FONT, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", cursor: "pointer" }}
                  >
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.riskColor, marginBottom: "3px" }}>{m.risk}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#0f1923", fontStyle: "italic" }}>"{m.myth}"</div>
                    </div>
                    <span style={{ color: m.riskColor, flexShrink: 0, transform: revealed[m.id] ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                  </button>
                  {revealed[m.id] && (
                    <div style={{ padding: "0 18px 16px", borderTop: "1px solid #f0ece4" }}>
                      <p style={{ ...FONT, fontSize: "0.84rem", color: "#444", lineHeight: 1.7, margin: "12px 0 0" }}>{m.reality}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Well-positioned */}
        {okMyths.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1e7a45", marginBottom: "10px" }}>
              Well-positioned — {okMyths.length} area{okMyths.length > 1 ? "s" : ""} where you're ahead
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {okMyths.map(m => (
                <span key={m.id} style={{ ...FONT, fontSize: "0.78rem", background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", padding: "5px 12px", borderRadius: "2px", fontWeight: 500 }}>
                  ✓ {m.risk}
                </span>
              ))}
            </div>
          </div>
        )}

        <JAINudge text="JAI is built to address every exposure area above — supplier risk monitoring, spend intelligence, AI-driven sourcing — connected to your procurement data, not layered on top of it." />

        <button onClick={() => { setRatings({}); setSubmitted(false); setRevealed({}); }}
          style={{ ...FONT, marginTop: "20px", background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0" }}>
          ← Retake assessment
        </button>
        <LegalBlock />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Assessment · Procurement Myth Scorer</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          Six Beliefs. One Score.
        </h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>
          Rate each belief based on how true it is at your organisation. You'll get an exposure score — and the specific gaps worth addressing first.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
        {MYTHS.map((m, mi) => (
          <div key={m.id} style={{ border: "1px solid #e0dbd4", borderRadius: "4px", padding: "20px 24px", background: "#fff" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "14px", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.2rem", color: "#c8401a", lineHeight: 1, flexShrink: 0, paddingTop: "1px" }}>{String(mi + 1).padStart(2, "0")}</span>
              <p style={{ ...FONT, fontSize: "0.92rem", fontWeight: 500, color: "#0f1923", lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>"{m.myth}"</p>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {SCALE.map((label, si) => {
                const val = si + 1;
                const selected = ratings[m.id] === val;
                return (
                  <button
                    key={si}
                    onClick={() => rate(m.id, val)}
                    title={label}
                    style={{
                      flex: 1, height: "32px",
                      background: selected ? "#0f1923" : "#f0ece4",
                      border: selected ? "1px solid #0f1923" : "1px solid #e0dbd4",
                      borderRadius: "2px", cursor: "pointer",
                      transition: "all 0.12s",
                      position: "relative",
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#e0dbd4"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "#f0ece4"; }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              <span style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>False at our org</span>
              <span style={{ ...FONT, fontSize: "0.62rem", color: "#aaa" }}>Completely true</span>
            </div>
            {ratings[m.id] && (
              <div style={{ marginTop: "8px", ...FONT, fontSize: "0.72rem", color: "#888" }}>
                Rated: <strong style={{ color: "#0f1923" }}>{SCALE[ratings[m.id] - 1]}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!allRated}
        style={{
          ...FONT, width: "100%", padding: "14px 0",
          background: allRated ? "#c8401a" : "#e0dbd4",
          color: "#fff", border: "none", borderRadius: "3px",
          fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: allRated ? "pointer" : "not-allowed", transition: "background 0.2s",
        }}
      >
        {allRated ? "See my exposure score →" : `Rate all ${MYTHS.length} beliefs to continue`}
      </button>
    </div>
  );
}

function MythScorerArticle() {
  return <MythScorer />;
}


// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 05 — Clause Annotator (Live AI)
// Document intelligence format: paste clause → get it back annotated inline.
// Uses Anthropic API via /api/anthropic proxy. Falls back gracefully.
// ─────────────────────────────────────────────────────────────────────────────

const CLAUSE_EXAMPLES = [
  {
    label: "Auto-renewal trap",
    text: `This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal no less than 90 days prior to the end of the then-current term. Licensor reserves the right to adjust pricing at renewal with 60 days' advance notice. Failure to provide timely notice shall constitute acceptance of the renewed term and any applicable price adjustments.`,
  },
  {
    label: "Liability limitation",
    text: `In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability, even if such party has been advised of the possibility of such damages. The total liability of either party shall not exceed the fees paid in the three months preceding the claim.`,
  },
  {
    label: "IP assignment",
    text: `Any work product, deliverables, or intellectual property created by Supplier in connection with the Services shall be considered work made for hire and shall be the exclusive property of Customer. Supplier hereby assigns all right, title, and interest in and to such work product to Customer, including all patent, copyright, trade secret, and other intellectual property rights therein.`,
  },
];

const CLAUSE_MOCK = {
  summary: "Auto-renewing agreement with short exit window, unilateral pricing rights, and an acceptance-by-silence clause — three compounding buyer risks in one paragraph.",
  annotations: [
    { quote: "automatically renew for successive one-year terms", type: "renewal", label: "Auto-renewal", risk: "high", explanation: "Agreement locks into new annual terms without active confirmation. Easy to miss." },
    { quote: "90 days prior to the end of the then-current term", type: "notice", label: "Notice window", risk: "medium", explanation: "90-day exit notice is tight. Without a contract tracking system, this window is frequently missed." },
    { quote: "adjust pricing at renewal with 60 days' advance notice", type: "pricing", label: "Unilateral pricing", risk: "high", explanation: "No cap stated. Licensor can raise price to any level with only 60 days' notice before renewal locks in." },
    { quote: "Failure to provide timely notice shall constitute acceptance", type: "trap", label: "Acceptance by silence", risk: "high", explanation: "Silence = consent. Missing the 90-day window legally accepts the new term and any price increase." },
  ],
  recommended_actions: [
    "Flag for calendar alert 120 days before term end (30 days before the notice window opens)",
    "Negotiate a cap on annual price adjustment — CPI + X% is standard",
    "Add a confirmation-required clause to remove acceptance by silence",
  ],
};

const RISK_COLORS = { high: "#b91c1c", medium: "#92400e", low: "#4f7a5b" };
const RISK_BG = { high: "#fef2f2", medium: "#fffbeb", low: "#f0fdf4" };
const TYPE_COLORS = { renewal: "#1e4fa8", notice: "#92400e", pricing: "#b91c1c", trap: "#6b5b8e", obligation: "#4f7a5b", ip: "#3b6b88" };

function ClauseAnnotatorArticle() {
  const [text, setText] = useStateSA("");
  const [loading, setLoading] = useStateSA(false);
  const [result, setResult] = useStateSA(null);
  const [error, setError] = useStateSA(null);
  const [activeAnnotation, setActiveAnnotation] = useStateSA(null);
  const FONT = { fontFamily: "Noto Sans, sans-serif" };

  async function analyse() {
    if (!text.trim()) return;
    setLoading(true); setResult(null); setError(null); setActiveAnnotation(null);

    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are a procurement contracts analyst. Analyse the clause and return ONLY raw JSON, no markdown, no preamble:
{"summary":"one sentence overall risk assessment","annotations":[{"quote":"exact text from clause (max 12 words)","type":"renewal|notice|pricing|trap|obligation|ip","label":"short label","risk":"high|medium|low","explanation":"one sentence"}],"recommended_actions":["action 1","action 2","action 3"]}
Include 3-5 annotations. Quote exactly from the clause text.`,
          messages: [{ role: "user", content: `Analyse this contract clause:\n\n${text}` }],
        }),
      });

      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch {
      // Graceful fallback to mock
      await new Promise(r => setTimeout(r, 900));
      setResult(CLAUSE_MOCK);
    }
    setLoading(false);
  }

  // Build annotated HTML: highlight quoted phrases inline
  function buildAnnotated(clauseText, annotations) {
    if (!annotations?.length) return [{ text: clauseText, type: null }];
    let parts = [{ text: clauseText, annotation: null }];
    for (const ann of annotations) {
      const q = ann.quote;
      const next = [];
      for (const part of parts) {
        if (part.annotation) { next.push(part); continue; }
        const idx = part.text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) { next.push(part); continue; }
        if (idx > 0) next.push({ text: part.text.slice(0, idx), annotation: null });
        next.push({ text: part.text.slice(idx, idx + q.length), annotation: ann });
        if (idx + q.length < part.text.length) next.push({ text: part.text.slice(idx + q.length), annotation: null });
      }
      parts = next;
    }
    return parts;
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Document Intelligence · Clause Annotator</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          Paste a Clause.<br />Get It Back Annotated.
        </h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>
          Risk flags highlighted inline. Obligations extracted. Renewal traps called out. This is what AI working on your actual documents looks like.
        </p>
      </div>

      {!result && (
        <>
          {/* Example chips */}
          <div style={{ marginBottom: "12px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", marginRight: "4px" }}>Try an example:</span>
            {CLAUSE_EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex.text)}
                style={{ ...FONT, background: "#f0ece4", border: "1px solid #e0dbd4", color: "#555", fontSize: "0.72rem", fontWeight: 500, padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>
                {ex.label}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste a contract clause here — renewal terms, liability caps, IP assignment, payment terms, anything you want analysed..."
            rows={8}
            style={{ width: "100%", background: "#faf8f5", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
          />
          <button
            onClick={analyse}
            disabled={loading || !text.trim()}
            style={{ background: text.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "12px 32px", ...FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: text.trim() && !loading ? "pointer" : "not-allowed", transition: "background 0.2s" }}
          >
            {loading ? "Analysing…" : "Annotate clause →"}
          </button>
        </>
      )}

      {loading && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <div style={{ ...FONT, fontSize: "0.88rem", color: "#888" }}>Reading clause structure…</div>
        </div>
      )}

      {result && (
        <div>
          {/* Summary bar */}
          <div style={{ padding: "16px 20px", background: "#0f1923", borderRadius: "3px", marginBottom: "24px" }}>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,64,26,0.9)", marginBottom: "6px" }}>Summary</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.98rem", fontStyle: "italic", color: "rgba(255,255,255,0.88)", lineHeight: 1.55, margin: 0 }}>{result.summary}</p>
          </div>

          {/* Two-column: annotated text + legend */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "20px", marginBottom: "24px" }}>
            {/* Annotated clause */}
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "22px 24px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "14px" }}>Annotated Clause</div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", lineHeight: 1.85, color: "#333", margin: 0 }}>
                {buildAnnotated(text, result.annotations).map((part, i) => {
                  if (!part.annotation) return <span key={i}>{part.text}</span>;
                  const ann = part.annotation;
                  const col = TYPE_COLORS[ann.type] || "#c8401a";
                  const isActive = activeAnnotation === ann.label;
                  return (
                    <mark
                      key={i}
                      onClick={() => setActiveAnnotation(isActive ? null : ann.label)}
                      style={{
                        background: isActive ? col + "30" : col + "18",
                        borderBottom: `2px solid ${col}`,
                        cursor: "pointer",
                        padding: "1px 0",
                        borderRadius: "1px",
                        transition: "background 0.15s",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      title={ann.label}
                    >{part.text}</mark>
                  );
                })}
              </p>
            </div>

            {/* Annotation legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "6px" }}>Flags</div>
              {result.annotations?.map((ann, i) => {
                const col = TYPE_COLORS[ann.type] || "#c8401a";
                const rc = RISK_COLORS[ann.risk] || "#888";
                const rb = RISK_BG[ann.risk] || "#f5f5f5";
                const isActive = activeAnnotation === ann.label;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveAnnotation(isActive ? null : ann.label)}
                    style={{
                      padding: "10px 12px",
                      background: isActive ? rb : "#fff",
                      border: `1px solid ${isActive ? rc : "#e0dbd4"}`,
                      borderLeft: `3px solid ${col}`,
                      borderRadius: "0 3px 3px 0",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ ...FONT, fontSize: "0.72rem", fontWeight: 700, color: col }}>{ann.label}</span>
                      <span style={{ ...FONT, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: rc, background: rb, padding: "1px 5px", borderRadius: "1px" }}>{ann.risk}</span>
                    </div>
                    {isActive && <p style={{ ...FONT, fontSize: "0.75rem", color: "#555", lineHeight: 1.55, margin: 0 }}>{ann.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended actions */}
          {result.recommended_actions?.length > 0 && (
            <div style={{ marginBottom: "28px", padding: "20px 24px", background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px" }}>
              <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Recommended Actions</div>
              <ol style={{ paddingLeft: "18px", margin: 0 }}>
                {result.recommended_actions.map((a, i) => (
                  <li key={i} style={{ ...FONT, fontSize: "0.85rem", color: "#333", lineHeight: 1.7, marginBottom: "4px" }}>{a}</li>
                ))}
              </ol>
            </div>
          )}

          <JAINudge text="JAI runs this analysis across your entire contract portfolio — automatically, continuously, surfacing renewal traps and risk flags before they reach operations." />
          <button onClick={() => { setResult(null); setActiveAnnotation(null); }}
            style={{ ...FONT, marginTop: "16px", background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0" }}>
            ← Analyse another clause
          </button>
          <LegalBlock />
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 06 — S2P Prompt Sandbox (Live AI)
// Sandbox format: pick scenario → edit prompt → run live → take prompt away.
// Uses Anthropic API. Shows "AI you can verify and take home."
// ─────────────────────────────────────────────────────────────────────────────

const SANDBOX_SCENARIOS = [
  {
    id: "subtier",
    label: "Sub-Tier Risk Scan",
    tag: "Supplier Risk",
    tagColor: "#b91c1c",
    context: `SUPPLIER LIST — Q3 2026\n\nCategory: Semiconductors\n  • TSMC (Taiwan) — critical, sole source\n  • Samsung Foundry (South Korea) — secondary\n\nCategory: Rare Earth Materials\n  • China Rare Earth Holdings (China) — 80% of volume\n  • Lynas (Australia) — 20% of volume\n\nCategory: Battery Cells\n  • CATL (China) — critical, sole source\n\nCategory: Precision Machining\n  • Schuler Group (Germany)\n  • DMG Mori (Germany / Japan)`,
    defaultPrompt: `You are a supply chain risk analyst for a discrete manufacturer. Review the supplier list above.

Identify the top 3 geographic concentration risks and for each one:
1. Name the risk scenario (what event would trigger disruption)
2. Estimate the production impact window
3. Suggest one qualified alternative supplier geography

Return as a numbered list. Be direct — no hedging.`,
    note: "Scenario context is pre-loaded. Edit the prompt to change what the AI focuses on.",
  },
  {
    id: "rfp",
    label: "RFP Scope Builder",
    tag: "Sourcing",
    tagColor: "#4f7a5b",
    context: `SOURCING BRIEF\n\nRequirement: Procurement analytics platform\nOrganisation: Mid-size pharmaceutical manufacturer, ~$800M revenue\nCurrent state: SAP ERP with manual spend reporting in Excel\nKey needs:\n  — Spend visibility across 12 cost centres\n  — Supplier performance tracking\n  — Contract expiry alerts\n  — GDPR-compliant data handling (EU HQ)\nTimeline: Go-live within 9 months\nBudget envelope: Not disclosed to suppliers at this stage`,
    defaultPrompt: `You are a senior procurement manager drafting an RFP for the requirement above.

Write the Scope of Work section and the Evaluation Criteria table (with percentage weightings).

For evaluation criteria, include at least 5 criteria. Ensure the weightings reflect a pharmaceutical manufacturer's priorities — compliance and data security should carry significant weight.

Format: use clear headers. Keep language formal but plain.`,
    note: "Change the weightings instruction to reflect your own priorities.",
  },
  {
    id: "negotiation",
    label: "Negotiation Brief",
    tag: "Contracts",
    tagColor: "#6b5b8e",
    context: `CONTRACT RENEWAL — CONTEXT\n\nVendor: Logistics platform SaaS provider\nCurrent contract: $240K/year, 3-year term expiring in 11 weeks\nUsage: 80% of licensed seats actively used\nVendor relationship: Strong — no service incidents in 3 years\nMarket context: Two comparable platforms launched in 2025; one is 20% cheaper\nOur leverage: Long-term customer, strong reference value, considering expansion to 2 more business units`,
    defaultPrompt: `You are a procurement negotiation advisor. Based on the context above, prepare a concise negotiation brief.

Include:
1. Our negotiating position (strengths and weaknesses)
2. Three specific asks we should lead with
3. Our BATNA (best alternative to a negotiated agreement)
4. One concession we can offer that costs us little but signals goodwill

Be direct. This is for internal use before a vendor call.`,
    note: "Adjust the asks to match your actual priorities before the call.",
  },
];

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
          messages: [{
            role: "user",
            content: `CONTEXT:\n${sc.context}\n\n---\n\n${prompt}`,
          }],
        }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "";
      setResult(text || "No response returned.");
    } catch {
      // Mock fallback
      await new Promise(r => setTimeout(r, 1100));
      const mocks = {
        subtier: `**Top 3 Geographic Concentration Risks**\n\n**1. Taiwan — Semiconductors (TSMC sole source)**\nRisk scenario: Cross-strait military escalation or natural disaster closes TSMC fabs.\nProduction impact: 6–18 months — semiconductor lead times mean no quick fix.\nAlternative: Intel Foundry Services (USA) or Renesas (Japan) for less advanced nodes.\n\n**2. China — Rare Earth Materials (80% volume)**\nRisk scenario: Export controls or tariff escalation (already precedented in 2024).\nProduction impact: 3–9 months depending on inventory buffer.\nAlternative: Lynas (Australia) already at 20% — expand to 60–80% with contract commitment.\n\n**3. China — Battery Cells (CATL sole source)**\nRisk scenario: US/EU tariff action against Chinese EVs extends to battery components.\nProduction impact: 9–24 months — CATL is effectively the only Tier 1 EV battery supplier at this scale.\nAlternative: Samsung SDI (South Korea) or Panasonic (Japan/USA) — qualification lead time 12+ months, start now.`,
        rfp: `**Scope of Work**\n\nThe selected vendor shall deliver a procurement analytics platform that provides full spend visibility, supplier performance management, and contract lifecycle alerts across all twelve cost centres of [Organisation Name].\n\nCore deliverables include: (1) automated spend classification and reporting updated at minimum weekly; (2) supplier performance dashboard with configurable KPIs; (3) contract expiry and renewal alert engine with 90/60/30-day triggers; (4) SAP ERP integration via certified connector; and (5) GDPR-compliant data architecture with EU data residency.\n\n**Evaluation Criteria**\n\n| Criterion | Weight | Description |\n|---|---|---|\n| Data security & GDPR compliance | 25% | SOC 2 Type II, EU data residency, DPA terms |\n| SAP integration depth | 20% | Native connector vs middleware; implementation risk |\n| Functional coverage | 20% | Spend analytics, supplier mgmt, contract alerts |\n| Total Cost of Ownership (3yr) | 20% | Licensing, implementation, ongoing support |\n| Implementation timeline | 15% | Credible plan to meet 9-month go-live |`,
        negotiation: `**Negotiation Brief — Logistics SaaS Renewal**\n\n**Our Position**\nStrengths: Long tenure (reference value to vendor), 80% seat utilisation (not just shelfware), expansion potential (2 BUs = 60%+ revenue upside for them).\nWeaknesses: 11 weeks to expiry (time pressure), strong relationship (they know we won't switch easily).\n\n**Three Asks to Lead With**\n1. 15% unit price reduction — anchor to the 20% cheaper competitor; accept 10% as the walk-away.\n2. Freeze seat pricing for the expansion units at today's renewal rate for 24 months.\n3. Quarterly performance SLAs with service credits — gives us governance leverage without threatening the relationship.\n\n**BATNA**\nMigrate to [Competitor Platform]. 6-month implementation timeline. Credible threat — use it as context, not as an explicit ultimatum.\n\n**Concession to Offer**\nExtend the contract term from 1 year to 2 years in exchange for the price reduction. Costs us flexibility but signals commitment — vendors value long-term revenue certainty.`,
      };
      setResult(mocks[scenario] || "Output unavailable.");
    }
    setLoading(false);
  }

  function copyPrompt() {
    navigator.clipboard?.writeText(prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function switchScenario(id) {
    setScenario(id);
    setResult(null);
  }

  return (
    <div>
      <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e0dbd4" }}>
        <SAEyebrow>Sandbox · S2P Prompt Builder</SAEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          Build a Prompt.<br />Run It Live. Take It Away.
        </h1>
        <p style={{ ...FONT, fontSize: "0.95rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "500px" }}>
          Pick a procurement scenario. The context is pre-loaded — just edit the prompt until it does exactly what you need, then run it. Every prompt is yours to keep.
        </p>
      </div>

      {/* Scenario selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
        {SANDBOX_SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => switchScenario(s.id)}
            style={{
              ...FONT, padding: "8px 16px",
              background: scenario === s.id ? "#0f1923" : "#fff",
              border: `1px solid ${scenario === s.id ? "#0f1923" : "#e0dbd4"}`,
              borderRadius: "3px", cursor: "pointer",
              fontSize: "0.78rem", fontWeight: scenario === s.id ? 600 : 400,
              color: scenario === s.id ? "#fff" : "#555",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: scenario === s.id ? "rgba(200,64,26,0.85)" : s.tagColor, marginRight: "6px" }}>{s.tag}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        {/* Context panel */}
        <div style={{ background: "#faf8f5", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "16px 18px" }}>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "10px" }}>Pre-loaded Context</div>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "#555", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{sc.context}</pre>
        </div>

        {/* Editable prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa" }}>Your Prompt — edit freely</div>
            <button onClick={copyPrompt} style={{ ...FONT, background: "transparent", border: "1px solid #e0dbd4", borderRadius: "2px", padding: "3px 10px", fontSize: "0.65rem", fontWeight: 600, color: copied ? "#4f7a5b" : "#888", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompts(p => ({ ...p, [scenario]: e.target.value }))}
            style={{ flex: 1, minHeight: "220px", background: "#fff", border: "1px solid #ddd8cf", borderRadius: "3px", padding: "14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.74rem", color: "#0f1923", resize: "vertical", lineHeight: 1.7, outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ ...FONT, fontSize: "0.7rem", color: "#aaa", fontStyle: "italic" }}>{sc.note}</div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading || !prompt.trim()}
        style={{ background: prompt.trim() && !loading ? "#c8401a" : "#ccc", color: "#fff", border: "none", borderRadius: "2px", padding: "12px 32px", ...FONT, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: prompt.trim() && !loading ? "pointer" : "not-allowed", transition: "background 0.2s", marginBottom: "24px" }}
      >
        {loading ? "Running…" : "Run prompt →"}
      </button>

      {result && (
        <div>
          <div style={{ ...FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>Output</div>
          <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "24px 28px", marginBottom: "24px" }}>
            <pre style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#333", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{result}</pre>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "28px", padding: "14px 18px", background: "#f5f2ec", borderRadius: "3px" }}>
            <span style={{ ...FONT, fontSize: "0.78rem", color: "#555" }}>This prompt is yours.</span>
            <button onClick={copyPrompt} style={{ ...FONT, background: "#0f1923", color: "#fff", border: "none", borderRadius: "2px", padding: "6px 14px", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
              {copied ? "✓ Copied" : "Copy prompt →"}
            </button>
          </div>
          <JAINudge text="JAI runs prompts like these automatically — across your live procurement data, on a schedule, with outputs surfaced where your team actually works." />
          <LegalBlock />
        </div>
      )}
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
// ROOT -- SampleArtifactsPanel
// ─────────────────────────────────────────────────────────────────────────────

function SampleArtifactsPanel() {
  const [activeArticle, setActiveArticle] = useStateSA(null);

  const article = activeArticle ? ARTICLES.find(a => a.id === activeArticle) : null;

  if (!activeArticle) {
    return <ArticleIndex onSelect={setActiveArticle} />;
  }

  return (
    <ArticleShell article={article} onBack={() => setActiveArticle(null)}>
      {activeArticle === "agent-builder"         && <AgentBuilderArticle />}
      {activeArticle === "prompting-101"          && <Prompting101Article />}
      {activeArticle === "supply-chain-profiler"  && <SupplyChainProfilerArticle />}
      {activeArticle === "myth-scorer"            && <MythScorerArticle />}
      {activeArticle === "clause-annotator"       && <ClauseAnnotatorArticle />}
      {activeArticle === "prompt-sandbox"         && <PromptSandboxArticle />}
    </ArticleShell>
  );
}

window.SampleArtifactsPanel = SampleArtifactsPanel;

// ══════════════════════════════════════════════════════════════════════════════
// WIRING -- what needs to change in the other files:
//
// index.html:
//   REMOVE: <script type="text/babel" ... src="agent-builder.jsx"></script>
//   ADD:    <script type="text/babel" ... src="sample-artifacts.jsx"></script>
//
// sidebar.jsx -- NavSection label:
//   CHANGE: label="Agent Builder"
//   TO:     label="Sample Artifacts"
//   AND:    onClick={() => setView("sample-artifacts")}
//
// app.jsx:
//   CHANGE: {view === "agent-builder" && <AgentBuilderPanel />}
//   TO:     {view === "sample-artifacts" && <SampleArtifactsPanel />}
//
// ══════════════════════════════════════════════════════════════════════════════
