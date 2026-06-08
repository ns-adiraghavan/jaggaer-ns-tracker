// GitHub + Anthropic helpers — all calls go through Vercel serverless proxies.
// No tokens or API keys are exposed in the browser.

window.NS_API = (function () {
  const GITHUB_REPO = window.__CONFIG__.GITHUB_REPO;

  const isRealGithub = !!(GITHUB_REPO && GITHUB_REPO.includes("/") && !GITHUB_REPO.includes("owner/"));
  const isRealAnthropic = true;

  // ── GitHub proxy helpers ──────────────────────────────────────────────────
  // 5-second timeout on every GitHub call — if the Vercel function doesn't
  // respond in time (cold start, env misconfiguration) we fall back to mock
  // immediately rather than hanging the loading screen forever.
  async function githubGetFile(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`gh-${r.status}`);
      return r.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  async function githubPutFile(path, contentString, message, sha) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(contentString))),
      ...(sha ? { sha } : {}),
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        const errBody = await r.text();
        throw new Error(`gh-put-${r.status}: ${errBody}`);
      }
      return r.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  async function githubListFolder(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const r = await fetch(`/api/github?path=${encodeURIComponent(path)}&list=1`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`gh-list-${r.status}`);
      return r.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ── Project load / save ───────────────────────────────────────────────────
  async function loadProject() {
    try {
      const meta = await githubGetFile("config/project.json");
      const raw = atob(meta.content.replace(/\n/g, ""));
      const content = new TextDecoder("utf-8").decode(
        Uint8Array.from(raw, c => c.charCodeAt(0))
      );
      return { project: JSON.parse(content), source: "github", sha: meta.sha };
    } catch (e) {
      console.warn("[NS_API] GitHub load failed, using mock data:", e.message);
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
      console.warn("[NS_API] GitHub save failed:", e.message);
      return { ok: false, error: e.message };
    }
  }

  async function uploadPieceDeliverable(piece, cluster, pillar, month, file, author) {
    const nextRev = (piece.revision_count || 0) + 1;
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${nextRev}.html`;
    const contentString =
      `<!-- uploaded by ${author} at ${new Date().toISOString()} -->\n` +
      `<!-- piece: ${piece.title} -->\n` +
      (typeof file === "string" ? file : `[binary upload: ${file.name}, ${file.size} bytes]`);
    try {
      // Fetch SHA with a longer timeout — file may be large (base64 HTML via GitHub API)
      let sha;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          sha = data.sha;
          console.log(`[NS_API] deliverable-v${nextRev} exists, using SHA`, sha?.slice(0, 8));
        } else {
          console.log(`[NS_API] deliverable-v${nextRev} not found (${r.status}), creating new`);
        }
      } catch (e) {
        console.log(`[NS_API] SHA fetch skipped (${e.message}), proceeding without`);
        sha = undefined;
      }
      const result = await githubPutFile(path, contentString, `upload ${piece.id} v${nextRev}`, sha);
      return { ok: true, path, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Upload failed:", e.message);
      return { ok: false, path, error: e.message };
    }
  }

  async function replaceDeliverable(piece, cluster, pillar, month, file, author) {
    const rev = piece.revision_count || 1;
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${rev}.html`;
    const contentString =
      `<!-- replaced by ${author} at ${new Date().toISOString()} -->\n` +
      `<!-- piece: ${piece.title} -->\n` +
      (typeof file === "string" ? file : `[binary upload: ${file.name}, ${file.size} bytes]`);
    try {
      // File exists at this rev — fetch SHA with longer timeout for large HTML files
      let sha;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          sha = data.sha;
          console.log(`[NS_API] replace: found SHA`, sha?.slice(0, 8));
        }
      } catch (e) {
        console.log(`[NS_API] replace: SHA fetch skipped (${e.message})`);
        sha = undefined;
      }
      const result = await githubPutFile(path, contentString, `replace ${piece.id} v${rev}`, sha);
      return { ok: true, path, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Replace failed:", e.message);
      return { ok: false, path, error: e.message };
    }
  }


  async function listBuildWithClaude() {
    try {
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
    } catch (e) { /* fall through */ }

    if (typeof window.claude !== "undefined") {
      return await window.claude.complete({
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n— Conversation —\n` +
              messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") +
              `\n\nRespond as the project-aware colleague. Be concise.`,
          },
        ],
      });
    }

    return "Claude is not available. Add ANTHROPIC_API_KEY to Vercel environment variables.";
  }

  return {
    loadProject,
    saveProject,
    uploadPieceDeliverable,
    replaceDeliverable,
    listBuildWithClaude,
    askClaude,
    isRealGithub,
    isRealAnthropic,
  };
})();
