// Fallback project state used when the GitHub token is a placeholder or the
// fetch fails. Kept in sync with config/project.json — update both together.
// Mirrors the full project.json schema including schedule and interlink_map.
window.MOCK_PROJECT = {
  "months": [
    {
      "id": "month-1",
      "label": "Month 1 · May–Jun 2026",
      "active": true,
      "start_date": "2026-05-21"
    },
    {
      "id": "month-2",
      "label": "Month 2 · Jun–Jul 2026",
      "active": false,
      "start_date": "2026-06-18"
    },
    {
      "id": "month-3",
      "label": "Month 3 · Jul–Aug 2026",
      "active": false,
      "start_date": "2026-07-16"
    }
  ],
  "active_month": "month-1",
  "content_type_split": [
    {
      "id": "msv",
      "label": "MSV-driven",
      "description": "Broad articles targeting high-search-volume generic procurement terms. Industry examples added as callout sections.",
      "weight": 0.5,
      "pieces_est": 15
    },
    {
      "id": "ai-in-s2p",
      "label": "AI in S2P (Claude)",
      "description": "Claude-focused content for the Build With Claude section. Targets Claude + S2P searches. User journey mapped (Path 1/2/3). Drives traffic to JAI platform.",
      "weight": 0.25,
      "pieces_est": 8
    },
    {
      "id": "industry-specific",
      "label": "Industry-specific",
      "description": "Vertical content written explicitly for one sector. Lower search volume but high sales enablement value. Used by SDR team in outreach.",
      "weight": 0.25,
      "pieces_est": 8
    }
  ],
  "pillars": [
  {
    "id": "ai-in-s2p",
    "label": "AI in S2P",
    "subtitle": "Build With Claude",
    "weight": null,
    "geography": "Global",
    "clusters": [
      {
        "id": "c1-getting-started",
        "label": "Getting Started with Claude in S2P",
        "sequence": 1,
        "intent": "informational",
        "anchor_piece": "p-c1-3",
        "publish_week": 1,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-c1-1",
            "title": "How to Install Claude: A Step-by-Step Guide for Procurement Professionals",
            "format": "How-to Guide",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "how to install Claude procurement professional",
            "secondary_keyword": "Claude setup IT permissions S2P guide",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 1,
            "user_paths": [
              "Path 1",
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c1-2",
            "title": "What Are .md Files in Claude — and Why S2P Teams Can't Skip This Step",
            "format": "Educational Page",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "Claude basics markdown files S2P procurement",
            "secondary_keyword": "how to use Claude AI procurement basics",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 1,
            "user_paths": [
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c1-3",
            "title": "AI in S2P: What Claude Actually Delivers for Procurement in 2026 — Beyond the Hype",
            "format": "FAQ Article",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "AI S2P Claude use cases FAQ procurement",
            "secondary_keyword": "what to ask Claude S2P procurement FAQ",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 1,
            "user_paths": [
              "Path 1",
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          }
        ]
      },
      {
        "id": "c2-contracts",
        "label": "Claude for Contracts",
        "sequence": 2,
        "intent": "commercial",
        "anchor_piece": "p-c2-2",
        "publish_week": 2,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-c2-1",
            "title": "Stop Manually Hunting for Risky Clauses. Use Claude to Find Them in Your Contracts",
            "format": "MD File / Tutorial",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "use Claude review procurement contracts expiry risk",
            "secondary_keyword": "Claude contract analysis S2P tutorial",
            "intent": "commercial",
            "geography": "us",
            "schedule_week": 2,
            "user_paths": [
              "Path 2",
              "Path 3"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c2-2",
            "title": "What Happens When You Ask Claude to Audit Your Supplier Contracts",
            "format": "Problem-Solution",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "Claude supplier contract audit S2P results",
            "secondary_keyword": "AI contract review procurement outcomes",
            "intent": "commercial",
            "geography": "us",
            "schedule_week": 2,
            "user_paths": [
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          }
        ]
      },
      {
        "id": "c3-suppliers",
        "label": "Claude for Suppliers & Sourcing",
        "sequence": 4,
        "intent": "commercial",
        "anchor_piece": "p-c3-3",
        "publish_week": 2,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-c3-1",
            "title": "How to Use Claude to Find Alternative Suppliers by Country or Category",
            "format": "MD File / Tutorial",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "use Claude find alternative suppliers procurement",
            "secondary_keyword": "Claude supplier recommendation S2P",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 2,
            "user_paths": [
              "Path 2",
              "Path 3"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c3-2",
            "title": "How to Use Claude to Auto-Generate an RFP from Your Sourcing Brief",
            "format": "MD File / Tutorial",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "use Claude generate RFP procurement",
            "secondary_keyword": "Claude RFP autogeneration sourcing tutorial",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 2,
            "user_paths": [
              "Path 2",
              "Path 3"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c3-3",
            "title": "3 S2P Tasks You Can Do in Claude Right Now — With Prompts and Outputs",
            "format": "How-to Guide",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "Claude S2P tasks procurement prompts guide",
            "secondary_keyword": "AI sourcing contracts supplier procurement",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 2,
            "user_paths": [
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          }
        ]
      },
      {
        "id": "c4-prompt-library",
        "label": "S2P Prompt Library & Webinar Hub",
        "sequence": 6,
        "intent": "commercial",
        "anchor_piece": "p-c4-1",
        "publish_week": 4,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-c4-1",
            "title": "The Jaggaer S2P Claude Prompt Library: 20 Fundamental Queries Every Procurement Pro Needs",
            "format": "By the Numbers",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "S2P Claude prompt library procurement fundamental",
            "secondary_keyword": "Jaggaer GitHub S2P prompts Claude",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 4,
            "user_paths": [
              "Path 2",
              "Path 3"
            ],
            "content_type": "ai-in-s2p"
          },
          {
            "id": "p-c4-2",
            "title": "Claude for S2P: Watch How It Works — Curated Videos and Original Jaggaer Webinars",
            "format": "Webinar / Video Page",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "Claude S2P procurement webinar tutorial video",
            "secondary_keyword": "AI S2P procurement how-to video guide",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 4,
            "user_paths": [
              "Path 1",
              "Path 2"
            ],
            "content_type": "ai-in-s2p"
          }
        ]
      }
    ]
  },
  {
    "id": "discrete-manufacturing",
    "label": "Discrete Manufacturing",
    "subtitle": "US & Germany",
    "weight": null,
    "geography": "US / DE",
    "clusters": [
      {
        "id": "dm1-tariffs",
        "label": "Tariff & Trade Disruption",
        "sequence": 3,
        "intent": "informational",
        "anchor_piece": "p-dm1-2",
        "publish_week": 1,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-dm1-1",
            "title": "US Tariffs in H2 2026: Why Your Direct Procurement Numbers Need Recalculating",
            "format": "Quick-take Blog",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "tariff impact direct procurement 2026",
            "secondary_keyword": "US tariff supply chain manufacturing",
            "intent": "informational",
            "geography": "us",
            "schedule_week": 1,
            "content_type": "msv"
          },
          {
            "id": "p-dm1-2",
            "title": "CBAM & the Carbon Cost of Your Supply Chain: What Procurement Needs to Know Now",
            "format": "FAQ Article",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "CBAM procurement compliance manufacturing",
            "secondary_keyword": "carbon border adjustment supply chain cost",
            "intent": "informational",
            "geography": "de",
            "schedule_week": 1,
            "content_type": "msv"
          },
          {
            "id": "p-dm1-3",
            "title": "Nearshoring Doesn't Simplify Procurement. It Multiplies Risk.",
            "format": "Data Snapshot",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "nearshoring procurement complexity 2026",
            "secondary_keyword": "nearshoring supply chain risk data",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 1,
            "content_type": "msv"
          }
        ]
      },
      {
        "id": "dm2-subtier",
        "label": "Sub-Tier & Supplier Risk",
        "sequence": 5,
        "intent": "informational",
        "anchor_piece": "p-dm2-4",
        "publish_week": 3,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-dm2-1",
            "title": "Why Supply Chain Visibility Breaks Down Beyond Tier 1",
            "format": "Thought Leadership",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "supply chain visibility beyond tier 1",
            "secondary_keyword": "multi-tier supplier visibility challenges",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 3,
            "funnel": "TOFU",
            "url": "/supply-chain-visibility-beyond-tier-1",
            "notes": "NEW — not previously in tracker | Words: 1,200–1,800",
            "content_type": "msv"
          },
          {
            "id": "p-dm2-2",
            "title": "Supplier Financial Risk Signals Procurement Should Monitor",
            "format": "Informational Article",
            "assignee": "manager",
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "supplier financial risk assessment",
            "secondary_keyword": "supplier risk management",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 3,
            "funnel": "TOFU",
            "url": "/blog/supplier-financial-risk-signals-procurement",
            "notes": "NEW — not previously in tracker | Words: 2,000–2,500",
            "content_type": "msv"
          },
          {
            "id": "p-dm2-3",
            "title": "From Reactive to Predictive Supplier Risk Management",
            "format": "Strategic Solution Article",
            "assignee": "manager",
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "predictive supplier risk management",
            "secondary_keyword": "proactive procurement risk management",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 3,
            "funnel": "MOFU",
            "url": "/predictive-supplier-risk-management",
            "notes": "UPDATED — title refined, keyword updated | Words: 1,200–1,500",
            "content_type": "industry-specific"
          },
          {
            "id": "p-dm2-4",
            "title": "Tier 2-4 Supplier Bankruptcy: The Hidden Supply Chain Risk",
            "format": "Whitepaper (gated)",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "tier 2 supplier bankruptcy risk",
            "secondary_keyword": "supplier bankruptcy supply chain risk",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 3,
            "funnel": "BOFU",
            "url": "/tier-2-supplier-bankruptcy-supply-chain-risk",
            "notes": "UPDATED — title refined, keywords updated | Words: 2,500–4,000",
            "content_type": "industry-specific"
          }
        ]
      },
      {
        "id": "dm3-minerals",
        "label": "Critical Minerals & Commodity Risk",
        "sequence": 7,
        "intent": "informational",
        "anchor_piece": "p-dm3-2",
        "publish_week": 3,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-dm3-1",
            "title": "Most Procurement Platforms Are Missing Critical Mineral Risk in the Auto Supply Chain. What to Watch in H2 2026",
            "format": "Quick-take Blog",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "critical minerals automotive procurement",
            "secondary_keyword": "rare earth supply chain risk 2026",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 3,
            "content_type": "msv"
          },
          {
            "id": "p-dm3-2",
            "title": "Steel, Aluminum & Rare Earth Volatility: A Mid-2026 Reality Check for Procurement Teams",
            "format": "Data Snapshot",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "steel aluminum price volatility procurement 2026",
            "secondary_keyword": "commodity procurement risk data",
            "intent": "informational",
            "geography": "all",
            "schedule_week": 3,
            "content_type": "msv"
          }
        ]
      },
      {
        "id": "dm4-tco",
        "label": "Platform TCO & Consolidation",
        "sequence": 8,
        "intent": "commercial",
        "anchor_piece": "p-dm4-2",
        "publish_week": 4,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-dm4-1",
            "title": "The Hidden Costs in Your Procurement Platform Contract Nobody Talks About",
            "format": "Hot Take",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "hidden costs procurement platform contract",
            "secondary_keyword": "S2P platform true cost manufacturing",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 4,
            "content_type": "industry-specific"
          },
          {
            "id": "p-dm4-2",
            "title": "Before You Sign That Procurement Platform Contract: A CPO Checklist for H2 2026",
            "format": "eBook / Guide",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "manufacturing CPO procurement platform guide",
            "secondary_keyword": "S2P platform evaluation manufacturing",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 4,
            "content_type": "industry-specific"
          }
        ]
      }
    ]
  },
  {
    "id": "public-sector",
    "label": "Public Sector",
    "subtitle": "UK · FR · ES",
    "weight": null,
    "geography": "UK / FR / ES",
    "clusters": [
      {
        "id": "ps1-eu-ai",
        "label": "EU AI Act & Regulatory Compliance",
        "sequence": 9,
        "intent": "informational",
        "anchor_piece": "p-ps1-2",
        "publish_week": 2,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-ps1-1",
            "title": "EU AI Act & Public Procurement: 8 Questions Contracting Authorities Are Asking",
            "format": "FAQ Article",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "EU AI Act public procurement FAQ",
            "secondary_keyword": "AI Act contracting authority compliance 2026",
            "intent": "informational",
            "geography": "eu",
            "schedule_week": 2,
            "content_type": "msv"
          },
          {
            "id": "p-ps1-2",
            "title": "Your Government Procurement AI Audit Trail Has Gaps. Here's What the EU AI Act Requires in 2026",
            "format": "Whitepaper",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "AI government procurement audit trail EU AI Act",
            "secondary_keyword": "public sector AI compliance whitepaper",
            "intent": "commercial",
            "geography": "eu",
            "schedule_week": 2,
            "content_type": "industry-specific"
          }
        ]
      },
      {
        "id": "ps2-einvoicing",
        "label": "E-Invoicing & AP Automation",
        "sequence": 10,
        "intent": "commercial",
        "anchor_piece": "p-ps2-2",
        "publish_week": 2,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-ps2-1",
            "title": "E-Invoicing Is Live in France & Spain. Is Your AP Stack Compliant?",
            "format": "Quick-take Blog",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "e-invoicing compliance France Spain 2026",
            "secondary_keyword": "AP automation government e-invoicing mandate",
            "intent": "commercial",
            "geography": "fr",
            "schedule_week": 2,
            "content_type": "msv"
          },
          {
            "id": "p-ps2-2",
            "title": "Government Contract Leakage: 5 Numbers France, Spain & UK Cannot Ignore in 2026",
            "format": "Data Snapshot",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "government contract leakage data 2026",
            "secondary_keyword": "off-contract spend public sector UK France Spain",
            "intent": "informational",
            "geography": "eu",
            "schedule_week": 2,
            "content_type": "msv"
          }
        ]
      },
      {
        "id": "ps3-eval",
        "label": "Platform Evaluation & AI Adoption",
        "sequence": 11,
        "intent": "commercial",
        "anchor_piece": "p-ps3-1",
        "publish_week": 4,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-ps3-1",
            "title": "What Central Government Procurement Leaders Actually Want in a Platform for 2026",
            "format": "Q&A Piece",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "central government procurement head platform criteria",
            "secondary_keyword": "government CPO platform requirements 2026",
            "intent": "commercial",
            "geography": "eu",
            "schedule_week": 4,
            "content_type": "industry-specific"
          }
        ]
      }
    ]
  },
  {
    "id": "higher-education",
    "label": "Higher Education",
    "subtitle": "US · EU · UK",
    "weight": null,
    "geography": "US / EU / UK",
    "clusters": [
      {
        "id": "he1-maverick",
        "label": "Maverick Spend & Governance",
        "sequence": 12,
        "intent": "informational",
        "anchor_piece": "p-he1-2",
        "publish_week": 3,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-he1-1",
            "title": "Maverick Spend in US & UK Universities: What the Data Shows in 2026",
            "format": "Data Snapshot",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "maverick spend university data 2026",
            "secondary_keyword": "off-contract spend higher education UK US",
            "intent": "informational",
            "geography": "us",
            "schedule_week": 3,
            "content_type": "msv"
          },
          {
            "id": "p-he1-2",
            "title": "R1 University Procurement Governance Is Broken. The 2026 CFO & CPO Playbook to Fix It",
            "format": "Whitepaper",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "R1 university maverick spend CFO CPO playbook",
            "secondary_keyword": "higher education procurement governance",
            "intent": "commercial",
            "geography": "us",
            "schedule_week": 3,
            "content_type": "industry-specific"
          }
        ]
      },
      {
        "id": "he2-grants",
        "label": "Grant & Regulatory Compliance",
        "sequence": 13,
        "intent": "informational",
        "anchor_piece": "p-he2-2",
        "publish_week": 3,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-he2-1",
            "title": "OMB Uniform Guidance 2026: What University Procurement Teams Are Still Getting Wrong",
            "format": "Quick-take Blog",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "OMB Uniform Guidance university procurement 2026",
            "secondary_keyword": "2 CFR 200 federal grant compliance",
            "intent": "informational",
            "geography": "us",
            "schedule_week": 3,
            "content_type": "msv"
          },
          {
            "id": "p-he2-2",
            "title": "Grant Procurement Compliance in 2026: The Checklist Most NSF, NIH & Horizon Europe Teams Miss",
            "format": "Checklist",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "grant procurement compliance checklist NSF NIH Horizon Europe",
            "secondary_keyword": "federal grant compliance university",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 3,
            "content_type": "industry-specific"
          }
        ]
      },
      {
        "id": "he3-modernisation",
        "label": "Platform Modernisation & ROI",
        "sequence": 14,
        "intent": "commercial",
        "anchor_piece": "p-he3-1",
        "publish_week": 4,
        "month_id": "month-1",
        "pieces": [
          {
            "id": "p-he3-1",
            "title": "From Spreadsheets to Platform: How R1 Universities Are Modernising Procurement",
            "format": "Problem-Solution",
            "assignee": null,
            "status": "not-started",
            "revision_count": 0,
            "primary_keyword": "R1 university procurement platform modernisation",
            "secondary_keyword": "higher education procurement digitization 2026",
            "intent": "commercial",
            "geography": "all",
            "schedule_week": 4,
            "content_type": "industry-specific"
          }
        ]
      }
    ]
  }
],
  "team": {
    "ns": [
      {
        "id": "jason",
        "name": "Dipayan M",
        "role": "Researcher",
        "org": "ns"
      },
      {
        "id": "orlagh",
        "name": "Adi R",
        "role": "Researcher",
        "org": "ns"
      },
      {
        "id": "manager",
        "name": "Chahat K",
        "role": "NS Manager",
        "org": "ns",
        "admin": true
      }
    ],
    "jaggaer": [
      {
        "id": "indy",
        "name": "Indy C",
        "role": "CMO",
        "org": "jaggaer"
      },
      {
        "id": "anna",
        "name": "Jason R",
        "role": "Marketing",
        "org": "jaggaer",
        "admin": true
      },
      {
        "id": "m-ny8dy",
        "name": "Orlagh M",
        "role": "SEO, Digital Marketing",
        "org": "jaggaer"
      },
      {
        "id": "m-eic94",
        "name": "Anna R",
        "role": "PM",
        "org": "jaggaer"
      },
      {
        "id": "m-9toiv",
        "name": "Robert D",
        "role": "Marketing",
        "org": "jaggaer"
      }
    ]
  },
  "feedback": {},
  "build_with_claude": [
    {
      "name": "contract-analyser",
      "description": "Drag-drop MSA → Claude returns redline summary + risk flags.",
      "status": "Live",
      "updated": "2026-05-14",
      "path": "build-with-claude/contract-analyser"
    },
    {
      "name": "rfp-generator",
      "description": "Generates a first-draft RFP from a 5-question intake.",
      "status": "Ready for Review",
      "updated": "2026-05-12",
      "path": "build-with-claude/rfp-generator"
    },
    {
      "name": "supplier-recommender",
      "description": "Returns a ranked supplier shortlist with rationale.",
      "status": "In Progress",
      "updated": "2026-05-13",
      "path": "build-with-claude/supplier-recommender"
    },
    {
      "name": "spend-classifier",
      "description": "UNSPSC tagging assistant for unclassified spend rows.",
      "status": "In Progress",
      "updated": "2026-05-10",
      "path": "build-with-claude/spend-classifier"
    },
    {
      "name": "tender-summariser",
      "description": "Summarises long public-sector tenders into a one-page brief.",
      "status": "Live",
      "updated": "2026-05-11",
      "path": "build-with-claude/tender-summariser"
    }
  ],
  "conversations": {},
  "schedule": [
    {
      "week": 1,
      "label": "Week 1",
      "goal": "Capture Claude + S2P and tariff procurement search traffic from day one",
      "slots": [
        {
          "pillar": "discrete-manufacturing",
          "cluster": "dm1-tariffs",
          "linking_rule": "Quick Blog → FAQ → Data Snapshot; all cross-link"
        },
        {
          "pillar": "ai-in-s2p",
          "cluster": "c1-getting-started",
          "linking_rule": "All 3 link to each other; all link to JAI CTA"
        }
      ]
    },
    {
      "week": 2,
      "label": "Week 2",
      "goal": "Convert Path 2 users, demonstrate Claude, rank before EU AI Act deadline peaks",
      "slots": [
        {
          "pillar": "ai-in-s2p",
          "cluster": "c3-suppliers",
          "linking_rule": "All use cases link to Getting Started cluster + JAI"
        },
        {
          "pillar": "public-sector",
          "cluster": "ps1-eu-ai",
          "linking_rule": "FAQ → Whitepaper; Quick Blog → Data Snapshot; cross-link"
        },
        {
          "pillar": "public-sector",
          "cluster": "ps2-einvoicing",
          "linking_rule": "FAQ → Whitepaper; Quick Blog → Data Snapshot; cross-link"
        },
        {
          "pillar": "ai-in-s2p",
          "cluster": "c2-contracts",
          "linking_rule": "All use cases link to Getting Started cluster + JAI"
        }
      ]
    },
    {
      "week": 3,
      "label": "Week 3",
      "goal": "Build cluster authority on supply chain risk and higher education spend governance",
      "slots": [
        {
          "pillar": "discrete-manufacturing",
          "cluster": "dm2-subtier",
          "linking_rule": "All 3 informational pieces link to Whitepaper as anchor"
        },
        {
          "pillar": "discrete-manufacturing",
          "cluster": "dm3-minerals",
          "linking_rule": "Quick Blog links to Data Snapshot as anchor; minerals cross-link"
        },
        {
          "pillar": "higher-education",
          "cluster": "he1-maverick",
          "linking_rule": "Data Snapshot → Whitepaper; Quick Blog → Checklist"
        },
        {
          "pillar": "higher-education",
          "cluster": "he2-grants",
          "linking_rule": "Data Snapshot → Whitepaper; Quick Blog → Checklist"
        }
      ]
    },
    {
      "week": 4,
      "label": "Week 4",
      "goal": "Convert audiences built in weeks 1–3 to platform evaluation intent",
      "slots": [
        {
          "pillar": "ai-in-s2p",
          "cluster": "c4-prompt-library",
          "linking_rule": "Library links back to all use cases; Webinar links to JAI"
        },
        {
          "pillar": "discrete-manufacturing",
          "cluster": "dm4-tco",
          "linking_rule": "Hot Take → eBook; both link back to risk clusters"
        },
        {
          "pillar": "public-sector",
          "cluster": "ps3-eval",
          "linking_rule": "Q&A links back to both compliance clusters"
        },
        {
          "pillar": "higher-education",
          "cluster": "he3-modernisation",
          "linking_rule": "P-S links back to maverick spend + grant clusters"
        }
      ]
    }
  ],
  "interlink_map": [
    {
      "pillar": "ai-in-s2p",
      "cluster": "c1-getting-started",
      "anchor_label": "FAQ: AI in S2P — What Claude Actually Delivers",
      "linking_rule": "How-to Guide + Educational Page both link to FAQ as anchor",
      "cross_pillar": "Link from each sector's AI angle back to Getting Started cluster"
    },
    {
      "pillar": "ai-in-s2p",
      "cluster": "c2-contracts",
      "anchor_label": "P-S: What Happens When You Ask Claude to Audit Contracts",
      "linking_rule": "MD Tutorial links to P-S; P-S links back to Getting Started cluster",
      "cross_pillar": "Manufacturing C2: Sub-tier bankruptcy contracts angle"
    },
    {
      "pillar": "ai-in-s2p",
      "cluster": "c3-suppliers",
      "anchor_label": "How-to Guide: 3 S2P Tasks in Claude Right Now",
      "linking_rule": "Both MD Files (Suppliers + Sourcing) link to How-to Guide as anchor",
      "cross_pillar": "Public Sector C2: E-invoicing as a Claude sourcing use case"
    },
    {
      "pillar": "ai-in-s2p",
      "cluster": "c4-prompt-library",
      "anchor_label": "By the Numbers: 20 Fundamental Queries",
      "linking_rule": "Webinar Page links to Prompt Library; Library links to all C2 + C3 pieces",
      "cross_pillar": "All pillars: prompt library is the master cross-pillar SEO resource"
    },
    {
      "pillar": "discrete-manufacturing",
      "cluster": "dm1-tariffs",
      "anchor_label": "FAQ: CBAM & the Carbon Cost of Your Supply Chain",
      "linking_rule": "Quick Blog + Data Snapshot both link to FAQ as anchor",
      "cross_pillar": "Public Sector C1: EU AI Act + CBAM as parallel compliance obligations"
    },
    {
      "pillar": "discrete-manufacturing",
      "cluster": "dm2-subtier",
      "anchor_label": "Whitepaper: Tier 2-4 Supplier Bankruptcy — The Hidden Supply Chain Risk",
      "linking_rule": "Thought Leadership + Informational Article + Strategic Solution Article all link to Whitepaper as anchor",
      "cross_pillar": "AI in S2P C2: Claude for auditing supplier contracts"
    },
    {
      "pillar": "discrete-manufacturing",
      "cluster": "dm3-minerals",
      "anchor_label": "Data Snapshot: Steel, Aluminum & Rare Earth Volatility",
      "linking_rule": "Quick Blog links to Data Snapshot as anchor",
      "cross_pillar": "Manufacturing C2: Critical minerals as a sub-tier risk driver"
    },
    {
      "pillar": "discrete-manufacturing",
      "cluster": "dm4-tco",
      "anchor_label": "eBook: Before You Sign That Procurement Platform Contract",
      "linking_rule": "Hot Take links to eBook as anchor; eBook links back to all risk clusters",
      "cross_pillar": "Public Sector C3: Platform evaluation — same buyer, different sector"
    },
    {
      "pillar": "public-sector",
      "cluster": "ps1-eu-ai",
      "anchor_label": "Whitepaper: AI in Government Procurement",
      "linking_rule": "FAQ Article links to Whitepaper as anchor; Whitepaper links back to FAQ",
      "cross_pillar": "Manufacturing C4: Platform evaluation — AI as a buying criterion"
    },
    {
      "pillar": "public-sector",
      "cluster": "ps2-einvoicing",
      "anchor_label": "Data Snapshot: Government Contract Leakage",
      "linking_rule": "Quick Blog links to Data Snapshot as anchor",
      "cross_pillar": "Higher Ed C1: Maverick spend — same problem, different sector"
    },
    {
      "pillar": "public-sector",
      "cluster": "ps3-eval",
      "anchor_label": "Q&A: Head of Procurement Platform Criteria",
      "linking_rule": "Q&A links back to both compliance clusters (C1 + C2)",
      "cross_pillar": "Manufacturing C4 + Higher Ed C3: Cross-pillar platform evaluation authority"
    },
    {
      "pillar": "higher-education",
      "cluster": "he1-maverick",
      "anchor_label": "Whitepaper: CFO & CPO Maverick Spend Playbook",
      "linking_rule": "Data Snapshot links to Whitepaper as anchor",
      "cross_pillar": "Public Sector C2: Off-contract spend — parallel government problem"
    },
    {
      "pillar": "higher-education",
      "cluster": "he2-grants",
      "anchor_label": "Checklist: Grant Compliance NSF/NIH/Horizon Europe",
      "linking_rule": "Quick Blog links to Checklist as anchor",
      "cross_pillar": "Higher Ed C3: Platform modernisation as the compliance solution"
    },
    {
      "pillar": "higher-education",
      "cluster": "he3-modernisation",
      "anchor_label": "P-S: From Spreadsheets to Platform",
      "linking_rule": "P-S links back to maverick spend (C1) + grant compliance (C2) as catalyst",
      "cross_pillar": "Manufacturing C4 + Public Sector C3: Platform evaluation cross-pillar"
    }
  ]
};
