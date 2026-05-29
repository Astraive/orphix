import { useState } from "react";
import { X, ExternalLink, FileText } from "lucide-react";
import { MarkdownPreview } from "../../notes/components/MarkdownPreview";

interface MarkdownPreviewPopupProps {
  filePath: string;
  content: string;
  onClose: () => void;
}

export function MarkdownPreviewPopup({ filePath, content, onClose }: MarkdownPreviewPopupProps) {
  const [showSource, setShowSource] = useState(false);
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "80vw",
          maxWidth: "900px",
          height: "75vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--orphix-color-base-background)",
          borderRadius: "12px",
          border: "1px solid var(--orphix-color-base-border)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderBottom: "1px solid var(--orphix-color-base-border)",
            background: "var(--orphix-color-base-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={14} style={{ color: "var(--orphix-color-primary)" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--orphix-color-text)" }}>{fileName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowSource(!showSource)}
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px solid var(--orphix-color-base-border)",
                cursor: "pointer",
                background: showSource ? "rgba(50, 224, 196, 0.1)" : "transparent",
                color: showSource ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
              }}
            >
              {showSource ? "Preview" : "Source"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <X size={14} style={{ color: "var(--orphix-color-text-muted)" }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {showSource ? (
            <pre
              style={{
                fontFamily: "var(--orphix-font-terminal)",
                fontSize: "0.8125rem",
                lineHeight: "1.6",
                color: "var(--orphix-color-text)",
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {content}
            </pre>
          ) : (
            <MarkdownPreview content={content} />
          )}
        </div>
      </div>
    </div>
  );
}
