import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div
      className="editor-scroll h-full overflow-auto p-6"
      style={{
        background: "var(--orphix-editor-bg)",
        color: "var(--orphix-editor-text)",
        fontFamily: "var(--orphix-font-code, var(--orphix-font-mono))",
        fontSize: "14px",
        lineHeight: "1.7",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6" style={{ color: "var(--orphix-editor-text)" }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5" style={{ color: "var(--orphix-editor-text)" }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4" style={{ color: "var(--orphix-editor-text)" }}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3" style={{ color: "var(--orphix-editor-text)" }}>{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-3" style={{ color: "var(--orphix-editor-text)" }}>{children}</p>
          ),
          a: ({ href, children }) => (
            <a href={href} className="underline" style={{ color: "var(--orphix-color-primary)" }} target="_blank" rel="noreferrer">{children}</a>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-sm"
                  style={{
                    background: "var(--orphix-editor-current-line)",
                    color: "var(--orphix-color-accent)",
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block p-4 rounded-lg text-sm overflow-x-auto my-3"
                style={{
                  background: "var(--orphix-editor-gutter-bg)",
                  color: "var(--orphix-editor-text)",
                  fontFamily: "var(--orphix-font-code, var(--orphix-font-mono))",
                }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3" style={{ color: "var(--orphix-editor-text)" }}>{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3" style={{ color: "var(--orphix-editor-text)" }}>{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-4 my-3 italic"
              style={{
                borderColor: "var(--orphix-color-accent)",
                color: "var(--orphix-editor-muted)",
              }}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4" style={{ borderColor: "var(--orphix-editor-border)" }} />
          ),
          table: ({ children }) => (
            <table className="w-full border-collapse my-3 text-sm" style={{ borderColor: "var(--orphix-editor-border)" }}>{children}</table>
          ),
          th: ({ children }) => (
            <th
              className="border px-3 py-2 text-left font-semibold"
              style={{
                borderColor: "var(--orphix-editor-border)",
                background: "var(--orphix-editor-gutter-bg)",
                color: "var(--orphix-editor-text)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="border px-3 py-2"
              style={{ borderColor: "var(--orphix-editor-border)", color: "var(--orphix-editor-text)" }}
            >
              {children}
            </td>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded my-3" />
          ),
          strong: ({ children }) => (
            <strong className="font-bold" style={{ color: "var(--orphix-editor-text)" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
