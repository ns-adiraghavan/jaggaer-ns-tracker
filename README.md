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
```

**Key principle:** GitHub is the database. No separate backend, no database, no server-side state. Every read and write goes through the GitHub Contents API via a Vercel proxy that injects the PAT from environment variables. The browser never holds a credential.

**Body parser limit:** `api/github.js` sets `bodyParser.sizeLimit = "10mb"` to support PDF deliverable uploads.

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
│                   ├── brief-v{n}.{ext}           ← Jaggaer-uploaded briefs
│                   └── deliverable-v{n}.{ext}     ← NS-uploaded content files
│
├── repo-setup/                   ← Vercel serves this folder as the app root
│   ├── index.html
│   ├── styles.css
│   ├── mock-data.js
│   ├── api.js                    ← dead weight (root-level copy) — only api/ versions are served
│   ├── entry.jsx
│   ├── sidebar.jsx
│   ├── tracker.jsx
│   ├── admin.jsx
│   ├── app.jsx
│   ├── ai-playground.html        ← AI Playground microsite (standalone, 4-step journey + 13 tools)
│   ├── vercel.json               ← must live here (Vercel root dir = repo-setup/)
│   ├── api/
│   │   ├── github.js             ← Vercel serverless proxy (10mb body limit)
│   │   ├── anthropic.js          ← Vercel serverless proxy
│   │   ├── digest.js             ← Daily digest email (Vercel Cron)
│   │   └── notify.js             ← Send to Editors email
│   ├── jaggaer-logo.png
│   └── netscribes-logo.png
│
└── README.md
```

> **Removed:** `bwc.jsx`, `/build-with-claude/`, `jai-demo.html`, `claude-rail.jsx`, and `sample-artifacts.jsx` are no longer part of the active app. The `/demo` route previously served by `jai-demo.html` is now replaced by the AI Playground at `/ai`.

> **Dead weight:** Root-level `api.js`, `digest.js`, and `notify.js` are duplicates that Vercel ignores. Only the `api/` directory versions are served. Do not update the root-level copies.

> **Note on vercel.json:** Because Vercel's root directory is set to `repo-setup/`, `vercel.json` must live inside `repo-setup/` — not the repo root. The repo-root copy (if it still exists) is ignored by Vercel.

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
  "schedule": [...],
  "workflow_stages": [...],
  "notifications": { "digest_to": [...], "editors_to": [...] },
  "playground_comments": [...]
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
  "deliverable_ext": "html",
  "last_upload": "2026-05-22T13:58:08.804Z",
  "last_upload_by": "manager",
  "last_updated": "2026-05-22T13:58:08.804Z",
  "last_updated_by": "manager",
  "status_history": [
    { "stage": "writing", "ts": "2026-05-22T13:58:08.804Z", "by": "manager" }
  ],
  "brief_files": ["brief-v1.pdf"]
}
```

| Field | Notes |
|---|---|
| `status` | Must match a stage `id` in `workflow_stages` |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` |
| `phase` | `1` (informational) or `2` (commercial) |
| `funnel` | `TOFU` / `MOFU` / `BOFU` |
| `revision_count` | Increments on each NS submit |
| `deliverable_ext` | Set on upload. Enables PDF/docx round-trip. Defaults to `"html"`. |
| `status_history` | Append-only log of `{ stage, ts, by }`. UTC stored, US Eastern displayed. |
| `brief_files` | Array of uploaded brief filenames. Set by `BriefUploadPanel`. |

