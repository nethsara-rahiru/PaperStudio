import { useState, useEffect, useRef, useCallback } from "react";
import SourceEditor from "./components/SourceEditor";
import PDFPreview from "./components/PDFPreview";
import CompilerLog from "./components/CompilerLog";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  FileCode2,
  FileImage,
  FileText,
  FolderOpen,
  HelpCircle,
  ImagePlus,
  LayoutTemplate,
  LoaderCircle,
  PanelLeftClose,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { templates } from "./templates";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem("paperstudio-project"));
    return data &&
      typeof data.source === "string" &&
      typeof data.name === "string" &&
      Array.isArray(data.assets)
      ? data
      : {};
  } catch {
    return {};
  }
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({ title, children, onClose }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const initial = useRef(load()).current;
  const [source, setSource] = useState(
    initial.source ?? templates.article.source,
  );
  const [name, setName] = useState(initial.name || templates.article.name);
  const [assets, setAssets] = useState(initial.assets || []);
  const [busy, setBusy] = useState(false),
    [pdf, setPdf] = useState(null),
    [log, setLog] = useState(""),
    [compiledSource, setCompiledSource] = useState(null);
  const [status, setStatus] = useState("idle"),
    [showLog, setShowLog] = useState(false),
    [modal, setModal] = useState(null),
    [sidebar, setSidebar] = useState(true),
    [tab, setTab] = useState("editor");
  const [notice, setNotice] = useState(""),
    [saveState, setSaveState] = useState("Saved locally"),
    [health, setHealth] = useState(null),
    [zoom, setZoom] = useState(100),
    [selectedAsset, setSelectedAsset] = useState(null),
    [elapsed, setElapsed] = useState(null);
  const upload = useRef(),
    importRef = useRef(),
    pdfRef = useRef(),
    busyRef = useRef(false),
    revision = useRef(0);
  const changed =
    compiledSource !== null &&
    compiledSource !== JSON.stringify({ source, assets });
  useEffect(() => {
    fetch("/api/health")
      .then(async (r) => {
        const data = await r.json();
        setHealth(data.ready);
      })
      .catch(() => setHealth(false));
  }, []);
  useEffect(() => {
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          "paperstudio-project",
          JSON.stringify({ source, name, assets }),
        );
        setSaveState("Saved locally");
      } catch {
        setSaveState("Storage full · export your source");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [source, name, assets]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(
    () => () => {
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    },
    [],
  );
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const recompile = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStatus("compiling");
    setSelectedAsset(null);
    const started = performance.now(),
      atRevision = revision.current;
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, assets }),
      });
      const result = await response.json();
      if (atRevision !== revision.current) return;
      setLog(result.log || result.error || "No compiler output.");
      if (!response.ok || !result.ok) {
        setStatus("error");
        setShowLog(true);
        setNotice(
          result.error ||
            "Compilation needs a little attention. Check the log below.",
        );
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
      pdfRef.current = url;
      setPdf(url);
      setCompiledSource(JSON.stringify({ source, assets }));
      setStatus("success");
      setElapsed(((performance.now() - started) / 1000).toFixed(1));
      setHealth(true);
    } catch (e) {
      if (atRevision !== revision.current) return;
      setStatus("error");
      setLog(
        `Could not reach the compiler. Start the backend with npm run dev.\n${e.message}`,
      );
      setShowLog(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [source, assets]);
  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        recompile();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [recompile]);
  async function uploadAssets(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    let next = [...assets];
    try {
      for (const file of files) {
        if (
          !/\.(png|jpe?g|pdf)$/i.test(file.name) ||
          !/^[\p{L}\p{N}_][\p{L}\p{N}_. -]{0,119}\.(png|jpe?g|pdf)$/iu.test(
            file.name,
          ) ||
          file.name.includes("..")
        )
          throw Error("Choose PNG, JPEG, or PDF files with simple filenames.");
        if (next.some((a) => a.name === file.name))
          throw Error(`${file.name} already exists.`);
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => reject(Error("Could not read file."));
          reader.readAsDataURL(file);
        });
        next.push({ name: file.name, data });
      }
      if (
        next.length > 20 ||
        next.reduce((sum, a) => sum + a.data.length * 0.75, 0) > 10_000_000
      )
        throw Error("Keep uploads under 10 MB and 20 files per project.");
      setAssets(next);
      setNotice(
        "Files uploaded. Click an image to preview or insert it into your document.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function useTemplate(key) {
    revision.current++;
    const t = templates[key];
    setSource(t.source);
    setName(t.name);
    setAssets([]);
    setSelectedAsset(null);
    setCompiledSource(null);
    setPdf(null);
    setStatus("idle");
    setShowLog(false);
    setLog("");
    setModal(null);
    setTab("editor");
  }
  function insertImage(asset) {
    const addition = `\n\\begin{figure}[ht]\n  \\centering\n  \\includegraphics[width=0.8\\linewidth]{${asset.name}}\n  \\caption{Your caption here}\n\\end{figure}\n`;
    setSource((s) =>
      s.includes("\\end{document}")
        ? s.replace("\\end{document}", addition + "\n\\end{document}")
        : s + addition,
    );
    setSelectedAsset(null);
    setNotice("Image added before the end of your document.");
  }
  const selected = assets.find((a) => a.name === selectedAsset);
  return (
    <div className="app-shell">
      <aside className="rail">
        <a
          className="brand-mark"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label="PaperStudio home"
        >
          <BookOpen size={23} />
        </a>
        <button
          className="rail-button active"
          title="Project files"
          aria-label="Toggle project files"
          onClick={() => setSidebar((s) => !s)}
        >
          <FolderOpen size={20} />
        </button>
        <button
          className="rail-button"
          title="Templates"
          aria-label="Open templates"
          onClick={() => setModal("templates")}
        >
          <LayoutTemplate size={20} />
        </button>
        <div className="rail-bottom">
          <button
            className="rail-button"
            title="Help"
            aria-label="Help"
            onClick={() => setModal("help")}
          >
            <HelpCircle size={20} />
          </button>
          <button
            className="avatar"
            onClick={() => setModal("settings")}
            title="Workspace settings"
          >
            P
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="wordmark">
            paper<span>studio</span>
            <span className="beta">WORKSPACE</span>
          </div>
          <div className="top-actions">
            <span className="local-indicator">
              <span /> Personal workspace
            </span>
            <button className="text-button" onClick={() => setModal("help")}>
              Quick guide <ArrowUpRight size={14} />
            </button>
          </div>
        </header>
        <div className="project-header">
          <div className="project-title">
            <div className="breadcrumb">
              My workspace <ChevronRight size={13} />
              <span>Untitled collection</span>
            </div>
            <div className="title-row">
              <input
                aria-label="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
              <span className="project-badge">LaTeX PROJECT</span>
            </div>
            <div className="save-status">
              <Check size={13} />
              {saveState}
              <span className="dot-separator">·</span> Just you, your ideas, and
              a blank page.
            </div>
          </div>
          <div className="project-actions">
            <button
              className="button secondary"
              onClick={() =>
                download(
                  new Blob([source], { type: "text/plain;charset=utf-8" }),
                  `${name || "document"}.tex`,
                )
              }
            >
              <Download size={15} /> Export source
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={recompile}
            >
              {busy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              {busy ? "Compiling…" : "Recompile"}
              <kbd>⌘ ↵</kbd>
            </button>
          </div>
        </div>
        <div className="mobile-tabs">
          <button
            className={tab === "editor" ? "selected" : ""}
            onClick={() => setTab("editor")}
          >
            Source editor
          </button>
          <button
            className={tab === "preview" ? "selected" : ""}
            onClick={() => setTab("preview")}
          >
            PDF preview
          </button>
        </div>
        <main className={`studio ${sidebar ? "" : "sidebar-hidden"}`}>
          {sidebar && (
            <aside className="file-sidebar">
              <div className="panel-label">
                EXPLORER{" "}
                <div>
                  <button
                    className="icon"
                    title="Import .tex source"
                    aria-label="Import LaTeX source"
                    onClick={() => importRef.current.click()}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="icon"
                    title="Upload image"
                    aria-label="Upload image"
                    onClick={() => upload.current.click()}
                  >
                    <Upload size={15} />
                  </button>
                </div>
              </div>
              <div className="file-tree">
                <div className="tree-root">
                  <ChevronDown size={14} />
                  <FolderOpen size={15} />
                  <span>Project files</span>
                </div>
                <button
                  className={`file-item ${!selectedAsset ? "selected" : ""}`}
                  onClick={() => setSelectedAsset(null)}
                >
                  <FileCode2 size={16} />
                  <span>main.tex</span>
                  <span className="file-dot" />
                </button>
                {assets.map((asset) => (
                  <div className="asset-row" key={asset.name}>
                    <button
                      className={`file-item ${selectedAsset === asset.name ? "selected" : ""}`}
                      onClick={() => setSelectedAsset(asset.name)}
                    >
                      <FileImage size={16} />
                      <span>{asset.name}</span>
                    </button>
                    <button
                      className="icon delete"
                      aria-label={`Delete ${asset.name}`}
                      onClick={() => {
                        setAssets((a) =>
                          a.filter((f) => f.name !== asset.name),
                        );
                        if (selectedAsset === asset.name)
                          setSelectedAsset(null);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  className="add-files"
                  onClick={() => upload.current.click()}
                >
                  <Plus size={14} /> Add images or files
                </button>
              </div>
              <div className="sidebar-bottom">
                <div className="little-card">
                  <div className="little-card-icon">
                    <Sparkles size={17} />
                  </div>
                  <h3>Words without borders.</h3>
                  <p>Write beautifully in Sinhala, English, and beyond.</p>
                  <button onClick={() => setModal("templates")}>
                    Explore templates <ArrowUpRight size={13} />
                  </button>
                </div>
                <button
                  className="compiler-setting"
                  onClick={() => setModal("settings")}
                >
                  <Settings2 size={15} />
                  <span>Compiler settings</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </aside>
          )}
          <section
            className={`editor-panel ${tab === "editor" ? "mobile-visible" : ""}`}
          >
            <div className="editor-toolbar">
              <div className="editor-file">
                <button
                  className="icon"
                  aria-label="Toggle explorer"
                  onClick={() => setSidebar((s) => !s)}
                >
                  <PanelLeftClose size={15} />
                </button>
                <FileCode2 size={15} />
                <span>{selectedAsset || "main.tex"}</span>
                {!selectedAsset && (
                  <span className="modified-dot" title="Source file" />
                )}
              </div>
              <span className="editor-type">
                {selectedAsset ? "ASSET" : "SOURCE"}
              </span>
            </div>
            {selected ? (
              <div className="asset-preview">
                {/\.pdf$/i.test(selected.name) ? (
                  <iframe
                    title={selected.name}
                    src={`data:application/pdf;base64,${selected.data}`}
                  />
                ) : (
                  <img
                    alt={selected.name}
                    src={`data:image/${/\.png$/i.test(selected.name) ? "png" : "jpeg"};base64,${selected.data}`}
                  />
                )}
                <h3>{selected.name}</h3>
                <button
                  className="button primary"
                  onClick={() => insertImage(selected)}
                >
                  <ImagePlus size={16} /> Insert into document
                </button>
                <p>
                  Requires the graphicx package, included in every template.
                </p>
              </div>
            ) : (
              <SourceEditor source={source} onChange={setSource} />
            )}
            <footer className="editor-footer">
              <span>
                <span className="green-dot" /> LaTeX
              </span>
              <span>
                UTF-8 <span className="dot-separator">·</span>{" "}
                {source.split("\n").length} lines
              </span>
            </footer>
          </section>
          <section
            className={`preview-panel ${tab === "preview" ? "mobile-visible" : ""}`}
          >
            <div className="preview-toolbar">
              <div className="preview-title">
                <FileText size={15} />
                <span>PDF preview</span>
                <span className="preview-live">LIVE</span>
              </div>
              <button
                className="icon"
                disabled={!pdf}
                aria-label="Download PDF"
                title="Download PDF"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = pdf;
                  a.download = `${name || "document"}.pdf`;
                  a.click();
                }}
              >
                <Download size={16} />
              </button>
            </div>
            <div className="preview-controls">
              <div className="preview-state">
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={13} /> Compiling
                    document
                  </>
                ) : status === "success" ? (
                  <>
                    <Check size={13} />
                    {changed
                      ? "Source changed · recompile to update"
                      : `Compiled in ${elapsed}s`}
                  </>
                ) : status === "error" ? (
                  <span className="error-text">Compilation failed</span>
                ) : (
                  <>
                    <span className="green-dot" /> Ready when you are
                  </>
                )}
              </div>
              <div className="zoom">
                <button
                  className="icon"
                  disabled={!pdf || zoom <= 50}
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                >
                  <ZoomOut size={14} />
                </button>
                <span>{zoom}%</span>
                <button
                  className="icon"
                  disabled={!pdf || zoom >= 180}
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(180, z + 10))}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
            <div className="pdf-canvas">
              {pdf ? (
                <PDFPreview url={pdf} zoom={zoom} />
              ) : (
                <div className="preview-empty">
                  <div className="paper-illustration">
                    <div className="paper-top">
                      <span />
                      <span />
                    </div>
                    <div className="illustration-title" />
                    <div className="illustration-title short" />
                    <div className="illustration-line" />
                    <div className="illustration-line" />
                    <div className="illustration-line medium" />
                    <div className="illustration-equation">E = mc²</div>
                    <div className="illustration-line" />
                    <div className="illustration-line medium" />
                    <div className="illustration-page-number">1</div>
                    <div className="paper-seal">
                      <Sparkles size={23} />
                    </div>
                  </div>
                  <span className="eyebrow">FROM THOUGHT TO PAPER</span>
                  <h2>Your ideas, beautifully set.</h2>
                  <p>
                    Write a little. Make something wonderful.
                    <br />
                    Compile your source to bring this page to life.
                  </p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={recompile}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                    {busy ? "Bringing it to life…" : "Compile your first PDF"}
                  </button>
                  <span className="preview-hint">
                    or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                  </span>
                </div>
              )}
            </div>
            <footer className="preview-footer">
              <span>
                <span
                  className={health === false ? "amber-dot" : "green-dot"}
                />
                {health === false
                  ? "Compiler unavailable"
                  : "Powered by XeLaTeX"}
              </span>
              <span>
                Unicode & Sinhala ready <Check size={12} />
              </span>
            </footer>
          </section>
        </main>
        <CompilerLog
          expanded={showLog}
          onToggle={() => setShowLog((s) => !s)}
          status={status}
          log={log}
        />
        <footer className="workspace-footer">
          <span>Made for the things worth writing.</span>
          <div>
            <span>XeLaTeX</span>
            <span className="dot-separator">·</span>
            <button onClick={() => setModal("help")}>
              Keyboard shortcuts <Code2 size={12} />
            </button>
          </div>
        </footer>
      </div>
      <input
        ref={upload}
        hidden
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        multiple
        onChange={uploadAssets}
      />
      <input
        ref={importRef}
        hidden
        type="file"
        accept=".tex"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 512000) {
            setNotice("Source must be smaller than 512 KB.");
            return;
          }
          const text = await file.text();
          setModal({ type: "import", text });
        }}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            className="icon"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal === "templates" && (
        <Modal title="A good place to begin" onClose={() => setModal(null)}>
          <p className="modal-description">
            Choose a starting point for your next idea. This replaces your
            current document and uploads. Export your source first to keep it.
          </p>
          <div className="template-list">
            {Object.entries(templates).map(([key, t], i) => (
              <button key={key} onClick={() => useTemplate(key)}>
                <span className="template-number">0{i + 1}</span>
                <span>
                  <strong>{t.label}</strong>
                  <small>
                    {key === "sinhala"
                      ? "Noto Serif Sinhala · Unicode typography"
                      : key === "report"
                        ? "Equations · tables · table of contents"
                        : "Beautiful typography · mathematics · TikZ"}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Make yourself at home" onClose={() => setModal(null)}>
          <div className="help-content">
            <h3>01 / Write your story</h3>
            <p>
              Edit main.tex in the source editor. Changes are saved in this
              browser. Export your source to keep a backup.
            </p>
            <h3>02 / Bring it to life</h3>
            <p>
              Press Recompile or Ctrl / ⌘ + Enter. XeLaTeX runs twice to resolve
              references. Your PDF appears on the right; use the download icon
              to save it.
            </p>
            <h3>03 / Add a little more</h3>
            <p>
              Upload PNG, JPEG, or PDF assets, then select a file and choose
              “Insert into document”. All templates include graphicx. TikZ
              drawings are supported too.
            </p>
            <h3>සිංහල / Sinhala, beautifully</h3>
            <p>
              Open Templates in the left rail and choose Sinhala document. Use
              fontspec with Noto Serif Sinhala or Noto Sans Sinhala. XeLaTeX
              handles Unicode directly.
            </p>
            <p className="help-note">
              This is a personal local workspace. LaTeX runs on the backend; use
              it only with trusted documents. No account or cloud sync is
              required.
            </p>
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="A few thoughtful defaults" onClose={() => setModal(null)}>
          <div className="setting-row">
            <div>
              <strong>Typesetting engine</strong>
              <p>Unicode, system fonts, mathematics, and graphics.</p>
            </div>
            <span className="setting-value">XeLaTeX</span>
          </div>
          <div className="setting-row">
            <div>
              <strong>Compilation</strong>
              <p>Two passes for cross-references. 30 seconds per pass.</p>
            </div>
            <Check size={18} />
          </div>
          <div className="setting-row">
            <div>
              <strong>Your workspace</strong>
              <p>Saved on this device. Up to 20 assets and 10 MB total.</p>
            </div>
            <span className="setting-value">Local</span>
          </div>
          <button
            className="button secondary"
            onClick={() => setModal("templates")}
          >
            <RotateCcw size={15} /> Start from a template
          </button>
        </Modal>
      )}
      {modal?.type === "import" && (
        <Modal title="Replace your source?" onClose={() => setModal(null)}>
          <p className="modal-description">
            Importing this file replaces main.tex. Your uploaded assets stay in
            the project. Export the current source first if you want to keep it.
          </p>
          <button
            className="button primary"
            onClick={() => {
              setSource(modal.text);
              setSelectedAsset(null);
              setModal(null);
              setNotice("LaTeX source imported.");
            }}
          >
            Import source
          </button>
        </Modal>
      )}
    </div>
  );
}
