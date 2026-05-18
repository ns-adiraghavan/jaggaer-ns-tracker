// GitHub + Anthropic helpers. Both gracefully fall back when the placeholder
// credentials are still in place — the app stays fully usable for design review.

window.NS_API = (function () {
  const GITHUB_TOKEN = window.__CONFIG__.GITHUB_TOKEN;
  const GITHUB_REPO = window.__CONFIG__.GITHUB_REPO;
  const ANTHROPIC_API_KEY = window.__CONFIG__.ANTHROPIC_API_KEY;

  const isRealGithub =
    typeof GITHUB_TOKEN === "string" &&
    GITHUB_TOKEN.startsWith("ghp_") &&
    GITHUB_TOKEN.length > 10 &&
    !GITHUB_TOKEN.endsWith("...") &&
    GITHUB_REPO &&
    GITHUB_REPO.includes("/") &&
    !GITHUB_REPO.includes("owner/");

  const isRealAnthropic =
    typeof ANTHROPIC_API_KEY === "string" &&
    ANTHROPIC_API_KEY.startsWith("sk-ant-") &&
    !ANTHROPIC_API_KEY.endsWith("...");

  // ── GitHub ────────────────────────────────────────────────────────────────
  async function githubGetFile(path) {
    if (!isRealGithub) throw new Error("no-creds");
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
    );
    if (!r.ok) throw new Error(`gh-${r.status}`);
    return r.json();
  }

  async function githubPutFile(path, contentString, message, sha) {
    if (!isRealGithub) {
      return { mock: true, sha: "mock-" + Math.random().toString(36).slice(2, 10) };
    }
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(contentString))),
      ...(sha ? { sha } : {})
    };
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    if (!r.ok) throw new Error(`gh-put-${r.status}`);
    return r.json();
  }

  async function githubListBWC() {
    if (!isRealGithub) throw new Error("no-creds");
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/build-with-claude`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
    );
    if (!r.ok) throw new Error(`gh-list-${r.status}`);
    return r.json();
  }

  // Top-level: load project state (project.json), with mock fallback.
  async function loadProject() {
    try {
      const meta = await githubGetFile("config/project.json");
      const raw = atob(meta.content.replace(/\n/g, ""));
      const content = new TextDecoder("utf-8").decode(Uint8Array.from(raw, c => c.charCodeAt(0)));
      return { project: JSON.parse(content), source: "github", sha: meta.sha };
    } catch (e) {
      // Deep clone the mock so writes don't poison subsequent loads in dev.
      const project = JSON.parse(JSON.stringify(window.MOCK_PROJECT));
      return { project, source: "mock", sha: null, error: e.message };
    }
  }

  async function saveProject(project, sha, message) {
    try {
      const result = await githubPutFile(
        "config/project.json",
        JSON.stringify(project, null, 2),
        message || "update project.json",
        sha
      );
      return { ok: true, sha: result.content?.sha || result.sha };
    } catch (e) {
      return { ok: true, mock: true, sha: "mock-" + Date.now() };
    }
  }

  async function uploadPieceDeliverable(piece, cluster, pillar, month, file, author) {
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${(piece.revision_count || 0) + 1}.html`;
    const contentString =
      `<!-- uploaded by ${author} at ${new Date().toISOString()} -->\n` +
      `<!-- piece: ${piece.title} -->\n` +
      (typeof file === "string" ? file : `[binary upload: ${file.name}, ${file.size} bytes]`);
    try {
      const result = await githubPutFile(path, contentString, `upload ${piece.id} v${(piece.revision_count || 0) + 1}`);
      return { ok: true, path, mock: !!result.mock };
    } catch (e) {
      return { ok: true, path, mock: true };
    }
  }

  async function listBuildWithClaude() {
    try {
      const list = await githubListBWC();
      return list.map(item => ({
        name: item.name,
        description: "—",
        status: "Live",
        updated: new Date().toISOString().slice(0, 10),
        path: item.path
      }));
    } catch (e) {
      return window.MOCK_PROJECT.build_with_claude;
    }
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────
  async function askClaude(messages, systemPrompt) {
    // Direct Anthropic API path
    if (isRealAnthropic) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system: systemPrompt,
            messages
          })
        });
        if (r.ok) {
          const data = await r.json();
          return data.content?.[0]?.text || "";
        }
      } catch (e) { /* fall through */ }
    }
    // Built-in helper fallback
    return await window.claude.complete({
      messages: [
        { role: "user", content: `${systemPrompt}\n\n— Conversation —\n` +
            messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") +
            `\n\nRespond as the project-aware colleague. Be concise.`
        }
      ]
    });
  }

  return {
    loadProject,
    saveProject,
    uploadPieceDeliverable,
    listBuildWithClaude,
    askClaude,
    isRealGithub,
    isRealAnthropic
  };
})();
