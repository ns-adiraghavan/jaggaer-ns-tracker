// GitHub + Anthropic helpers — all calls go through Vercel serverless proxies.
// No tokens or API keys are exposed in the browser.

window.NS_API = (function () {
  const GITHUB_REPO = window.__CONFIG__.GITHUB_REPO;

  // We're always "real" when deployed — proxies handle credential validation.
  // In local dev without the proxy running, calls will 404 and fall back to mock.
  const isRealGithub = !!(GITHUB_REPO && GITHUB_REPO.includes("/") && !GITHUB_REPO.includes("owner/"));
  const isRealAnthropic = true; // proxy decides at runtime

  // ── GitHub proxy helpers ──────────────────────────────────────────────────
  async function githubGetFile(path) {
    const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`);
    if (!r.ok) throw new Error(`gh-${r.status}`);
    return r.json();
  }

  async function githubPutFile(path, contentString, message, sha) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(contentString))),
      ...(sha ? { sha } : {}),
    };
    const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`gh-put-${r.status}: ${errBody}`);
    }
    return r.json();
  }

  async function githubListFolder(path) {
    const r = await fetch(`/api/github?path=${encodeURIComponent(path)}&list=1`);
    if (!r.ok) throw new Error(`gh-list-${r.status}`);
    return r.json();
  }

  // ── Project load / save ───────────────────────────────────────────────────
  async function loadProject() {
    try {
      const meta = await githubGetFile("config/project.json");
      const raw = atob(meta.content.replace(/\n/g, ""));
      const content = new TextDecoder("utf-8").decode(Uint8Array.from(raw, c => c.charCodeAt(0)));
      return { project: JSON.parse(content), source: "github", sha: meta.sha };
    } catch (e) {
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
      const newSha = result.content?.sha;
      if (!newSha) throw new Error("no-sha-in-response");
      return { ok: true, sha: newSha };
    } catch (e) {
      return { ok: false, error: e.message };
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
      return { ok: false, path, error: e.message };
    }
  }

  async function listBuildWithClaude() {
    try {
      const list = await githubListFolder("build-with-claude");
      return list.map(item => ({
        name: item.name,
        description: "—",
        status: "Live",
        updated: new Date().toISOString().slice(0, 10),
        path: item.path,
      }));
    } catch (e) {
      return window.MOCK_PROJECT.build_with_claude;
    }
  }

  // ── Anthropic proxy ───────────────────────────────────────────────────────
  async function askClaude(messages, systemPrompt) {
    try {
      const r = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        return data.content?.[0]?.text || "";
      }
    } catch (e) { /* fall through to built-in */ }

    // Built-in helper fallback (claude.ai artifact context only)
    if (typeof window.claude !== "undefined") {
      return await window.claude.complete({
        messages: [
          { role: "user", content: `${systemPrompt}\n\n— Conversation —\n` +
              messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") +
              `\n\nRespond as the project-aware colleague. Be concise.`
          }
        ]
      });
    }

    return "Claude is not available. Add ANTHROPIC_API_KEY to Vercel environment variables.";
  }

  return {
    loadProject,
    saveProject,
    uploadPieceDeliverable,
    listBuildWithClaude,
    askClaude,
    isRealGithub,
    isRealAnthropic,
  };
})();
