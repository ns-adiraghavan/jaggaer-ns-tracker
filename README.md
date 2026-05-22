# Jaggaer × Netscribes — Content Intelligence Tracker
### Technical Reference & Build Guide

---

## What this is

A collaborative content delivery and review platform for the Jaggaer × Netscribes content intelligence engagement. It replaces a shared spreadsheet and serves as the single interface for content delivery, client review, feedback, and approval — with a Claude-powered conversation layer that lets both teams query project state in natural language.

It is also a reference build for Jaggaer's own team: a working example of what a Claude-powered internal tool looks like at production quality.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [The Data Model — project.json](#3-the-data-model--projectjson)
4. [Status Lifecycle](#4-status-lifecycle)
5. [Content Type Model](#5-content-type-model)
6. [Publishing Sequence & Interlink Map](#6-publishing-sequence--interlink-map)
7. [File-by-File Reference](#7-file-by-file-reference)
8. [Deployment (Vercel)](#8-deployment-vercel)
9. [Environment Variables](#9-environment-variables)
10. [The Agent Builder Tab](#10-the-agent-builder-tab)
11. [Prompts: How to Build Something Like This](#11-prompts-how-to-build-something-like-this)
12. [Prompts: How to Build Agent Builder Artifacts](#12-prompts-how-to-build-agent-builder-artifacts)
13. [Known Issues & Next Steps](#13-known-issues--next-steps)

---

## 1. Architecture Overview

```
Browser (React via Babel CDN — no build step)
    │
    ├── Reads/writes project state
    │       └── /api/github.js  (Vercel serverless)
    │               └── GitHub Contents API
    │                       └── config/project.json  ← single source of truth
    │
    ├── Claude conversation rail
    │       └── /api/anthropic.js  (Vercel serverless)
    │               └── Anthropic API  /v1/messages
    │
    └── Static assets served from /repo-setup/
            (HTML, JSX, CSS, logos)
```

**Key principle:** GitHub is the database. There is no separate backend, no database, no server-side state. Every read and write goes through the GitHub Contents API via a Vercel proxy function that injects the PAT from environment variables. The browser never holds a credential.

**Why Vercel proxy functions?** The GitHub PAT must never appear in browser-side code. The `/api/github.js` serverless function reads `process.env.GITHUB_TOKEN` and proxies requests. Same pattern for the Anthropic key via `/api/anthropic.js`.

---

## 2. Repository Structure

```
/
├── config/
│   └── project.json              ← ALL app state lives here
│
├── content/
│   └── month-1/
│       └── {pillar-id}/
│           └── {cluster-id}/
│               └── {piece-id}/
│                   └── deliverable-v{n}.html   ← uploaded content files
│
├── build-with-claude/
│   ├── contract-analyser/
│   ├── rfp-generator/
│   ├── supplier-recommender/
│   ├── spend-classifier/
│   └── tender-summariser/        ← Claude-powered apps (separate from tracker)
│
├── repo-setup/                   ← Vercel serves this folder as the app root
│   ├── index.html
│   ├── styles.css
│   ├── mock-data.js              ← fallback when GitHub is unavailable
│   ├── api.js                    ← GitHub + Anthropic API helpers
│   ├── entry.jsx                 ← name selector / login screen
│   ├── sidebar.jsx               ← left navigation
│   ├── tracker.jsx               ← main tracker (cards + table views)
│   ├── claude-rail.jsx           ← Claude conversation rail (right column)
│   ├── bwc.jsx                   ← Build With Claude read-only panel
│   ├── admin.jsx                 ← admin config editor
│   ├── agent-builder.jsx         ← Agent Builder tab
│   ├── app.jsx                   ← root: hydration, routing, GitHub save
│   ├── api/
│   │   ├── github.js             ← Vercel serverless proxy
│   │   └── anthropic.js          ← Vercel serverless proxy
│   ├── jaggaer-logo.png
│   └── netscribes-logo.png
│
└── README.md
```

---

## 3. The Data Model — project.json

Everything the app renders is derived from a single file: `config/project.json`. Adding a new pillar, cluster, piece, team member, or month requires only editing this file — no code changes.

### Root structure

```json
{
  "months": [...],
  "active_month": "month-1",
  "content_type_split": [...],
  "pillars": [...],
  "team": { "ns": [...], "jaggaer": [...] },
  "feedback": {},
  "build_with_claude": [...],
  "conversations": {},
  "schedule": [...],
  "interlink_map": [...]
}
```

### months

```json
{
  "id": "month-1",
  "label": "Month 1 · May–Jun 2026",
  "active": true,
  "start_date": "2026-05-21"
}
```

`start_date` drives the week calculation. The app computes `currentWeek` (1–4) by diffing today against the active month's start date. Overdue and due-this-week highlighting derives from this.

### content_type_split

The three-type model that overlays the four industry pillars:

```json
{
  "id": "msv",
  "label": "MSV-driven",
  "description": "...",
  "weight": 0.50,
  "pieces_est": 15
}
```

Valid `id` values: `"msv"`, `"ai-in-s2p"`, `"industry-specific"`. Each piece carries one of these as its `content_type` field.

### pillars

```json
{
  "id": "discrete-manufacturing",
  "label": "Discrete Manufacturing",
  "subtitle": "US & Germany",
  "weight": null,
  "geography": "US, Germany",
  "clusters": [...]
}
```

`weight` is `null` because pillar weights have been replaced by the `content_type_split` model. The field is preserved for schema compatibility.

### clusters

```json
{
  "id": "dm1-tariffs",
  "label": "Tariff & Trade Disruption",
  "sequence": 1,
  "intent": "informational",
  "anchor_piece": "p-dm1-2",
  "month_id": "month-1",
  "pieces": [...]
}
```

`anchor_piece` must match the `id` of one piece in the `pieces` array. The anchor is called out visually in the tracker and is the linking hub for the cluster's internal link strategy.

`intent` is either `"informational"` or `"commercial"`. The publishing sequence puts informational clusters first.

### pieces

The full piece schema as of v3:

```json
{
  "id": "p-dm1-2",
  "title": "CBAM & the Carbon Cost of Your Supply Chain: What Procurement Needs to Know Now",
  "format": "FAQ Article",
  "assignee": "jason",
  "status": "not-started",
  "revision_count": 0,
  "primary_keyword": "CBAM procurement compliance manufacturing",
  "secondary_keyword": "carbon border adjustment supply chain cost",
  "intent": "informational",
  "geography": "DE",
  "user_paths": ["path-2"],
  "content_type": "industry-specific",
  "funnel_stage": "TOFU",
  "url_slug": "/cbam-procurement-compliance-manufacturing",
  "schedule_week": 1
}
```

| Field | Values | Notes |
|---|---|---|
| `id` | `p-{cluster}-{n}` | Unique across entire project |
| `status` | see §4 | Drives all UI state |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` | New in v3 |
| `funnel_stage` | `TOFU` / `MOFU` / `BOFU` / `Informational` | New in v3 |
| `url_slug` | `/slug-here` | New in v3 |
| `schedule_week` | `1`–`4` | Used for overdue/due timing calculations |
| `user_paths` | `["path-1"]` etc | AI in S2P pillar only |

### team

```json
{
  "ns": [
    { "id": "jason", "name": "Jason", "role": "researcher", "org": "ns" }
  ],
  "jaggaer": [
    { "id": "indy", "name": "Indy", "role": "client", "org": "jaggaer", "admin": true }
  ]
}
```

`"admin": true` on a team member unlocks admin mode in the app (inline editing, piece deletion, config editing). The entry screen identifies admin users from this field.

### feedback

Runtime-written by the app. Structure:

```json
{
  "p-dm2-1": [
    {
      "id": "fb-a3x9k2",
      "author": "indy",
      "verdict": "needs-revision",
      "body": "Section 2 needs a stronger data point — the current stat is from 2023.",
      "ts": "2026-05-22T14:32:00Z"
    }
  ]
}
```

Valid verdicts: `"approved"`, `"needs-revision"`, `"question"`.

### schedule

The publishing sequence. Read by `tracker.jsx` to drive the Publishing Sequence view and all timing calculations. Previously hardcoded in `tracker.jsx` — now lives here so updating the schedule requires only editing `project.json`.

```json
{
  "week": 1,
  "label": "Week 1",
  "goal": "Capture Claude + S2P and tariff procurement search traffic from day one",
  "slots": [
    {
      "pillar": "ai-in-s2p",
      "cluster": "c1-getting-started",
      "linking_rule": "All 3 link to each other; all link to JAI CTA"
    }
  ]
}
```

To update the sequence: edit `schedule` in `project.json`. No code changes needed.

### interlink_map

The cross-pillar linking strategy. Read by `tracker.jsx` to drive the Interlink Map view and the piece detail drawer's cross-pillar link field. Previously hardcoded in `tracker.jsx`.

```json
{
  "pillar": "discrete-manufacturing",
  "cluster": "dm1-tariffs",
  "anchor_label": "FAQ: CBAM & the Carbon Cost of Your Supply Chain",
  "linking_rule": "Quick Blog + Data Snapshot both link to FAQ as anchor",
  "cross_pillar": "Public Sector C1: EU AI Act + CBAM as parallel compliance obligations"
}
```

`pillar` and `cluster` are IDs (matching the `id` fields in `pillars`). `tracker.jsx` enriches these to display labels at render time. To update the interlink strategy: edit `interlink_map` in `project.json`.

---

## 4. Status Lifecycle

Every piece moves through exactly these states in order:

```
not-started → uploaded → jaggaer-feedback → revised → approved
```

| Status | Who triggers it | What it means |
|---|---|---|
| `not-started` | Default | Piece exists in config but no file has been uploaded |
| `uploaded` | NS uploads a file | Deliverable committed to GitHub; Jaggaer is cued |
| `jaggaer-feedback` | Jaggaer submits feedback with verdict `needs-revision` or `question` | NS is cued to revise |
| `revised` | NS re-uploads after feedback | New versioned file committed; Jaggaer is cued again |
| `approved` | Jaggaer submits feedback with verdict `approved` | Counts toward cluster completion |

A cluster is **publish-ready** when every piece in it reaches `approved`. The progress arcs and the Publishing Sequence view reflect this live.

---

## 5. Content Type Model

Month 1 uses a three-type content split that cuts across all four pillars:

| Type | ID | Weight | Purpose |
|---|---|---|---|
| MSV-driven | `msv` | 50% | Broad horizontal pieces targeting high-search-volume procurement terms. Industry examples as callout sections. |
| AI in S2P (Claude) | `ai-in-s2p` | 25% | Claude-focused content for the Build With Claude section. User journey mapped (Path 1/2/3). |
| Industry-specific | `industry-specific` | 25% | Vertical content for one sector. Lower search volume, high SDR enablement value. eBooks and whitepapers. |

Each piece carries `"content_type": "msv"` (or `"ai-in-s2p"` or `"industry-specific"`). The tracker does not currently filter by content type in the UI — that column is available for a future sprint.

**User paths (AI in S2P pillar only):**

| Path | Description |
|---|---|
| Path 1 | Low-interest user. Lands on the page, not keen to figure it out themselves. Prefers a ready-made solution (JAI). |
| Path 2 | Medium-interest user. Curious, wants to understand Claude, has some friction (IT permissions, setup). Wants to see it work first. |
| Path 3 | Superuser. Already interested in AI, has or will get permissions, wants to go deep. Will fork the GitHub repo. |

---

## 6. Publishing Sequence & Interlink Map

Both are now fully data-driven from `project.json`. To change either, edit the JSON — no code change required.

**Publishing sequence rule:** Informational clusters first (build audience), commercial clusters second (convert audience). All pieces within a cluster must be approved before the cluster publishes. The app surfaces cluster publish-readiness via progress arcs and the Publishing Sequence tab.

**Interlink rule:** Every piece links to its cluster's anchor piece. Anchor pieces link back to all supporting pieces. Cross-pillar links multiply topical authority across the full content ecosystem.

Both rules are displayed in the tracker UI and referenced in the piece detail drawer.

---

## 7. File-by-File Reference

### index.html

The app shell. Loads all `.jsx` files as Babel-transpiled scripts. No build step — React runs in-browser via CDN. Contains the script loading order (important: dependencies before consumers) and a single `<div id="root">`.

**Config constants at the top:**
```js
const GITHUB_REPO = "ns-adiraghavan/jaggaer-ns-tracker";
// GITHUB_TOKEN is NOT here — it lives in Vercel env and is injected server-side
```

### styles.css

Full design system. Key CSS variables:
```css
--ink: #0f1923          /* deep navy — primary text and dark surfaces */
--paper: #f0ede6        /* warm off-white — page background */
--accent: #c8401a       /* burnt orange/terracotta — Jaggaer brand */
--st-approved: #1e7a45  /* status: approved */
--st-feedback: #b05e00  /* status: jaggaer-feedback */
--st-revised: #5a3d9e   /* status: revised */
--st-uploaded: #1e6fa8  /* status: uploaded */
```

Cluster card colours cycle through four palette entries (`CLUSTER_PALETTE` in `tracker.jsx`) indexed by cluster position within its pillar.

### mock-data.js

Fallback used when GitHub returns an error or the token is a placeholder. Must be kept in sync with `project.json`. After any `project.json` update, regenerate `mock-data.js` from it — it is a JS-wrapped snapshot of the same data.

**To regenerate:** `window.MOCK_PROJECT = { ...paste project.json content here... };`

### api.js

All GitHub and Anthropic API calls. Calls `/api/github` and `/api/anthropic` (Vercel proxy routes) — never calls GitHub or Anthropic directly from the browser. **Do not revert this to direct API calls** — that would expose credentials and break Vercel's CORS policy.

Key functions:
- `fetchProject()` — GET `config/project.json`, returns parsed JSON + SHA
- `saveProject(data, sha)` — PUT `config/project.json` with base64-encoded content
- `uploadPieceDeliverable(piece, clusterId, pillarId, monthId, contents, userId)` — PUT versioned deliverable HTML to the content folder
- `callClaude(messages, systemPrompt)` — POST to `/api/anthropic` with message history

### entry.jsx

Name selector / login screen. Renders a list of all team members from `project.team.ns` and `project.team.jaggaer`. On selection, sets `currentUser` in app state. No password — identification only for feedback attribution.

### sidebar.jsx

Left navigation. Renders pillar list dynamically from `project.pillars`. Clicking a pillar sets `activePillar` filter. Clicking a cluster sets `activeCluster` filter. Shows overall progress stats. Displays NS and Jaggaer logos at the top.

### tracker.jsx

The main content area. Three tabs:

**Content Tracker** — two view modes:
- *Cards view*: cluster cards with coloured headers, progress arcs, piece rows, inline upload/feedback buttons
- *Table view*: single continuous table with all pieces. Columns: #, Title, Content Type, Assignee, Primary Keyword, Secondary Keyword, Intent, User Path, Status

Both views share the `DrawerOverlay` component for piece interaction.

**Publishing Sequence** — reads from `project.schedule`. Shows week-by-week cluster readiness with progress bars. Live piece counts derived from cluster state (not stored in the slot).

**Interlink Map** — reads from `project.interlink_map`. Pillar and cluster labels are enriched at render time from `project.pillars`. Columns: Pillar, Cluster, Anchor Piece, Linking Rule, Cross-Pillar Link Opportunity.

**Key components:**
- `PriorityActions` — banner above the tracker listing overdue and due-this-week pieces
- `ClusterCard` — card with coloured header, progress arc, piece list
- `ProgressArc` — SVG arc showing approved/in-motion/total
- `DrawerOverlay` — full modal overlay on piece click
- `PieceDrawer` — tabbed panel inside overlay (Upload / Leave Feedback / Notes / Details / Edit / Delete)
- `InlineCell` — admin-mode inline editing for text and select fields

### claude-rail.jsx

Claude conversation interface (right column). **Currently not wired into the app** — the Anthropic API key is pending. When the key is available:
1. Add `ANTHROPIC_API_KEY` to Vercel environment variables
2. Add script tag for `claude-rail.jsx` to `index.html`
3. Add `<ClaudeRail project={project} currentUser={currentUser} />` to `app.jsx`
4. Update model string in `api/anthropic.js` to `claude-sonnet-4-6`

The rail passes the full serialised `project` state as a system prompt context on each message, so Claude can answer questions about piece statuses, cluster readiness, and feedback history without hallucinating.

### bwc.jsx

Build With Claude read-only panel. Lists entries from `project.build_with_claude`. Each entry shows app name, description, status, and a link to its folder in GitHub. NS pushes to the repo directly; this panel reflects whatever is there. No upload flow — visibility only.

### admin.jsx

Admin config editor. Unlocks when an admin user is logged in (`"admin": true` in the team roster). Tabs:
- **Pillars & Clusters** — add/edit pillars and clusters; edit cluster metadata
- **Pieces** — add pieces to clusters; full field editor
- **Team** — add NS and Jaggaer team members *(remove is not yet implemented — see §13)*
- **Schedule** — edit publishing sequence weeks and slots

All changes write back to `project.json` via `saveProject()`.

### agent-builder.jsx

The Agent Builder tab — a separate content experience separate from the tracker flow. Five blocks:
1. **S2P Use Case Demos** — three Claude-powered tools (Contracts, Suppliers, RFP). Currently in demo mode (mock outputs). Live Claude API activates once the key is integrated.
2. **How to Install Claude** — collapsible, branching on IT permission answer
3. **Basics of Claude** — collapsible accordion: What is Claude, Markdown files, How prompts work
4. **How to Prompt for S2P** — three-part formula (role / task / format) with copyable example prompts
5. **Webinar Hub** — curated YouTube embeds + live session registration

### app.jsx

Root component. Responsibilities:
- On load: call `fetchProject()`, hydrate state, fall back to `MOCK_PROJECT` on error
- Debounced auto-save: any `project` state change triggers a 1.5s debounced `saveProject()` write to GitHub
- Routing: `view` state determines which panel renders (tracker / bwc / admin / agent-builder)
- Save confirmation toast: shown after each successful GitHub write

### api/github.js

Vercel serverless function. Reads `GITHUB_TOKEN` and `GITHUB_REPO` from `process.env`. Proxies GET and PUT requests to `https://api.github.com/repos/{repo}/contents/{path}`.

### api/anthropic.js

Vercel serverless function. Reads `ANTHROPIC_API_KEY` from `process.env`. Proxies POST requests to `https://api.anthropic.com/v1/messages`. Currently uses `claude-haiku-4-5` — update to `claude-sonnet-4-6` when the key is activated.

---

## 8. Deployment (Vercel)

1. Push the repo to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`
2. Import the repo into Vercel
3. Set **Root Directory** to `repo-setup`
4. Set **Framework** to `Other` (no build step)
5. Add environment variables (see §9)
6. Deploy

Vercel auto-detects `api/github.js` and `api/anthropic.js` as serverless functions from the `api/` folder within the root directory.

---

## 9. Environment Variables

Set these in Vercel project settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `GITHUB_TOKEN` | `ghp_...` | Classic PAT, full repo scope. Never put in code. |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` | Repo identifier for API calls |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Pending purchase. Leave unset until ready. |

---

## 10. The Agent Builder Tab

The Agent Builder tab (`agent-builder.jsx`) is a self-contained content experience aimed at Jaggaer's site visitors — primarily procurement professionals unfamiliar with Claude. It is not part of the tracker flow.

**Purpose:** Demonstrate what Claude can do for S2P, teach the basics, and bridge visitors toward JAI (Jaggaer AI) as the enterprise-grade version.

**Demo system prompts** are defined in `DEMO_SYSTEM_PROMPTS` in `agent-builder.jsx`. These are the prompts sent to Claude when a visitor pastes input into the Contracts, Suppliers, or RFP demo. They instruct Claude to return structured JSON only (no markdown fences), which the app then renders as styled output components.

Currently in **demo mode** — the `DemoPane` component shows mock outputs (`MOCK_OUTPUTS`) after a 1.5s fake delay. When the Anthropic API key is integrated, replace the `setTimeout` mock in `runDemo()` with a real `callClaude()` call.

---

## 11. Prompts: How to Build Something Like This

These are the prompts you would give Claude to build a tracker of this type from scratch for a new engagement.

---

### Prompt 1 — Project brief to app design seed

Use this when starting a new engagement. Replace the bracketed sections with your actual project details.

```
I need to build a collaborative content delivery and review tracker for [CLIENT] and [AGENCY]. 

Here is the project context:
- Client: [CLIENT NAME] — [one-line description]
- Agency: [AGENCY NAME] — [one-line description]
- Engagement type: [e.g. content intelligence programme, 3 months, 40 pieces]

The engagement has the following workstreams and content structure:
[Describe pillars/categories, clusters, pieces — or paste your spreadsheet]

The team is:
- Agency team: [list names and roles]
- Client team: [list names and roles]

The app should:
1. Replace a shared spreadsheet for content delivery, review, and approval
2. Allow the agency to upload deliverables
3. Allow the client to leave structured feedback (Approved / Needs Revision / Question)
4. Track status per piece: Not Started → Uploaded → Client Feedback → Revised → Approved
5. Surface cluster publish-readiness (all pieces approved = ready to ship)
6. Have a Claude conversation rail so both teams can ask questions about project state

Design direction:
- [Describe tone and aesthetic — e.g. "editorial B2B dashboard, dark steel base, warm off-white content, burnt orange accent"]
- [Describe what should be memorable — e.g. "cluster progress arcs that show publish-readiness at a glance"]

Technical requirements:
- Single React artifact (JSX), Tailwind utility classes or custom CSS
- GitHub as backend — all state in a config/project.json file, content files uploaded to /content/
- Anthropic API for the Claude conversation rail
- Vercel serverless functions as API proxies (no tokens in browser code)

Produce: an app design seed document describing the full structure, schema, user model, status lifecycle, design direction, and technical notes. Do not write code yet.
```

---

### Prompt 2 — Generate project.json from a spreadsheet

Use this to convert an existing tracker spreadsheet into the project.json schema.

```
I have a content tracker spreadsheet. I need to convert it into a project.json file for a React app.

Here is the schema the app expects:

[Paste the project.json schema from this README, §3]

Here is my tracker content:

[Paste the spreadsheet content — or describe the structure if you're attaching the file]

Rules:
- Generate IDs as: pillars → kebab-case label, clusters → p1c1 / p1c2 etc, pieces → p-{cluster-id}-{n}
- All statuses start as "not-started"
- All revision_counts start at 0
- Set the anchor_piece to the piece in each cluster that is most likely to be the linking hub (usually the FAQ, Whitepaper, or Data Snapshot)
- Populate schedule based on [describe your publishing sequence], with linking_rule per slot
- Populate interlink_map with one entry per cluster, anchor_label from the anchor piece title, and cross_pillar describing the most relevant cross-pillar link opportunity

Return the complete project.json as valid JSON only.
```

---

### Prompt 3 — Build the tracker component

Use this once you have a project.json and a design direction.

```
Build a React tracker component (tracker.jsx) for a content delivery and review app.

The component receives these props:
- project: the full project.json state object (schema below)
- setProject: state setter
- currentUser: { id, name, role, org } — "ns" or "jaggaer"
- activePillar: string or null — filter by pillar ID
- activeCluster: string or null — filter by cluster ID
- adminMode: boolean

The project.json schema is:
[Paste schema from §3]

The component should render:
1. A header with KPIs: total approved, awaiting client review, clusters ready to publish
2. Two view modes toggled by buttons: Cards view and Table view
3. Cards view: one section per pillar, one card per cluster. Each card shows:
   - Coloured header (cycle through 4 palette colours by cluster index)
   - Cluster name, sequence number, intent badge, publish week badge
   - Progress arc (SVG circle showing approved/in-motion/total)
   - Anchor piece called out distinctly
   - List of piece rows with status chips and upload/feedback action buttons
4. Table view: single continuous table. Rows grouped by pillar and cluster with header rows.
5. A Publishing Sequence tab reading from project.schedule
6. An Interlink Map tab reading from project.interlink_map
7. A priority actions banner above the tracker showing overdue and due-this-week pieces

Status lifecycle: not-started → uploaded → jaggaer-feedback → revised → approved
Status colours: uploaded=#1e6fa8, jaggaer-feedback=#b05e00, revised=#5a3d9e, approved=#1e7a45

Clicking any piece opens a full-screen modal overlay with tabs:
- Upload (NS only, when piece is not-started or jaggaer-feedback)
- Leave Feedback (Jaggaer only, when piece is uploaded or revised)
- Notes (feedback history thread)
- Details (piece metadata)
- Edit (admin only — inline form)
- Delete (admin only — two-step confirm, blocked if approved)

Design: [describe your aesthetic]

Write complete, working JSX. Export window.Tracker = Tracker at the end.
```

---

### Prompt 4 — Build the Claude conversation rail

```
Build a Claude conversation rail component (claude-rail.jsx) for a project tracker app.

The component receives:
- project: full project state object
- currentUser: { id, name, role, org }

It should:
1. Always be visible as a right-side panel
2. Feel like a senior colleague who knows the project, not a chatbot widget
3. Show a message history (responses above, input at bottom)
4. On each user message, call the Anthropic API at /api/anthropic with:
   - A system prompt that includes the full serialised project state
   - The full conversation history
   - Model: claude-sonnet-4-6, max_tokens: 1000

The system prompt should tell Claude:
- What the project is (client, agency, engagement type)
- The status lifecycle (not-started → uploaded → jaggaer-feedback → revised → approved)
- That it should read statuses from the project state and never hallucinate them
- That responses should be concise and direct — status answers in 2–3 sentences, not paragraphs
- The current date

Example questions it should handle well:
- "What's blocking Week 2 from publishing?"
- "Which clusters are fully approved?"
- "What does [client] still need to review?"
- "How many pieces are approved across all pillars?"
- "Are we on track for Week 3?"

Design: [describe — e.g. "white panel, ink text, accent colour input border, minimal chrome"]

Export window.ClaudeRail = ClaudeRail at the end.
```

---

### Prompt 5 — Build the admin panel

```
Build an admin config editor component (admin.jsx) for a content tracker app.

The component receives:
- project: full project state object
- setProject: state setter

It should render tabs for:
1. Pillars & Clusters — add new pillar, add new cluster to any pillar, edit cluster metadata (label, intent, sequence, anchor piece, schedule week)
2. Pieces — add new piece to any cluster; fields: title, format, primary keyword, secondary keyword, content type, funnel stage, url slug, geography, schedule week, assignee
3. Team — add NS and Jaggaer team members; fields: name, role, org, admin flag
4. Schedule — edit publishing sequence: add/remove weeks, add/remove slots per week, edit linking rule per slot

Rules:
- All changes update the project state immediately
- project state is auto-saved to GitHub by the parent app (not this component's concern)
- New IDs should be generated as kebab-case from the label + a short random suffix
- Deleting a pillar or cluster is not permitted if any piece in it is approved
- Adding a team member should check for duplicate IDs

Design: [describe]

Export window.AdminPanel = AdminPanel at the end.
```

---

## 12. Prompts: How to Build Agent Builder Artifacts

The Agent Builder tab contains three Claude-powered demo tools. Here are the prompts for building each type of artifact — both the system prompts that drive the Claude API calls, and prompts for building the UI components.

---

### Building a Claude-powered analysis tool (Contracts / Suppliers / RFP pattern)

The pattern is: textarea input → Claude API with structured JSON system prompt → parse and render typed output.

**System prompt structure** (what you send as the `system` parameter to the Anthropic API):

```
You are a [expert role relevant to the task].
The user will [describe what they paste in].

Analyse it and return a structured response in exactly this JSON format (no markdown fences, raw JSON only):
{
  "[field_1]": "[description of what goes here]",
  "[field_2]": ["array of strings if multiple items"],
  ...
}

[Any additional rules — e.g. "Be specific. Give real supplier names where possible."]
[Edge case handling — e.g. "If a field has no findings, use an empty array or null."]
```

**Key requirements for structured output:**
- Always specify `no markdown fences, raw JSON only` — otherwise Claude wraps the response in ```json blocks
- Always specify the exact schema — field names, types, and whether arrays or strings
- Strip any code fences before parsing: `text.replace(/```json|```/g, "").trim()`
- Wrap `JSON.parse()` in try/catch — Claude occasionally returns explanatory text on error

**Example: Contract analysis system prompt**
```
You are an expert procurement contracts analyst. The user will paste a contract clause or excerpt.
Analyse it and return a structured response in exactly this JSON format (no markdown fences, raw JSON only):
{
  "expiry_dates": ["list any expiration or renewal dates found, or empty array"],
  "auto_renewal": "describe auto-renewal terms if present, or null",
  "risky_obligations": ["list obligations that could expose the buyer to cost or liability"],
  "concerning_sections": ["flag any clauses that warrant legal review, briefly explain each"],
  "summary": "one-sentence plain-English summary of the key risk posture"
}
Be precise and practical. If a field has no findings, use an empty array or null.
```

**Prompt to build the UI component for this pattern:**

```
Build a React component for a Claude-powered [task name] tool.

The component:
1. Shows a textarea for user input with a placeholder example
2. Has a button that calls the Anthropic API at /api/anthropic
3. Shows a loading state ("Analysing…") during the API call
4. Parses the JSON response and renders it as styled output
5. Shows a JAI nudge strip below the output (a dark banner with a "This is one tool. JAI does this across your entire [portfolio/supply chain/pipeline]" message and a CTA)

The API call sends:
- system: [paste your system prompt here]
- messages: [{ role: "user", content: userInput }]
- model: "claude-sonnet-4-6"
- max_tokens: 1000

The JSON response schema is:
[paste the schema from your system prompt]

Render the output fields as:
- Summary: highlighted callout box with left border rule
- Array fields: left-bordered list under a small-caps label
- Nested object arrays: individual cards with category header

Design: [describe — e.g. same as the Jaggaer design system: Playfair Display headers, Noto Sans body, #c8401a accent, white cards, #0f1923 dark surfaces]

Also build a canned mock output object for demo mode — realistic data that matches the schema. When in demo mode (no API key), show this after a 1.5s delay instead of calling the API.
```

---

### Building a multi-step guided tool (Install Guide / Basics pattern)

For tools that branch based on user input (like the IT permissions branch in the install guide):

```
Build a React component for a collapsible [topic] guide with branching.

Structure:
- Collapsed by default, showing a header with [title] and a + toggle
- When expanded, first shows a question: "[your branching question]"
- Two buttons: [Option A label] and [Option B label]
- Option A shows: [describe path A content]
- Option B shows: [describe path B content]
- Both paths have a "← Back" button to return to the question

[Option A content: e.g. numbered steps with connector lines between them]
[Option B content: e.g. a brief message with a CTA to an alternative]

Design: [describe]
```

---

### Building a prompt library / copyable prompt component

```
Build a React component displaying a tabbed prompt library.

Data structure per prompt:
{
  label: "Display name for the tab",
  tag: "Category label",
  tagColor: "#hexcolor",
  prompt: "The full prompt text with [placeholder] markers",
  note: "One sentence explaining why this prompt structure works"
}

The component shows:
- A tab bar with one tab per prompt
- The active prompt in a monospace code block (pre-formatted, with line breaks preserved)
- A "Copy prompt" button that copies to clipboard and shows "✓ Copied" for 2 seconds
- Below the prompt: a "Why it works:" callout with the note

Design: [describe]
```

---

### Connecting demos to the live Claude API

When `ANTHROPIC_API_KEY` is set in Vercel and `api/anthropic.js` is deployed, replace the mock delay in each demo with a real API call:

```javascript
// Replace this mock:
setTimeout(() => {
  setResult(MOCK_OUTPUTS[demoId]);
  setLoading(false);
}, 1500);

// With this real call:
try {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: DEMO_SYSTEM_PROMPTS[demoId],
      messages: [{ role: "user", content: input }]
    })
  });
  const data = await response.json();
  const text = data.content.map(b => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  setResult(JSON.parse(clean));
} catch (err) {
  console.error("Claude API error:", err);
  setResult(MOCK_OUTPUTS[demoId]); // graceful fallback
} finally {
  setLoading(false);
}
```

---

## 13. Known Issues & Next Steps

### Outstanding work

| # | Issue | Notes |
|---|---|---|
| 1 | **Remove team member in Admin** | Add-only currently. Needs guard against removing active assignees. |
| 2 | **Feedback deletion** | No admin ability to remove an erroneous feedback note. |
| 3 | **BWC GitHub links** | Should resolve to `https://github.com/ns-adiraghavan/jaggaer-ns-tracker/tree/main/${app.path}` |
| 4 | **Month switcher UI** | Months array in data model; no UI to browse non-active months yet. |
| 5 | **Anthropic API key** | Pending purchase. Claude rail and live Agent Builder demos not active until key added to Vercel env. |
| 6 | **Content type filter** | `content_type` field exists on all pieces; no UI filter for it yet. |
| 7 | **Real file upload E2E** | `uploadPieceDeliverable` reads via FileReader and base64 encodes; confirm works end-to-end on Vercel with a real upload. |

### When the Anthropic key arrives

1. Add `ANTHROPIC_API_KEY` to Vercel environment variables
2. Update model string in `api/anthropic.js` from `claude-haiku-4-5` to `claude-sonnet-4-6`
3. Add `<script type="text/babel" src="claude-rail.jsx"></script>` to `index.html`
4. Add `<ClaudeRail project={project} currentUser={currentUser} />` to `app.jsx` shell
5. In `agent-builder.jsx`: replace mock delays in `DemoPane.runDemo()` with live API calls (see §12)

### How to push a project.json update via PowerShell

```powershell
$TOKEN = "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"
$REPO = "ns-adiraghavan/jaggaer-ns-tracker"
$BASE = "https://api.github.com/repos/$REPO/contents"
$HEADERS = @{ Authorization = "Bearer $TOKEN"; Accept = "application/vnd.github+json" }

$existing = Invoke-RestMethod "$BASE/config/project.json" -Headers $HEADERS
$sha = $existing.sha
$content = Get-Content "config\project.json" -Raw
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
$body = @{ message = "update: description here"; content = $encoded; sha = $sha } | ConvertTo-Json
Invoke-RestMethod "$BASE/config/project.json" -Method Put -Headers $HEADERS -Body $body -ContentType "application/json" | Out-Null
Write-Host "Done" -ForegroundColor Green
```

---

*Last updated: May 2026 — v3 schema (content_type_split, interlink_map and schedule moved to project.json, DM C1/C3/C4 updated per Orlagh's briefs)*
