// style-guide.jsx — Style Guide inline viewer + admin uploader
// Renders the docx via /api/docx-render (mammoth on the server).
// File lives at: config/style-guide.docx in the repo.

const { useState: useSGState, useEffect: useSGEffect, useRef: useSGRef } = React;

const SG_PATH = "config/style-guide.docx";
const SG_FILENAME = "Jaggaer-Style-Guide.docx";
const FONT = { fontFamily: "Noto Sans, sans-serif" };

// Injected into the iframe srcdoc to style the rendered docx HTML
const DOC_CSS = `
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 14px;
    line-height: 1.75;
    color: #1a2535;
    max-width: 740px;
    margin: 0 auto;
    padding: 40px 48px 80px;
    background: #fff;
  }
  h1 { font-family: 'Georgia', serif; font-size: 1.6rem; font-weight: 700; color: #0f1923; margin: 2rem 0 0.6rem; border-bottom: 2px solid #e8e3da; padding-bottom: 0.4rem; }
  h2 { font-family: 'Georgia', serif; font-size: 1.25rem; font-weight: 700; color: #1a2535; margin: 1.6rem 0 0.5rem; }
  h3 { font-family: 'Georgia', serif; font-size: 1.05rem; font-weight: 700; color: #1a2535; margin: 1.3rem 0 0.4rem; }
  h4 { font-family: 'Georgia', serif; font-size: 0.95rem; font-weight: 700; color: #444; margin: 1rem 0 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
  p  { margin: 0 0 0.85rem; }
  ul, ol { padding-left: 1.6rem; margin: 0 0 0.85rem; }
  li { margin-bottom: 0.3rem; }
  strong { font-weight: 700; color: #0f1923; }
  em { font-style: italic; }
  u  { text-decoration-color: #c8401a; text-underline-offset: 2px; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0 1.2rem; font-size: 13px; }
  th { background: #f0ede6; font-weight: 700; text-align: left; padding: 8px 12px; border: 1px solid #d4cfc8; }
  td { padding: 7px 12px; border: 1px solid #e8e3da; vertical-align: top; }
  tr:nth-child(even) td { background: #faf8f4; }
  a  { color: #c8401a; }
  code { font-family: 'Courier New', monospace; font-size: 0.88em; background: #f5f2ec; padding: 1px 5px; border-radius: 2px; }
  blockquote { border-left: 3px solid #c8401a; margin: 1rem 0; padding: 4px 16px; color: #555; background: #fff8f5; }
  img { max-width: 100%; height: auto; border-radius: 3px; margin: 8px 0; }
`;

