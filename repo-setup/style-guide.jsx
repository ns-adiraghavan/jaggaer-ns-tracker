// style-guide.jsx — Style Guide viewer + admin uploader
// File lives at: config/style-guide.docx in the repo
// Anyone can download. Admin can replace via file upload.

const { useState: useSGState, useEffect: useSGEffect, useRef: useSGRef } = React;

const SG_PATH = "config/style-guide.docx";
const SG_FILENAME = "Jaggaer-Style-Guide.docx";
const FONT = { fontFamily: "Noto Sans, sans-serif" };

function StyleGuidePanel({ project, adminMode }) {
  const [meta, setMeta] = useSGState(null);       // { sha, download_url, size, updated_at }
  const [loading, setLoading] = useSGState(true);
  const [fetchErr, setFetchErr] = useSGState(null);

  useSGEffect(() => {
    setLoading(true);
    setFetchErr(null);
    fetch(`/api/github?path=${encodeURIComponent(SG_PATH)}`)
      .then(r => r.json())
      .then(d => {
        if (d.sha) {
          setMeta({ sha: d.sha, download_url: d.download_url, size: d.size, name: d.name });
        } else {
          setMeta(null); // no file yet
        }
        setLoading(false);
      })
      .catch(() => { setFetchErr("Could not reach GitHub"); setLoading(false); });
  }, []);

  function onUploaded(newMeta) {
    setMeta(newMeta);
  }

  const LABEL = {
    ...FONT, fontSize: "0.68rem", fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase", color: "#888",
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: "820px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1.5px solid #e8e3da", paddingBottom: "20px" }}>
        <div style={{ ...FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8401a", marginBottom: "6px" }}>
          Reference Document
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#1a2535", lineHeight: 1.2 }}>
          Style Guide
        </div>
        <div style={{ ...FONT, fontSize: "0.82rem", color: "#888", marginTop: "6px" }}>
          The shared writing and formatting standards for all Jaggaer content.
        </div>
      </div>

      {/* State: loading */}
      {loading && (
        <div style={{ ...FONT, fontSize: "0.82rem", color: "#aaa", padding: "32px 0" }}>
          Checking for style guide…
        </div>
      )}

      {/* State: error */}
      {!loading && fetchErr && (
        <div style={{ ...FONT, fontSize: "0.82rem", color: "#c8401a", padding: "16px 20px", background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: "4px", marginBottom: "24px" }}>
          {fetchErr}
        </div>
      )}

      {/* State: file exists */}
      {!loading && !fetchErr && meta && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            background: "#fff", border: "1px solid #e8e3da", borderLeft: "4px solid #1e7a45",
            borderRadius: "4px", padding: "20px 24px",
            display: "flex", alignItems: "center", gap: "20px",
          }}>
            {/* Doc icon */}
            <div style={{
              width: 44, height: 52, background: "#1e6fa8", borderRadius: "3px",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flexShrink: 0, position: "relative",
            }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>DOCX</div>
              <div style={{
                position: "absolute", top: 0, right: 0, width: 0, height: 0,
                borderLeft: "10px solid #1553a0", borderBottom: "10px solid transparent",
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ ...FONT, fontSize: "0.92rem", fontWeight: 600, color: "#1a2535", marginBottom: "4px" }}>
                {SG_FILENAME}
              </div>
              <div style={{ ...FONT, fontSize: "0.75rem", color: "#aaa" }}>
                {meta.size ? `${Math.round(meta.size / 1024)} KB` : ""}{meta.size ? " · " : ""}Word document
              </div>
            </div>

            <a
              href={meta.download_url}
              download={SG_FILENAME}
              onClick={e => { e.preventDefault(); forceDownloadSG(meta.download_url, SG_FILENAME); }}
              style={{
                ...FONT, fontSize: "0.78rem", fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
                background: "#1a2535", color: "#fff",
                padding: "10px 20px", borderRadius: "2px",
                textDecoration: "none", flexShrink: 0,
                display: "inline-block",
              }}
            >
              Download →
            </a>
          </div>

          <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", marginTop: "10px", paddingLeft: "2px" }}>
            Open in Word, Google Docs, or any compatible editor to view formatting and inline comments.
          </div>
        </div>
      )}

      {/* State: no file yet */}
      {!loading && !fetchErr && !meta && (
        <div style={{
          ...FONT, fontSize: "0.85rem", color: "#888",
          padding: "32px 24px", background: "#faf8f4",
          border: "1px dashed #d4cfc8", borderRadius: "4px",
          marginBottom: "32px", textAlign: "center",
        }}>
          No style guide uploaded yet.
          {adminMode && <span> Use the uploader below to add one.</span>}
        </div>
      )}

      {/* Admin uploader */}
      {adminMode && (
        <StyleGuideUploader currentSha={meta?.sha || null} onUploaded={onUploaded} />
      )}
    </div>
  );
}

