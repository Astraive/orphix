import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

function CodeBlock(props: any) {
  const { className, children, ...rest } = props;
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match?.[1] ?? "";
  const isInline = !className && !String(children).includes("\n");

  if (isInline) {
    return <code className="rounded bg-muted px-1.5 py-0.5 text-xs" {...rest}>{children}</code>;
  }

  return (
    <div className="relative my-2">
      {language && (
        <div className="absolute right-2 top-1 font-mono text-xs text-muted-foreground opacity-50">
          {language}
        </div>
      )}
      <pre className="overflow-auto rounded-lg border border-border bg-muted p-3">
        <code className="font-mono text-xs leading-relaxed" {...rest}>{children}</code>
      </pre>
    </div>
  );
}

export default function MarkdownPreview({ content }: Props) {
  if (!content) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Empty note</p>;
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-primary pl-3 italic text-muted-foreground">{children}</blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => <div className="my-2 overflow-auto"><table className="w-full border-collapse text-xs">{children}</table></div>,
          thead: ({ children }) => <thead className="border-b-2 border-border">{children}</thead>,
          th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-2 py-1 text-muted-foreground">{children}</td>,
          del: ({ children }) => <del className="text-muted-foreground">{children}</del>,
          input: ({ checked, type, ...props }) => {
            if (type === "checkbox") {
              return <input type="checkbox" checked={checked} readOnly className="mr-1 accent-primary" {...props} />;
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