**Ad-Hoc Articles** are a separate content type that lives outside the main cluster/pillar hierarchy. They use a simplified two-stage review flow (`ad-hoc-review` stage) that bypasses `project.workflow_stages`. The `ad-hoc-review` stage is intentionally not listed in `workflow_stages` to avoid shifting stage indices. Every component that resolves stages needs an explicit patch for this stage.

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
      "stage": "marketing-review",
      "revision": 1
    }
  ]
}
```

Valid verdicts: `"approved"`, `"needs-revision"`, `"question"`.

The `revision` field on feedback entries enables version-aware inline comments — comments are grouped by the deliverable version they were left on; stale comments (from prior versions) appear collapsed under a "Previous versions" disclosure.

### playground_comments

Stored at `project.playground_comments[]`. Each entry is a pin placed on the AI Playground microsite by a reviewer:

```json
{
  "id": "pc-1",
  "author": "anna",
  "body": "Step 2 copy needs shortening.",
  "ts": "2026-06-01T10:00:00Z",
  "resolved": false,
  "page": "step-2"
}
```

Managed via the `AIPlaygroundPanel` toggle-based commenting system inside the tracker.

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

`actor` values: `"ns"` (any NS member), `"jaggaer"` (any Jaggaer member), `"person:{id}"` (named individual), `null` (terminal — approved state). Actor can also be an array, e.g. `["person:abhishek", "person:m-ny8dy"]`, when multiple named reviewers share a stage.

The app derives all role-based permissions from this config at runtime. Changing the actor for a stage immediately changes who sees the action button in the drawer.

**SHA management:** `saveProject` always fetches a fresh SHA before PUT. On 409 conflict it retries with the refreshed SHA. Never pass a stale SHA — it causes cascading 409 failures.

---

## 4. Workflow Stages

The production funnel is fully configurable via `project.workflow_stages`. Current live stages:

| Stage | Actor | Meaning |
|---|---|---|
| `not-started` | Jaggaer | Brief not yet uploaded |
| `stage-nq11b` | person: m-ny8dy | SME topic confirmation before brief |
| `brief-uploaded` | NS + Jaggaer | Brief uploaded; NS begins writing |
| `writing` | NS | NS submits draft to next reviewer |
| `marketing-review` | person: abhishek + person: m-ny8dy | Abhishek and Orlagh review |
| `robert-review` | person: m-9toiv | Robert's SME review |
| `editors` | Jaggaer | CTA check / final editorial |
| `approved` | — | Terminal state |

**Ad-Hoc Articles** use `ad-hoc-review` (simplified two-stage: NS submit → Jaggaer review → approved). This stage deliberately lives outside `project.workflow_stages`.

**To change the funnel:** Edit stages in **Admin → Workflow** (drag to reorder, rename, change actor). Saves to `project.workflow_stages`. The digest email, role permissions, drawer actions, and FilterBar all update automatically — all stage resolution reads `project.workflow_stages` at runtime; nothing is hardcoded.

A cluster is **publish-ready** when every piece reaches `approved`.

**Return-to-sender:** When a reviewer selects "Needs Revision", the piece returns to the last NS-actor stage (not necessarily `writing`), preserving the correct return point regardless of workflow configuration.

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

**Ad-Hoc Articles** are a fourth content category for one-off pieces not belonging to any cluster or pillar. They have a simplified two-stage review and appear in a dedicated section of the tracker.

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
- `saveProject(data, sha)` — PUT `config/project.json` base64-encoded; fetches fresh SHA on 409 and retries
- `uploadPieceDeliverable(piece, clusterId, pillarId, monthId, payload, userId)` — PUT versioned deliverable to content folder; `payload` is `{ ext, name, binary, b64? text? }` from `readDeliverableFile()`
- `uploadPieceBrief(piece, clusterId, pillarId, monthId, payload, userId)` — PUT versioned brief to content folder
- `callClaude(messages, systemPrompt)` — POST to `/api/anthropic`

### entry.jsx

Name selector screen. Renders all team members from `project.team.ns` and `project.team.jaggaer`. No password — identification for feedback attribution only.

### sidebar.jsx

Left navigation. **By Pillar / By Type toggle:**
- **By Pillar** (default): P01–P04 industry pillar nav with expandable cluster list
- **By Type**: MSV-Driven / AI in S2P / Industry-Specific — lists every piece with status dot and click-through

Nav sections: Tracker, AI Playground, Admin (admin mode only).

### tracker.jsx

Main content area. Three tabs:

**Content Tracker** — two view modes:
- *Cards view*: cluster cards with coloured headers, progress arcs, piece rows
- *Table view*: continuous table. Columns: #, Title, Content Type, Assignee, Primary Keyword, Secondary Keyword, Intent, User Path, Status

**Publishing Sequence** — reads `project.schedule`. Week-by-week cluster readiness and goal statements.

**Weekly Progress** — phase-aware progress view. Shows Phase 1 vs Phase 2 completion, recent activity, and per-stage piece counts. Includes the FilterBar which reads `project.workflow_stages` dynamically — no hardcoded stage IDs.

**Key components:**

- `DrawerOverlay` — full modal overlay on piece click. Tabs: Upload / Replace Draft / Brief (admin, Jaggaer) / Review / Preview & Comment / History / Notes / Details / Edit (admin) / Delete (admin)
- `UploadPanel` — NS submits a file and advances to the next workflow stage. Versioned: each submit creates `deliverable-v{n}.{ext}`. Supports HTML, PDF, DOCX, MD. Binary types (PDF, DOCX) are committed as raw base64. Gates `updatePiece()` behind upload success check.
- `ReplaceDraftPanel` — NS replaces their current draft *without* advancing the workflow. Status unchanged; no version increment. Use to fix errors before a reviewer sees the piece.
- `BriefUploadPanel` — Jaggaer uploads a brief (PDF, DOCX, MD, HTML). Stored at `content/{month}/{pillar}/{cluster}/{piece}/brief-v{n}.{ext}`. Gates `updatePiece()` behind upload success check. Advances status to `brief-uploaded`.
- `ReviewPanel` — unified review for any non-NS stage. Verdicts: Approved (advances to next stage) / Needs Revision (return-to-sender, back to last NS stage) / Question (status unchanged, note logged)
- `PreviewPanel` — renders uploaded HTML deliverables in a sandboxed iframe. Injects paragraph-number gutter (`¶1`, `¶2`…) for easy reference. Non-HTML types (PDF) rendered in a native viewer or download link.
- `AnnotatePanel` — Preview with inline comment sidebar. Click any `¶` number to auto-populate the section reference field. Comments carry `revision` field — stale comments from prior versions appear collapsed.
- `HistoryPanel` — per-piece stage-history log. Reads `piece.status_history[]`. Timestamps stored UTC, displayed in US Eastern.
- `CsvSyncPanel` (in Admin) — download current topics as CSV; upload an edited CSV to update piece metadata in bulk. New pieces can be added via CSV (blank `id`, valid `cluster` name). Status, revision count, and feedback are never overwritten by CSV sync.
- `AIPlaygroundPanel` — embeds `ai-playground.html` in an iframe with a toggle-based commenting system. Reviewer pins stored in `project.playground_comments[]`.

### admin.jsx

Config editor for admin users. Tabs:
- **Pillars & Clusters** — add/edit pillars and clusters
- **Pieces** — add/edit pieces
- **Team** — add team members
- **Workflow** — drag to reorder stages, rename, set actor per stage. Saves to `project.workflow_stages`
- **Notifications** — manage digest and editors email recipients, send test digest
- **CSV Sync** — bulk-edit piece metadata via CSV round-trip

### app.jsx

Root component. Hydrates from GitHub on load, falls back to `MOCK_PROJECT` on error. Debounced auto-save (1.5s) on any project state change. Calls `syncWorkflowGlobals(project)` after hydration to keep `STATUS_META`, `STATUS_ORDER`, and `IN_MOTION_STATUSES` in sync with the live workflow config.

### api/github.js

Vercel serverless. Reads `GITHUB_TOKEN` and `GITHUB_REPO` from `process.env`. Proxies GET and PUT to GitHub Contents API. Body parser limit raised to `10mb` to support PDF uploads.

### api/anthropic.js

Vercel serverless. Reads `ANTHROPIC_API_KEY` from `process.env`. Proxies POST to Anthropic `/v1/messages`. Active — API key is live.

### api/digest.js

Daily digest email. Triggered by Vercel Cron at 12:30 UTC (6pm IST). Only sends if there has been activity since the last digest. Reads `project.workflow_stages` to categorise stages dynamically — no hardcoded status names. Stores last-sent state in `config/digest-state.json`.

### api/notify.js

"Send to Editors" email for fully-approved clusters. Triggered by the **Send to Editors →** button on cluster cards (admin mode). Reads recipient list from `project.notifications.editors_to`.

### ai-playground.html — AI Playground

Self-contained, single-file interactive microsite for S2P procurement professionals. No API key required (fully static, all responses are pre-scripted). No build step. Accessible two ways:

- **In the tracker:** via the AI Playground nav entry in the sidebar, rendered via `AIPlaygroundPanel` with toggle-based commenting overlay. Login required (normal tracker session).
- **Direct URL (no login):** `https://jaggaer-ns-tracker.vercel.app/ai`, served by a `vercel.json` rewrite rule pointing `/ai` directly at `ai-playground.html`.

