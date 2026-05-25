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
6. [Publishing Sequence](#6-publishing-sequence)
7. [File-by-File Reference](#7-file-by-file-reference)
8. [Deployment (Vercel)](#8-deployment-vercel)
9. [Environment Variables](#9-environment-variables)
10. [Email Notifications](#10-email-notifications)
11. [The Agent Builder Tab](#11-the-agent-builder-tab)
12. [Prompts: How to Build Something Like This](#12-prompts-how-to-build-something-like-this)
13. [Prompts: How to Build Agent Builder Artifacts](#13-prompts-how-to-build-agent-builder-artifacts)
14. [Known Issues & Next Steps](#14-known-issues--next-steps)

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
│   ├── sidebar.jsx               ← left navigation (pillar + content-type views)
│   ├── tracker.jsx               ← main tracker (cards + table views, notifications)
│   ├── claude-rail.jsx           ← Claude conversation rail (right column, inactive)
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
  "schedule": [...]
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

The three-type model that overlays the four industry pillars. Displayed as badges in the tracker header and navigable via the sidebar "By Type" view.

```json
{
  "id": "msv",
  "label": "MSV-driven",
  "description": "...",
  "weight": 0.50,
  "pieces_est": 15
}
```

Valid `id` values: `"msv"`, `"ai-in-s2p"`, `"industry-specific"`. Each piece carries one of these as its `content_type` field. The sidebar "By Type" toggle groups and lists all pieces by this classification, making the 50/25/25 split directly navigable.

### pillars

```json
{
  "id": "discrete-manufacturing",
  "label": "Discrete Manufacturing",
  "subtitle": "US & Germany",
  "weight": null,
  "geography": "US / DE",
  "clusters": [...]
}
```

`weight` is `null` — pillar weights have been replaced by the `content_type_split` model. Preserved for schema compatibility.

### clusters

```json
{
  "id": "dm1-tariffs",
  "label": "Tariff & Trade Disruption",
  "sequence": 3,
  "intent": "informational",
  "anchor_piece": "p-dm1-2",
  "month_id": "month-1",
  "publish_week": 1,
  "pieces": [...]
}
```

`sequence` is the global cross-pillar publishing order (1–14 in Month 1). `anchor_piece` must match the `id` of one piece in `pieces`. `intent` is `"informational"` or `"commercial"` — informational clusters publish before commercial ones.

### pieces

Full piece schema:

```json
{
  "id": "p-dm2-3",
  "title": "From Reactive to Predictive Supplier Risk Management",
  "format": "Strategic Solution Article",
  "assignee": "manager",
  "status": "uploaded",
  "revision_count": 1,
  "primary_keyword": "predictive supplier risk management",
  "secondary_keyword": "proactive procurement risk management",
  "intent": "commercial",
  "geography": "all",
  "content_type": "industry-specific",
  "funnel": "MOFU",
  "url": "/predictive-supplier-risk-management",
  "notes": "UPDATED — title refined, keyword updated | Words: 1,200–1,500",
  "schedule_week": 3,
  "last_upload": "2026-05-22T13:58:08.804Z",
  "last_upload_by": "manager"
}
```

| Field | Values | Notes |
|---|---|---|
| `id` | `p-{cluster}-{n}` | Unique across entire project |
| `status` | see §4 | Drives all UI state |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` | Cross-cutting classification; drives sidebar "By Type" view |
| `funnel` | `TOFU` / `MOFU` / `BOFU` | Shown in piece Details tab |
| `url` | `/slug-here` | Target URL slug; shown in piece Details tab |
| `notes` | free text | Editorial notes; shown in piece Details tab with URL/words extracted |
| `schedule_week` | `1`–`4` | Drives overdue/due timing calculations |
| `user_paths` | `["Path 1", "Path 2"]` | AI in S2P pillar only |

### team

```json
{
  "ns": [
    { "id": "manager", "name": "Chahat K", "role": "NS Manager", "org": "ns", "admin": true }
  ],
  "jaggaer": [
    { "id": "anna", "name": "Jason R", "role": "Marketing", "org": "jaggaer", "admin": true }
  ]
}
```

`"admin": true` unlocks admin mode. Both NS and Jaggaer can have admin users.

### feedback

Runtime-written by the app:

```json
{
  "p-dm2-2": [
    {
      "id": "fb-9",
      "author": "indy",
      "verdict": "question",
      "body": "Is the tier-3 data sourced or illustrative?",
      "ts": "2026-05-14T08:50:00Z"
    }
  ]
}
```

Valid verdicts: `"approved"`, `"needs-revision"`, `"question"`.

### schedule

The publishing sequence. Drives the Publishing Sequence tab and all timing/overdue calculations. Edit here to change the sequence — no code change needed.

```json
{
  "week": 1,
  "label": "Week 1",
  "goal": "Capture Claude + S2P and tariff procurement search traffic from day one",
  "slots": [
    { "pillar": "ai-in-s2p", "cluster": "c1-getting-started" },
    { "pillar": "discrete-manufacturing", "cluster": "dm1-tariffs" }
  ]
}
```

---

## 4. Status Lifecycle

```
not-started → uploaded → jaggaer-feedback → revised → approved
```

| Status | Who triggers it | What it means |
|---|---|---|
| `not-started` | Default | Piece exists in config, nothing uploaded |
| `uploaded` | NS uploads a file | Deliverable committed to GitHub; Jaggaer notification fires |
| `jaggaer-feedback` | Jaggaer submits needs-revision or question | NS cued to revise |
| `revised` | NS re-uploads after feedback | New versioned file committed; Jaggaer re-cued |
| `approved` | Jaggaer submits approved verdict | Counts toward cluster completion |

A cluster is **publish-ready** when every piece reaches `approved`.

---

## 5. Content Type Model

Month 1 uses a three-type split that cuts across all four industry pillars:

| Type | ID | Target | ~Pieces |
|---|---|---|---|
| MSV-driven | `msv` | Broad horizontal, high-search-volume procurement terms. Industry examples as callout sections. | ~15 |
| AI in S2P (Claude) | `ai-in-s2p` | Claude + S2P searches. User journey mapped (Path 1/2/3). Drives JAI traffic. | ~8 |
| Industry-specific | `industry-specific` | Vertical, sector-explicit content. Lower search volume, high SDR enablement. eBooks and whitepapers. | ~8 |

Every piece has `"content_type"` set to one of these IDs. The sidebar **By Type** toggle (next to By Pillar) groups all 31 pieces by content type, making the 50/25/25 split navigable alongside the industry pillar view.

**Month 1 classification (31 pieces):**
- **MSV (12):** Tariff & Trade cluster, Sub-Tier visibility + financial risk pieces, Critical Minerals cluster, EU AI Act FAQ, E-invoicing quick-take, Contract Leakage snapshot, Maverick Spend snapshot, OMB Uniform Guidance quick-take
- **AI in S2P (10):** All 10 pieces in the AI in S2P pillar
- **Industry-specific (9):** Predictive Risk MOFU, Bankruptcy Whitepaper, Platform TCO & Consolidation cluster, EU AI Act Whitepaper, Platform Evaluation pieces, R1 University Whitepaper, NSF/NIH Checklist, Platform Modernisation

**User paths (AI in S2P pillar only):**

| Path | Description |
|---|---|
| Path 1 | Low-interest. Lands on page, prefers ready-made solution (JAI). |
| Path 2 | Medium-interest. Curious about Claude, has some friction (IT permissions, setup). Wants to see it work first. |
| Path 3 | Superuser. Already interested in AI, will install, go deep, possibly fork the repo. |

---

## 6. Publishing Sequence

Four-week sequence for Month 1. Informational clusters first (build audience), commercial clusters second (convert audience).

| Week | Goal | Clusters |
|---|---|---|
| **Week 1** | Capture Claude + S2P and tariff search traffic from day one | AI in S2P C1: Getting Started · DM C1: Tariff & Trade |
| **Week 2** | Convert Path 2 users; demonstrate Claude; rank before EU AI Act peaks | AI in S2P C2+C3: Contracts + Suppliers · PS C1+C2: EU AI Act + E-Invoicing |
| **Week 3** | Build cluster authority on supply chain risk and higher education governance | DM C2+C3: Sub-Tier Risk + Critical Minerals · HE C1+C2: Maverick Spend + Grant Compliance |
| **Week 4** | Convert audiences built in weeks 1–3 to platform evaluation intent | AI in S2P C4: Prompt Library · DM C4: Platform TCO · PS C3: Platform Evaluation · HE C3: Platform Modernisation |

Sequence is data-driven from `project.schedule`. Edit there to change order.

---

## 7. File-by-File Reference

### index.html

App shell. Loads all `.jsx` files as Babel-transpiled scripts in dependency order. No build step. Contains a single `<div id="root">` and this config at the top:

```js
window.__CONFIG__ = { GITHUB_REPO: "ns-adiraghavan/jaggaer-ns-tracker" };
// Token is NOT here — injected server-side by Vercel
```

### styles.css

Full design system. Key CSS variables:

```css
--ink: #0f1923          /* deep navy */
--paper: #f0ede6        /* warm off-white page background */
--accent: #c8401a       /* burnt orange — Jaggaer brand */
--st-approved: #1e7a45
--st-feedback: #b05e00
--st-revised: #5a3d9e
--st-uploaded: #1e6fa8
```

### mock-data.js

Fallback used when GitHub returns an error or the token is a placeholder. Kept in sync with `project.json` — after any `project.json` update, the pillars array in `mock-data.js` must also be updated. The build process this session updated both files simultaneously.

### api.js

All GitHub and Anthropic API calls. Calls `/api/github` and `/api/anthropic` (Vercel proxy routes) — never calls external APIs directly from the browser. **Do not revert to direct calls** — that exposes credentials and breaks CORS.

Key functions:
- `fetchProject()` — GET `config/project.json`, returns parsed JSON + SHA
- `saveProject(data, sha)` — PUT `config/project.json` base64-encoded
- `uploadPieceDeliverable(piece, clusterId, pillarId, monthId, contents, userId)` — PUT versioned deliverable to content folder
- `callClaude(messages, systemPrompt)` — POST to `/api/anthropic`

### entry.jsx

Name selector screen. Renders all team members from `project.team.ns` and `project.team.jaggaer`. Sets `currentUser` on selection. No password — identification for feedback attribution only.

### sidebar.jsx

Left navigation. Key features:

**By Pillar / By Type toggle** — a two-button toggle just below the Tracker nav item:
- **By Pillar** (default): P01–P04 industry pillar nav with expandable cluster list, approved/total fractions
- **By Type**: three collapsible sections — MSV-Driven, AI in S2P (Claude), Industry-Specific — each listing every piece in that category with a status dot, title, pillar/cluster breadcrumb, and click-through to the cluster in the tracker

This makes the 50/25/25 content type split navigable, not just a header badge.

### tracker.jsx

Main content area. Two tabs:

**Content Tracker** — two view modes:
- *Cards view*: cluster cards with coloured headers, progress arcs, piece rows
- *Table view*: continuous table. Columns: #, Title, Content Type, Assignee, Primary Keyword, Secondary Keyword, Intent, User Path, Status

The status column in table view includes an inline **↓ download button** for any piece with an uploaded deliverable. Clicking downloads the raw HTML directly without opening the drawer.

**Publishing Sequence** — reads `project.schedule`. Week-by-week cluster readiness, live piece counts, goal statement per week.

**Key components:**
- `ActivityBar` — collapsed strip above the tracker; expands to two equal-height columns: Priority Actions (overdue + due-this-week) and Recent Activity
- `NotificationBell` — visible to Jaggaer org users only. Shows a badge count of uploaded + revised pieces awaiting review. Dropdown lists each piece with status, uploader, days since upload, and a direct "Review →" click-through to the feedback form
- `ClusterCard` — card with progress arc, anchor piece callout, piece list
- `DrawerOverlay` — full modal overlay on piece click
- `PieceDrawer` — tabbed: Upload / Leave Feedback / Notes / Details / Edit / Delete
- `PieceDetails` — Details tab shows: Funnel stage, Target URL, Word count (extracted from notes), Notes (cleaned), in addition to standard metadata
- `PreviewPanel` — renders uploaded HTML deliverables in a sandboxed iframe. Fetches via `/api/github` proxy (authenticated) — **not** `raw.githubusercontent.com`, which fails on private repos. Decodes the base64 GitHub Contents API response and passes it as `srcdoc` to the iframe. Top bar shows filename, upload date, uploader name (looked up from team roster), download button, and GitHub link. Download builds a blob from the already-fetched content — no second network request.
- `InlineCell` — admin inline editing for text and select fields

### claude-rail.jsx

Claude conversation rail. **Currently not wired into the app** — Anthropic API key is pending. When the key is available:

1. Add `ANTHROPIC_API_KEY` to Vercel environment variables
2. Update model in `api/anthropic.js` from `claude-haiku-4-5` to `claude-sonnet-4-6`
3. Add script tag for `claude-rail.jsx` to `index.html`
4. Add `<ClaudeRail project={project} currentUser={currentUser} />` to `app.jsx`

The rail serialises full project state as system prompt context on each message. Claude reads statuses directly — no hallucination.

### bwc.jsx

Build With Claude panel. Read-only. Lists `project.build_with_claude` entries: app name, description, status, GitHub link. NS pushes directly to the repo; this panel reflects it.

### admin.jsx

Config editor for admin users. Tabs: Pillars & Clusters, Pieces, Team, Schedule. All changes write back to `project.json` via `saveProject()`.

### agent-builder.jsx

Self-contained content experience for Jaggaer site visitors. Five sections: S2P Use Case Demos, Install Guide, Claude Basics, How to Prompt for S2P, Webinar Hub. Currently in demo mode (mock outputs). Live Claude API activates when key is integrated — see §12.

### app.jsx

Root component. Hydrates from GitHub on load, falls back to `MOCK_PROJECT` on error. Debounced auto-save (1.5s) on any project state change. Save confirmation toast after each successful write.

### api/github.js

Vercel serverless. Reads `GITHUB_TOKEN` and `GITHUB_REPO` from `process.env`. Proxies GET and PUT to GitHub Contents API.

### api/anthropic.js

Vercel serverless. Reads `ANTHROPIC_API_KEY` from `process.env`. Proxies POST to Anthropic `/v1/messages`. Currently set to `claude-haiku-4-5` — update to `claude-sonnet-4-6` when key is activated.

---

## 8. Deployment (Vercel)

1. Push repo to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`
2. Import into Vercel
3. Set **Root Directory** to `repo-setup`
4. Set **Framework** to `Other` (no build step)
5. Add environment variables (see §9)
6. Deploy

Vercel auto-detects `api/github.js` and `api/anthropic.js` as serverless functions.

---

## 9. Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `GITHUB_TOKEN` | `ghp_...` | Classic PAT, full repo scope. Never in code. |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` | Repo identifier |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Pending. Leave unset until purchased. |
| `RESEND_API_KEY` | From resend.com dashboard | Free tier: 3,000 emails/month. No domain verification needed. |
| `APP_URL` | `https://jaggaer-ns-tracker.vercel.app` | Clean production URL used in digest email CTA. Optional — falls back to hardcoded value if unset. |
| `DIGEST_TO` | `indy@jaggaer.com,chahat@netscribes.com` | Fallback recipient list. In practice, set via Admin → Notifications panel in the app — that takes priority over this env var. |
| `EDITORS_TO` | Editors' email addresses | Recipients for the "Send to Editors" cluster approval email. |
| `DIGEST_FROM` | Leave unset | Defaults to `onboarding@resend.dev` (Resend shared domain — no DNS verification needed). Only set this if you've verified a custom domain in Resend. |

---

---

## 10. Email Notifications

Two email flows, both powered by [Resend](https://resend.com) (free tier, no domain verification required).

### Setup

1. Sign up at resend.com (personal email is fine — no company domain needed)
2. Get your `RESEND_API_KEY` from the Resend dashboard
3. Add `RESEND_API_KEY` and `EDITORS_TO` to Vercel environment variables
4. Set digest recipients via **Admin → Notifications** inside the app (no env var needed)
5. Deploy — done

Emails send from `onboarding@resend.dev` by default. This is Resend's shared sender domain and requires no DNS records or IT permissions. To send from a custom domain (e.g. `tracker@netscribes.com`), verify it in Resend and set `DIGEST_FROM` in Vercel.

### Flow 1 — Daily Digest (`api/digest.js`)

Triggered by a POST to `/api/digest`. Designed to run at **6pm IST** via a GitHub Actions schedule (free) or Vercel Cron (Pro plan only).

**Only sends if activity has happened since the last digest** — uploads, feedback submissions, or approvals. Stores a `config/digest-state.json` in the repo to track last-seen state between sends.

Email contains:
- KPI strip: Approved / Awaiting Review / Needs Revision counts
- New uploads and revisions table
- New Jaggaer feedback table
- Newly approved pieces table
- "Open Tracker →" CTA button linking to `APP_URL`

**Recipients:** Reads `project.notifications.digest_to` from `project.json` first. Falls back to `DIGEST_TO` env var if not set. Manage via **Admin → Notifications** — no redeployment needed.

**Manual trigger / test:**
```bash
curl -X POST https://jaggaer-ns-tracker.vercel.app/api/digest \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```
Or use the **Send Test Digest** button in Admin → Notifications.

**GitHub Actions cron (free, recommended over Vercel Cron):**
```yaml
# .github/workflows/digest.yml
name: Daily Digest
on:
  schedule:
    - cron: '30 12 * * 1-5'   # 12:30 UTC = 6pm IST, weekdays only
  workflow_dispatch:             # allows manual trigger from GitHub UI
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.APP_URL }}/api/digest \
            -H "Content-Type: application/json" \
            -d '{"force": false}'
```
Add `APP_URL` as a GitHub Actions secret (`https://jaggaer-ns-tracker.vercel.app`).

### Flow 2 — Send to Editors (`api/notify.js`)

Triggered by the **Send to Editors →** button on fully-approved cluster cards (admin mode only).

Sends a single formatted email with:
- Cluster name, pillar, piece count
- Table of all pieces with title, format, and direct GitHub file link
- Green "all approved" confirmation bar

**Recipients:** Reads `project.notifications.editors_to` from `project.json` first. Falls back to `EDITORS_TO` env var.

### Recipient priority (both flows)

```
project.json  →  project.notifications.digest_to / editors_to   (wins)
    ↓  if empty
Vercel env vars  →  DIGEST_TO / EDITORS_TO                       (fallback)
```

Updating recipients in the Admin panel writes to `project.json` and takes effect on the next send. No Vercel redeployment needed.

### Admin → Notifications panel

Available in the Admin tab for admin users. Fields:
- **Daily Digest recipients** — comma-separated email addresses
- **Editors recipients** — comma-separated email addresses
- **Send Test Digest** button — forces an immediate send regardless of activity

Changes auto-save to `project.json` via the standard debounced GitHub write.

---

## 11. The Agent Builder Tab

Self-contained experience for Jaggaer's site visitors. Not part of the tracker flow.

**Five sections:**
1. **S2P Use Case Demos** — Contracts, Suppliers, RFP tools. Demo mode (mock outputs). Live on API key integration.
2. **How to Install Claude** — Collapsible, branches on IT permissions answer
3. **Basics of Claude** — Accordion: What is Claude, Markdown files, How prompts work
4. **How to Prompt for S2P** — Three-part formula (role / task / format) with copyable examples
5. **Webinar Hub** — YouTube embeds + live session registration

Demo system prompts are in `DEMO_SYSTEM_PROMPTS` in `agent-builder.jsx`. They instruct Claude to return raw JSON only — no markdown fences. Strip fences before parsing: `text.replace(/```json|```/g, "").trim()`.

---

## 12. Prompts: How to Build Something Like This

### Prompt 1 — Project brief to app design seed

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
- [Describe tone and aesthetic]
- [Describe what should be memorable]

Technical requirements:
- Single React artifact (JSX), no build step
- GitHub as backend — all state in config/project.json
- Anthropic API for the Claude conversation rail
- Vercel serverless functions as API proxies (no tokens in browser code)

Produce: an app design seed document. Do not write code yet.
```

### Prompt 2 — Generate project.json from a spreadsheet

```
I have a content tracker spreadsheet. Convert it into a project.json file.

Schema the app expects:
[Paste schema from §3]

Tracker content:
[Paste spreadsheet or attach file]

Rules:
- IDs: pillars → kebab-case label, clusters → {pillar-prefix}-{topic}, pieces → p-{cluster-id}-{n}
- All statuses start as "not-started", revision_count as 0
- Set anchor_piece to the FAQ, Whitepaper, or Data Snapshot in each cluster
- Tag each piece with content_type: "msv" (broad horizontal), "ai-in-s2p" (Claude-focused), or "industry-specific" (vertical, gated)
- Tag funnel: "TOFU", "MOFU", or "BOFU" based on format and intent
- Populate schedule from the publishing sequence in the spreadsheet
- sequence numbers are global cross-pillar (1, 2, 3... across all clusters)

Return complete project.json as valid JSON only.
```

### Prompt 3 — Build the tracker component

```
Build a React tracker component (tracker.jsx).

Props:
- project: full project.json state
- setProject: state setter
- currentUser: { id, name, role, org } — "ns" or "jaggaer"
- activePillar: string | null
- activeCluster: string | null
- adminMode: boolean

Render:
1. Header with KPIs: approved, awaiting Jaggaer review, clusters ready
2. Notification bell (Jaggaer org only): badge count of uploaded+revised pieces; dropdown with piece list and Review → click-through
3. Cards view and Table view toggle
4. Cards: one section per pillar, one card per cluster with coloured header, progress arc, piece rows
5. Table: continuous table grouped by pillar+cluster; status column includes inline ↓ download button for uploaded pieces
6. Publishing Sequence tab reading project.schedule
7. ActivityBar: collapsed strip, expands to two equal-height columns — Priority Actions (overdue/due) and Recent Activity

Status lifecycle: not-started → uploaded → jaggaer-feedback → revised → approved
Status colours: uploaded=#1e6fa8, jaggaer-feedback=#b05e00, revised=#5a3d9e, approved=#1e7a45

Piece click opens DrawerOverlay with tabs: Upload (NS) / Leave Feedback (JG) / Notes / Details / Edit (admin) / Delete (admin)
Details tab shows: Pillar, Cluster, Intent, Publishing week, Content Type, Funnel stage, Target URL, Word count, Assignee, Geography, User path, Primary keyword, Secondary keyword, Anchor piece, Revision count, Status, Notes

Design: [describe your aesthetic]

Export window.Tracker = Tracker at the end.
```

### Prompt 4 — Build the sidebar with content-type toggle

```
Build a sidebar component (sidebar.jsx) for a content tracker.

Props: project, currentUser, activePillar, setActivePillar, activeCluster, setActiveCluster, view, setView, adminMode, activeMonthId, setActiveMonthId

Features:
1. Collapse toggle (‹ / ›)
2. Logo strip (NS × Jaggaer logos)
3. Active month label / switcher
4. Tracker nav with approved/total fraction
5. By Pillar / By Type toggle — pill toggle buttons
   - By Pillar: P01–P04 with expandable cluster list, approved/total per cluster, click to filter
   - By Type: three collapsible sections (MSV-Driven / AI in S2P / Industry-Specific). Each section lists every piece in that content_type with status dot, title, pillar·cluster breadcrumb, click navigates to that cluster
6. Divider, then: Build With Claude, Sample Artifacts, Admin (admin only)
7. User card at bottom with name, role, org pill, Admin toggle, Switch button

Content type colours: msv=#1a6a3a/bg#eaf4ee, ai-in-s2p=#1e4fa8/bg#eaf0fb, industry-specific=#784212/bg#fef3e8

Export window.Sidebar = Sidebar and window.computeStats = computeStats at the end.
```

### Prompt 5 — Build the Claude conversation rail

```
Build claude-rail.jsx. Props: project, currentUser.

- Always-visible right panel
- Feels like a senior colleague, not a chatbot
- Full conversation history; input at bottom
- Each message: POST to /api/anthropic with full serialised project state in system prompt
- System prompt tells Claude: project context, status lifecycle, to read statuses not hallucinate them, to be concise (2–3 sentences for status answers)
- Model: claude-sonnet-4-6, max_tokens: 1000

Example questions to handle well:
"What's blocking Week 2?" / "Which clusters are fully approved?" / "What does Indy still need to review?" / "Are we on track for Week 3?"

Export window.ClaudeRail = ClaudeRail.
```

---

## 13. Prompts: How to Build Agent Builder Artifacts

### System prompt pattern for structured JSON tools

```
You are a [expert role].
The user will [describe input].

Return a structured response in exactly this JSON format (no markdown fences, raw JSON only):
{
  "field_1": "description",
  "field_2": ["array of strings"],
  ...
}

[Rules and edge cases]
```

**Key requirements:**
- Always specify `no markdown fences, raw JSON only`
- Strip fences before parsing: `text.replace(/```json|```/g, "").trim()`
- Wrap `JSON.parse()` in try/catch with graceful fallback to mock output

### Connecting demos to live Claude API

Replace the mock delay in `DemoPane.runDemo()`:

```javascript
// Replace mock:
setTimeout(() => { setResult(MOCK_OUTPUTS[demoId]); setLoading(false); }, 1500);

// With real call:
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
  setResult(MOCK_OUTPUTS[demoId]); // graceful fallback
} finally {
  setLoading(false);
}
```

---

## 14. Known Issues & Next Steps

| # | Issue | Status | Notes |
|---|---|---|---|
| 1 | **Remove team member in Admin** | Open | Add-only. Needs guard against removing active assignees. |
| 2 | **Feedback deletion** | Open | No admin ability to remove an erroneous feedback note. |
| 3 | **BWC GitHub links** | Open | Should resolve to `https://github.com/ns-adiraghavan/jaggaer-ns-tracker/tree/main/${app.path}` |
| 4 | **Month switcher UI** | Open | Months array in data model; no UI to browse non-active months yet. |
| 5 | **Anthropic API key** | Pending | Claude rail and live Agent Builder demos inactive until key added to Vercel env. |
| 6 | **Real file upload E2E** | Open | `uploadPieceDeliverable` uses FileReader + base64; confirm works end-to-end on Vercel. |
| 7 | **Email digest cron** | Open | Vercel Cron requires Pro plan. Use GitHub Actions workflow (see §10) as free alternative. |
| 8 | **Preview panel — private repo auth** | ✓ Fixed | Was fetching from `raw.githubusercontent.com` (no auth, fails on private repo). Now fetches via `/api/github` proxy and renders as `srcdoc`. |
| 9 | **Preview showing raw HTML source** | ✓ Fixed | Root cause: unauthenticated fetch returned raw text. Fixed by proxy fetch + srcdoc. |
| 10 | **Uploaded-by showing wrong name** | ✓ Fixed | Preview bar now reads `piece.last_upload_by`, looks up team roster, displays first name correctly. |
| 11 | **Digest email linking to deploy URL** | ✓ Fixed | Was using `VERCEL_URL` (deployment-specific). Now uses `APP_URL` env var, falls back to clean production URL. |

### When the Anthropic key arrives

1. Add `ANTHROPIC_API_KEY` to Vercel env
2. Update `api/anthropic.js`: `claude-haiku-4-5` → `claude-sonnet-4-6`
3. Add `<script type="text/babel" src="claude-rail.jsx"></script>` to `index.html`
4. Add `<ClaudeRail project={project} currentUser={currentUser} />` to `app.jsx`
5. In `agent-builder.jsx`: replace `setTimeout` mock in `runDemo()` with live `fetch("/api/anthropic", ...)` call

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

*Last updated: May 2026 — v3.2. Changes from v3.1: email notification system added (daily digest via `api/digest.js`, editors notification via `api/notify.js`, both using Resend free tier with shared sender domain — no DNS/IT setup required); Admin → Notifications panel for managing recipients without redeployment; HTML preview panel fixed (now fetches via authenticated `/api/github` proxy + `srcdoc` instead of unauthenticated raw URL); uploaded-by attribution corrected in preview bar (reads `last_upload_by` from piece metadata, looks up team roster); digest email CTA fixed to use clean production URL via `APP_URL` env var.*
