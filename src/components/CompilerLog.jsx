import { Terminal, ChevronDown } from "lucide-react";
export default function CompilerLog({ expanded, onToggle, status, log }) {
  return (
    <div className={`log-panel ${expanded ? "expanded" : ""}`}>
      <button
        className="log-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Terminal size={14} />
        <span>Compiler log</span>
        {status === "error" ? (
          <span className="log-badge error">Needs attention</span>
        ) : status === "success" ? (
          <span className="log-badge">No errors</span>
        ) : (
          <span className="log-idle">Output appears here after compiling</span>
        )}
        <ChevronDown size={14} className={expanded ? "rotated" : ""} />
      </button>
      {expanded && (
        <pre role="log">
          {log ||
            "No compilation yet. Press Recompile or Ctrl + Enter to get started."}
        </pre>
      )}
    </div>
  );
}
