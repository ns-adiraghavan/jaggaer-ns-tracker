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

  // Upload an SEO brief or keyword file attached by Jaggaer.
  // Supports any file type (PDF, DOCX, XLSX, etc) — reads as base64.
  // Path: content/{month}/{pillar}/{cluster}/{pieceId}/brief-v{n}.{ext}
  async function uploadBriefFile(piece, cluster, pillar, month, file, author) {
    const ext = file.name.split(".").pop().toLowerCase() || "bin";
    const existing = (piece.brief_files || []).length;
    const vNum = existing + 1;
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/brief-v${vNum}.${ext}`;

    // Read as base64 (works for binary PDF/DOCX and text alike)
    const base64Content = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        // readAsDataURL returns "data:application/pdf;base64,XXXX" — strip the prefix
        const result = r.result;
        const comma = result.indexOf(",");
        res(comma >= 0 ? result.slice(comma + 1) : result);
      };
      r.onerror = rej;
      r.readAsDataURL(file);
    });

    // PUT directly with pre-encoded base64 — skip the btoa wrapper in githubPutFile
    const body = {
      message: `brief: attach ${file.name} to ${piece.id}`,
      content: base64Content,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
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
      return { ok: true, path, filename: file.name, ext, vNum };
    } catch (e) {
      clearTimeout(timer);
      console.warn("[NS_API] Brief upload failed:", e.message);
      return { ok: false, path, filename: file.name, error: e.message };
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
      console.warn("[NS_API] Upload failed:", e.message);
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
    uploadBriefFile,
    uploadPieceDeliverable,
    listBuildWithClaude,
    askClaude,
    isRealGithub,
    isRealAnthropic,
  };
})();
