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

  // Raw PUT — `base64Content` is already base64 of the file's bytes (used for
  // binary deliverables like PDF/DOCX, where wrapping in btoa would corrupt them).
  async function githubPutRaw(path, base64Content, message, sha) {
    const body = { message, content: base64Content, ...(sha ? { sha } : {}) };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
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

  // Fetch an existing file's SHA (needed to overwrite). Returns undefined if absent.
  async function fetchSha(path) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const r = await fetch(`/api/github?path=${encodeURIComponent(path)}`, { signal: controller.signal });
      clearTimeout(timer);
      if (r.ok) { const data = await r.json(); return data.sha; }
    } catch (e) { /* not found / timeout — proceed without */ }
    return undefined;
  }

  // Normalises the upload payload coming from the UI. Accepts either the new
  // { ext, binary, b64|text, name } object or a legacy plain string.
  function normaliseDeliverable(payload) {
    if (payload && typeof payload === "object") {
      return {
        ext: (payload.ext || "html").toLowerCase(),
        binary: !!payload.binary,
        b64: payload.b64 || null,
        text: payload.text != null ? payload.text : null,
        name: payload.name || null,
      };
    }
    return { ext: "html", binary: false, b64: null, text: String(payload || ""), name: null };
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
      const project = JSON.parse(content);
      if (!Array.isArray(project.playground_comments)) project.playground_comments = [];
      return { project, source: "github", sha: meta.sha };
    } catch (e) {
      console.warn("[NS_API] GitHub load failed, using mock data:", e.message);
      const project = JSON.parse(JSON.stringify(window.MOCK_PROJECT));
      if (!Array.isArray(project.playground_comments)) project.playground_comments = [];
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
    const d = normaliseDeliverable(file);
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${nextRev}.${d.ext}`;
    try {
      const sha = await fetchSha(path); // new path normally — but be safe
      let result;
      if (d.binary && d.b64) {
        result = await githubPutRaw(path, d.b64, `upload ${piece.id} v${nextRev} (${d.ext})`, sha);
      } else {
        const contentString =
          `<!-- uploaded by ${author} at ${new Date().toISOString()} -->\n` +
          `<!-- piece: ${piece.title} -->\n` + (d.text || "");
        result = await githubPutFile(path, contentString, `upload ${piece.id} v${nextRev}`, sha);
      }
      return { ok: true, path, ext: d.ext, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Upload failed:", e.message);
      return { ok: false, path, error: e.message };
    }
  }

  async function replaceDeliverable(piece, cluster, pillar, month, file, author) {
    const rev = piece.revision_count || 1;
    const d = normaliseDeliverable(file);
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/deliverable-v${rev}.${d.ext}`;
    try {
      const sha = await fetchSha(path); // exists at this rev — overwrite needs SHA
      let result;
      if (d.binary && d.b64) {
        result = await githubPutRaw(path, d.b64, `replace ${piece.id} v${rev} (${d.ext})`, sha);
      } else {
        const contentString =
          `<!-- replaced by ${author} at ${new Date().toISOString()} -->\n` +
          `<!-- piece: ${piece.title} -->\n` + (d.text || "");
        result = await githubPutFile(path, contentString, `replace ${piece.id} v${rev}`, sha);
      }
      return { ok: true, path, ext: d.ext, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Replace failed:", e.message);
      return { ok: false, path, error: e.message };
    }
  }

  // Whitepaper dual-upload: PDF (required) + HTML companion (optional).
  // slot is "pdf" or "html" — used directly as the file extension so both land
  // at the same revision path: deliverable-v{nextRev}.pdf / deliverable-v{nextRev}.html.
  async function uploadWhitepaperFile(piece, clusterId, pillarId, month, payload, slot, author) {
    const nextRev = (piece.revision_count || 0) + 1;
    const d = normaliseDeliverable(payload);
    const ext = slot === "html" ? "html" : "pdf";
    const path = `content/${month}/${pillarId}/${clusterId}/${piece.id}/deliverable-v${nextRev}.${ext}`;
    try {
      const sha = await fetchSha(path);
      let result;
      if (ext === "pdf" || (d.binary && d.b64)) {
        result = await githubPutRaw(path, d.b64, `upload ${piece.id} v${nextRev} (${ext})`, sha);
      } else {
        const contentString =
          `<!-- uploaded by ${author} at ${new Date().toISOString()} -->\n` +
          `<!-- piece: ${piece.title} -->\n` + (d.text || "");
        result = await githubPutFile(path, contentString, `upload ${piece.id} v${nextRev} (${ext})`, sha);
      }
      return { ok: true, path, ext, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Whitepaper upload failed:", e.message);
      return { ok: false, path, error: e.message };
    }
  }

  // Brief / keyword attachments (Jaggaer). Reads the File here and commits the
  // raw bytes (base64) so PDFs/DOCX round-trip intact.
  async function uploadBriefFile(piece, cluster, pillar, month, file, author) {
    const safeName = String(file.name || "brief").replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `content/${month}/${pillar}/${cluster}/${piece.id}/brief/${safeName}`;
    try {
      const b64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onerror = rej;
        reader.onload = () => { const s = String(reader.result); res(s.slice(s.indexOf(",") + 1)); };
        reader.readAsDataURL(file);
      });
      const sha = await fetchSha(path);
      const result = await githubPutRaw(path, b64, `brief ${piece.id}: ${safeName}`, sha);
      return { ok: true, path, mock: !!result.mock };
    } catch (e) {
      console.warn("[NS_API] Brief upload failed:", e.message);
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
    uploadPieceDeliverable,
    replaceDeliverable,
    uploadWhitepaperFile,
    uploadBriefFile,
    listBuildWithClaude,
    askClaude,
    isRealGithub,
    isRealAnthropic,
  };
})();
