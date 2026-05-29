import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

interface MarkdownPreviewProps {
  content: string;
}

// Initialize mermaid once
let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
      primaryColor: "#32E0C4",
      primaryTextColor: "#EEEEEE",
      primaryBorderColor: "#123238",
      lineColor: "#8FA3A8",
      secondaryColor: "#071418",
      tertiaryColor: "#0D1F25",
      background: "#050D10",
      mainBkg: "#071418",
      nodeBorder: "#32E0C4",
      clusterBkg: "#091A1F",
      clusterBorder: "#123238",
      titleColor: "#EEEEEE",
      edgeLabelBackground: "#071418",
      nodeTextColor: "#EEEEEE",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "0.8125rem",
    },
  });
  mermaidInitialized = true;
}

let mermaidCounter = 0;

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    initMermaid();
    const id = `mermaid-${++mermaidCounter}-${Date.now()}`;

    mermaid.render(id, code.trim()).then(({ svg: rendered }) => {
      setSvg(rendered);
    }).catch((err) => {
      setError(err?.message ?? "Failed to render diagram");
    });
  }, [code]);

  if (error) {
    return (
      <div style={{
        background: "rgba(255, 83, 112, 0.05)",
        border: "1px solid rgba(255, 83, 112, 0.15)",
        borderRadius: "6px",
        padding: "12px",
        margin: "8px 0",
        fontSize: "0.75rem",
        color: "#FF5370",
        fontFamily: "var(--orphix-font-terminal)",
      }}>
        Mermaid error: {error}
        <pre style={{ marginTop: "8px", color: "var(--orphix-color-text-muted)", whiteSpace: "pre-wrap" }}>{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{
        background: "rgba(50, 224, 196, 0.03)",
        border: "1px solid var(--orphix-color-base-border)",
        borderRadius: "6px",
        padding: "16px",
        margin: "8px 0",
        textAlign: "center",
        color: "var(--orphix-color-text-muted)",
        fontSize: "0.75rem",
      }}>
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ margin: "12px 0", overflow: "auto" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match?.[1] ?? "";
  const code = String(children).replace(/\n$/, "");

  if (language === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  return (
    <div style={{ position: "relative", margin: "8px 0" }}>
      {language && (
        <div style={{
          position: "absolute",
          top: "4px",
          right: "8px",
          fontSize: "0.75rem",
          color: "var(--orphix-color-text-muted)",
          fontFamily: "var(--orphix-font-terminal)",
          opacity: 0.6,
        }}>
          {language}
        </div>
      )}
      <pre style={{
        background: "var(--orphix-color-base-surface-deep)",
        border: "1px solid var(--orphix-color-base-border)",
        borderRadius: "6px",
        padding: "12px",
        overflow: "auto",
        margin: 0,
      }}>
        <code style={{
          fontFamily: "var(--orphix-font-terminal)",
          fontSize: "0.8125rem",
          color: "var(--orphix-color-text)",
          lineHeight: "1.5",
        }}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--orphix-color-text-muted)", fontSize: "0.8125rem" }}>
        Empty note
      </div>
    );
  }

  return (
    <div style={{ fontSize: "0.8125rem", lineHeight: "1.7", color: "var(--orphix-color-text-muted)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          h1: ({ children }) => <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--orphix-color-text)", margin: "1.5rem 0 0.75rem" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--orphix-color-text)", margin: "1.25rem 0 0.625rem" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--orphix-color-text)", margin: "1rem 0 0.5rem" }}>{children}</h3>,
          h4: ({ children }) => <h4 style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--orphix-color-text)", margin: "0.75rem 0 0.375rem" }}>{children}</h4>,
          p: ({ children }) => <p style={{ margin: "6px 0", color: "var(--orphix-color-text-muted)" }}>{children}</p>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener" style={{ color: "var(--orphix-color-primary)", textDecoration: "underline" }}>{children}</a>,
          strong: ({ children }) => <strong style={{ fontWeight: 600, color: "var(--orphix-color-text)" }}>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "3px solid var(--orphix-color-primary)", paddingLeft: "12px", margin: "8px 0", color: "var(--orphix-color-text-muted)", fontStyle: "italic" }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--orphix-color-base-border)", margin: "16px 0" }} />,
          ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: "20px" }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "2px 0", color: "var(--orphix-color-text-muted)" }}>{children}</li>,
          table: ({ children }) => (
            <div style={{ overflow: "auto", margin: "8px 0" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8125rem" }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ borderBottom: "2px solid var(--orphix-color-base-border)" }}>{children}</thead>,
          th: ({ children }) => (
            <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "var(--orphix-color-text)" }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--orphix-color-base-border)", color: "var(--orphix-color-text-muted)" }}>{children}</td>
          ),
          del: ({ children }) => <del style={{ color: "var(--orphix-color-text-muted)" }}>{children}</del>,
          input: ({ checked, type, ...props }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{ marginRight: "6px", accentColor: "var(--orphix-color-primary)" }}
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          img: ({ src, alt }) => (
            <img src={src} alt={alt} style={{ maxWidth: "100%", borderRadius: "6px", margin: "8px 0" }} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
