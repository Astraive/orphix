import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { ArrowLeft, Wifi, WifiOff, Loader2, AlertCircle, RefreshCw, Unplug } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";
import { useLinkStore, sendTerminalInput, attachTerminal, sendTerminalResize } from "@/stores/link-store";

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


function AnimatedKeyButton({ label, keyVal, onPress, style, textStyle }: {
  label: string; keyVal: string; onPress: (key: string) => void; style: any; textStyle: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => onPress(keyVal)}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        style={style}
      >
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
export default function TerminalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const lastFlushedRef = useRef(0);
  const [webViewReady, setWebViewReady] = useState(false);

  const linkState = useLinkStore((s) => s.state);
  const error = useLinkStore((s) => s.error);
  const desktopDeviceId = useLinkStore((s) => s.desktopDeviceId);
  const terminalOutput = useLinkStore((s) => s.terminalOutput);
  const connectionMode = useLinkStore((s) => s.connectionMode);
  const connect = useLinkStore((s) => s.connect);
  const requestLink = useLinkStore((s) => s.requestLink);
  const startRelay = useLinkStore((s) => s.startRelay);
  const setConnectionMode = useLinkStore((s) => s.setConnectionMode);
  const clearTerminalOutput = useLinkStore((s) => s.clearTerminalOutput);

  // Auto-connect and request link on mount
  useEffect(() => {
    if (linkState === "idle") {
      connect().then(() => {
        if (desktopDeviceId) {
          requestLink(desktopDeviceId);
        }
      });
    }
  }, [connect, desktopDeviceId, linkState, requestLink]);

  // Attach to the terminal on the desktop when connected
  useEffect(() => {
    if (linkState === "p2p_connected" && id) {
      clearTerminalOutput();
      lastFlushedRef.current = 0;
      attachTerminal(id);
    }
  }, [linkState, id]);

  // Flush terminal output to the WebView
  useEffect(() => {
    if (!webViewReady || terminalOutput.length === 0) return;

    const newChunks = terminalOutput.slice(lastFlushedRef.current);
    lastFlushedRef.current = terminalOutput.length;

    if (newChunks.length > 0) {
      const escaped = newChunks.map((c) => JSON.stringify(c)).join(",");
      webViewRef.current?.injectJavaScript(
        `[${escaped}].forEach(c => window.writeToTerminal(c))`
      );
    }
  }, [terminalOutput, webViewReady]);

  const sendKey = useCallback((key: string) => {
    if (linkState === "p2p_connected" || linkState === "terminal_attached") {
      sendTerminalInput(key);
    }
  }, [linkState]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        setWebViewReady(true);
      } else if (msg.type === "input") {
        sendTerminalInput(msg.data);
      }
    } catch {}
  }, []);

  const handleDisconnect = () => {
    useLinkStore.getState().reset();
    router.back();
  };

  const handleUseRelay = () => {
    if (id) {
      startRelay(id);
    }
  };

  const handleRetry = () => {
    useLinkStore.getState().reset();
    if (id) {
      connect().then(() => requestLink(id));
    }
  };

  const isConnected = linkState === "p2p_connected" || linkState === "terminal_attached";
  const isConnecting = ["connecting", "connected", "authenticated", "requesting", "awaiting_approval", "p2p_connecting"].includes(linkState);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <TouchableOpacity onPress={handleDisconnect} style={{ padding: S.sm }}>
          <ArrowLeft size={IS.lg} stroke={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>Terminal</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          {isConnected && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.xs }}>
              <Wifi size={IS.xs} stroke={C.primary} />
              <Text style={{ color: C.primary, fontSize: FS.xs, fontWeight: "500" }}>
                {connectionMode === "websocket" ? "Relay" : "P2P"}
              </Text>
            </View>
          )}
          {isConnected && (
            <TouchableOpacity onPress={handleDisconnect} style={{ padding: S.sm }}>
              <Unplug size={IS.md} stroke={C.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Connection states */}
      {isConnecting && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.xxxl, gap: S.lg }}>
          <Loader2 size={IS.xxl} stroke={C.accent} />
          <Text style={{ color: C.accent, fontSize: FS.lg, fontWeight: "600", textAlign: "center" }}>
            {linkState === "awaiting_approval" ? "Waiting for approval" : "Connecting..."}
          </Text>
          <Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center", lineHeight: 20 }}>
            {linkState === "awaiting_approval"
              ? "Approve the link request on your desktop"
              : "Establishing secure connection to your desktop"}
          </Text>
          <TouchableOpacity
            onPress={handleDisconnect}
            style={{ backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.xxl, paddingVertical: S.md, borderWidth: 1, borderColor: C.border, marginTop: S.md }}
          >
            <Text style={{ color: C.textMuted, fontSize: FS.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {linkState === "error" && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.xxxl, gap: S.lg }}>
          <AlertCircle size={IS.xxl} stroke={C.danger} />
          <Text style={{ color: C.danger, fontSize: FS.lg, fontWeight: "600", textAlign: "center" }}>
            Connection failed
          </Text>
          <Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center", lineHeight: 20 }}>
            {error ?? "Could not establish connection"}
          </Text>
          <View style={{ flexDirection: "row", gap: S.md, marginTop: S.md }}>
            <TouchableOpacity
              onPress={handleUseRelay}
              style={{ backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: S.sm }}
            >
              <RefreshCw size={IS.sm} stroke={C.text} />
              <Text style={{ color: C.text, fontSize: FS.sm }}>Use Relay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRetry}
              style={{ backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: S.sm }}
            >
              <RefreshCw size={IS.sm} stroke={C.text} />
              <Text style={{ color: C.text, fontSize: FS.sm }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDisconnect}
              style={{ backgroundColor: C.dangerBg, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.dangerBorder }}
            >
              <Text style={{ color: C.danger, fontSize: FS.sm }}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Terminal (only when connected) */}
      {isConnected && (
        <>
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
                  <AnimatedKeyButton
                    key={btn.label}
                    label={btn.label}
                    keyVal={btn.key}
                    onPress={sendKey}
                    style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
                    textStyle={{ color: C.text, fontSize: FS.sm, fontFamily: "monospace" }}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Arrow keys + Enter + Backspace */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: S.sm, marginTop: S.sm }}>
              {ARROW_BUTTONS.map((btn) => (
                <AnimatedKeyButton
                  key={btn.label}
                  label={btn.label}
                  keyVal={btn.key}
                  onPress={sendKey}
                  style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
                  textStyle={{ color: C.text, fontSize: FS.base, fontFamily: "monospace" }}
                />
              ))}
              <AnimatedKeyButton
                label="Enter"
                keyVal={"\r"}
                onPress={sendKey}
                style={{ backgroundColor: C.primaryBgStrong, borderRadius: R.sm, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.primaryBorder }}
                textStyle={{ color: C.primary, fontSize: FS.base, fontFamily: "monospace" }}
              />
              <AnimatedKeyButton
                label="Bksp"
                keyVal={"\x7f"}
                onPress={sendKey}
                style={{ backgroundColor: C.surfaceElevated, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: C.border }}
                textStyle={{ color: C.text, fontSize: FS.base, fontFamily: "monospace" }}
              />
            </View>

            {/* Agent controls */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm }}>
              <View style={{ flexDirection: "row", gap: S.sm }}>
                {AGENT_BUTTONS.map((btn) => (
                  <AnimatedKeyButton
                    key={btn.label}
                    label={btn.label}
                    keyVal={btn.key}
                    onPress={sendKey}
                    style={{ flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: btn.bg, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderWidth: 1, borderColor: btn.border }}
                    textStyle={{ color: btn.fg, fontSize: FS.sm, fontWeight: "500" }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
