# Jaggaer × Netscribes — Content Intelligence Tracker
### Technical Reference

A collaborative content delivery and review platform for the Jaggaer × Netscribes content intelligence engagement. It replaces a shared spreadsheet and is the single interface for content delivery, client review, feedback, and approval.

It is **not** an internal NS workflow tool. NS coordinates writing however it likes; this app activates when a piece is ready for client eyes.

Deployed at **`jaggaer-ns-tracker.vercel.app`**. Repo: **`ns-adiraghavan/jaggaer-ns-tracker`**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [The Data Model — project.json](#3-the-data-model--projectjson)
4. [Workflow Stages](#4-workflow-stages)
5. [Content Type Model](#5-content-type-model)
6. [Publishing Sequence](#6-publishing-sequence)
7. [File-by-File Reference](#7-file-by-file-reference)
8. [AI Playground](#8-ai-playground)
9. [Build & Local Development](#9-build--local-development)
10. [Deployment (Vercel)](#10-deployment-vercel)
11. [Environment Variables](#11-environment-variables)
12. [Email Notifications](#12-email-notifications)
13. [Maintenance Playbook](#13-maintenance-playbook)
14. [Common Tasks — Recipes](#14-common-tasks--recipes)

---

## 1. Architecture Overview

```
Browser (React 18 via Babel Standalone CDN — no build step)
    │
    ├── Reads/writes project state
    │       └── /api/github.js   (Vercel serverless)  → GitHub Contents API
    │               └── config/project.json           ← single source of truth
    │
    ├── Claude conversation rail
    │       └── /api/anthropic.js (Vercel serverless)  → Anthropic /v1/messages
    │
    ├── Search Console ingestion
    │       └── /api/perf-xlsx.js (Vercel serverless)  → SheetJS parse of GSC .xlsx
    │
    ├── Style-guide rendering
    │       └── /api/docx-render.js (Vercel serverless) → mammoth docx→HTML
    │
    └── Static assets served from /repo-setup/
```

**Key principle:** GitHub is the database. No separate backend, no database, no server-side session state. Every read and write goes through a Vercel serverless proxy that injects secrets from environment variables — the browser never holds a credential, and never calls GitHub or Anthropic directly.

The proxy architecture (browser → `/api/*` → external API) is intentional. **Do not** revert any component to direct browser-to-API calls.

---

## 2. Repository Structure

```
/
├── config/
│   ├── project.json          ← ALL app state lives here (single source of truth)
│   ├── digest-state.json     ← last-sent timestamp + piece states for digest dedup
│   └── style-guide.docx      ← rendered in-app via api/docx-render.js
│
├── content/
│   └── month-1/
│       └── {pillar-id}/{cluster-id}/{piece-id}/
│           ├── brief-v{n}.{ext}         ← Jaggaer-uploaded briefs
│           └── deliverable-v{n}.{ext}   ← NS-uploaded content files
│
├── repo-setup/               ← Vercel serves THIS folder as the app root
│   │
│   │  ── Loaded by index.html, in dependency order ──
│   ├── index.html            ← app shell; lists the script load order
│   ├── styles.css            ← design system / CSS variables
│   ├── mock-data.js          ← MOCK_PROJECT fallback when GitHub hydration fails
│   ├── api.js                ← browser-side GitHub/Anthropic helper (calls /api/* proxies)
│   ├── entry.jsx             ← name-selector screen
│   ├── sidebar.jsx           ← left nav (By Pillar / By Type)
│   ├── tracker.jsx           ← main tracker, drawer, review panels, CSV sync
│   ├── weekly-report.jsx     ← Status Report tab
│   ├── performance.jsx       ← Search Performance tab
│   ├── admin.jsx             ← admin config editor
│   ├── sample-artifacts.jsx  ← S2P sample-article showcase panel
│   ├── style-guide.jsx       ← in-app style-guide viewer/uploader
│   ├── app.jsx               ← root component; hydration + debounced auto-save
│   │
│   │  ── Static / standalone ──
│   ├── ai-playground.html    ← AI Playground microsite (standalone; /ai route)
│   ├── jaggaer-logo.png
│   ├── netscribes-logo.png
│   │
│   │  ── Serverless functions (Vercel auto-detects api/*.js) ──
│   ├── api/
│   │   ├── github.js         ← GitHub Contents API proxy (10 MB body limit)
│   │   ├── anthropic.js      ← Anthropic /v1/messages proxy
│   │   ├── perf-xlsx.js      ← GSC .xlsx parser (SheetJS)
│   │   ├── docx-render.js    ← style-guide docx→HTML (mammoth)
│   │   ├── digest.js         ← daily digest email (Vercel Cron)
│   │   ├── notify.js         ← "Send to Editors" email
│   │   └── api.js            ← shared serverless helpers
│   │
│   ├── vercel.json           ← crons + rewrites; MUST live here (see below)
│   ├── package.json          ← dev deps (Babel CLI) + serverless deps (xlsx, mammoth)
│   └── setup.sh              ← one-time GitHub repo initialiser
│
└── README.md
```

### Two structural rules that bite if forgotten

- **`vercel.json` must live inside `repo-setup/`.** Vercel's Root Directory is set to `repo-setup/`, so a copy at the repo root is ignored. This governs the Cron schedule and the `/ai` + `/demo` rewrites.
- **Serverless code lives only in `repo-setup/api/`.** Vercel only treats `api/*.js` as functions. `repo-setup/digest.js` and `repo-setup/notify.js` are **stale root-level duplicates** left over from an earlier layout — they are never executed. Edit the `api/` versions only; the root copies are dead weight and safe to delete.

### Present but not loaded (legacy)

`agent-builder.jsx`, `bwc.jsx`, `claude-rail.jsx`, and `jai-demo.html` are still in the repo but are **not** referenced by `index.html` and are not part of the running app. `jai-demo.html` is still reachable via the `/demo` rewrite in `vercel.json`; the live demo experience is now the AI Playground at `/ai`. These files can be removed in a cleanup pass — verify nothing imports them first.

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
  "performanceData": {},
  "notifications": { "digest_to": [...], "editors_to": [...] },
  "playground_comments": [...]
}
```

### months

```json
{ "id": "month-1", "label": "Month 1 · May–Jun 2026", "active": true, "start_date": "2026-05-21" }
```

### content_type_split

The three-type model that overlays the four industry pillars. Valid `id`: `"msv"`, `"ai-in-s2p"`, `"industry-specific"`.

```json
{ "id": "msv", "label": "MSV-driven", "description": "...", "weight": 0.50, "pieces_est": 15 }
```

### pillars → clusters → pieces

```json
{
  "id": "discrete-manufacturing",
  "label": "Discrete Manufacturing",
  "subtitle": "US & Germany",
  "geography": "US / DE",
  "clusters": [
    {
      "id": "dm1-tariffs",
      "label": "Tariff & Trade Disruption",
      "sequence": 3,
      "intent": "informational",
      "anchor_piece": "p-dm1-2",
      "month_id": "month-1",
      "publish_week": 1,
      "pieces": [ ... ]
    }
  ]
}
```

`sequence` is the global cross-pillar publishing order. `anchor_piece` must match a piece `id` inside `pieces`. `intent` is `"informational"` or `"commercial"`.

### piece fields

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
  "publishing": { "live_url": "https://www.jaggaer.com/blog/..." },
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
| `status` | Must match a stage `id` in `workflow_stages` (or `ad-hoc-review`) |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` |
| `phase` | `1` (informational) or `2` (commercial) |
| `funnel` | `TOFU` / `MOFU` / `BOFU` |
| `primary_keyword` | Target keyword; shown next to position in Search Performance |
| `revision_count` | Increments on each NS submit |
| `deliverable_ext` | Set on upload; enables PDF/DOCX round-trip. Defaults to `"html"` |
| `publishing.live_url` | Live URL; joins the piece to its Search Console `performanceData` record via URL slug |
| `status_history` | Append-only log of `{ stage, ts, by }`. Stored UTC, displayed US Eastern. Seeded pre-tracking entries carry `ts: null` and are never backfilled |
| `brief_files` | Array of uploaded brief filenames; set by `BriefUploadPanel` |

### team

```json
{
  "ns":      [ { "id": "manager", "name": "Chahat K", "role": "NS Manager", "org": "ns", "admin": true } ],
  "jaggaer": [ { "id": "anna",    "name": "Jason R",  "role": "Marketing",  "org": "jaggaer", "admin": true } ]
}
```

`"admin": true` unlocks admin mode for that user. Both orgs can have admin users. A stage `actor` of `"person:{id}"` must match a `team` member `id`.

### feedback (written at runtime)

```json
{
  "p-dm2-2": [
    { "id": "fb-9", "author": "indy", "verdict": "question",
      "body": "Is the tier-3 data sourced or illustrative?",
      "ts": "2026-05-14T08:50:00Z", "stage": "marketing-review", "revision": 1 }
  ]
}
```

Valid verdicts: `"approved"`, `"needs-revision"`, `"question"`. The `revision` field groups inline comments by the deliverable version they were left on; comments from prior versions collapse under a "Previous versions" disclosure.

### performanceData (written at runtime)

Keyed by URL slug (last non-empty path segment of `publishing.live_url`, lowercased). Each record is one parsed GSC export:

```json
{
  "predictive-supplier-risk-management": {
    "url": "https://www.jaggaer.com/blog/predictive-supplier-risk-management",
    "uploaded_at": "2026-07-10T09:00:00Z",
    "uploaded_by": "anna",
    "filename": "gsc-export.xlsx",
    "date_range": { "start": "2026-05-22", "end": "2026-07-10", "label": "..." },
    "summary": { "clicks": 0, "impressions": 0, "ctr": 0, "avg_position": 0 },
    "timeseries": [ { "date": "2026-05-22", "clicks": 0, "impressions": 0, "position": 0 } ],
    "top_queries": [...], "countries": [...], "devices": [...]
  }
}
```

Slug mismatches between an upload and a piece's `live_url` are surfaced to the user, never silently written.

### playground_comments (written at runtime)

Reviewer pins placed on the AI Playground microsite from inside the tracker:

```json
{ "id": "pc-1", "author": "anna", "body": "Step 2 copy needs shortening.",
  "ts": "2026-06-01T10:00:00Z", "resolved": false, "page": "step-2" }
```

### workflow_stages

Defines the production funnel. Fully configurable — edit here or via **Admin → Workflow**, no code changes.

```json
{ "id": "ed-review", "label": "Ed Content Review", "color": "#7d6608", "bg": "#fefde8", "actor": "person:m-ed01" }
```

`actor` values: `"ns"` (any NS member), `"jaggaer"` (any Jaggaer member), `"person:{id}"` (named individual), `null` (terminal). `actor` may also be an **array** when several named reviewers share a stage, e.g. `["person:abhishek", "person:m-ny8dy", "person:m-pifrn"]`.

The app derives all role-based permissions from this config at runtime. Change a stage's actor and the action button in the drawer immediately moves to the new owner.

> **Stage IDs are also mirrored as fallback defaults in `tracker.jsx`** (`STATUS_META` / `DEFAULT_WORKFLOW_STAGES`). When you rename or re-ID a stage in `project.json`, update the matching entry in `tracker.jsx` too, or the fallback (used before hydration, and by colour lookups) will be stale.

---

## 4. Workflow Stages

Current live funnel (from `project.workflow_stages`):

| Stage `id` | Actor | Meaning |
|---|---|---|
| `not-started` | Jaggaer | Brief not yet uploaded |
| `stage-nq11b` | person: m-ny8dy, m-pifrn | SME topic confirmation before brief |
| `brief-uploaded` | NS + Jaggaer | Brief uploaded; NS begins writing |
| `writing` | NS | NS submits draft to next reviewer |
| `marketing-review` | person: abhishek, m-ny8dy, m-pifrn | SEO / marketing review |
| `ed-review` | person: m-ed01 (Ed) | JAGGAER content review |
| `editors` | person: m-pznem (Alex), m-izu4e (Jovana) | CTA check / final editorial |
| `approved` | — | Terminal state |

**Current review chain:** NS upload → SEO review (Vizna / Abhishek) → **Ed content review** → Alex CTA check → live.

> As of July 2026 content moved from Robert's team to Jason's team; **Ed** replaced Robert as the JAGGAER content reviewer (`robert-review` → `ed-review`). The SEO-stage reviewer swap (Orlagh → Vizna) is still provisional pending confirmation with Jason.

**Ad-Hoc Articles** use a separate `ad-hoc-review` stage (simplified two-stage: NS submit → Jaggaer review → approved). This stage deliberately lives **outside** `project.workflow_stages` so it doesn't shift the indices of the main funnel — every component that resolves stages carries an explicit patch for it (`getAdHocReviewStage`).

**To change the funnel:** use **Admin → Workflow** (drag to reorder, rename, change actor). The digest email, role permissions, drawer actions, and FilterBar all read `project.workflow_stages` at runtime and update automatically.

**Publish-ready:** a cluster is publish-ready when every piece reaches `approved`.

**Return-to-sender:** selecting "Needs Revision" returns a piece to the *last NS-actor stage* (not necessarily `writing`), preserving the correct return point regardless of funnel shape.

---

## 5. Content Type Model

Three types cut across all four industry pillars:

| Type | ID | Description |
|---|---|---|
| MSV-driven | `msv` | Broad horizontal, high-search-volume procurement terms |
| AI in S2P | `ai-in-s2p` | Claude + S2P searches; user journey mapped (Path 1/2/3) |
| Industry-specific | `industry-specific` | Vertical, sector-explicit; eBooks and whitepapers |

**User paths (AI in S2P pillar only):**

| Path | Description |
|---|---|
| Path 1 | Low-interest. Prefers a ready-made solution (JAI). |
| Path 2 | Medium-interest. Has friction (IT permissions, setup). |
| Path 3 | Superuser. Will install, go deep, possibly fork the repo. |

**Ad-Hoc Articles** are a fourth category for one-off pieces outside any cluster or pillar, with a simplified two-stage review and a dedicated tracker section.

---

## 6. Publishing Sequence

Four-week sequence for Month 1, driven by `project.schedule` — edit there to change order.

| Week | Goal | Clusters |
|---|---|---|
| **Week 1** | Capture Claude + S2P and tariff search traffic | AI in S2P C1 · DM C1: Tariff & Trade |
| **Week 2** | Convert Path 2 users; rank before EU AI Act peaks | AI in S2P C2+C3 · PS C1+C2: EU AI Act + E-Invoicing |
| **Week 3** | Build authority on supply-chain risk and HE governance | DM C2+C3 · HE C1+C2 |
| **Week 4** | Convert audiences to platform-evaluation intent | AI in S2P C4 · DM C4 · PS C3 · HE C3 |

---

## 7. File-by-File Reference

### index.html
App shell. Loads React 18 + Babel Standalone from CDN, then each `.jsx` file as a Babel-transpiled `<script type="text/babel">` in dependency order (see the tree in §2). No build step. Sets:

```js
window.__CONFIG__ = { GITHUB_REPO: "ns-adiraghavan/jaggaer-ns-tracker" };
// Token is NOT here — injected server-side by the Vercel proxy.
```

### styles.css
Design system. Key CSS variables:

```css
--paper:  #f0ede6;   /* warm off-white page background */
--accent: #c8401a;   /* burnt orange — Jaggaer brand */
```

### mock-data.js
`MOCK_PROJECT` — the fallback project used when GitHub hydration fails, so the UI still renders locally without secrets.

### api.js (browser helper)
All GitHub and Anthropic calls from the browser, routed through the `/api/github` and `/api/anthropic` proxies. **Never calls external APIs directly.** Key functions:

- `fetchProject()` — GET `config/project.json`; returns parsed JSON + SHA.
- `saveProject(data, sha)` — PUT `config/project.json`, base64-encoded. Always fetches a **fresh SHA** before writing and retries once on 409. Never pass a stale SHA.
- `uploadPieceDeliverable(...)` / `uploadPieceBrief(...)` — PUT versioned files into the `content/` tree. Binary types (PDF, DOCX) committed as raw base64.
- `callClaude(messages, systemPrompt)` — POST to `/api/anthropic`.

### entry.jsx
Name selector. Renders all `team.ns` + `team.jaggaer` members. No password — identity is for feedback attribution only. Exposes `window.NameSelector`.

### sidebar.jsx
Left nav with a **By Pillar / By Type** toggle. By Pillar: P01–P04 with expandable clusters. By Type: MSV / AI in S2P / Industry-specific with per-piece status dots. Exposes `window.Sidebar`, `window.computeStats`.

### tracker.jsx
The largest module. Main content area + all review machinery. Exposes `window.Tracker`, `window.CT_DISPLAY`, `window.NS_syncWorkflow`, `window.CsvSyncPanel`, `window.projectToCsv`. Holds the `STATUS_META` / `DEFAULT_WORKFLOW_STAGES` fallback stage definitions.

Key components: `DrawerOverlay` (piece modal with Upload / Replace Draft / Brief / Review / Preview & Comment / History / Notes / Details / Edit / Delete tabs), `UploadPanel`, `ReplaceDraftPanel`, `BriefUploadPanel`, `ReviewPanel`, `PreviewPanel` (sandboxed iframe with `¶`-numbered gutter), `AnnotatePanel`, `HistoryPanel`, `CsvSyncPanel`, `AIPlaygroundPanel`.

Upload and brief panels gate `updatePiece()` behind an explicit `result.ok` success check, showing a red retry state on failure.

### weekly-report.jsx
**Status Report** tab. Exposes `window.WeeklyReportPanel`. KPI strip: Published to date · Published last week · To publish this week · Awaiting JAGGAER review · Awaiting Netscribes. Below it: collapsible "Awaiting JAGGAER review" / "Awaiting Netscribes" buckets (oldest-waiting first), SEO briefs outstanding, and an upload/brief log. Uses `withinLastWeek()` for the 7-day window and `lastEnteredStage()` for per-stage timestamps.

### performance.jsx
**Search Performance** tab. Exposes `window.PerformancePanel` and `window.NS_perfSlug` (shared with the Status Report so live cards can show impressions). Jaggaer users (or Admin mode) upload a GSC `.xlsx` per piece; NS reads.

Metrics are computed from each piece's `timeseries`, windowed to **trailing three months starting at the article go-live date** (`perfReleaseTs`):
- `perfTrailing3Month()` — filters the timeseries to `max(90 days ago, go-live) … today`.
- `perfWindowTotals()` — returns trailing-3-month impressions, clicks, **average monthly impressions**, and **impression-weighted average position**.

Cards and the modal show trailing-3-month impressions, avg monthly impressions, weighted avg position, and the piece's **target keyword** (`primary_keyword`) alongside position for context.

### admin.jsx
Config editor for admin users: Pillars & Clusters, Pieces, Team, **Workflow** (drag-reorder / rename / set actor), Notifications (recipients + test digest), CSV Sync. Exposes `window.AdminPanel`.

### sample-artifacts.jsx
S2P sample-article showcase panel. Exposes `window.SampleArtifactsPanel`.

### style-guide.jsx
In-app style-guide viewer + admin uploader. Renders `config/style-guide.docx` by calling `/api/docx-render` (mammoth on the server) and displaying the HTML in a styled iframe.

### app.jsx
Root component. Hydrates from GitHub on load, falls back to `MOCK_PROJECT` on error, debounced auto-save (1.5 s) on any state change. Calls `syncWorkflowGlobals(project)` after hydration to keep `STATUS_META`, `STATUS_ORDER`, and `IN_MOTION_STATUSES` aligned with the live workflow config.

### api/github.js
GitHub Contents API proxy. Reads `GITHUB_TOKEN` + `GITHUB_REPO` from `process.env`. Body-parser limit raised to **10 MB** for PDF deliverable uploads.

### api/anthropic.js
Anthropic `/v1/messages` proxy. Reads `ANTHROPIC_API_KEY`. Live.

### api/perf-xlsx.js
Parses a GSC `.xlsx` export (SheetJS). Input `{ filename, content }` (base64); output `{ url, url_key, date_range, summary, timeseries, top_queries, countries, devices }`. Keyed by URL slug.

### api/docx-render.js
`GET /api/docx-render?path=config/style-guide.docx`. Fetches the file from GitHub raw, runs mammoth (docx→HTML), returns HTML for the style-guide viewer.

### api/digest.js
Daily digest email. Vercel Cron at 12:30 UTC (6 pm IST). Only sends on days with activity. Reads `project.workflow_stages` to categorise stages dynamically. Stores last-sent state in `config/digest-state.json`.

### api/notify.js
"Send to Editors" email for fully-approved clusters. Triggered by the **Send to Editors →** button (admin). Reads `project.notifications.editors_to`.

### api/api.js
Shared serverless helpers used by the functions above.

---

## 8. AI Playground

Self-contained, single-file interactive microsite for S2P procurement professionals (`ai-playground.html`). Fully static — no API key, no React, no build step. All responses are pre-scripted but input-aware. Two entry points:

- **In the tracker:** AI Playground nav entry → rendered via `AIPlaygroundPanel` with a toggle-based commenting overlay (pins stored in `project.playground_comments[]`). Requires a tracker session.
- **Direct URL (no login):** `https://jaggaer-ns-tracker.vercel.app/ai`, served by the `/ai` rewrite in `vercel.json`.

**Journey:** a four-step guided experience (Prompt Builder → Myth Check → AI Readiness scorecard → What Next) followed by 13 interactive tool pages grouped into four capability groups (Conversation Window, Deep Research, Guided Sourcing, Know where you stand). Each tool parses real user input, offers a Manufacturing / Higher Education / Public Sector lens where applicable, and carries a contrast strip comparing demo output to what JAI does with live organisational data.

**Design system (JAGGAER v2.0):** Inter (300–800) for body, Poppins (600–900) for stats. JAI gradient `90deg #5300CE → #E22B83` (AI-branded contexts only); CTA red `#D22428` (primary CTAs and the JAGGAER wordmark only); dark ink `#0B0D12` (full-bleed JAI-zone backgrounds); JAI purple surface `#E1CFF1`; amber `#C77700` (user-controlled inputs / gap indicators).

**Copy & design rules:**
- Purple / gradient reserved exclusively for JAI moments; red is the primary S2P accent; amber for user-controlled inputs.
- "Full bleed" JAI zones use `width:100vw; left:50%; transform:translateX(-50%)` — no `max-width`, `border-radius`, `margin:auto`.
- No marketing verbs (transform, unlock, leverage); no em-dashes; no self-referential framing. Lead with what something does; plain declarative sentences.
- JAI referenced only in designated zones; the JAGGAER product name is not used in non-JAI sections.

**Copy source of truth:** `ai-playground.html` itself. There is no separate `copy.md`.

---

## 9. Build & Local Development

There is **no bundler and no build step for the browser app** — `index.html` transpiles JSX in the browser via Babel Standalone. `package.json` exists for two reasons only: (1) dev-time JSX **validation** via Babel CLI, and (2) the serverless runtime dependencies `xlsx` and `mammoth`, which Vercel installs for the functions in `api/`.

```json
{
  "dependencies":    { "mammoth": "^1.8.0", "xlsx": "^0.18.5" },
  "devDependencies": { "@babel/cli": "…", "@babel/core": "…", "@babel/preset-react": "…" }
}
```

### Run it locally

Because the browser app has no build step, any static server works — but the `/api/*` routes only exist under Vercel. Use the Vercel CLI so the serverless functions and rewrites are available:

```bash
cd repo-setup
npm install
npx vercel dev        # serves the app + api/* locally on http://localhost:3000
```

You'll need the environment variables from §11 in a local `.env` (or a linked Vercel project) for the proxies to work. Without them the app still renders — it falls back to `MOCK_PROJECT` — but reads/writes to GitHub, Claude, and GSC parsing will fail.

A plain static server (`npx serve .`) is fine for pure UI work that doesn't touch `/api/*`.

### Validate JSX before every commit

JSX is **not** valid plain JS, so `node --check` cannot parse it and will report false errors. Always validate with the Babel CLI + the React preset:

```bash
cd repo-setup
for f in *.jsx; do
  npx babel --presets @babel/preset-react "$f" --out-file /dev/null \
    && echo "$f OK" || echo "$f FAILED"
done
```

For the serverless functions and other plain-JS files, `node --check api/*.js` is correct.

### Validate rendered output

After any non-trivial UI change, load the app in a headless browser and confirm it mounts without console errors before shipping. A minimal Playwright check:

```bash
npx playwright install chromium
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('console', m => m.type() === 'error' && console.log('CONSOLE ERROR:', m.text()));
  await p.goto('http://localhost:3000');
  await p.waitForTimeout(2500);
  await b.close();
})();
"
```

---

## 10. Deployment (Vercel)

1. Push to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`.
2. Import into Vercel.
3. Set **Root Directory** to `repo-setup`.
4. Set **Framework Preset** to **Other** (no build step).
5. Add the environment variables from §11.
6. Deploy.

Vercel auto-detects `api/*.js` as serverless functions. The Cron job and the `/ai` + `/demo` rewrites are configured in `vercel.json`, which **must live inside `repo-setup/`** (the Root Directory), not at the repo root.

---

## 11. Environment Variables

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Classic PAT, full `repo` scope. **Never in code.** Injected by `api/github.js`. |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` |
| `ANTHROPIC_API_KEY` | Live. Required for the Claude conversation rail. |
| `MAILEROO_API_KEY` | Email delivery. From the Maileroo dashboard. |
| `APP_URL` | Clean production URL used in the digest-email CTA. Optional; falls back to a hardcoded value. |
| `DIGEST_TO` / `EDITORS_TO` | Fallback recipient lists. **Admin → Notifications takes priority** over these. |
| `DIGEST_FROM` | Leave unset — defaults to the Maileroo shared domain. Only set with a verified custom domain. |

---

## 12. Email Notifications

Two flows, both via Maileroo. Auth header is **`X-Sending-Key`**; recipients must be passed as structured `{ address, display_name }` objects, **not** flat strings.

### Setup
1. Sign up at maileroo.com, get `MAILEROO_API_KEY`.
2. Add it to Vercel env vars.
3. Set recipients via **Admin → Notifications**.
4. Deploy.

### Flow 1 — Daily Digest (`api/digest.js`)
Runs at 6 pm IST via Vercel Cron (in `vercel.json`). Only sends on days with activity. Sections (each shown only if non-empty): **Needs your review**, **Sent back for revision**, **Approved today**, **Feedback added**. Recipients from `project.notifications.digest_to`, falling back to `DIGEST_TO`.

Manual trigger / test:
```bash
curl -X POST https://jaggaer-ns-tracker.vercel.app/api/digest \
  -H "Content-Type: application/json" -d '{"force": true}'
```
Or **Send Test Digest** in Admin → Notifications. **After any schema migration**, force-trigger once to reset `digest-state.json` with current piece statuses.

### Flow 2 — Send to Editors (`api/notify.js`)
Triggered by **Send to Editors →** on fully-approved cluster cards (admin). Emails all approved pieces with title, format, and a direct GitHub file link. Recipients from `project.notifications.editors_to`, falling back to `EDITORS_TO`.

### Recipient priority
```
project.notifications.digest_to / editors_to   (wins)
        ↓ if empty
DIGEST_TO / EDITORS_TO env vars                (fallback)
```

---

## 13. Maintenance Playbook

**Working principles that keep this codebase stable:**

1. **Read the real file state before editing.** This repo drifts (stale duplicates, legacy files, fallback copies of the workflow config). Assumptions about what a file contains cause regressions — open it and confirm the exact lines first.
2. **Edit large HTML/JSX with guarded string replacement, not `sed`/`awk`.** Braces and JSX confuse line-based tools. Use Python string replacement with an assertion that the target substring exists **exactly once** before replacing:
   ```python
   assert src.count(old) == 1, "target not unique or missing"
   src = src.replace(old, new)
   ```
3. **Watch for global-scope naming collisions.** The unbundled script-tag architecture puts every top-level `const`/`function` in one shared global scope. Two files declaring the same identifier crash the app (this happened before with `PieceDrawer` / `PerfPieceDrawer`). Every component and helper name must be unique **across all loaded `.jsx` files**. When adding a helper, prefix it per-module (e.g. `perfSlug`, `useMemoWR`).
4. **Keep the two copies of the workflow config in sync.** `config/project.json` is the source of truth; `tracker.jsx` (`STATUS_META` / `DEFAULT_WORKFLOW_STAGES`) is the pre-hydration fallback. Rename a stage in one, rename it in the other.
5. **Never hardcode stage IDs in new UI.** Resolve stages through `project.workflow_stages` at runtime, and patch `ad-hoc-review` explicitly via `getAdHocReviewStage()` — it is intentionally not in `workflow_stages`.
6. **GitHub Contents API needs a fresh SHA on every PUT.** Fetch the current SHA immediately before writing; a missing SHA → 422, a stale SHA → 409. `saveProject` already refreshes and retries once — don't reintroduce a cached SHA.
7. **Validate before delivering:** Babel CLI on every touched `.jsx`, `node --check` on plain JS, then a headless render check. Deliver working files, not inline diffs.
8. **Don't revert the proxy architecture.** Browser → `/api/*` → external API is deliberate; direct browser calls would leak credentials.

**Security note — rotate the committed token.** `repo-setup/setup.sh` contains a **hardcoded GitHub PAT in plaintext**. Anyone with repo read access can use it. Rotate that token in GitHub → Settings → Developer settings → Personal access tokens, replace it with an environment lookup (`TOKEN="${GITHUB_TOKEN}"`) in `setup.sh`, and treat the old token as compromised. This is unrelated to the runtime `GITHUB_TOKEN` env var, which is injected server-side and is safe.

**Housekeeping backlog (safe to action in a cleanup pass):**
- Delete stale root-level serverless duplicates `repo-setup/digest.js` and `repo-setup/notify.js` (the live versions are in `api/`).
- Remove unloaded legacy files `agent-builder.jsx`, `bwc.jsx`, `claude-rail.jsx`, and — once `/demo` is retired — `jai-demo.html` and its `vercel.json` rewrite. Confirm nothing references them first.
- Backfill missing `status_history` timestamps where known; leave genuinely-unknown ones as `ts: null` rather than guessing.

---

## 14. Common Tasks — Recipes

### Add a piece / cluster / pillar
Edit `config/project.json` (or use **Admin → Pieces / Pillars & Clusters**). New `status` must match a `workflow_stages` id. No code change.

### Add a workflow stage or change a reviewer
**Admin → Workflow**, or edit `project.workflow_stages`. If you rename or re-ID a stage, mirror it in `tracker.jsx` (`STATUS_META` / `DEFAULT_WORKFLOW_STAGES`) and update any pieces whose `status` referenced the old id.

### Add a team member / reviewer
Add to `team.ns` or `team.jaggaer` with a unique `id`. Reference them in a stage as `"person:{id}"`. Set `"admin": true` to grant admin mode.

### Upload Search Console data
Jaggaer user (or Admin mode) drops a per-page GSC `.xlsx` on the piece's card in the Search Performance tab. The slug from the export must match the piece's `publishing.live_url`; a mismatch is reported, not swallowed.

### Push a project.json update by hand (PowerShell)

```powershell
$TOKEN   = $env:GITHUB_TOKEN          # do NOT paste a literal token
$REPO    = "ns-adiraghavan/jaggaer-ns-tracker"
$BASE    = "https://api.github.com/repos/$REPO/contents"
$HEADERS = @{ Authorization = "Bearer $TOKEN"; Accept = "application/vnd.github+json" }

$existing = Invoke-RestMethod "$BASE/config/project.json" -Headers $HEADERS
$sha      = $existing.sha
$content  = Get-Content "config\project.json" -Raw
$encoded  = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
$body     = @{ message = "update: description here"; content = $encoded; sha = $sha } | ConvertTo-Json
Invoke-RestMethod "$BASE/config/project.json" -Method Put -Headers $HEADERS -Body $body -ContentType "application/json" | Out-Null
Write-Host "Done" -ForegroundColor Green
```

The fresh-SHA-before-PUT pattern is mandatory (see §13.6).

### After a schema migration
Force-trigger the digest once (§12) so `digest-state.json` reseeds with current statuses and the next real digest doesn't misreport.

---

*Last updated: July 2026, v3.7. Changes from v3.6: reconciled file tree with actual repo (documented `weekly-report.jsx`, `performance.jsx`, `style-guide.jsx`, `sample-artifacts.jsx`, and the `api/perf-xlsx.js` / `docx-render.js` / `api.js` functions; corrected the inaccurate "removed files" list — those files are unloaded, not deleted). Workflow reviewer `robert-review` → `ed-review` (Ed). Search Performance now trailing-3-month impressions + avg monthly + weighted position + target keyword. Status Report KPI relabelling. Added detailed Build & Local Development, Maintenance Playbook, and Common Tasks sections. Flagged the plaintext token in `setup.sh` for rotation. Removed repeated notes (vercel.json location, SHA management, dead-weight files now stated once).*
