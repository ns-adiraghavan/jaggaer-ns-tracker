// sme-guide.jsx — Subject Matter Expert guide viewer + admin uploader.
// Mirrors content-flow.jsx: a single reference IMAGE (the "Content Experts" /
// SME guide, rendered as a page image so it never depends on a browser PDF
// plugin) shown scrollable, with Download / Refresh / admin Replace.
//
// The image lives at a fixed path in the repo: config/sme-content-experts.png.
// The stored extension is irrelevant to rendering — on load we sniff the real
// image type from the file's magic bytes and build a correct data: URL, so a
// PNG, JPG, GIF, WEBP or SVG all render regardless of what the file is named.
// Keeping the path fixed means "Replace" always overwrites in place (via sha)
// and never leaves an orphaned old image behind.

const { useState: useSMEState, useEffect: useSMEEffect, useRef: useSMERef } = React;

const SME_PATH = "config/sme-content-experts.png";
const SME_FILENAME = "Jaggaer-Content-Experts.png";
const SME_FONT = { fontFamily: "Noto Sans, sans-serif" };

// Detect image mime from the first few base64 chars (magic bytes), so display
// is decoupled from the stored file extension.
function smeMimeFromBase64(b64) {
  if (!b64) return "image/png";
  const head = b64.slice(0, 24);
  if (head.startsWith("iVBOR")) return "image/png";
  if (head.startsWith("/9j/")) return "image/jpeg";
  if (head.startsWith("R0lG")) return "image/gif";
  if (head.startsWith("UklGR")) return "image/webp";
  if (head.startsWith("PHN2") || head.startsWith("PD94")) return "image/svg+xml"; // "<svg" / "<?xml"
  return "image/png";
}