#### Journey structure

A four-step guided experience followed by 13 interactive tool pages:

| Step | Description |
|---|---|
| Step 1 — Prompt Builder | User builds a real S2P prompt using a guided wizard |
| Step 2 — Myth Check | Debunks procurement AI myths with interactive pick-and-reveal |
| Step 3 — AI Readiness | Maturity scorecard with dial and dimension breakdown |
| Step 4 — What Next | Chat-style recommendations based on readiness score |

#### Interactive tools (13)

Organized into four capability groups:

| Capability Group | Tools |
|---|---|
| Conversation Window | Approval Path Checker, Supplier Message Drafter, Sole-Source Justifier, Prompt Builder |
| Deep Research | Supplier Risk Scanner, Contract Clause Analyser, Invoice Exception Detector, Spend Classifier, Tender Summariser, Spend Diagnostic |
| Guided Sourcing | RFP Builder, Should-Cost Estimator, Bid Comparison & Award |
| Know where you stand | Procurement Myth Check, AI Readiness Scorecard |

Every tool is input-aware, parsing real user input and producing genuinely responsive output. A customer-type lens (Manufacturing / Higher Education / Public Sector) is available on applicable tools. Each tool carries a contrast strip comparing demo output to what JAI does with live organisational data.

#### Design system

Implements the JAGGAER v2.0 web design guidelines. Key tokens:

| Token | Value |
|---|---|
| Primary typeface | Inter (300–800) from Google Fonts |
| Stats / numbers typeface | Poppins (600–900), matching jaggaer.com |
| JAI gradient | 90deg `#5300CE` to `#E22B83` (AI-branded contexts only) |
| CTA red | `#D22428` (primary CTAs and JAGGAER wordmark only) |
| Dark ink | `#0B0D12` (full-bleed JAI zone backgrounds) |

**Design rules:**
- Purple/gradient reserved exclusively for JAI moments; red is the primary S2P accent
- "Full bleed" JAI zones use `width:100vw; left:50%; transform:translateX(-50%)`; no `max-width`, `border-radius`, or `margin:auto`
- JAI footers state what JAI does on real data without acknowledging the demo context
- No marketing verbs (transform, unlock, leverage); no em-dashes; lead with what something does
- JAI referenced only in designated zones; JAGGAER product name not used in non-JAI sections

**Copy source of truth:** `ai-playground.html` itself. No separate `copy.md` in repo.

---

## 8. Deployment (Vercel)

1. Push repo to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`
2. Import into Vercel
3. Set **Root Directory** to `repo-setup`
4. Set **Framework** to `Other` (no build step)
5. Add environment variables (see §9)
6. Deploy

Vercel auto-detects `api/*.js` files as serverless functions. The Cron job, the `/ai` rewrite, and any other routes are all configured in `vercel.json` — which **must live inside `repo-setup/`**, not the repo root.

The `/ai` route (`https://jaggaer-ns-tracker.vercel.app/ai`) is served by a Vercel rewrite pointing directly to `ai-playground.html`. No login required, no React, no session.

---

## 9. Environment Variables

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Classic PAT, full repo scope. Never in code. |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` |
| `ANTHROPIC_API_KEY` | Live. Required for Claude conversation rail. |
| `MAILEROO_API_KEY` | Email delivery. Get from Maileroo dashboard. |
| `APP_URL` | Clean production URL used in digest email CTA. Optional — falls back to hardcoded value. |
| `DIGEST_TO` | Fallback recipient list. Manage via **Admin → Notifications** — that takes priority. |
| `DIGEST_FROM` | Leave unset. Defaults to Maileroo shared domain. Only set if using a verified custom domain. |

---

## 10. Email Notifications

Two email flows, both via Maileroo (`X-Sending-Key` auth header). Recipient addresses must be passed as structured `{ address, display_name }` objects — not flat strings.

### Setup

1. Sign up at maileroo.com
2. Get `MAILEROO_API_KEY` from the dashboard
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

**After any schema migration** — force-trigger once to reset `digest-state.json` with current piece statuses.

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

*Last updated: July 2026, v3.6. Changes from v3.5: `jai-demo.html` replaced by `ai-playground.html` (4-step guided journey + 13 tools, `/ai` route). Ad-Hoc Articles content type added (two-stage review, outside main workflow). Per-piece stage-history log (`status_history[]`). Return-to-sender workflow. Version-aware inline comments (`revision` field on feedback). `BriefUploadPanel` for Jaggaer brief uploads. `ReplaceDraftPanel` for NS draft replacement. Weekly Progress tab. CSV import with new-piece insertion. `AIPlaygroundPanel` with `playground_comments[]`. Maileroo migrated to `X-Sending-Key` auth + structured address objects. GitHub body parser limit raised to 10mb. `ANTHROPIC_API_KEY` now live. Removed `sample-artifacts.jsx`, `claude-rail.jsx`, `jai-demo.html`, `bwc.jsx`.*
