import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { C, S, R, FS, IS } from "@/theme/tokens";

const TERMINAL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #050D10; overflow: hidden; }
    #terminal { width: 100%; height: 100%; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css">
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js"></script>
</head>
<body>
  <div id="terminal"></div>
  <script>
    const term = new Terminal({
      theme: { background: '#050D10', foreground: '#EEEEEE', cursor: '#32E0C4', selectionBackground: 'rgba(50,224,196,0.2)' },
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true,
    });
    term.open(document.getElementById('terminal'));
    term.write('\\x1b[1;32mOrphix Terminal\\x1b[0m\\r\\n');
    term.write('\\x1b[90mConnected to desktop...\\x1b[0m\\r\\n\\r\\n');
    term.write('\\x1b[36m$\\x1b[0m ');

    window.writeToTerminal = (data) => term.write(data);
    window.onTerminalInput = null;
    term.onData((data) => {
      if (window.onTerminalInput) window.onTerminalInput(data);
    });

    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;

interface KeyButton {
  label: string;
  key: string;
  bg?: string;
  fg?: string;
  border?: string;
}

const KEY_BUTTONS: KeyButton[] = [
  { label: "Esc", key: "\x1b" },
  { label: "Tab", key: "\t" },
  { label: "Ctrl+C", key: "\x03" },
  { label: "Ctrl+D", key: "\x04" },
  { label: "Ctrl+L", key: "\x0c" },
  { label: "Ctrl+R", key: "\x12" },
  { label: "Ctrl+Z", key: "\x1a" },
  { label: "/", key: "/" },
  { label: "|", key: "|" },
  { label: "~", key: "~" },
  { label: "-", key: "-" },
];

const ARROW_BUTTONS: KeyButton[] = [
  { label: "\u2190", key: "\x1b[D" },
  { label: "\u2191", key: "\x1b[A" },
  { label: "\u2193", key: "\x1b[B" },
  { label: "\u2192", key: "\x1b[C" },
];

const AGENT_BUTTONS: KeyButton[] = [
  { label: "Approve", key: "approve", bg: C.primaryBg, fg: C.primary, border: C.primaryBorder },
  { label: "Reject", key: "reject", bg: C.dangerBg, fg: C.danger, border: C.dangerBorder },
  { label: "Pause", key: "pause", bg: C.accentBg, fg: C.accent, border: C.accentBorder },
  { label: "Stop", key: "stop", bg: C.dangerBg, fg: C.danger, border: C.dangerBorder },
  { label: "Resume", key: "resume", bg: C.primaryBg, fg: C.primary, border: C.primaryBorder },
];

export default function TerminalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [connected, setConnected] = useState(false);

  const sendKey = (key: string) => {
    webViewRef.current?.injectJavaScript(
      "if(window.onTerminalInput) window.onTerminalInput(" + JSON.stringify(key) + ")"
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") setConnected(true);
      else if (msg.type === "input") sendKey(msg.data);
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: S.sm }}>
          <Text style={{ color: C.textMuted, fontSize: FS.base }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>Terminal</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: R.full, backgroundColor: connected ? C.primary : C.textMuted }} />
          <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{connected ? "Live" : "..."}</Text>
        </View>
      </View>

      {/* Terminal */}
      <WebView
        ref={webViewRef}
        source={{ html: TERMINAL_HTML }}
        onMessage={handleWebViewMessage}
        style={{ flex: 1, backgroundColor: C.bg }}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Keyboard Toolbar */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface, paddingHorizontal: S.sm, paddingVertical: S.sm }}>
        {/* Special keys row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: S.sm }}>
            {KEY_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={() => sendKey(btn.key)}
                style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: FS.sm, fontFamily: "monospace" }}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Arrow keys + Enter + Backspace */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: S.sm, marginTop: S.sm }}>
          {ARROW_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.label}
              onPress={() => sendKey(btn.key)}
              style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ color: C.text, fontSize: FS.base, fontFamily: "monospace" }}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => sendKey("\r")}
            style={{ backgroundColor: C.primaryBgStrong, borderRadius: R.sm, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.primaryBorder }}
          >
            <Text style={{ color: C.primary, fontSize: FS.base, fontFamily: "monospace" }}>Enter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendKey("\x7f")}
            style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
          >
            <Text style={{ color: C.text, fontSize: FS.base, fontFamily: "monospace" }}>Bksp</Text>
          </TouchableOpacity>
        </View>

        {/* Agent controls */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm }}>
          <View style={{ flexDirection: "row", gap: S.sm }}>
            {AGENT_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={() => sendKey(btn.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: S.sm,
                  backgroundColor: btn.bg,
                  borderRadius: R.sm,
                  paddingHorizontal: S.lg,
                  paddingVertical: S.md,
                  borderWidth: 1,
                  borderColor: btn.border,
                }}
              >
                <Text style={{ color: btn.fg, fontSize: FS.sm, fontWeight: "500" }}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
