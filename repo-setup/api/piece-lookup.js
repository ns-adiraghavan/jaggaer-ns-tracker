// api/_lib/piece-lookup.js
// Shared logic for the piece endpoints. Both /api/piece (JSON) and
// /api/piece-page (server-rendered HTML) use this so the lookup and the
// deliverable-version resolution can never drift between them.
//
// Not a route itself — the leading underscore in the folder name keeps
// Vercel from treating it as a serverless function.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO || "ns-adiraghavan/jaggaer-ns-tracker";
const BASE_URL     = `https://api.github.com/repos/${GITHUB_REPO}/contents`;

export async function ghGet(path) {
  const r = await fetch(`${BASE_URL}/${encodeURI(path)}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ns-jaggaer-tracker",
    },
  });
  if (!r.ok) {
    const e = new Error(`GitHub ${r.status}: ${path}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// Does a file exist at this repo path? (cheap existence check)
async function ghExists(path) {
  const r = await fetch(`${BASE_URL}/${encodeURI(path)}`, {
    method: "HEAD",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ns-jaggaer-tracker",
    },
  });
  return r.ok;
}

export async function loadProject() {
  const projData = await ghGet("config/project.json");
  return JSON.parse(
    Buffer.from(projData.content.replace(/\n/g, ""), "base64").toString("utf-8")
  );
}

// Find a piece by id across all pillars/clusters.
export function findPiece(project, id) {
  for (const pillar of (project.pillars || [])) {
    for (const cluster of (pillar.clusters || [])) {
      for (const piece of (cluster.pieces || [])) {
        if (piece.id === id) return { piece, cluster, pillar };
      }
    }
  }
  return { piece: null, cluster: null, pillar: null };
}

// Resolve the latest deliverable. revision_count is the expected version, but
// if that exact file is missing we walk DOWN (n-1, n-2 …) so a drifted count
// degrades to the newest file that actually exists instead of a dead "No
// deliverable" state. Returns { content, ext, filename, path, version } | null.
export async function resolveDeliverable(piece, pillar, cluster, monthId) {
  const rev = piece.revision_count || 0;
  if (rev < 1) return null;

  const ext = (piece.deliverable_ext || ".html").replace(/^\./, "").toLowerCase();
  const dir = `content/${monthId}/${pillar.id}/${cluster.id}/${piece.id}`;

  for (let v = rev; v >= 1; v--) {
    const path = `${dir}/deliverable-v${v}.${ext}`;
    try {
      const fileData = await ghGet(path);
      return {
        content: fileData.content, // base64 (may contain newlines)
        ext,
        filename: `deliverable-v${v}.${ext}`,
        path,
        version: v,
      };
    } catch (e) {
      if (e.status === 404) continue; // try the previous version
      throw e;                        // real error — surface it
    }
  }
  return null;
}

// Assemble the full payload the piece page/API return.
export async function buildPiecePayload(id) {
  const project = await loadProject();
  const monthId = project.active_month || "month-1";
  const { piece, cluster, pillar } = findPiece(project, id);
  if (!piece) return { notFound: true };

  const deliverable = await resolveDeliverable(piece, pillar, cluster, monthId);

  return {
    piece,
    cluster:  { id: cluster.id, label: cluster.label },
    pillar:   { id: pillar.id,  label: pillar.label },
    monthId,
    deliverable,
    workflow_stages: project.workflow_stages || [],
    team: project.team || { ns: [], jaggaer: [] },
  };
}