function StyleGuidePanel({ project, adminMode }) {
  const [docHtml, setDocHtml]   = useSGState(null);
  const [meta, setMeta]         = useSGState(null);   // { sha, size }
  const [loading, setLoading]   = useSGState(true);
  const [fetchErr, setFetchErr] = useSGState(null);
  const [showUpload, setShowUpload] = useSGState(false);

  function load() {
    setLoading(true); setFetchErr(null); setDocHtml(null); setMeta(null);
    fetch(`/api/docx-render?path=${encodeURIComponent(SG_PATH)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setFetchErr(d.error);
        } else {
          setDocHtml(d.html);
          setMeta({ sha: d.sha, size: d.size });
        }
        setLoading(false);
      })
      .catch(() => { setFetchErr("Could not reach server"); setLoading(false); });
  }

  useSGEffect(() => { load(); }, []);

  function onUploaded(newMeta) {
    setMeta(newMeta);
    setShowUpload(false);
    load(); // re-render from new docx
  }

  const noFile = !loading && fetchErr && fetchErr.includes("No style guide");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "12px 24px", borderBottom: "1.5px solid #e8e3da",
        background: "#fff", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "1px" }}>
            Reference Document
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#1a2535" }}>
            Style Guide
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {meta && (
            <span style={{ ...FONT, fontSize: "0.7rem", color: "#bbb" }}>
              {Math.round(meta.size / 1024)} KB
            </span>
          )}
          {meta && (
            <button
              onClick={() => forceDownloadSG()}
              style={{
                ...FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                background: "transparent", color: "#888",
                border: "1px solid #e0dbd4", padding: "6px 14px",
                borderRadius: "2px", cursor: "pointer",
              }}
            >
              Download ↓
            </button>
          )}
          {adminMode && (
            <button
              onClick={() => setShowUpload(s => !s)}
              style={{
                ...FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                background: showUpload ? "#1a2535" : "transparent",
                color: showUpload ? "#fff" : "#c8401a",
                border: `1px solid ${showUpload ? "#1a2535" : "#e8cfc8"}`,
                padding: "6px 14px", borderRadius: "2px", cursor: "pointer",
              }}
            >
              {meta ? "Replace" : "Upload"} →
            </button>
          )}
        </div>
      </div>

      {/* ── Admin uploader (collapsible) ── */}
      {adminMode && showUpload && (
        <div style={{ flexShrink: 0, borderBottom: "1.5px solid #e8e3da", background: "#faf8f4" }}>
          <div style={{ maxWidth: "640px", padding: "20px 24px" }}>
            <StyleGuideUploader currentSha={meta?.sha || null} onUploaded={onUploaded} />
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div style={{ flex: 1, overflow: "auto", background: "#f0ede6", minHeight: 0 }}>

        {loading && (
          <div style={{ ...FONT, fontSize: "0.82rem", color: "#aaa", padding: "48px", textAlign: "center" }}>
            Loading style guide…
          </div>
        )}

        {!loading && noFile && (
          <div style={{
            ...FONT, fontSize: "0.85rem", color: "#888",
            padding: "48px 24px", textAlign: "center",
          }}>
            No style guide uploaded yet.
            {adminMode && <span> Click <strong>Upload →</strong> in the toolbar to add one.</span>}
          </div>
        )}

        {!loading && fetchErr && !noFile && (
          <div style={{ ...FONT, fontSize: "0.82rem", color: "#c8401a", padding: "24px 32px" }}>
            {fetchErr}
          </div>
        )}

        {!loading && docHtml && (
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${docHtml}</body></html>`}
            style={{
              width: "100%", height: "100%", border: "none",
              display: "block", minHeight: "600px",
            }}
            title="Style Guide"
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </div>
  );

  async function forceDownloadSG() {
    try {
      const r = await fetch(`/api/github?path=${encodeURIComponent(SG_PATH)}`);
      const d = await r.json();
      if (!d.download_url) return;
      const res = await fetch(d.download_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = SG_FILENAME;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { console.error(e); }
  }
}

// ─── Admin uploader ───────────────────────────────────────────────────────────
function StyleGuideUploader({ currentSha, onUploaded }) {
  const [file, setFile]       = useSGState(null);
  const [dragging, setDragging] = useSGState(false);
  const [uploading, setUploading] = useSGState(false);
  const [result, setResult]   = useSGState(null);
  const [errMsg, setErrMsg]   = useSGState("");
  const inputRef = useSGRef(null);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && isDocx(f)) { setFile(f); setResult(null); setErrMsg(""); }
    else setErrMsg("Please drop a .docx file.");
  }
  function onFileChange(e) {
    const f = e.target.files[0];
    if (f && isDocx(f)) { setFile(f); setResult(null); setErrMsg(""); }
    else setErrMsg("Please select a .docx file.");
  }
  function isDocx(f) {
    return f.name.endsWith(".docx") ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  async function upload() {
    if (!file) return;
    setUploading(true); setResult(null); setErrMsg("");
    try {
      const base64 = await fileToBase64(file);
      const body = {
        message: `update: style guide replaced (${new Date().toISOString().slice(0,10)})`,
        content: base64,
      };
      if (currentSha) body.sha = currentSha;

      const res = await fetch(`/api/github?path=${encodeURIComponent(SG_PATH)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setResult("ok"); setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        onUploaded({ sha: data.content.sha, size: data.content.size });
      } else {
        setResult("error"); setErrMsg(data.message || "GitHub API error");
      }
    } catch (e) { setResult("error"); setErrMsg(e.message); }
    setUploading(false);
  }

  function fileToBase64(f) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("File read failed"));
      r.readAsDataURL(f);
    });
  }

  return (
    <div>
      <div style={{ ...FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>
        {currentSha ? "Replace Style Guide" : "Upload Style Guide"}
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#c8401a" : file ? "#1e7a45" : "#d4cfc8"}`,
          borderRadius: "4px", padding: "20px 24px", textAlign: "center",
          cursor: "pointer", background: dragging ? "#fff8f5" : file ? "#f0faf5" : "#fff",
          transition: "all 0.15s", marginBottom: "12px",
        }}
      >
        <input
          ref={inputRef} type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }} onChange={onFileChange}
        />
        {file ? (
          <>
            <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 600, color: "#1e7a45" }}>{file.name}</div>
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#aaa", marginTop: "3px" }}>{Math.round(file.size / 1024)} KB · Click to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.2rem", opacity: 0.35, marginBottom: "6px" }}>⬆</div>
            <div style={{ ...FONT, fontSize: "0.82rem", color: "#888" }}>Drop a <strong>.docx</strong> here, or click to browse</div>
          </>
        )}
      </div>

      {errMsg && <div style={{ ...FONT, fontSize: "0.75rem", color: "#c8401a", marginBottom: "8px" }}>{errMsg}</div>}
      {result === "ok" && <div style={{ ...FONT, fontSize: "0.75rem", color: "#1e7a45", marginBottom: "8px", fontWeight: 600 }}>✓ Uploaded — reloading preview…</div>}

      <button
        onClick={upload} disabled={!file || uploading}
        style={{
          ...FONT, fontSize: "0.75rem", fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase",
          background: (!file || uploading) ? "#e8e3da" : "#c8401a",
          color: (!file || uploading) ? "#aaa" : "#fff",
          border: "none", padding: "9px 20px", borderRadius: "2px",
          cursor: (!file || uploading) ? "default" : "pointer",
        }}
      >
        {uploading ? "Uploading…" : currentSha ? "Replace →" : "Upload →"}
      </button>
    </div>
  );
}
