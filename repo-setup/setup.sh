#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Jaggaer × NS Tracker — GitHub repo initialiser
# Run once from any terminal: bash setup.sh
# ─────────────────────────────────────────────────────────────

TOKEN="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"
REPO="ns-adiraghavan/jaggaer-ns-tracker"
BASE="https://api.github.com/repos/${REPO}/contents"

push_file() {
  local path="$1"
  local content="$2"
  local message="$3"
  local encoded=$(echo -n "$content" | base64 | tr -d '\n')

  # Check if file already exists (need its SHA to update)
  local sha=$(curl -s -H "Authorization: Bearer ${TOKEN}" \
    "${BASE}/${path}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)

  local body
  if [ -n "$sha" ]; then
    body="{\"message\":\"${message}\",\"content\":\"${encoded}\",\"sha\":\"${sha}\"}"
  else
    body="{\"message\":\"${message}\",\"content\":\"${encoded}\"}"
  fi

  local status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${BASE}/${path}" \
    -d "$body")

  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    echo "  ✓  ${path}"
  else
    echo "  ✗  ${path} (HTTP ${status})"
  fi
}

echo ""
echo "Jaggaer × NS Tracker — repo setup"
echo "Repo: ${REPO}"
echo "────────────────────────────────────"

# ── config/project.json ───────────────────────────────────────
echo ""
echo "→ Pushing config..."
push_file "config/project.json" "$(cat config/project.json)" "init: project.json with Month 1 data"

# ── README ────────────────────────────────────────────────────
echo ""
echo "→ Pushing README..."
README="# Jaggaer × Netscribes Tracker

Backend repo for the NS × Jaggaer project tracker app.

## Structure

\`\`\`
/config/
  project.json          ← pillars, clusters, pieces, team, feedback
/content/
  /month-1/             ← deliverable HTML files by pillar/cluster/piece
/build-with-claude/     ← Claude-powered apps (read-only from tracker)
\`\`\`

## How it works

The tracker app reads \`config/project.json\` on load. All status changes,
feedback, and uploads write back here via the GitHub Contents API.

Do not edit project.json manually while the tracker is in active use —
changes may be overwritten by the app's debounced save."

push_file "README.md" "$README" "init: README"

# ── Placeholder folders (GitHub needs a file to create a folder) ──
echo ""
echo "→ Creating content folder structure..."

PLACEHOLDER="# placeholder — deliverables upload here via the tracker app"

push_file "content/month-1/.gitkeep" "$PLACEHOLDER" "init: content/month-1 folder"
push_file "build-with-claude/.gitkeep" "$PLACEHOLDER" "init: build-with-claude folder"

# Individual BWC app folders
for app in contract-analyser rfp-generator supplier-recommender spend-classifier tender-summariser; do
  push_file "build-with-claude/${app}/README.md" "# ${app}" "init: ${app} folder"
done

echo ""
echo "────────────────────────────────────"
echo "Done. Repo is ready at:"
echo "https://github.com/${REPO}"
echo ""
echo "Next: plug these into the tracker app (index.html __CONFIG__ block):"
echo "  GITHUB_TOKEN:  ${TOKEN}"
echo "  GITHUB_REPO:   ${REPO}"
echo "  ANTHROPIC_KEY: sk-ant-... (add when purchased)"
echo ""