function SMEGuidePanel({ project, adminMode }) {
  const [imgSrc, setImgSrc]     = useSMEState(null);
  const [meta, setMeta]         = useSMEState(null);   // { sha, size }
  const [loading, setLoading]   = useSMEState(true);
  const [fetchErr, setFetchErr] = useSMEState(null);
  const [notFound, setNotFound] = useSMEState(false);
  const [showUpload, setShowUpload] = useSMEState(false);

  function load() {
    setLoading(true); setFetchErr(null); setImgSrc(null); setMeta(null); setNotFound(false);
    fetch(`/api/github?path=${encodeURIComponent(SME_PATH)}`)
      .then(r => r.json())
      .then(d => {
        // GitHub Contents API returns { message: "Not Found" } (with no sha) when
        // the file doesn't exist yet — treat that as an empty state, not an error.
        if (d && d.content) {
          const b64 = String(d.content).replace(/\n/g, "");
          setImgSrc(`data:${smeMimeFromBase64(b64)};base64,${b64}`);
          setMeta({ sha: d.sha, size: d.size });
        } else if (d && /not found/i.test(d.message || "")) {
          setNotFound(true);
        } else {
          setFetchErr(d.error || d.message || "Could not load the document");
        }
        setLoading(false);
      })
      .catch(() => { setFetchErr("Could not reach server"); setLoading(false); });
  }

  useSMEEffect(() => { load(); }, []);

  function onUploaded(newMeta) {
    setMeta(newMeta);
    setShowUpload(false);
    load(); // re-render from the new image
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "12px 24px", borderBottom: "1.5px solid #e8e3da",
        background: "#fff", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...SME_FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "1px" }}>
            Reference Guide
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#1a2535" }}>
            Content Experts
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {meta && (
            <span style={{ ...SME_FONT, fontSize: "0.7rem", color: "#bbb" }}>
              {Math.round(meta.size / 1024)} KB
            </span>
          )}
          <button
            onClick={() => load()}
            disabled={loading}
            title="Reload the latest version"
            style={{
              ...SME_FONT, fontSize: "0.72rem", fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
              background: "transparent", color: loading ? "#ccc" : "#888",
              border: "1px solid #e0dbd4", padding: "6px 14px",
              borderRadius: "2px", cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Refreshing…" : "Refresh ↻"}
          </button>
          {imgSrc && (
            <a
              href={imgSrc} download={SME_FILENAME}
              style={{
                ...SME_FONT, fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                background: "transparent", color: "#888", textDecoration: "none",
                border: "1px solid #e0dbd4", padding: "6px 14px",
                borderRadius: "2px", cursor: "pointer",
              }}
            >
              Download ↓
            </a>
          )}
          {adminMode && (
            <button
              onClick={() => setShowUpload(s => !s)}
              style={{
                ...SME_FONT, fontSize: "0.72rem", fontWeight: 700,
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
            <SMEGuideUploader currentSha={meta?.sha || null} onUploaded={onUploaded} />
          </div>
        </div>
      )}

      {/* ── Main content area (scrollable) ── */}
      <div style={{ flex: 1, overflow: "auto", background: "#f0ede6", minHeight: 0 }}>

        {loading && (
          <div style={{ ...SME_FONT, fontSize: "0.82rem", color: "#aaa", padding: "48px", textAlign: "center" }}>
            Loading document…
          </div>
        )}

        {!loading && notFound && (
          <div style={{
            ...SME_FONT, fontSize: "0.85rem", color: "#888",
            padding: "48px 24px", textAlign: "center",
          }}>
            No content experts guide uploaded yet.
            {adminMode && <span> Click <strong>Upload →</strong> in the toolbar to add one.</span>}
          </div>
        )}

        {!loading && fetchErr && !notFound && (
          <div style={{ ...SME_FONT, fontSize: "0.82rem", color: "#c8401a", padding: "24px 32px" }}>
            {fetchErr}
          </div>
        )}

        {!loading && imgSrc && (
          <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}>
            <img
              src={imgSrc}
              alt="Content experts guide"
              style={{
                maxWidth: "100%", height: "auto", display: "block",
                background: "#fff", border: "1px solid #e0dbd4", borderRadius: "4px",
                boxShadow: "0 2px 14px rgba(26,47,78,0.08)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin uploader ───────────────────────────────────────────────────────────
function SMEGuideUploader({ currentSha, onUploaded }) {
  const [file, setFile]         = useSMEState(null);
  const [dragging, setDragging] = useSMEState(false);
  const [uploading, setUploading] = useSMEState(false);
  const [result, setResult]     = useSMEState(null);
  const [errMsg, setErrMsg]     = useSMEState("");
  const inputRef = useSMERef(null);

  function isImage(f) {
    return /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);
  }
  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && isImage(f)) { setFile(f); setResult(null); setErrMsg(""); }
    else setErrMsg("Please drop an image (PNG, JPG, GIF, WEBP or SVG).");
  }
  function onFileChange(e) {
    const f = e.target.files[0];
    if (f && isImage(f)) { setFile(f); setResult(null); setErrMsg(""); }
    else setErrMsg("Please select an image (PNG, JPG, GIF, WEBP or SVG).");
  }

  async function upload() {
    if (!file) return;
    setUploading(true); setResult(null); setErrMsg("");
    try {
      const base64 = await fileToBase64(file);
      const body = {
        message: `update: content experts guide replaced (${new Date().toISOString().slice(0,10)})`,
        content: base64,
      };
      if (currentSha) body.sha = currentSha;

      const res = await fetch(`/api/github?path=${encodeURIComponent(SME_PATH)}`, {
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
      <div style={{ ...SME_FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "12px" }}>
        {currentSha ? "Replace Content Experts Guide" : "Upload Content Experts Guide"}
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
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.svg"
          style={{ display: "none" }} onChange={onFileChange}
        />
        {file ? (
          <>
            <div style={{ ...SME_FONT, fontSize: "0.88rem", fontWeight: 600, color: "#1e7a45" }}>{file.name}</div>
            <div style={{ ...SME_FONT, fontSize: "0.72rem", color: "#aaa", marginTop: "3px" }}>{Math.round(file.size / 1024)} KB · Click to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.2rem", opacity: 0.35, marginBottom: "6px" }}>⬆</div>
            <div style={{ ...SME_FONT, fontSize: "0.82rem", color: "#888" }}>Drop an <strong>image</strong> here, or click to browse</div>
            <div style={{ ...SME_FONT, fontSize: "0.7rem", color: "#bbb", marginTop: "3px" }}>PNG, JPG, GIF, WEBP or SVG</div>
          </>
        )}
      </div>

      {errMsg && <div style={{ ...SME_FONT, fontSize: "0.75rem", color: "#c8401a", marginBottom: "8px" }}>{errMsg}</div>}
      {result === "ok" && <div style={{ ...SME_FONT, fontSize: "0.75rem", color: "#1e7a45", marginBottom: "8px", fontWeight: 600 }}>✓ Uploaded — reloading preview…</div>}

      <button
        onClick={upload} disabled={!file || uploading}
        style={{
          ...SME_FONT, fontSize: "0.75rem", fontWeight: 700,
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

window.SMEGuidePanel = SMEGuidePanel;
