// ══════════════════════════════════════════════════════════════════════════════
// agent-builder.jsx  —  "Agent Builder" tab for the NS × Jaggaer tracker
// ══════════════════════════════════════════════════════════════════════════════

const { useState: useStateAB, useRef: useRefAB, useCallback: useCBAB } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Small shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function ABEyebrow({ children }) {
  return (
    <div style={{
      fontFamily: "Noto Sans, sans-serif",
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#c8401a",
      marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

function ABSectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
        fontWeight: 900,
        color: "#0f1923",
        lineHeight: 1.15,
        marginBottom: "10px",
      }}>{title}</h2>
      {sub && <p style={{ color: "#6b6560", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: "640px" }}>{sub}</p>}
    </div>
  );
}

function ABCard({ children, style }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e0dbd4",
      borderRadius: "4px",
      padding: "32px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Inline JAI nudge strip — used throughout
function JAINudge({ text, tight }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      padding: tight ? "14px 18px" : "18px 22px",
      background: "#0f1923",
      borderRadius: "3px",
      marginTop: tight ? "16px" : "28px",
    }}>
      <p style={{
        fontFamily: "Noto Sans, sans-serif",
        fontSize: "0.85rem",
        color: "rgba(255,255,255,0.72)",
        margin: 0,
        lineHeight: 1.5,
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
          fontSize: "0.75rem",
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

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 — S2P Use Case Demos (live Claude API) — NOW FIRST
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_TABS = [
  { id: "contracts", label: "Contracts" },
  { id: "suppliers", label: "Suppliers" },
  { id: "rfp", label: "RFP / Sourcing" },
];

const DEMO_SYSTEM_PROMPTS = {
  contracts: `You are an expert procurement contracts analyst. The user will paste a contract clause or excerpt.
Analyse it and return a structured response in exactly this JSON format (no markdown fences, raw JSON only):
{
  "expiry_dates": ["list any expiration or renewal dates found, or empty array"],
  "auto_renewal": "describe auto-renewal terms if present, or null",
  "risky_obligations": ["list obligations that could expose the buyer to cost or liability"],
  "concerning_sections": ["flag any clauses that warrant legal review, briefly explain each"],
  "summary": "one-sentence plain-English summary of the key risk posture"
}
Be precise and practical. If a field has no findings, use an empty array or null.`,

  suppliers: `You are an expert procurement sourcing strategist. The user will paste a supplier list (names, countries, categories).
Analyse the list for geographic concentration risk and suggest alternative or complementary suppliers.
Return a structured JSON response (no markdown fences, raw JSON only):
{
  "risk_flags": ["list any single-country or single-supplier concentration risks"],
  "alternatives": [
    { "category": "category name", "region": "suggested alternative geography", "rationale": "brief reason", "example_suppliers": ["2-3 example supplier names"] }
  ],
  "diversification_priority": "high | medium | low — with one-line rationale"
}
Be specific. Give real supplier names where possible. Focus on procurement-relevant geographies.`,

  rfp: `You are an expert procurement writer specialising in RFP documents. The user will describe a sourcing requirement in plain language.
Generate a concise, professional RFP draft in JSON format (no markdown fences, raw JSON only):
{
  "rfp_title": "formal title",
  "background": "2-3 sentence context paragraph",
  "scope_of_work": ["4-6 bullet points defining what is being sourced"],
  "evaluation_criteria": [{ "criterion": "name", "weight": "percentage", "description": "what will be assessed" }],
  "submission_requirements": ["list of what suppliers must submit"],
  "key_dates": [{ "milestone": "name", "date": "TBD or suggested relative date" }],
  "questions": ["3-5 specific questions for suppliers to address in their response"]
}`
};

const DEMO_PLACEHOLDERS = {
  contracts: `Paste a contract clause or excerpt here. Example:\n\n"This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal no less than 90 days prior to the end of the then-current term. Licensor reserves the right to adjust pricing at renewal with 60 days' advance notice."`,
  suppliers: `Paste your supplier list here. Example:\n\nSupplier A — Taiwan — Semiconductors\nSupplier B — Taiwan — PCB Manufacturing\nSupplier C — Germany — Precision Machining\nSupplier D — China — Rare Earth Materials\nSupplier E — China — Battery Cells`,
  rfp: `Describe your sourcing requirement here. Example:\n\nWe need to source a fleet management software solution for 200 commercial vehicles across our US and Germany operations. The solution must integrate with SAP and provide real-time GPS tracking, maintenance scheduling, and driver behaviour analytics.`,
};

const DEMO_JAI_NUDGES = {
  contracts: "This is one clause. JAI runs this analysis across your entire contract portfolio — automatically, continuously, connected to your procurement data.",
  suppliers: "JAI monitors your full supplier base in real time. Risk flags like these surface before they reach operations, not after.",
  rfp: "JAI generates and manages sourcing events at scale — with your organisation's data, categories, and approval workflows built in.",
};

function ContractOutput({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.summary && (
        <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a", borderRadius: "0 3px 3px 0" }}>
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
        <div style={{ padding: "14px 18px", background: "#f5f2ec", borderLeft: "3px solid #c8401a", borderRadius: "0 3px 3px 0" }}>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923" }}>Diversification Priority: </span>
          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#444" }}>{data.diversification_priority}</span>
        </div>
      )}
      {data.risk_flags?.length > 0 && <OutputSection label="Risk Flags" items={data.risk_flags} color="#c8401a" />}
      {data.alternatives?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>
            Alternative Supplier Suggestions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.alternatives.map((alt, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "3px", padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "#0f1923" }}>{alt.category}</span>
                  <span style={{ background: "#f0e6e1", color: "#c8401a", fontFamily: "Noto Sans, sans-serif", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: "2px" }}>{alt.region}</span>
                </div>
                <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#555", margin: "0 0 6px" }}>{alt.rationale}</p>
                {alt.example_suppliers?.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {alt.example_suppliers.map((s, j) => (
                      <span key={j} style={{ background: "#f5f2ec", border: "1px solid #ddd8cf", color: "#444", fontSize: "0.72rem", fontFamily: "Noto Sans, sans-serif", padding: "3px 9px", borderRadius: "2px" }}>{s}</span>
                    ))}
                  </div>
                )}
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
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{data.rfp_title}</span>
        </div>
      )}
      {data.background && (
        <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#444", lineHeight: 1.7, padding: "0 2px" }}>
          {data.background}
        </div>
      )}
      {data.scope_of_work?.length > 0 && <OutputSection label="Scope of Work" items={data.scope_of_work} color="#3b6b88" />}
      {data.evaluation_criteria?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>
            Evaluation Criteria
          </div>
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
      {data.key_dates?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>
            Key Dates
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {data.key_dates.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.83rem" }}>
                <span style={{ color: "#6b6560", minWidth: "100px" }}>{d.date}</span>
                <span style={{ color: "#0f1923" }}>{d.milestone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.questions?.length > 0 && <OutputSection label="Supplier Questions" items={data.questions} color="#6b5b8e" />}
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

// ─── Canned demo outputs ───────────────────────────────────────────────────────
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
      "Auto-renewal clause: 90-day notice is shorter than many procurement review cycles — recommend flagging for calendar alert 120 days before term end",
      "Unilateral pricing adjustment: no stated cap or CPI linkage — recommend negotiating a maximum annual increase percentage (e.g. CPI + 3%)",
    ],
  },
  suppliers: {
    diversification_priority: "High — heavy concentration in Taiwan (semiconductors, PCB) and China (rare earth, batteries) creates compounding single-event risk",
    risk_flags: [
      "Taiwan concentration: two critical categories (Semiconductors + PCB Manufacturing) sourced entirely from Taiwan — both exposed to the same geopolitical and natural disaster risk profile",
      "China concentration: Rare Earth Materials and Battery Cells both sourced from China — subject to export controls and tariff volatility",
      "No European or Americas-based source for any category except Precision Machining",
    ],
    alternatives: [
      {
        category: "Semiconductors",
        region: "South Korea / Japan",
        rationale: "Mature fab capacity outside Taiwan cross-strait risk zone; strong quality equivalence for most industrial applications",
        example_suppliers: ["Samsung Foundry", "SK Hynix", "Renesas Electronics"],
      },
      {
        category: "PCB Manufacturing",
        region: "Vietnam / Thailand",
        rationale: "Growing PCB capacity with lower geopolitical exposure; several Taiwan OEMs have established Vietnam operations",
        example_suppliers: ["Tripod Technology (VN ops)", "Kinwong Electronic", "TTM Technologies"],
      },
      {
        category: "Rare Earth Materials",
        region: "Australia / Canada",
        rationale: "Lynas (Australia) and MP Materials (USA) are the two largest non-China rare earth producers — actively scaling capacity",
        example_suppliers: ["Lynas Rare Earths", "MP Materials", "Mkango Resources"],
      },
      {
        category: "Battery Cells",
        region: "South Korea / Poland",
        rationale: "Samsung SDI and LG Energy Solution have European gigafactory capacity; reduces China dependency for EU-facing supply chains",
        example_suppliers: ["Samsung SDI", "LG Energy Solution", "Northvolt"],
      },
    ],
  },
  rfp: {
    rfp_title: "Request for Proposal: Fleet Management Software — US & Germany Operations",
    background: "We are seeking a fleet management software solution to support 200 commercial vehicles across our US and Germany operations. The solution must integrate with our existing SAP environment and provide real-time visibility, predictive maintenance capability, and driver analytics to reduce total operating cost and compliance exposure.",
    scope_of_work: [
      "Real-time GPS tracking and geofencing for all 200 vehicles across both geographies",
      "Bi-directional integration with SAP S/4HANA for cost centre allocation and purchase order generation",
      "Predictive maintenance scheduling based on telematics data, with automated work order creation",
      "Driver behaviour analytics including speed, braking, idling, and fatigue indicators",
      "Regulatory compliance module covering EU tachograph rules (Germany) and FMCSA hours-of-service (US)",
      "Mobile application for drivers and field managers (iOS and Android)",
    ],
    evaluation_criteria: [
      { criterion: "Functional fit", weight: "30%", description: "Coverage of all stated requirements; depth of SAP integration; compliance module completeness" },
      { criterion: "Total Cost of Ownership", weight: "25%", description: "3-year TCO including implementation, licensing, and ongoing support; pricing model transparency" },
      { criterion: "Implementation approach", weight: "20%", description: "Project methodology, go-live timeline, training plan, and change management support" },
      { criterion: "Security & data residency", weight: "15%", description: "GDPR compliance for Germany operations; data residency options; SOC 2 Type II certification" },
      { criterion: "Vendor viability & references", weight: "10%", description: "Financial stability, customer retention rate, and at least two references in comparable fleet environments" },
    ],
    submission_requirements: [
      "Executive summary (max 3 pages)",
      "Detailed response to each evaluation criterion",
      "SAP integration architecture diagram and connector documentation",
      "3-year TCO model with clear breakdown of licensing, implementation, and support costs",
      "Two customer references in comparable fleet environments (200+ vehicles, multi-country)",
      "GDPR compliance statement and data processing agreement (DPA) draft",
      "Proposed implementation timeline with key milestones",
    ],
    key_dates: [
      { milestone: "RFP issued", date: "Week 1" },
      { milestone: "Supplier Q&A deadline", date: "Week 2" },
      { milestone: "Q&A responses published", date: "Week 3" },
      { milestone: "Proposals due", date: "Week 5" },
      { milestone: "Shortlist announced", date: "Week 7" },
      { milestone: "Demos / presentations", date: "Week 8–9" },
      { milestone: "Award decision", date: "Week 11" },
    ],
    questions: [
      "Describe your SAP S/4HANA integration architecture — is this a native connector or middleware-dependent? What SAP modules are covered?",
      "How does your platform handle multi-jurisdiction compliance — specifically EU tachograph rules and US FMCSA HOS simultaneously within one instance?",
      "What is your data residency model for EU customers? Where is German vehicle and driver data stored and processed?",
      "Provide your average go-live timeline for a 200-vehicle, two-country deployment, and identify the top three implementation risks you have encountered in comparable projects.",
      "What does your predictive maintenance model use as input signals, and how is the maintenance alert threshold calibrated per vehicle type?",
    ],
  },
};

function DemoPane({ demoId }) {
  const [input, setInput] = useStateAB("");
  const [loading, setLoading] = useStateAB(false);
  const [result, setResult] = useStateAB(null);

  const runDemo = useCBAB(() => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(MOCK_OUTPUTS[demoId]);
      setLoading(false);
    }, 1500);
  }, [demoId, input]);

  const labels = { contracts: "contract text", suppliers: "supplier list", rfp: "sourcing requirement" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c08227", flexShrink: 0 }} />
        <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>
          Demo mode — showing representative output. Live Claude API analysis activates once the API key is integrated.
        </span>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={DEMO_PLACEHOLDERS[demoId]}
        rows={8}
        style={{
          width: "100%",
          background: "#faf8f5",
          border: "1px solid #ddd8cf",
          borderRadius: "3px",
          padding: "16px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.8rem",
          color: "#0f1923",
          resize: "vertical",
          lineHeight: 1.7,
          marginBottom: "12px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={runDemo}
        disabled={loading || !input.trim()}
        style={{
          background: input.trim() && !loading ? "#c8401a" : "#ccc",
          color: "#fff",
          border: "none",
          borderRadius: "2px",
          padding: "12px 28px",
          fontFamily: "Noto Sans, sans-serif",
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          marginBottom: "24px",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Analysing…" : `Analyse ${labels[demoId]}`}
      </button>

      {result && (
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "16px" }}>
            Claude's Analysis
          </div>
          {demoId === "contracts" && <ContractOutput data={result} />}
          {demoId === "suppliers" && <SupplierOutput data={result} />}
          {demoId === "rfp" && <RFPOutput data={result} />}

          <JAINudge text={DEMO_JAI_NUDGES[demoId]} />
        </div>
      )}
    </div>
  );
}

function DemosBlock() {
  const [activeDemo, setActiveDemo] = useStateAB("contracts");

  return (
    <div id="block-demos" style={{ marginBottom: "64px" }}>
      <ABEyebrow>Try it now</ABEyebrow>
      <ABSectionHead
        title="S2P Use Case Demos"
        sub="Three live Claude-powered tools. Paste your own data — contract text, a supplier list, or a sourcing brief — and see the analysis in real time."
      />

      <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", marginBottom: "28px" }}>
        {DEMO_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDemo(tab.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeDemo === tab.id ? "2px solid #c8401a" : "2px solid transparent",
              padding: "12px 24px",
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "0.82rem",
              fontWeight: activeDemo === tab.id ? 600 : 400,
              color: activeDemo === tab.id ? "#0f1923" : "#6b6560",
              cursor: "pointer",
              letterSpacing: "0.04em",
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ABCard>
        <DemoPane key={activeDemo} demoId={activeDemo} />
      </ABCard>

      {/* JAI bridge — below demos, before the fold */}
      <div style={{
        marginTop: "24px",
        padding: "24px 28px",
        background: "#faf8f5",
        border: "1px solid #e0dbd4",
        borderRadius: "4px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "24px",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
            Want this without the prompting?
          </div>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#0f1923", lineHeight: 1.6, margin: 0 }}>
            JAI does everything you just saw — across your entire contract portfolio, supplier base, and sourcing pipeline — with no prompt writing required. It's pre-built for S2P, connected to your data, and running continuously.
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
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "13px 22px",
            borderRadius: "2px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          See JAI →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 — How to Install Claude (now below the demos)
// ─────────────────────────────────────────────────────────────────────────────

const INSTALL_STEPS = [
  {
    n: "01",
    title: "Go to claude.ai",
    body: "Open your browser and navigate to claude.ai. You'll land on the login page.",
  },
  {
    n: "02",
    title: "Create or sign into your account",
    body: "Sign up with a work email address, or log in if you already have an account. A free account gets you access to Claude's core capabilities immediately.",
  },
  {
    n: "03",
    title: "Choose your plan",
    body: "For professional procurement use, Claude Pro gives you significantly higher usage limits and priority access during peak hours. For team-wide rollout, ask your IT admin about the Claude for Work (Teams) plan.",
  },
  {
    n: "04",
    title: "Bookmark or pin to your browser",
    body: "Pin claude.ai to your browser taskbar or create a desktop shortcut. Most procurement professionals add it alongside their ERP and email — it works best as a persistent tab.",
  },
  {
    n: "05",
    title: "Try your first S2P prompt",
    body: 'You\'re ready. Start with something concrete: paste a supplier contract clause and ask "What are the renewal terms and exit conditions here?" That\'s the fastest way to see the value.',
  },
];

function InstallBlock() {
  const [answer, setAnswer] = useStateAB(null);
  const [open, setOpen] = useStateAB(false);

  return (
    <div id="block-install" style={{ marginBottom: "40px" }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid #e0dbd4",
          borderRadius: open ? "4px 4px 0 0" : "4px",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>
            Setup Guide
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#0f1923" }}>
            How to Install Claude
          </span>
        </div>
        <span style={{ color: "#c8401a", fontSize: "1.1rem", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
      </button>

      {open && (
        <div style={{ border: "1px solid #e0dbd4", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "28px 24px", background: "#fff" }}>
          {answer === null && (
            <div style={{ marginBottom: "24px", padding: "20px 22px", background: "#f5f2ec", border: "1px solid #ddd8cf", borderRadius: "3px" }}>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.95rem", fontWeight: 500, color: "#0f1923", marginBottom: "16px" }}>
                Do you have IT permissions to install or sign up for new software tools?
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setAnswer("yes")}
                  style={{ background: "#c8401a", color: "#fff", border: "none", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  Yes — show me the steps
                </button>
                <button
                  onClick={() => setAnswer("no")}
                  style={{ background: "transparent", color: "#0f1923", border: "1px solid #c4bdb5", borderRadius: "2px", padding: "10px 24px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.06em", cursor: "pointer" }}
                >
                  No / Not sure
                </button>
              </div>
            </div>
          )}

          {answer === "no" && (
            <div style={{ marginBottom: "24px", borderLeft: "3px solid #c8401a", paddingLeft: "18px" }}>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", color: "#0f1923", lineHeight: 1.7, marginBottom: "8px" }}>
                <strong>No installation needed.</strong> You've already seen what Claude can do for S2P in the demos above — no account required.
              </p>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#6b6560", lineHeight: 1.6, marginBottom: "16px" }}>
                When you're ready to request access through IT, come back here and select <em>"Yes"</em>. Or — skip the setup entirely and let JAI handle it for your team.
              </p>
              <JAINudge text="JAI integrates into your existing procurement environment — no individual signups or IT tickets required." tight />
              <button
                onClick={() => setAnswer(null)}
                style={{ background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0", marginTop: "14px" }}
              >
                ← Back
              </button>
            </div>
          )}

          {answer === "yes" && (
            <div>
              {INSTALL_STEPS.map((step, i) => (
                <div key={step.n} style={{ display: "flex", gap: "24px", position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: "36px", height: "36px", background: "#0f1923", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.75rem", fontWeight: 700, color: "#c8401a" }}>{step.n}</span>
                    </div>
                    {i < INSTALL_STEPS.length - 1 && (
                      <div style={{ width: "1px", flex: 1, background: "#e0dbd4", margin: "4px 0" }}></div>
                    )}
                  </div>
                  <div style={{ paddingBottom: "28px" }}>
                    <h4 style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#0f1923", marginBottom: "6px" }}>{step.title}</h4>
                    <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#6b6560", lineHeight: 1.65 }}>{step.body}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setAnswer(null)}
                style={{ background: "transparent", border: "none", color: "#999", fontSize: "0.78rem", cursor: "pointer", padding: "0", marginTop: "4px" }}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 — Basics of Claude (collapsible, below install)
// ─────────────────────────────────────────────────────────────────────────────

const BASICS = [
  {
    term: "What is Claude?",
    body: "Claude is an AI assistant built by Anthropic. Unlike a search engine that retrieves existing documents, Claude generates responses by reasoning through your question — reading, summarising, drafting, analysing, or structuring information in real time. For procurement professionals, that means you can give it a 40-page contract and ask it specific questions, rather than reading it yourself.",
  },
  {
    term: "What are .md (Markdown) files?",
    body: "Markdown is a lightweight text format that uses simple symbols — # for headings, ** for bold, - for bullets — to structure plain text. Claude's prompt library is stored as .md files because they're readable as plain text in any editor, and they render beautifully in GitHub, Notion, and most documentation tools. You don't need to know Markdown to use Claude, but it's worth knowing why the prompt files look the way they do.",
  },
  {
    term: "How do prompts work?",
    body: "A prompt is the instruction you give Claude. The quality of Claude's output is directly proportional to the clarity of your prompt. Good prompts: (1) give context — 'I'm a procurement manager at a mid-size manufacturer'; (2) specify the task precisely — 'Review this NDA and list all obligations that expire within 12 months'; (3) define the output format — 'Return a numbered list, not paragraphs'. The prompt library below gives you tested, ready-to-use prompts for common S2P tasks.",
  },
];

function BasicsBlock() {
  const [open, setOpen] = useStateAB(null);
  const [sectionOpen, setSectionOpen] = useStateAB(false);

  return (
    <div style={{ marginBottom: "40px" }}>
      <button
        onClick={() => setSectionOpen(!sectionOpen)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid #e0dbd4",
          borderRadius: sectionOpen ? "4px 4px 0 0" : "4px",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "4px" }}>
            Background
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#0f1923" }}>
            Basics of Claude
          </span>
        </div>
        <span style={{ color: "#c8401a", fontSize: "1.1rem", transform: sectionOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
      </button>

      {sectionOpen && (
        <div style={{ border: "1px solid #e0dbd4", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "24px", background: "#fff" }}>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#6b6560", lineHeight: 1.6, marginBottom: "20px" }}>
            Three things worth understanding before you start building with Claude.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {BASICS.map((item, i) => (
              <div
                key={i}
                style={{ border: "1px solid #e0dbd4", borderRadius: "3px", overflow: "hidden", background: open === i ? "#fff" : "#faf8f5" }}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#0f1923" }}>{item.term}</span>
                  <span style={{ color: "#c8401a", fontSize: "1rem", fontWeight: 300, transform: open === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                </button>
                {open === i && (
                  <div style={{ padding: "0 20px 18px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.87rem", color: "#444", lineHeight: 1.75 }}>
                    {item.body}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "20px", padding: "14px 18px", background: "#f5f2ec", border: "1px solid #ddd8cf", borderLeft: "3px solid #c8401a", borderRadius: "0 3px 3px 0" }}>
            <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.83rem", color: "#555", margin: 0 }}>
              <strong style={{ color: "#0f1923" }}>Go deeper:</strong>{" "}
              The full S2P Prompt Library is on GitHub and updated as the engagement progresses.{" "}
              <a href="https://github.com/ns-adiraghavan/jaggaer-ns-tracker" target="_blank" rel="noopener noreferrer" style={{ color: "#c8401a", textDecoration: "none", fontWeight: 500 }}>
                Browse the prompt library →
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 — Prompt Writing Guide (new) + JAI bridge
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_EXAMPLES = [
  {
    label: "Contract Review",
    tag: "Contracts",
    tagColor: "#3b6b88",
    prompt: `You are a procurement contracts analyst. Review the clause below and identify:\n1. Any auto-renewal terms and the exact notice window required to exit\n2. Obligations that create financial exposure for the buyer\n3. Any clauses that should be reviewed by legal before signing\n\nReturn your findings as a numbered list under each heading. Be specific — quote the relevant language where relevant.\n\n[Paste clause here]`,
    note: "The structure — role, task, numbered output format — is what gets you precise, structured results instead of a generic paragraph.",
  },
  {
    label: "Supplier Risk Scan",
    tag: "Suppliers",
    tagColor: "#4f7a5b",
    prompt: `I'm a procurement manager at a discrete manufacturer. Here is our current supplier list by category and country:\n\n[Paste supplier list]\n\nFor each category where we have geographic concentration risk, flag it and suggest two or three alternative supplier geographies with example vendors. Prioritise risks by potential production impact. Return as a table.`,
    note: "Giving Claude your role and the output format (table) dramatically improves usability of the response.",
  },
  {
    label: "RFP First Draft",
    tag: "RFP / Sourcing",
    tagColor: "#6b5b8e",
    prompt: `Draft a professional RFP for the following sourcing requirement:\n\n[Describe what you're buying, volume, key integrations, and any compliance requirements]\n\nInclude: a scope of work section, evaluation criteria with weightings, submission requirements, and 4–5 questions for suppliers to address. Format with clear section headers. Keep language formal but plain — no procurement jargon.`,
    note: "Specifying what to include and the tone gets you something close to publishable on the first pass.",
  },
];

function PromptWritingBlock() {
  const [active, setActive] = useStateAB(0);
  const [copied, setCopied] = useStateAB(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(PROMPT_EXAMPLES[active].prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ marginBottom: "64px" }}>
      <ABEyebrow>Prompt Craft</ABEyebrow>
      <ABSectionHead
        title="How to Prompt for S2P"
        sub="The demos above run on carefully engineered prompts. Here's what those look like — and how to write your own."
      />

      {/* Three-part formula */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "36px" }}>
        {[
          { n: "1", title: "Set the role", body: "Tell Claude what kind of expert it's acting as. 'You are a procurement contracts analyst' produces sharper output than no framing at all." },
          { n: "2", title: "Be precise about the task", body: "Vague asks get vague answers. 'Review this contract' is weak. 'List every clause that creates financial exposure for the buyer' is strong." },
          { n: "3", title: "Define the output format", body: "Tell Claude how to structure the answer — numbered list, table, JSON, paragraph. Without this, it chooses for you, and that's often not what you need." },
        ].map(item => (
          <div key={item.n} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", padding: "22px 20px" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 900, color: "#c8401a", marginBottom: "10px", lineHeight: 1 }}>{item.n}</div>
            <h4 style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#0f1923", marginBottom: "8px" }}>{item.title}</h4>
            <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.82rem", color: "#6b6560", lineHeight: 1.65, margin: 0 }}>{item.body}</p>
          </div>
        ))}
      </div>

      {/* Example prompt tabs */}
      <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4", background: "#faf8f5" }}>
          {PROMPT_EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active === i ? "2px solid #c8401a" : "2px solid transparent",
                padding: "12px 20px",
                fontFamily: "Noto Sans, sans-serif",
                fontSize: "0.8rem",
                fontWeight: active === i ? 600 : 400,
                color: active === i ? "#0f1923" : "#6b6560",
                cursor: "pointer",
                marginBottom: "-1px",
                letterSpacing: "0.03em",
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Prompt body */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{
              background: PROMPT_EXAMPLES[active].tagColor + "18",
              color: PROMPT_EXAMPLES[active].tagColor,
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "2px",
              border: `1px solid ${PROMPT_EXAMPLES[active].tagColor}40`,
            }}>
              {PROMPT_EXAMPLES[active].tag}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: "transparent",
                border: "1px solid #e0dbd4",
                borderRadius: "2px",
                padding: "6px 14px",
                fontFamily: "Noto Sans, sans-serif",
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: copied ? "#4f7a5b" : "#6b6560",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              {copied ? "✓ Copied" : "Copy prompt"}
            </button>
          </div>

          <pre style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.78rem",
            color: "#0f1923",
            background: "#faf8f5",
            border: "1px solid #e8e3da",
            borderRadius: "3px",
            padding: "18px",
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
            margin: "0 0 16px",
          }}>
            {PROMPT_EXAMPLES[active].prompt}
          </pre>

          <div style={{ padding: "12px 16px", background: "#f5f2ec", borderLeft: "3px solid #c08227", borderRadius: "0 3px 3px 0" }}>
            <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "#0f1923" }}>Why it works: </span>
            <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#555" }}>{PROMPT_EXAMPLES[active].note}</span>
          </div>
        </div>
      </div>

      {/* JAI bridge — the natural "or just don't bother" moment */}
      <div style={{
        marginTop: "24px",
        padding: "28px 28px",
        background: "#0f1923",
        borderRadius: "4px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "24px",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "8px" }}>
            Or skip the prompt engineering entirely
          </div>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.65, margin: "0 0 6px" }}>
            JAI has these prompts — and thousands more — pre-built and running against your live procurement data. No crafting, no copy-pasting, no context-setting. You ask a business question, JAI answers it.
          </p>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", margin: 0, fontStyle: "italic" }}>
            Claude is the engine. JAI is the vehicle built for S2P.
          </p>
        </div>
        <a
          href="https://www.jaggaer.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#c8401a",
            color: "#fff",
            fontFamily: "Noto Sans, sans-serif",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "14px 22px",
            borderRadius: "2px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Explore JAI →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 — Webinar Hub
// ─────────────────────────────────────────────────────────────────────────────

const YOUTUBE_VIDEOS = [
  {
    id: "0vZ_UVLhSQQ",
    title: "Getting Started with Claude.ai",
    description: "Anthropic's official walkthrough of Claude.ai — the fastest way to get your procurement team oriented before trying the demos above.",
    source: "Anthropic",
  },
  {
    id: "oqUclC3gqKs",
    title: "A Day with Claude",
    description: "A practical look at how Claude fits into real working days — document review, drafting, analysis. Useful framing for S2P professionals.",
    source: "Anthropic",
  },
  {
    id: "T9aRN5JkmL8",
    title: "AI Prompt Engineering: A Deep Dive",
    description: "How to write prompts that produce precise, structured outputs — directly applicable to the contract, supplier, and RFP demos on this page.",
    source: "Anthropic",
  },
];

function WebinarBlock() {
  const [email, setEmail] = useStateAB("");
  const [submitted, setSubmitted] = useStateAB(false);

  return (
    <div style={{ marginBottom: "64px" }}>
      <ABEyebrow>Learn</ABEyebrow>
      <ABSectionHead
        title="Claude Webinar Hub"
        sub="Curated Anthropic tutorials selected for S2P relevance — plus the upcoming Jaggaer × Netscribes live session."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {YOUTUBE_VIDEOS.map((video, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ position: "relative", paddingBottom: "56.25%", background: "#0f1923" }}>
              <iframe
                src={`https://www.youtube.com/embed/${video.id}`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
                {video.source}
              </div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "#0f1923", marginBottom: "8px", lineHeight: 1.35 }}>
                {video.title}
              </h4>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", color: "#6b6560", lineHeight: 1.6, margin: 0 }}>
                {video.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f1923", borderRadius: "4px", padding: "36px", display: "grid", gridTemplateColumns: "1fr auto", gap: "40px", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "10px" }}>
            Coming Soon
          </div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "10px", lineHeight: 1.25 }}>
            Jaggaer × Netscribes:<br />Claude for S2P — Live Session
          </h3>
          <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65, maxWidth: "480px", margin: 0 }}>
            A live walkthrough of the S2P demos above — with a Q&A on how procurement teams are using Claude in real workflows today. Register your interest to be notified when the date is confirmed.
          </p>
        </div>
        <div style={{ minWidth: "280px" }}>
          {!submitted ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "2px", padding: "12px 16px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <button
                onClick={() => { if (email.includes("@")) setSubmitted(true); }}
                style={{ background: "#c8401a", color: "#fff", border: "none", borderRadius: "2px", padding: "12px", fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", width: "100%" }}
              >
                Register My Interest
              </button>
            </div>
          ) : (
            <div style={{ padding: "20px", background: "rgba(79,122,91,0.2)", border: "1px solid #4f7a5b", borderRadius: "3px", textAlign: "center" }}>
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#a8d4b4", margin: 0 }}>
                ✓ Registered. We'll be in touch with the date.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JAI Agent OS placeholder
// ─────────────────────────────────────────────────────────────────────────────

function JAISection() {
  return (
    <div style={{ marginBottom: "64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
        <div style={{ flex: 1, height: "1px", background: "#e0dbd4" }}></div>
        <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6560", whiteSpace: "nowrap" }}>
          Build With JAI Agent OS
        </div>
        <div style={{ flex: 1, height: "1px", background: "#e0dbd4" }}></div>
      </div>

      <div style={{ background: "#faf8f5", border: "1px dashed #c4bdb5", borderRadius: "4px", padding: "48px 36px", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", background: "#e0dbd4", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.2rem", color: "#888" }}>⚙</span>
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f1923", marginBottom: "12px" }}>
          JAI Agent OS — Coming Soon
        </h3>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.88rem", color: "#6b6560", lineHeight: 1.65, maxWidth: "480px", margin: "0 auto 8px" }}>
          Anna's section. AgentOS content, demos, and documentation will be populated here once available.
        </p>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#999", fontStyle: "italic", margin: 0 }}>
          Placeholder — not yet live.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legal
// ─────────────────────────────────────────────────────────────────────────────

function LegalBlock() {
  return (
    <div style={{ padding: "24px 28px", background: "#f0ece4", border: "1px solid #ddd8cf", borderRadius: "3px", marginBottom: "40px" }}>
      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6560", marginBottom: "10px" }}>
        Legal Notice
      </div>
      <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.78rem", color: "#888", lineHeight: 1.7, margin: 0 }}>
        This page is created independently by Netscribes on behalf of Jaggaer and is not affiliated with, endorsed by, or produced in partnership with Anthropic. Claude™ is a product of Anthropic, PBC. All Claude capabilities referenced here are based on publicly available features. Jaggaer and Netscribes are not co-marketing partners of Anthropic. Use of Claude is subject to Anthropic's Terms of Service and Usage Policies.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root AgentBuilderPanel
// ─────────────────────────────────────────────────────────────────────────────

function AgentBuilderPanel() {
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 40px 80px" }}>

      {/* Page hero */}
      <div style={{ marginBottom: "56px", paddingBottom: "40px", borderBottom: "1px solid #e0dbd4" }}>
        <ABEyebrow>Agent Builder</ABEyebrow>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 900, color: "#0f1923", lineHeight: 1.1, marginBottom: "16px" }}>
          Building With AI<br />for Source To Pay
        </h1>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1rem", color: "#6b6560", lineHeight: 1.7, maxWidth: "580px", marginBottom: "0" }}>
          A live prototype of the Agent Builder page — two sections, two toolsets. Build With Claude is active and ready to use. Build With JAI Agent OS is coming soon.
        </p>
      </div>

      {/* Section divider — Build With Claude */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
        <div style={{ width: "3px", height: "28px", background: "#c8401a", borderRadius: "2px", flexShrink: 0 }}></div>
        <div>
          <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c8401a" }}>
            Netscribes
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#0f1923", margin: 0 }}>
            Build With Claude
          </h2>
        </div>
      </div>

      {/* NEW ORDER: Demos → Setup/Basics (collapsible) → Prompt Writing → Webinar */}
      <DemosBlock />

      <div style={{ borderTop: "1px solid #e0dbd4", margin: "8px 0 36px" }}></div>

      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "#6b6560", lineHeight: 1.6, margin: 0 }}>
          New to Claude? The guides below cover setup and the basics — expand whichever is relevant to you.
        </p>
      </div>

      <InstallBlock />
      <BasicsBlock />

      <div style={{ borderTop: "1px solid #e0dbd4", margin: "8px 0 48px" }}></div>

      <PromptWritingBlock />
      <WebinarBlock />

      {/* JAI section */}
      <JAISection />

      {/* Legal */}
      <LegalBlock />
    </div>
    </div>
  );
}

window.AgentBuilderPanel = AgentBuilderPanel;

// ══════════════════════════════════════════════════════════════════════════════
// WIRING INSTRUCTIONS (unchanged)
// ══════════════════════════════════════════════════════════════════════════════
//
// 1. index.html — add BEFORE the app.jsx script:
//    <script type="text/babel" data-presets="react" src="agent-builder.jsx"></script>
//
// 2. sidebar.jsx — add NavSection for "Agent Builder"
//
// 3. app.jsx — add: {view === "agent-builder" && <AgentBuilderPanel />}
//
// ══════════════════════════════════════════════════════════════════════════════
