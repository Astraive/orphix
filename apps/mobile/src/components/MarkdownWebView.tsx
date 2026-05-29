import React, { useRef, useCallback } from "react";
import { View, Modal, TouchableOpacity, Text } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { X } from "lucide-react-native";

interface MarkdownWebViewProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

function buildMarkdownHtml(content: string): string {
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre style="background:#020708;border:1px solid #123238;border-radius:8px;padding:12px;margin:10px 0;overflow-x:auto"><code style="font-family:monospace;font-size:12px;color:#EEEEEE">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#020708;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em;color:#32E0C4">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:14px;font-weight:600;color:#EEEEEE;margin:14px 0 6px">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:#EEEEEE;margin:18px 0 8px">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:600;color:#EEEEEE;margin:22px 0 10px;border-bottom:1px solid #123238;padding-bottom:6px">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:21px;font-weight:700;color:#EEEEEE;margin:26px 0 12px;border-bottom:1px solid #123238;padding-bottom:8px">$1</h1>');

  // Bold / Italic / Strikethrough
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#EEEEEE">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del style="color:#8FA3A8">$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#32E0C4;text-decoration:underline;text-underline-offset:2px">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #32E0C4;padding:4px 12px;margin:8px 0;color:#8FA3A8;background:rgba(50,224,196,0.03);border-radius:0 6px 6px 0">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #123238;margin:18px 0" />');

  // Task lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="color:#32E0C4">✓</span><span style="text-decoration:line-through;color:#8FA3A8">$1</span></div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="color:#8FA3A8">○</span><span>$1</span></div>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:18px;list-style:disc;color:#EEEEEE;margin-bottom:4px">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:18px;list-style:decimal;color:#EEEEEE;margin-bottom:4px">$1</li>');

  // Paragraphs
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p style="margin:6px 0;line-height:1.7;color:#8FA3A8">$1</p>');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3, user-scalable=yes">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: #050D10; color: #EEEEEE; font-family: -apple-system, system-ui, sans-serif; font-size: 14px; padding: 16px; }
a { color: #32E0C4; }
</style>
</head>
<body>${html}</body>
</html>`;
}

export function MarkdownWebView({ visible, onClose, title, content }: MarkdownWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  const handleLoadEnd = useCallback(() => {
    // Inject mermaid rendering after page load
    const mermaidBlocks: string[] = [];
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      mermaidBlocks.push(match[1].trim());
    }
    if (mermaidBlocks.length > 0 && webViewRef.current) {
      const script = `
        (function() {
          var mermaidBlocks = ${JSON.stringify(mermaidBlocks)};
          var preElements = document.querySelectorAll('pre');
          var mermaidIdx = 0;
          preElements.forEach(function(pre) {
            var code = pre.querySelector('code');
            if (code && mermaidIdx < mermaidBlocks.length) {
              var div = document.createElement('div');
              div.id = 'mermaid-' + mermaidIdx;
              div.style.margin = '8px 0';
              div.style.overflow = 'auto';
              pre.parentNode.replaceChild(div, pre);
              mermaidIdx++;
            }
          });
          if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ startOnLoad: false, theme: 'dark' });
            for (var i = 0; i < mermaidBlocks.length; i++) {
              try {
                mermaid.render('mermaid-svg-' + i, mermaidBlocks[i]).then(function(result) {
                  document.getElementById('mermaid-' + i).innerHTML = result.svg;
                }).catch(function(e) {
                  document.getElementById('mermaid-' + i).innerHTML = '<div style="color:#FF5370;font-size:11px">Mermaid error: ' + e.message + '</div>';
                });
              } catch(e) {}
            }
          }
        })();
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [content]);

  // Replace mermaid blocks with placeholder divs for the WebView
  let displayContent = content;
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let mermaidIdx = 0;
  displayContent = displayContent.replace(mermaidRegex, () => {
    return `\`\`\`\n[mermaid diagram ${++mermaidIdx}]\n\`\`\``;
  });

  const htmlContent = buildMarkdownHtml(displayContent);

  // Inject mermaid script into HTML
  const htmlWithMermaid = htmlContent.replace(
    '</head>',
    '<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script></head>'
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#050D10" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#123238", backgroundColor: "#071418" }}>
          <Text style={{ color: "#EEEEEE", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={18} stroke="#8FA3A8" />
          </TouchableOpacity>
        </View>

        {/* WebView with rendered markdown + mermaid */}
        <WebView
          ref={webViewRef}
          source={{ html: htmlWithMermaid }}
          style={{ flex: 1, backgroundColor: "#050D10" }}
          javaScriptEnabled={true}
          onLoadEnd={handleLoadEnd}
          onMessage={(_event: WebViewMessageEvent) => {}}
        />
      </View>
    </Modal>
  );
}
