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
          "pieces": [
            {
              "id": "p-c1-1",
              "title": "How to Install Claude: A Step-by-Step Guide for Procurement Professionals",
              "format": "How-to Guide",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "how to install Claude procurement",
              "geography": "all",
              "user_paths": [
                "Path 1",
                "Path 2"
              ],
              "schedule_week": 1,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c1-2",
              "title": "First Principles: What Claude Can Do for Source-to-Pay Teams",
              "format": "Explainer",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "Claude source to pay teams",
              "geography": "all",
              "user_paths": [
                "Path 2"
              ],
              "schedule_week": 1,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c1-3",
              "title": "S2P Buyer's FAQ on Generative AI Assistants",
              "format": "FAQ (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "generative AI assistants procurement",
              "geography": "all",
              "user_paths": [
                "Path 1",
                "Path 2"
              ],
              "schedule_week": 1,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            }
          ],
          "publish_week": 1,
          "month_id": "month-1"
        },
        {
          "id": "c2-contracts",
          "label": "Claude for Contracts",
          "sequence": 2,
          "intent": "commercial",
          "anchor_piece": "p-c2-2",
          "pieces": [
            {
              "id": "p-c2-1",
              "title": "Redlining Supplier MSAs with Claude: A Walkthrough",
              "format": "Walkthrough",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "redlining MSA Claude",
              "geography": "us",
              "user_paths": [
                "Path 2",
                "Path 3"
              ],
              "schedule_week": 2,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c2-2",
              "title": "The Contract Review Playbook for Procurement (Anchor)",
              "format": "Playbook (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "contract review playbook procurement",
              "geography": "us",
              "user_paths": [
                "Path 2"
              ],
              "schedule_week": 2,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            }
          ],
          "publish_week": 2,
          "month_id": "month-1"
        },
        {
          "id": "c3-suppliers",
          "label": "Claude for Suppliers & Sourcing",
          "sequence": 4,
          "intent": "informational",
          "anchor_piece": "p-c3-2",
          "pieces": [
            {
              "id": "p-c3-1",
              "title": "Asking Claude to Pre-Screen RFP Responses",
              "format": "How-to Guide",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "Claude RFP pre-screen",
              "geography": "all",
              "user_paths": [
                "Path 2",
                "Path 3"
              ],
              "schedule_week": 2,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c3-2",
              "title": "Supplier Intelligence with Claude: A Practical Field Guide (Anchor)",
              "format": "Field Guide (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "supplier intelligence Claude",
              "geography": "all",
              "last_upload": "2026-05-18T05:34:40.861Z",
              "last_upload_by": "manager",
              "user_paths": [
                "Path 2",
                "Path 3"
              ],
              "schedule_week": 2,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c3-3",
              "title": "Sourcing Event Briefs: From Blank Page to Brief in 10 Minutes",
              "format": "Case Study",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "sourcing event brief AI",
              "geography": "eu",
              "user_paths": [
                "Path 2"
              ],
              "schedule_week": 2,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            }
          ],
          "publish_week": 2,
          "month_id": "month-1"
        },
        {
          "id": "c4-prompt-library",
          "label": "S2P Prompt Library & Webinar Hub",
          "sequence": 6,
          "intent": "commercial",
          "anchor_piece": "p-c4-1",
          "pieces": [
            {
              "id": "p-c4-1",
              "title": "The Procurement Prompt Library - 40 Working Prompts for S2P (Anchor)",
              "format": "Resource Hub (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "procurement prompt library",
              "geography": "all",
              "user_paths": [
                "Path 2",
                "Path 3"
              ],
              "schedule_week": 4,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            },
            {
              "id": "p-c4-2",
              "title": "Webinar Recap: Claude in the S2P Stack - Live Q&A",
              "format": "Webinar Recap",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "Claude S2P webinar",
              "geography": "all",
              "user_paths": [
                "Path 1",
                "Path 2"
              ],
              "schedule_week": 4,
              "content_type": "ai-in-s2p",
              "funnel_stage": "MOFU",
              "secondary_keyword": "",
              "url_slug": ""
            }
          ],
          "publish_week": 4,
          "month_id": "month-1"
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
          "pieces": [
            {
              "id": "p-dm1-1",
              "title": "US Tariffs in H2 2026: Why Your Direct Procurement Numbers Need Recalculating",
              "format": "Quick-take Blog",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "tariff impact direct procurement 2026",
              "secondary_keyword": "US tariff supply chain manufacturing",
              "intent": "informational",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/tariff-impact-direct-procurement-2026",
              "schedule_week": 1
            },
            {
              "id": "p-dm1-2",
              "title": "CBAM & the Carbon Cost of Your Supply Chain: What Procurement Needs to Know Now",
              "format": "FAQ Article",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "CBAM procurement compliance manufacturing",
              "secondary_keyword": "carbon border adjustment supply chain cost",
              "intent": "informational",
              "geography": "DE",
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/cbam-procurement-compliance-manufacturing",
              "schedule_week": 1
            },
            {
              "id": "p-dm1-3",
              "title": "Nearshoring Doesn't Simplify Procurement. It Multiplies Risk.",
              "format": "Data Snapshot",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "nearshoring procurement complexity 2026",
              "secondary_keyword": "nearshoring supply chain risk data",
              "intent": "informational",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/nearshoring-procurement-complexity-2026",
              "schedule_week": 1
            }
          ],
          "publish_week": 1,
          "month_id": "month-1"
        },
        {
          "id": "dm2-subtier",
          "label": "Sub-Tier & Supplier Risk",
          "sequence": 5,
          "intent": "informational",
          "anchor_piece": "p-dm2-4",
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
              "funnel": "TOFU",
              "geography": "all",
              "notes": "NEW — not previously in tracker | URL: /supply-chain-visibility-beyond-tier-1 | Words: 1,200–1,800",
              "schedule_week": 3,
              "content_type": "msv",
              "funnel_stage": "TOFU",
              "url_slug": "/supply-chain-visibility-beyond-tier-1"
            },
            {
              "id": "p-dm2-2",
              "title": "Supplier Financial Risk Signals Procurement Should Monitor",
              "format": "Informational Article",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "supplier financial risk assessment",
              "secondary_keyword": "supplier risk management",
              "intent": "informational",
              "funnel": "TOFU",
              "geography": "all",
              "notes": "NEW — not previously in tracker | URL: /blog/supplier-financial-risk-signals-procurement | Words: 2,000–2,500",
              "schedule_week": 3,
              "content_type": "msv",
              "funnel_stage": "TOFU",
              "url_slug": "/supplier-financial-risk-signals-procurement"
            },
            {
              "id": "p-dm2-3",
              "title": "From Reactive to Predictive Supplier Risk Management",
              "format": "Strategic Solution Article",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "predictive supplier risk management",
              "secondary_keyword": "proactive procurement risk management",
              "intent": "commercial",
              "funnel": "MOFU",
              "geography": "all",
              "notes": "UPDATED — title refined, keyword updated | URL: /predictive-supplier-risk-management | Words: 1,200–1,500",
              "schedule_week": 3,
              "content_type": "msv",
              "funnel_stage": "MOFU",
              "url_slug": "/predictive-supplier-risk-management"
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
              "funnel": "BOFU",
              "geography": "all",
              "notes": "UPDATED — title refined, keywords updated | URL: /tier-2-supplier-bankruptcy-supply-chain-risk | Words: 2,500–4,000",
              "schedule_week": 3,
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/tier-2-supplier-bankruptcy-supply-chain-risk"
            }
          ],
          "publish_week": 3,
          "month_id": "month-1"
        },
        {
          "id": "dm3-minerals",
          "label": "Critical Minerals & Commodity Risk",
          "sequence": 7,
          "intent": "informational",
          "anchor_piece": "p-dm3-2",
          "pieces": [
            {
              "id": "p-dm3-1",
              "title": "Most Procurement Platforms Are Missing Critical Mineral Risk in the Auto Supply Chain. What to Watch in H2 2026",
              "format": "Quick-take Blog",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "critical minerals automotive procurement",
              "secondary_keyword": "rare earth supply chain risk 2026",
              "intent": "informational",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/critical-minerals-automotive-procurement",
              "schedule_week": 3
            },
            {
              "id": "p-dm3-2",
              "title": "Steel, Aluminum & Rare Earth Volatility: A Mid-2026 Reality Check for Procurement Teams",
              "format": "Data Snapshot",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "steel aluminum price volatility procurement 2026",
              "secondary_keyword": "commodity procurement risk data",
              "intent": "informational",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/steel-aluminum-rare-earth-volatility-procurement-2026",
              "schedule_week": 3
            }
          ],
          "publish_week": 3,
          "month_id": "month-1"
        },
        {
          "id": "dm4-tco",
          "label": "Platform TCO & Consolidation",
          "sequence": 8,
          "intent": "commercial",
          "anchor_piece": "p-dm4-2",
          "pieces": [
            {
              "id": "p-dm4-1",
              "title": "The Hidden Costs in Your Procurement Platform Contract Nobody Talks About",
              "format": "Hot Take",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "hidden costs procurement platform contract",
              "secondary_keyword": "S2P platform true cost manufacturing",
              "intent": "commercial",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "MOFU",
              "url_slug": "/hidden-costs-procurement-platform-contract",
              "schedule_week": 4
            },
            {
              "id": "p-dm4-2",
              "title": "Before You Sign That Procurement Platform Contract: A CPO Checklist for H2 2026",
              "format": "eBook / Guide",
              "assignee": "",
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "manufacturing CPO procurement platform guide",
              "secondary_keyword": "S2P platform evaluation manufacturing",
              "intent": "commercial",
              "geography": "US",
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/manufacturing-cpo-procurement-platform-guide",
              "schedule_week": 4
            }
          ],
          "publish_week": 4,
          "month_id": "month-1"
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
          "label": "EU AI Act Compliance",
          "sequence": 9,
          "intent": "informational",
          "anchor_piece": "p-ps1-1",
          "pieces": [
            {
              "id": "p-ps1-1",
              "title": "EU AI Act for Public Procurement Teams: What Actually Changes (Anchor)",
              "format": "Analysis (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "EU AI Act public procurement",
              "geography": "eu",
              "schedule_week": 2,
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/eu-ai-act-public-procurement-faq",
              "secondary_keyword": "AI Act contracting authority compliance 2026"
            },
            {
              "id": "p-ps1-2",
              "title": "High-Risk AI Systems in Tendering: A Compliance Checklist",
              "format": "Checklist",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "high risk AI tender compliance",
              "geography": "eu",
              "schedule_week": 2,
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/ai-government-procurement-audit-trail-eu-ai-act",
              "secondary_keyword": "public sector AI compliance whitepaper"
            }
          ],
          "publish_week": 2,
          "month_id": "month-1"
        },
        {
          "id": "ps2-einvoicing",
          "label": "E-Invoicing Mandates",
          "sequence": 10,
          "intent": "informational",
          "anchor_piece": "p-ps2-1",
          "pieces": [
            {
              "id": "p-ps2-1",
              "title": "Peppol, Factur-X, FACe: A Reader for Public Sector Procurement (Anchor)",
              "format": "Explainer (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "Peppol Factur-X FACe public sector",
              "geography": "eu",
              "schedule_week": 2,
              "content_type": "industry-specific",
              "funnel_stage": "MOFU",
              "url_slug": "/e-invoicing-compliance-france-spain-2026",
              "secondary_keyword": "AP automation government e-invoicing mandate"
            },
            {
              "id": "p-ps2-2",
              "title": "France's E-Invoicing Reform: Timeline & What to Do This Quarter",
              "format": "Briefing Note",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "France e-invoicing reform 2026",
              "geography": "fr",
              "schedule_week": 2,
              "content_type": "msv",
              "funnel_stage": "TOFU",
              "url_slug": "/government-contract-leakage-data-2026",
              "secondary_keyword": "off-contract spend public sector UK France Spain"
            }
          ],
          "publish_week": 2,
          "month_id": "month-1"
        },
        {
          "id": "ps3-eval",
          "label": "Platform Evaluation",
          "sequence": 11,
          "intent": "commercial",
          "anchor_piece": "p-ps3-1",
          "pieces": [
            {
              "id": "p-ps3-1",
              "title": "Evaluating S2P Platforms for Public Sector: The 12-Criterion Scorecard (Anchor)",
              "format": "Scorecard (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "S2P platform evaluation public sector",
              "geography": "eu",
              "schedule_week": 4,
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/central-government-procurement-platform-criteria-2026",
              "secondary_keyword": "government CPO platform requirements 2026"
            }
          ],
          "publish_week": 4,
          "month_id": "month-1"
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
          "label": "Maverick Spend",
          "sequence": 12,
          "intent": "informational",
          "anchor_piece": "p-he1-1",
          "pieces": [
            {
              "id": "p-he1-1",
              "title": "Maverick Spend on Campus: Where It Hides, How to Surface It (Anchor)",
              "format": "Field Guide (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "maverick spend higher education",
              "geography": "us",
              "schedule_week": 3,
              "content_type": "msv",
              "funnel_stage": "TOFU",
              "url_slug": "/maverick-spend-university-data-2026",
              "secondary_keyword": "off-contract spend higher education UK US"
            },
            {
              "id": "p-he1-2",
              "title": "P-Card Programmes vs Punch-Out: A Trade-Off Read",
              "format": "Analysis",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "P-Card punch-out university",
              "geography": "us",
              "schedule_week": 3,
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/r1-university-maverick-spend-cfo-cpo-playbook",
              "secondary_keyword": "higher education procurement governance"
            }
          ],
          "publish_week": 3,
          "month_id": "month-1"
        },
        {
          "id": "he2-grants",
          "label": "Grant Compliance",
          "sequence": 13,
          "intent": "informational",
          "anchor_piece": "p-he2-1",
          "pieces": [
            {
              "id": "p-he2-1",
              "title": "Uniform Guidance & the Procurement Office: A Working Reader (Anchor)",
              "format": "Reader (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "uniform guidance procurement university",
              "geography": "us",
              "schedule_week": 3,
              "content_type": "industry-specific",
              "funnel_stage": "TOFU",
              "url_slug": "/omb-uniform-guidance-university-procurement-2026",
              "secondary_keyword": "2 CFR 200 federal grant compliance"
            },
            {
              "id": "p-he2-2",
              "title": "UKRI Procurement Rules in 2026: The Quick Read for University Buyers",
              "format": "Briefing Note",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "UKRI procurement rules 2026",
              "geography": "uk",
              "schedule_week": 3,
              "content_type": "industry-specific",
              "funnel_stage": "MOFU",
              "url_slug": "/grant-procurement-compliance-checklist-nsf-nih-horizon-europe",
              "secondary_keyword": "federal grant compliance university"
            }
          ],
          "publish_week": 3,
          "month_id": "month-1"
        },
        {
          "id": "he3-modernisation",
          "label": "Platform Modernisation",
          "sequence": 14,
          "intent": "commercial",
          "anchor_piece": "p-he3-1",
          "pieces": [
            {
              "id": "p-he3-1",
              "title": "Replacing Legacy Procurement on Campus: A Phased Plan (Anchor)",
              "format": "Plan (Anchor)",
              "assignee": null,
              "status": "not-started",
              "revision_count": 0,
              "primary_keyword": "replace legacy procurement campus",
              "geography": "all",
              "schedule_week": 4,
              "content_type": "industry-specific",
              "funnel_stage": "BOFU",
              "url_slug": "/r1-university-procurement-platform-modernisation",
              "secondary_keyword": "higher education procurement digitization 2026"
            }
          ],
          "publish_week": 4,
          "month_id": "month-1"
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
