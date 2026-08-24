# Jaggaer × Netscribes — Content Intelligence Tracker
### Technical Reference

A collaborative content delivery and review platform for the Jaggaer × Netscribes content intelligence engagement. It replaces a shared spreadsheet and is the single interface for content delivery, client review, feedback, and approval.

It is **not** an internal NS workflow tool. NS coordinates writing however it likes; this app activates when a piece is ready for client eyes.

Access is gated by a two-team login (NS / Jaggaer); post-login the roster and UI are scoped to the signed-in org. Individual pieces have shareable `/piece/:id` links that unfurl in Slack/Teams and open a standalone read-only viewer.

Deployed at **`jaggaer-ns-tracker.vercel.app`**. Repo: **`ns-adiraghavan/jaggaer-ns-tracker`**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [The Data Model — project.json](#3-the-data-model--projectjson)
4. [Phase 2 Data Model](#4-phase-2-data-model)
5. [Workflow Stages](#5-workflow-stages)
6. [Content Type Model](#6-content-type-model)
7. [Publishing Sequence](#7-publishing-sequence)
8. [File-by-File Reference](#8-file-by-file-reference)
9. [AI Playground](#9-ai-playground)
10. [Build & Local Development](#10-build--local-development)
11. [Deployment (Vercel)](#11-deployment-vercel)
12. [Environment Variables](#12-environment-variables)
13. [Email Notifications](#13-email-notifications)
14. [Maintenance Playbook](#14-maintenance-playbook)
15. [Common Tasks — Recipes](#15-common-tasks--recipes)

---

## 1. Architecture Overview

```
Browser (React 18 via Babel Standalone CDN — no build step)
    │
    ├── Reads/writes project state
    │       └── /api/github.js   (Vercel serverless)  → GitHub Contents API
    │               └── config/project.json           ← single source of truth (Phase 1)
    │               └── config/phase2-reference.json  ← Phase 2 reference tabs (read-only)
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
    ├── Shareable piece links   /piece/:id
    │       └── /api/piece-page.js (Vercel serverless) → piece.html shell
    │               + OG/Twitter meta + inline piece data
    │               (JSON fallback: /api/piece.js; shared lookup: api/_lib/piece-lookup.js)
    │
    └── Static assets served from /repo-setup/
```

**Auth is a client-side login gate**, not a server session: `login.jsx` checks two hardcoded team passwords (NS / Jaggaer) and records the org in `localStorage`. There is no server-side authentication — the gate keeps casual visitors out, but is not a security boundary. The GitHub token that can actually write the repo lives only in the serverless env, never in the browser.

**Key principle:** GitHub is the database. No separate backend, no database, no server-side session state. Every read and write goes through a Vercel serverless proxy that injects secrets from environment variables — the browser never holds a credential, and never calls GitHub or Anthropic directly.

The proxy architecture (browser → `/api/*` → external API) is intentional. **Do not** revert any component to direct browser-to-API calls.

---

## 2. Repository Structure

```
/
├── config/
│   ├── project.json          ← ALL app state lives here (single source of truth)
│   ├── phase2-reference.json ← Phase 2 reference tab content (13 tabs; read-only in app)
│   ├── digest-state.json     ← last-sent timestamp + piece states for digest dedup
│   ├── style-guide.docx      ← rendered in-app via api/docx-render.js
│   └── content-flow.png      ← workflow diagram, rendered in-app via content-flow.jsx
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
│   ├── index.html            ← app shell; lists the script load order; has <base href="/"> for SPA routing
│   ├── styles.css            ← design system / CSS variables
│   ├── mock-data.js          ← MOCK_PROJECT fallback when GitHub hydration fails
│   ├── api.js                ← browser-side GitHub/Anthropic helper (calls /api/* proxies)
│   ├── login.jsx             ← two-team login gate (loaded first; sets org in localStorage)
│   ├── entry.jsx             ← name selector (org-scoped, post-login; attribution only)
│   ├── sidebar.jsx           ← left nav (By Pillar / By Type; Phase 2 category nav)
│   ├── tracker.jsx           ← main tracker, drawer, review panels, CSV sync, piece links
│   ├── weekly-report.jsx     ← Status Report tab + StatusExportBar (CSV export by launch_date)
│   ├── performance.jsx       ← Search Performance tab
│   ├── admin.jsx             ← admin config editor
│   ├── sample-artifacts.jsx  ← S2P sample-article showcase panel
│   ├── style-guide.jsx       ← in-app style-guide viewer/uploader (docx)
│   ├── content-flow.jsx      ← Content Flow diagram viewer/uploader (image)
│   ├── phase2.jsx            ← CommentsPanel, Phase2ReferencePanel, Phase2SyncPanel
│   ├── phase2_logic.js       ← Phase 2 .xlsx calendar sync logic (client-side SheetJS parse)
│   ├── app.jsx               ← root component; hydration + debounced auto-save; phase routing
│   │
│   │  ── Static / standalone ──
│   ├── ai-playground.html    ← AI Playground microsite (standalone; /ai route)
│   ├── piece.html            ← standalone per-piece read-only viewer (/piece/:id)
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
│   │   ├── notify.js         ← piece-approval / "Send to Editors" email
│   │   ├── piece-page.js     ← serves piece.html + per-piece OG meta (/piece/:id)
│   │   ├── piece.js          ← JSON fallback for piece.html
│   │   ├── _lib/
│   │   │   └── piece-lookup.js ← shared piece resolver (buildPiecePayload)
│   │   └── api.js            ← shared serverless helpers
│   │
│   ├── vercel.json           ← crons + rewrites; MUST live here (see below)
│   ├── package.json          ← dev deps (Babel CLI) + serverless deps (xlsx, mammoth)
│   └── setup.sh              ← one-time GitHub repo initialiser
│
└── README.md
```

### Structural rules

- **`vercel.json` must live inside `repo-setup/`.** Vercel's Root Directory is set to `repo-setup/`, so a copy at the repo root is ignored.
- **`<base href="/">` in `index.html` is required for SPA routing.** The Phase 2 URL is `/tracker/phase2`. Without the base tag, Babel-loaded JSX scripts resolve as `/tracker/phase2/tracker.jsx` → 404 on hard refresh.
- **Serverless code lives only in `repo-setup/api/`.** `repo-setup/digest.js`, `repo-setup/notify.js`, and `repo-setup/perfxlsx.js` are stale root-level duplicates — never executed. Edit the `api/` versions only.

### Stale duplicates and legacy files (present, not loaded)

- **Superseded duplicates:** `repo-setup/weeklyreport.jsx` → live is `weekly-report.jsx`; `repo-setup/perfxlsx.js` and `repo-setup/api/perfxlsx.js` → live is `api/perf-xlsx.js`; `repo-setup/digest.js` / `repo-setup/notify.js` → live are `api/digest.js` / `api/notify.js`.
- **Legacy prototypes:** `agent-builder.jsx`, `bwc.jsx`, `claude-rail.jsx`, and `jai-demo.html`. `jai-demo.html` is still reachable via the `/demo` rewrite but the live demo experience is the AI Playground at `/ai`.

---

## 3. The Data Model — project.json

Everything the app renders derives from `config/project.json`. Adding pillars, clusters, pieces, team members, months, or workflow stages requires only editing this file — no code changes.

### Root structure

```json
{
  "months": [...],
  "active_month": "month-1",
  "active_phase": 1,
  "phase2_active_month": "p2-month-1",
  "content_type_split": [...],
  "pillars": [...],
  "team": { "ns": [...], "jaggaer": [...] },
  "feedback": {},
  "schedule": [...],
  "workflow_stages": [...],
  "performanceData": {},
  "notifications": { "digest_to": [...], "editors_to": [...], "approved_to": [...] }
}
```

`active_phase` (`1` or `2`) and `phase2_active_month` are the two Phase 2 control fields written by the app when the user switches phases. `playground_comments[]` is written lazily at runtime and may be absent until the first pin is placed.

### months

```json
{ "id": "month-1", "label": "Month 1 · May–Jun 2026", "active": true, "start_date": "2026-05-21" }
```

Phase 2 adds a fourth month entry: `{ "id": "p2-month-1", "label": "Phase 2 · Aug–Sep 2026" }`.

### pillars → clusters → pieces

Phase 1 pillars (`ai-in-s2p`, `discrete-manufacturing`, `public-sector`, `higher-education`, `ad-hoc-articles`) carry `"phase": 1`. Phase 2 pillars (`p2-geo`, `p2-seo`, `p2-bofu`) carry `"phase": 2` and live in the same array. Phase 2 cluster IDs follow the pattern `p2-{type}-w{n}` (weekly buckets).

```json
{
  "id": "p2-geo",
  "label": "GEO",
  "phase": 2,
  "clusters": [
    {
      "id": "p2-geo-w1",
      "label": "Week 1 · Aug 25-29",
      "month_id": "p2-month-1",
      "pieces": [ ... ]
    }
  ]
}
```

### piece fields (Phase 1)

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
  "deliverable_ext": "html",
  "publishing": {
    "published_by": "Jovana",
    "launch_date": "2026-08-21",
    "live_url": "https://www.jaggaer.com/blog/...",
    "updated_at": "2026-08-21T11:00:00Z"
  },
  "last_updated": "2026-05-22T13:58:08.804Z",
  "last_updated_by": "manager",
  "status_history": [
    { "stage": "writing", "ts": "2026-05-22T13:58:08.804Z", "by": "manager" }
  ],
  "brief_files": [...]
}
```

| Field | Notes |
|---|---|
| `status` | Must match a stage `id` in `workflow_stages` (or `ad-hoc-review`) |
| `content_type` | `msv` / `ai-in-s2p` / `industry-specific` / `ad-hoc` / `geo` / `seo` |
| `phase` | `1` (informational) or `2` (commercial/GEO/SEO) |
| `funnel` | `TOFU` / `MOFU` / `BOFU` |
| `revision_count` | Increments on each NS submit |
| `deliverable_ext` | Set on upload; enables PDF/DOCX round-trip. Defaults to `"html"` |
| `publishing.launch_date` | Date Jovana records as the actual publish date (`"YYYY-MM-DD"`). This is what the Status Report CSV uses for date filtering — not the internal approval timestamp |
| `publishing.live_url` | Live URL; joins the piece to its Search Console `performanceData` record via URL slug |
| `status_history` | Append-only log of `{ stage, ts, by }`. Stored UTC, displayed US Eastern |
| `brief_files` | Array of uploaded brief file objects |

### piece fields (Phase 2)

Phase 2 pieces carry additional fields:

```json
{
  "id": "p2-geo-jaggaer-vs-coupa",
  "title": "Jaggaer Vs Coupa",
  "content_type": "geo",
  "phase": 2,
  "tier": "GEO Tier 1 (JAGGAER vs Competitor)",
  "publish_day": "Tue",
  "planned_publish_date": "Aug 26, 2026"
}
```

### team, feedback, performanceData, workflow_stages, notifications

Identical to v3.8 — see §3 of the previous README version or the schema inline in `project.json`.

---

## 4. Phase 2 Data Model

Phase 2 introduces a parallel programme of 64 pieces (GEO, SEO, BOFU) running alongside Phase 1.

### Control fields in project.json

| Field | Values | Written by |
|---|---|---|
| `active_phase` | `1` or `2` | Phase toggle in sidebar |
| `phase2_active_month` | `"p2-month-1"` | Phase 2 month selector |

### phase2-reference.json

A separate file (`config/phase2-reference.json`) holds 13 reference tabs (keyword lists, briefs, schedules, etc.) shown in the **P2 Reference** sidebar link. It is read-only from the app; never written at runtime. Kept separate from `project.json` to limit file size on each save.

### Phase 2 routing

Phase 2 is bookmarkable at `/tracker/phase2`. The app detects this URL on load and sets `active_phase = 2`. Navigation between phases uses `window.history.pushState` and a `popstate` listener. **`<base href="/">` in `index.html` is the critical prerequisite** — without it, hard-refreshing at `/tracker/phase2` causes 404s on all relative script paths.

### Phase 2 sync calendar

`phase2.jsx` (`Phase2SyncPanel`) and `phase2_logic.js` handle a one-way sync from an `.xlsx` workbook (the Phase 2 topics/keywords master) into `project.json`. The sync:
- Refreshes the P2 Reference panel content
- Updates piece titles, keywords, and schedule dates
- Never overwrites status, feedback, or uploaded file references

SheetJS is loaded via CDN in `index.html` for client-side `.xlsx` parsing.

### Phase 2 categories in sidebar

Phase 2 uses `PillarNav` components for its three categories (GEO / SEO / BOFU), collapsible by click on the category header. Sub-clusters are weekly buckets (e.g. `Week 1 · Aug 25-29`). The sidebar shows `P01 GEO`, `P02 SEO`, `P03 BOFU` labels with `approved/total` counts.

---

## 5. Workflow Stages

Current live funnel (from `project.workflow_stages`):

| Stage `id` | Actor | Meaning |
|---|---|---|
| `not-started` | Jaggaer | Brief not yet uploaded |
| `stage-nq11b` | person: m-ny8dy, m-pifrn | SME topic confirmation before brief |
| `brief-uploaded` | NS + Jaggaer | Brief uploaded; NS begins writing |
| `writing` | NS | NS submits draft to next reviewer |
| `marketing-review` | person: abhishek, m-ny8dy, m-pifrn | SEO / marketing review ("Abhishek and Visnja Review") |
| `ed-review` | person: m-ed01 | JAGGAER content review |
| `approved` | — | Approved by JAGGAER; ready to publish |
| `live` | NS + Jaggaer | Published — the true terminal state |

**Current review chain:** NS upload → SEO review (Abhishek / Visnja) → content review → `approved` → `live`.

> **`live` is a distinct post-approval stage.** `approved` means "signed off, not yet published"; `live` means "actually published." This separation drives the Status Report's *Published* vs *To publish* buckets.

> **Stale `robert-review` fallback constants remain in `admin.jsx` and `api/digest.js`** — inert at runtime, flagged for cleanup in §14.

**Ad-Hoc Articles** use a separate `ad-hoc-review` stage (simplified two-stage: NS submit → Jaggaer review → approved). This stage deliberately lives **outside** `project.workflow_stages` so it doesn't shift the indices of the main funnel — every component carries an explicit patch for it (`getAdHocReviewStage`).

---

## 6. Content Type Model

| Type | ID | Description |
|---|---|---|
| MSV-driven | `msv` | Broad horizontal, high-search-volume procurement terms |
| AI in S2P | `ai-in-s2p` | Claude + S2P searches; user journey mapped (Path 1/2/3) |
| Industry-specific | `industry-specific` | Vertical, sector-explicit; eBooks and whitepapers |
| Ad-Hoc | `ad-hoc` | One-off pieces outside any cluster/pillar; simplified two-stage review |
| GEO | `geo` | Phase 2 generative-engine-optimised content (listicles, comparisons, alternatives) |
| SEO | `seo` | Phase 2 keyword-targeted informational content |

---

## 7. Publishing Sequence

Four-week sequence for Month 1, driven by `project.schedule`:

| Week | Goal | Clusters |
|---|---|---|
| **Week 1** | Capture Claude + S2P and tariff search traffic | AI in S2P C1 · DM C1: Tariff & Trade |
| **Week 2** | Convert Path 2 users; rank before EU AI Act peaks | AI in S2P C2+C3 · PS C1+C2: EU AI Act + E-Invoicing |
| **Week 3** | Build authority on supply-chain risk and HE governance | DM C2+C3 · HE C1+C2 |
| **Week 4** | Convert audiences to platform-evaluation intent | AI in S2P C4 · DM C4 · PS C3 · HE C3 |

Phase 2 GEO pieces publish Mon–Fri across four weeks beginning Aug 25, 2026 (schedule encoded in each piece's `planned_publish_date` and `publish_day` fields).

---

## 8. File-by-File Reference

### index.html
App shell. Loads React 18 + Babel Standalone from CDN, the Noto Sans / Playfair Display / JetBrains Mono webfonts, then each `.jsx` file as a Babel-transpiled `<script type="text/babel">` in dependency order. `login.jsx` loads first. Contains `<base href="/">` — **do not remove**; it is required for hard-refresh at `/tracker/phase2` to resolve relative script paths correctly. Also loads SheetJS via CDN for Phase 2 `.xlsx` calendar sync.

```js
window.__CONFIG__ = { GITHUB_REPO: "ns-adiraghavan/jaggaer-ns-tracker" };
```

### sidebar.jsx
Left nav with a **By Pillar / By Type** toggle (Phase 1) or **GEO / SEO / BOFU** category nav (Phase 2). In By Type mode, the category label area sets the tracker filter and the chevron (›/▾) toggles the piece list expand/collapse independently — these are two separate controls. Exposes `window.Sidebar`, `window.computeStats`.

### tracker.jsx
Main content area + all review machinery. Exposes `window.Tracker`, `window.CT_DISPLAY`, `window.NS_syncWorkflow`, `window.CsvSyncPanel`, `window.projectToCsv`. Holds the `STATUS_META` / `DEFAULT_WORKFLOW_STAGES` fallback stage definitions (must be kept in sync with `project.workflow_stages`).

Key components: `DrawerOverlay`, `UploadPanel`, `ReplaceDraftPanel`, `BriefUploadPanel`, `ReviewPanel`, `PreviewPanel`, `AnnotatePanel`, `HistoryPanel`, `CsvSyncPanel`, `AIPlaygroundPanel`.

### weekly-report.jsx
**Status Report** tab. Exposes `window.WeeklyReportPanel`. KPI strip: Published to date · Published last week · To publish this week · Awaiting JAGGAER review · Awaiting Netscribes.

`StatusExportBar` handles the CSV export. **Date filtering uses `publishing.launch_date`** (the date Jovana enters when publishing) rather than the internal approval timestamp. This ensures the exported date window matches the actual publication calendar. The "Copy titles + links" button exports all pieces with live URLs regardless of date range; the download CSV respects the From/To range filter.

### performance.jsx
**Search Performance** tab. Jaggaer users (or Admin) upload a GSC `.xlsx` per piece. Metrics windowed to trailing three months from go-live date. Exposes `window.PerformancePanel`, `window.NS_perfSlug`.

### phase2.jsx
Holds three components exported to `window`:

- **`CommentsPanel`** — full comment history view across all pieces, filterable by phase. Scrollable (`overflowY: auto, height: 100%`). Shows up to 6 comments per piece inline; click a piece to open its review drawer.
- **`Phase2ReferencePanel`** — 13-tab reference panel loaded from `config/phase2-reference.json`.
- **`Phase2SyncPanel`** — admin-only `.xlsx` calendar sync UI (reads from Phase 2 workbook, diffs against current project state, previews and applies changes).

### phase2_logic.js
Client-side `.xlsx` parse logic used by `Phase2SyncPanel`. Reads the Phase 2 topics/keywords workbook via SheetJS and builds a diff against the current `project.json`. Never overwrites status, feedback, or uploaded files.

### app.jsx
Root component. Hydrates from GitHub on load, falls back to `MOCK_PROJECT` on error, debounced auto-save (1.5 s) on state change. Phase 2 is bookmarkable at `/tracker/phase2` — detected from `window.location.pathname` on load and maintained via `history.pushState` + `popstate`. The `active_phase` toggle in the sidebar calls `setActivePhase()`, which updates both React state and the URL. `popstate` (browser back/forward) syncs phase state back without re-hydrating.

### api/github.js
GitHub Contents API proxy. Reads `GITHUB_TOKEN` + `GITHUB_REPO` from `process.env`. Body limit 10 MB for PDF deliverable uploads.

### api/anthropic.js
Anthropic `/v1/messages` proxy. Reads `ANTHROPIC_API_KEY`. Live.

### api/perf-xlsx.js
Parses a GSC `.xlsx` export (SheetJS). Returns `{ url, url_key, date_range, summary, timeseries, top_queries, countries, devices }` keyed by URL slug.

### api/digest.js
Daily digest email. Vercel Cron at 12:30 UTC (6 pm IST). Reads `project.workflow_stages` to categorise stages dynamically. Stores last-sent state in `config/digest-state.json`.

### api/notify.js
Piece-approval email triggered by **Send to Editors →**. Sends two templates: stakeholder alert to `approved_to`, editors email to `editors_to`.

### api/docx-render.js, api/piece-page.js, api/piece.js, api/_lib/piece-lookup.js, api/api.js
Unchanged from v3.8 — see previous README for detail.

---

## 9. AI Playground

Unchanged from v3.8 — self-contained single-file interactive microsite at `ai-playground.html`. Accessible at `/ai` (no login required) and from within the tracker via the **AI Playground** nav entry.

---

## 10. Build & Local Development

No bundler, no build step. `package.json` exists for Babel CLI validation and serverless deps.

```bash
cd repo-setup
npm install
npx vercel dev   # serves app + api/* locally at http://localhost:3000
```

### Validate JSX before every commit

```bash
cd repo-setup
for f in *.jsx; do
  node_modules/.bin/babel --presets @babel/preset-react "$f" --out-file /dev/null \
    && echo "$f OK" || echo "$f FAILED"
done
```

Use `node_modules/.bin/babel`, not the global `npx babel` — the global command installs babel@5 which does not support optional chaining (`?.`) and will report false errors.

For serverless functions and other plain-JS files: `node --check api/*.js`.

---

## 11. Deployment (Vercel)

1. Push to GitHub at `ns-adiraghavan/jaggaer-ns-tracker`.
2. Import into Vercel.
3. Set **Root Directory** to `repo-setup`.
4. Set **Framework Preset** to **Other** (no build step).
5. Add the environment variables from §12.
6. Deploy.

`vercel.json` rewrites:

| Route | Destination |
|---|---|
| `/ai` | `ai-playground.html` |
| `/demo` | `jai-demo.html` |
| `/piece/:id` | `api/piece-page.js` |
| `/tracker` | `index.html` |
| `/tracker/phase2` | `index.html` |

The `/tracker/phase2` → `index.html` rewrite is what enables hard-refresh at the Phase 2 URL. Combined with `<base href="/">` in `index.html`, this is the complete fix for the refresh-404 issue.

---

## 12. Environment Variables

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Classic PAT, full `repo` scope. **Never in code.** |
| `GITHUB_REPO` | `ns-adiraghavan/jaggaer-ns-tracker` |
| `ANTHROPIC_API_KEY` | Live. Required for the Claude conversation rail. |
| `MAILEROO_API_KEY` | Email delivery. Auth header is `X-Sending-Key`. |
| `APP_URL` | Clean production URL used in digest-email CTA. Optional. |
| `DIGEST_TO` / `EDITORS_TO` | Fallback recipient lists. Admin → Notifications takes priority. |
| `DIGEST_FROM` | Leave unset — defaults to Maileroo shared domain. |

> **Login credentials are not env vars.** The two team passwords are hardcoded in `login.jsx` and ship to the browser. Change them by editing the file directly. See §14, Security note 2.

---

## 13. Email Notifications

Unchanged from v3.8 — two flows (daily digest via Vercel Cron; piece-approval via **Send to Editors →**), both via Maileroo with `X-Sending-Key` auth header.

---

## 14. Maintenance Playbook

1. **Read the real file state before editing.** The repo has stale duplicates and fallback copies. Confirm exact content before touching anything.
2. **Guarded string replacement only.** Python with `assert s.count(old) == 1` before every replace. No rewrites.
3. **Watch for global-scope naming collisions.** Unbundled script-tag architecture — every identifier shares global scope. Name helpers per-module.
4. **Keep the two workflow config copies in sync.** `project.json` is source of truth; `tracker.jsx` (`STATUS_META` / `DEFAULT_WORKFLOW_STAGES`) is the pre-hydration fallback. When you rename a stage in one, rename it in the other.
5. **Never hardcode stage IDs in new UI.** Resolve through `project.workflow_stages` at runtime; patch `ad-hoc-review` via `getAdHocReviewStage()`.
6. **GitHub Contents API needs a fresh SHA on every PUT.** `saveProject` already refreshes and retries once — don't reintroduce a cached SHA.
7. **Validate before delivering:** Babel CLI on every touched `.jsx`, `node --check` on plain JS, then a headless render check.
8. **Don't revert the proxy architecture.** Browser → `/api/*` → external API is deliberate.
9. **Phase 2 routing requires both `vercel.json` and `<base href="/">`** working together. The rewrite makes Vercel serve `index.html` at `/tracker/phase2`; the base tag makes the browser resolve relative script paths from `/` rather than `/tracker/phase2/`. Remove either and hard-refresh breaks.

**Security note 1 — rotate the committed token.** `repo-setup/setup.sh` contains a hardcoded GitHub PAT in plaintext. Rotate it in GitHub → Settings → Developer settings → Personal access tokens, replace with `TOKEN="${GITHUB_TOKEN}"` in `setup.sh`, treat the old token as compromised.

**Security note 2 — the login gate is a soft gate.** The two team passwords are hardcoded in `login.jsx` and shipped to every browser. The gate keeps casual visitors out; the repo's actual write protection is the server-side `GITHUB_TOKEN`. Change passwords by editing `login.jsx`.

**Housekeeping backlog:**
- Remove stale `robert-review` fallback constants in `admin.jsx` and `api/digest.js`.
- Delete stale root-level duplicates: `repo-setup/digest.js`, `repo-setup/notify.js`, `repo-setup/perfxlsx.js`, `repo-setup/weeklyreport.jsx`, `repo-setup/api/perfxlsx.js`.
- Remove unloaded legacy files: `agent-builder.jsx`, `bwc.jsx`, `claude-rail.jsx`, and (once `/demo` retired) `jai-demo.html`.
- Reconcile `tracker.jsx` fallback `marketing-review` label with `project.json`.

---

## 15. Common Tasks — Recipes

### Add a Phase 1 piece / cluster / pillar
Edit `config/project.json` (or use **Admin → Pieces / Pillars & Clusters**). New `status` must match a `workflow_stages` id. No code change.

### Add a Phase 2 piece
Edit `config/project.json` under the appropriate `p2-geo`, `p2-seo`, or `p2-bofu` pillar. Or upload the updated `.xlsx` workbook via **Phase 2 → Upload workbook** (admin) — the sync calendar will diff and apply changes.

### Sync the Phase 2 calendar from the workbook
Admin → switch to **Phase 2** → **Upload workbook (.xlsx)**. The sync refreshes P2 Reference tabs, piece titles, keywords, and dates. Status, feedback, and uploaded files are never overwritten.

### Add a workflow stage or change a reviewer
**Admin → Workflow**, or edit `project.workflow_stages`. If you rename or re-ID a stage, mirror it in `tracker.jsx` (`STATUS_META` / `DEFAULT_WORKFLOW_STAGES`) and update any pieces whose `status` referenced the old id.

### Add a team member / reviewer
Add to `team.ns` or `team.jaggaer` with a unique `id`. Reference in a stage as `"person:{id}"`. Set `"admin": true` for admin mode.

### Export the status report CSV
**Status Report** tab → set the From/To date range → **↓ Download CSV**. The date range filters by `publishing.launch_date` (the date entered when publishing), so the exported window matches the actual publication calendar. To copy all published titles + links with no date filter, use **Copy titles + links**.

### Upload Search Console data
Jaggaer user (or Admin) drops a per-page GSC `.xlsx` on the piece card in the Search Performance tab. The slug from the export must match the piece's `publishing.live_url`; a mismatch is reported, not swallowed.

### Hard-refresh at /tracker/phase2 returns a blank page or 404
Both fixes must be in place: (1) `vercel.json` must contain the `"/tracker/phase2"` → `"/index.html"` rewrite; (2) `index.html` must have `<base href="/">` in `<head>`. If either is missing, restore it.

### Change the login passwords
Edit the two `CREDENTIALS` entries in `repo-setup/login.jsx` and redeploy.

### Get a shareable piece link
Open the piece drawer → **Copy link** (or **Open ↗**). URL is `/piece/:id`; unfurls in Slack/Teams with real title and status.

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

Fresh-SHA-before-PUT is mandatory (see §14.6).

### After a schema migration
Force-trigger the digest once (§13) so `digest-state.json` reseeds with current piece statuses.

---

*Last updated: August 2026, v3.9. Changes from v3.8:*
- *Added **Phase 2** throughout: data model (§4), `p2-geo`/`p2-seo`/`p2-bofu` pillars, `active_phase` + `phase2_active_month` control fields, `phase2-reference.json`, `phase2.jsx`, `phase2_logic.js`.*
- *Documented **Phase 2 routing**: `/tracker/phase2` rewrite in `vercel.json` + `<base href="/">` in `index.html` as the two-part fix for hard-refresh 404s; added recipe and maintenance note.*
- *Documented **CommentsPanel** scroll fix (`overflowY: auto, height: 100%`).*
- *Documented **sidebar category expand/filter decoupling**: chevron toggles expand; label area sets filter. These are now independent controls.*
- *Corrected **Status Report CSV date logic**: `StatusExportBar` now filters and displays by `publishing.launch_date`, not the internal approval timestamp. Added recipe for CSV export.*
- *Documented `phase2-reference.json` as a separate read-only config file (keeps `project.json` lean).*
- *Updated §2 file tree to include `phase2.jsx`, `phase2_logic.js`, `phase2-reference.json`, and the `<base href="/">` note in `index.html`.*
- *Updated §6 content type table to include `geo` and `seo` types.*
- *Updated §7 publishing sequence with Phase 2 GEO schedule.*
- *Noted correct Babel validation tool: `node_modules/.bin/babel`, not global `npx babel` (babel@5 install issue).*
