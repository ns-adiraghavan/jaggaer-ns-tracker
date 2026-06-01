# Jaggaer × Netscribes — Content Intelligence Tracker
### Technical Reference

---

## What this is

A collaborative content delivery and review platform for the Jaggaer × Netscribes content intelligence engagement. It replaces a shared spreadsheet and serves as the single interface for content delivery, client review, feedback, and approval.

It is not an internal NS workflow tool. NS coordinates however they want. This app activates when a piece is ready for client eyes.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [The Data Model — project.json](#3-the-data-model--projectjson)
4. [Workflow Stages](#4-workflow-stages)
5. [Content Type Model](#5-content-type-model)
6. [Publishing Sequence](#6-publishing-sequence)
7. [File-by-File Reference](#7-file-by-file-reference)
8. [Deployment (Vercel)](#8-deployment-vercel)
9. [Environment Variables](#9-environment-variables)
10. [Email Notifications](#10-email-notifications)
11. [Known Issues & Next Steps](#11-known-issues--next-steps)

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
    ├── Claude conversation rail (inactive — API key pending)
    │       └── /api/anthropic.js  (Vercel serverless)
    │               └── Anthropic API  /v1/messages
    │
    └── Static assets served from /repo-setup/
```

**Key principle:** GitHub is the database. No separate backend, no database, no server-side state. Every read and write goes through the GitHub Contents API via a Vercel proxy that injects the PAT from environment variables. The browser never holds a credential.

---

## 2. Repository Structure

```
/
├── config/
│   ├── project.json              ← ALL app state lives here
│   └── digest-state.json         ← last-sent timestamp + piece states for digest dedup
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
│   └── tender-summariser/
│
├── repo-setup/                   ← Vercel serves this folder as the app root
│   ├── index.html
│   ├── styles.css
│   ├── mock-data.js
│   ├── api.js
│   ├── entry.jsx
│   ├── sidebar.jsx
│   ├── tracker.jsx
│   ├── claude-rail.jsx           ← exists but not wired in (API key pending)
│   ├── sample-artifacts.jsx      ← Sample Artifacts tab (formerly Agent Builder)
│   ├── bwc.jsx
│   ├── admin.jsx
│   ├── app.jsx
│   ├── api/
│   │   ├── github.js             ← Vercel serverless proxy
│   │   ├── anthropic.js          ← Vercel serverless proxy
│   │   ├── digest.js             ← Daily digest email (Vercel Cron)
│   │   └── notify.js             ← Send to Editors email
│   ├── jaggaer-logo.png
│   └── netscribes-logo.png
│
└── README.md
```

---

## 3. The Data Model — project.json

Everything the app renders derives from `config/project.json`. Adding pillars, clusters, pieces, team members, months, or workflow stages requires only editing this file — no code changes.

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
  "schedule": [...],
  "workflow_stages": [...],
  "notifications": { "digest_to": [...], "editors_to": [...] }
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

### content_type_split

The three-type model that overlays the four industry pillars.

```json
{
  "id": "msv",
  "label": "MSV-driven",
  "description": "...",
  "weight": 0.50,
  "pieces_est": 15
}
```

Valid `id` values: `"msv"`, `"ai-in-s2p"`, `"industry-specific"`.

### pillars

```json
{
  "id": "discrete-manufacturing",
  "label": "Discrete Manufacturing",
  "subtitle": "US & Germany",
  "geography": "US / DE",
  "clusters": [...]
}
```

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

`sequence` is the global cross-pillar publishing order. `anchor_piece` must match the `id` of one piece in `pieces`. `intent` is `"informational"` or `"commercial"`.

### pieces

```json
{
  "id": "p-dm2-3",
  "title": "From Reactive to Predictive Supplier Risk Management",
  "format": "Strategic Solution Article",
  "assignee": "manager",
  "status": "writing",
  "revision_count": 1,
  "phase": 1,
  "primary_keyword": "predictive supplier risk management",
  "secondary_keyword": "proactive procurement risk management",
  "intent": "commercial",
  "geography": "all",
  "content_type": "industry-specific",
  "funnel": "MOFU",
  "url": "/predictive-supplier-risk-management",
  "notes": "Words: 1,200–1,500",
  "last_upload": "2026-05-22T13:58:08.804Z",
  "last_upload_by": "manager"
}
```

| Field | Notes |
|---|---|
| `status` | Must match a stage `id` in `workflow_stages` |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` |
| `phase` | `1` (informational) or `2` (commercial) |
| `funnel` | `TOFU` / `MOFU` / `BOFU` |
| `revision_count` | Increments on each NS submit |

### team

```json
{
  "ns": [
    { "id": "manager", "name": "Chahat K", "role": "NS Manager", "org": "ns", "admin": true }
  ],
  "jaggaer": [
    { "id": "jason", "name": "Jason R", "role": "Marketing", "org": "jaggaer", "admin": true }
  ]
}
```

`"admin": true` unlocks admin mode for that user. Both orgs can have admin users.

### feedback

Written at runtime by the app:

```json
{
  "p-dm2-2": [
    {
      "id": "fb-9",
      "author": "indy",
      "verdict": "question",
      "body": "Is the tier-3 data sourced or illustrative?",
      "ts": "2026-05-14T08:50:00Z",
      "stage": "marketing-review"
    }
  ]
}
```

Valid verdicts: `"approved"`, `"needs-revision"`, `"question"`.

### workflow_stages

Defines the full production funnel. Fully configurable — edit here or via **Admin → Workflow**. No code changes needed.

```json
{
  "id": "robert-review",
  "label": "Robert Review",
  "color": "#7d6608",
  "bg": "#fefde8",
  "actor": "person:m-9toiv"
}
```

`actor` values: `"ns"` (any NS member), `"jaggaer"` (any Jaggaer member), `"person:{id}"` (named individual), `null` (terminal — approved state).

The app derives all role-based permissions from this config at runtime. Changing the actor for a stage immediately changes who sees the action button in the drawer.

---

## 4. Workflow Stages

The production funnel is fully configurable via `project.workflow_stages`. Current live stages:

| Stage | Actor | Meaning |
|---|---|---|
| `not-started` | Jaggaer | Brief not yet uploaded |
| `brief-uploaded` | NS | Jaggaer has uploaded the brief; NS to begin writing |
| `abhishek-review` | person: abhishek | Internal NS review before writing |
| `writing` | NS | NS submits draft to next reviewer |
| `robert-review` | person: robert | Robert's SME review |
| `marketing-review` | Jaggaer | Jaggaer marketing review |
| `editors` | Jaggaer | Final editorial review |
| `approved` | — | Terminal state |

**To change the funnel:** Edit stages in **Admin → Workflow** (drag to reorder, rename, change actor). Saves to `project.workflow_stages`. The digest email, role permissions, and drawer actions all update automatically.

A cluster is **publish-ready** when every piece reaches `approved`.

---

## 5. Content Type Model

Three types that cut across all four industry pillars:

| Type | ID | Description |
|---|---|---|
| MSV-driven | `msv` | Broad horizontal, high-search-volume procurement terms |
| AI in S2P | `ai-in-s2p` | Claude + S2P searches; user journey mapped (Path 1/2/3) |
| Industry-specific | `industry-specific` | Vertical, sector-explicit; eBooks and whitepapers |

**User paths (AI in S2P pillar only):**

| Path | Description |
|---|---|
| Path 1 | Low-interest. Prefers ready-made solution (JAI). |
| Path 2 | Medium-interest. Has friction (IT permissions, setup). |
| Path 3 | Superuser. Will install, go deep, possibly fork the repo. |

---

## 6. Publishing Sequence

Four-week sequence for Month 1. Driven by `project.schedule` — edit there to change order.

| Week | Goal | Clusters |
|---|---|---|
| **Week 1** | Capture Claude + S2P and tariff search traffic | AI in S2P C1 · DM C1: Tariff & Trade |
| **Week 2** | Convert Path 2 users; rank before EU AI Act peaks | AI in S2P C2+C3 · PS C1+C2: EU AI Act + E-Invoicing |
| **Week 3** | Build authority on supply chain risk and HE governance | DM C2+C3 · HE C1+C2 |
| **Week 4** | Convert audiences to platform evaluation intent | AI in S2P C4 · DM C4 · PS C3 · HE C3 |

---

## 7. File-by-File Reference

### index.html

App shell. Loads all `.jsx` files as Babel-transpiled scripts in dependency order. No build step. Contains:

```js
window.__CONFIG__ = { GITHUB_REPO: "ns-adiraghavan/jaggaer-ns-tracker" };
// Token is NOT here — injected server-side by Vercel
```

### styles.css

Full design system. Key CSS variables:

```css
--paper: #f0ede6        /* warm off-white page background */
--accent: #c8401a       /* burnt orange — Jaggaer brand */
```

### api.js

All GitHub and Anthropic API calls. Calls `/api/github` and `/api/anthropic` (Vercel proxy routes). **Never calls external APIs directly from the browser — do not revert this.**

Key functions:
- `fetchProject()` — GET `config/project.json`, returns parsed JSON + SHA
- `saveProject(data, sha)` — PUT `config/project.json` base64-encoded
- `uploadPieceDeliverable(piece, clusterId, pillarId, monthId, contents, userId)` — PUT versioned deliverable to content folder
- `callClaude(messages, systemPrompt)` — POST to `/api/anthropic`

### entry.jsx

Name selector screen. Renders all team members from `project.team.ns` and `project.team.jaggaer`. No password — identification for feedback attribution only.

### sidebar.jsx

Left navigation. **By Pillar / By Type toggle:**
- **By Pillar** (default): P01–P04 industry pillar nav with expandable cluster list
- **By Type**: MSV-Driven / AI in S2P / Industry-Specific — lists every piece with status dot and click-through

### tracker.jsx

Main content area. Two tabs:

**Content Tracker** — two view modes:
- *Cards view*: cluster cards with coloured headers, progress arcs, piece rows
- *Table view*: continuous table. Columns: #, Title, Content Type, Assignee, Primary Keyword, Secondary Keyword, Intent, User Path, Status

**Publishing Sequence** — reads `project.schedule`. Week-by-week cluster readiness and goal statements.

**Key components:**

- `DrawerOverlay` — full modal overlay on piece click. Tabs: Upload / Replace Draft / Review / Preview & Comment / Notes / Details / Edit (admin) / Delete (admin)
- `UploadPanel` — NS submits a file and advances to the next workflow stage. Versioned: each submit creates `deliverable-v{n}.html`.
- `ReplaceDraftPanel` — NS replaces their current draft *without* advancing the workflow. Used to fix errors before a reviewer sees it. Status unchanged; no version increment.
- `ReviewPanel` — unified review for any non-NS stage (Jaggaer, named reviewer). Verdicts: Approved (advances) / Needs Revision (sends back to last NS stage) / Question (status unchanged, note logged).
- `PreviewPanel` — renders uploaded HTML deliverables in a sandboxed iframe. Fetches via `/api/github` proxy (authenticated). Shows filename, upload date, uploader name, download button, GitHub link. Injects paragraph-number gutter (`¶1`, `¶2`…) into the rendered HTML for easy reference.
- `AnnotatePanel` — Preview with an inline comment sidebar. Click any `¶` number in the rendered article to auto-populate the section reference field. Comment is saved to the feedback thread tagged to the author.
- `InlineCell` — admin inline editing for text and select fields

### claude-rail.jsx

Claude conversation rail. **Not wired into the app** — Anthropic API key pending. When the key is available:

1. Add `ANTHROPIC_API_KEY` to Vercel env
2. Update model in `api/anthropic.js` from `claude-haiku-4-5` to `claude-sonnet-4-6`
3. Add `<script type="text/babel" src="claude-rail.jsx"></script>` to `index.html`
4. Add `<ClaudeRail project={project} currentUser={currentUser} />` to `app.jsx`

### sample-artifacts.jsx

Sample Artifacts tab — external-facing content hub showcasing Jaggaer OS / JAI. Index landing with numbered article cards. Article 01 (Agent Builder live demos), Article 02 (Prompting 101), Articles 03–05 as coming-soon placeholders. Anna Vogel owns the AgentOS section.

### bwc.jsx

Build With Claude panel. Read-only. Lists `project.build_with_claude` entries with app name, description, status, and GitHub link.

### admin.jsx

Config editor for admin users. Tabs:
- **Pillars & Clusters** — add/edit pillars and clusters
- **Pieces** — add/edit pieces
- **Team** — add team members (removal not yet implemented)
- **Workflow** — drag to reorder stages, rename, set actor per stage. Saves to `project.workflow_stages`.
- **Notifications** — manage digest and editors email recipients, send test digest

### app.jsx

Root component. Hydrates from GitHub on load, falls back to `MOCK_PROJECT` on error. Debounced auto-save (1.5s) on any project state change.

### api/github.js

Vercel serverless. Reads `GITHUB_TOKEN` and `GITHUB_REPO` from `process.env`. Proxies GET and PUT to GitHub Contents API.

### api/anthropic.js

Vercel serverless. Reads `ANTHROPIC_API_KEY` from `process.env`. Proxies POST to Anthropic `/v1/messages`.

### api/digest.js

Daily digest email. Triggered by Vercel Cron at 12:30 UTC (6pm IST). Only sends if there has been activity since the last digest. Reads `project.workflow_stages` to categorise stages dynamically — no hardcoded status names. Stores last-sent state in `config/digest-state.json`.

### api/notify.js

"Send to Editors" email for fully-approved clusters. Triggered by the **Send to Editors →** button on cluster cards (admin mode). Reads recipient list from `project.notifications.editors_to`.

---

## 8. Deployment (Vercel)

1. Push repo to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`
2. Import into Vercel
3. Set **Root Directory** to `repo-setup`
4. Set **Framework** to `Other` (no build step)
5. Add environment variables (see §9)
6. Deploy

Vercel auto-detects `api/*.js` files as serverless functions. The Cron job for the daily digest is configured in `vercel.json`.

---

## 9. Environment Variables

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Classic PAT, full repo scope. Never in code. |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` |
| `ANTHROPIC_API_KEY` | Pending. Leave unset until purchased. |
| `RESEND_API_KEY` | From resend.com dashboard. Free tier: 3,000 emails/month. |
| `APP_URL` | Clean production URL used in digest email CTA. Optional — falls back to hardcoded value. |
| `DIGEST_TO` | Fallback recipient list. In practice, manage via **Admin → Notifications** — that takes priority. |
| `DIGEST_FROM` | Leave unset. Defaults to `onboarding@resend.dev` (Resend shared domain — no DNS setup). Only set if using a verified custom domain. |

---

## 10. Email Notifications

Two email flows, both via [Resend](https://resend.com) (free tier, no domain verification required).

### Setup

1. Sign up at resend.com
2. Get `RESEND_API_KEY` from the dashboard
3. Add to Vercel environment variables
4. Set recipients via **Admin → Notifications** in the app
5. Deploy

### Flow 1 — Daily Digest (`api/digest.js`)

Runs at 6pm IST via Vercel Cron (configured in `vercel.json`). **Only sends on days with activity.**

Email sections (each only appears if non-empty):
- **Needs your review** — pieces NS submitted today, with who's turn it is next
- **Sent back for revision** — pieces kicked back to NS
- **Approved today**
- **Feedback added** — new notes with clean verdict labels

Recipients: `project.notifications.digest_to` (managed via Admin panel). Falls back to `DIGEST_TO` env var.

**Manual trigger / test:**
```bash
curl -X POST https://jaggaer-ns-tracker.vercel.app/api/digest \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```
Or use **Send Test Digest** in Admin → Notifications.

**After any schema migration** — force-trigger once to reset `digest-state.json` with current piece statuses. Otherwise the digest may not detect changes correctly.

### Flow 2 — Send to Editors (`api/notify.js`)

Triggered by **Send to Editors →** on fully-approved cluster cards (admin only). Sends a formatted email listing all approved pieces with title, format, and direct GitHub file link.

Recipients: `project.notifications.editors_to` (Admin panel). Falls back to `EDITORS_TO` env var.

### Recipient priority

```
project.json → project.notifications.digest_to / editors_to   (wins)
    ↓  if empty
Vercel env vars → DIGEST_TO / EDITORS_TO                       (fallback)
```

---

## 11. Known Issues & Next Steps

| # | Issue | Status |
|---|---|---|
| 1 | **Remove team member in Admin** | Open — add-only; no delete yet |
| 2 | **Feedback deletion** | Open — no admin ability to remove erroneous notes |
| 3 | **BWC GitHub links** | Open — should resolve to `https://github.com/ns-adiraghavan/jaggaer-ns-tracker/tree/main/${app.path}` |
| 4 | **Month switcher UI** | Open — months array exists in data model; no browse UI yet |
| 5 | **Anthropic API key** | Pending — Claude rail and live Sample Artifacts demos inactive until key added |
| 6 | **File upload E2E** | Open — `uploadPieceDeliverable` uses FileReader + base64; confirm works end-to-end on Vercel |

---

## How to push a project.json update via PowerShell

```powershell
$TOKEN = "<your-github-token>"
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

*Last updated: June 2026 — v3.3. Changes from v3.2: workflow stages now fully configurable via Admin panel and `project.workflow_stages` (no hardcoded statuses anywhere); daily digest rewritten to be stage-aware; digest email simplified to action-oriented sections only; paragraph-number gutter added to HTML preview for comment referencing; ReplaceDraftPanel added for NS pre-review corrections; Sample Artifacts tab renamed from Agent Builder.*