// ─── Force download (same pattern as tracker.jsx) ─────────────────────────────
async function forceDownloadSG(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) { window.open(url, "_blank"); return; }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch { window.open(url, "_blank"); }
}

// ─── Admin uploader ───────────────────────────────────────────────────────────
function StyleGuideUploader({ currentSha, onUploaded }) {
  const [file, setFile] = useSGState(null);
  const [dragging, setDragging] = useSGState(false);
  const [uploading, setUploading] = useSGState(false);
  const [result, setResult] = useSGState(null); // "ok" | "error" | null
  const [errMsg, setErrMsg] = useSGState("");
  const inputRef = useSGRef(null);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && isDocx(f)) { setFile(f); setResult(null); }
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
        message: `update: style guide replaced (${new Date().toISOString().slice(0, 10)})`,
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
        setResult("ok");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        onUploaded({
          sha: data.content.sha,
          download_url: data.content.download_url,
          size: data.content.size,
          name: data.content.name,
        });
      } else {
        setResult("error");
        setErrMsg(data.message || "GitHub API error");
      }
    } catch (e) {
      setResult("error"); setErrMsg(e.message);
    }
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

  const isReplace = !!currentSha;

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e3da",
      borderRadius: "4px", padding: "24px",
    }}>
      {/* Section label */}
      <div style={{
        ...FONT, fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#888", marginBottom: "16px",
      }}>
        {isReplace ? "Replace Style Guide" : "Upload Style Guide"} — Admin
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#c8401a" : file ? "#1e7a45" : "#d4cfc8"}`,
          borderRadius: "4px",
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "#fff8f5" : file ? "#f0faf5" : "#faf8f4",
          transition: "all 0.15s",
          marginBottom: "16px",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        {file ? (
          <>
            <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>📄</div>
            <div style={{ ...FONT, fontSize: "0.88rem", fontWeight: 600, color: "#1e7a45" }}>{file.name}</div>
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#aaa", marginTop: "4px" }}>
              {Math.round(file.size / 1024)} KB · Click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.6rem", marginBottom: "8px", opacity: 0.4 }}>⬆</div>
            <div style={{ ...FONT, fontSize: "0.85rem", color: "#888" }}>
              Drop a <strong>.docx</strong> file here, or click to browse
            </div>
            <div style={{ ...FONT, fontSize: "0.72rem", color: "#bbb", marginTop: "4px" }}>
              Word documents only
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {errMsg && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#c8401a", marginBottom: "12px" }}>
          {errMsg}
        </div>
      )}

      {/* Success */}
      {result === "ok" && (
        <div style={{ ...FONT, fontSize: "0.78rem", color: "#1e7a45", marginBottom: "12px", fontWeight: 600 }}>
          ✓ Style guide {isReplace ? "replaced" : "uploaded"} successfully.
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={upload}
        disabled={!file || uploading}
        style={{
          ...FONT, fontSize: "0.78rem", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          background: (!file || uploading) ? "#e8e3da" : "#c8401a",
          color: (!file || uploading) ? "#aaa" : "#fff",
          border: "none", padding: "11px 24px", borderRadius: "2px",
          cursor: (!file || uploading) ? "default" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {uploading ? "Uploading…" : isReplace ? "Replace →" : "Upload →"}
      </button>
    </div>
  );
}
