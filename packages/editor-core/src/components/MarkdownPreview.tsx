import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "var(--orphix-editor-bg)", color: "var(--orphix-editor-text)" }}>
      <div className="prose prose-invert max-w-none" style={{ fontFamily: "var(--orphix-font-code, monospace)" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default MarkdownPreview;
