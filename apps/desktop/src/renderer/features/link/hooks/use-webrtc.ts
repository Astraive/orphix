import { useEffect, useRef, useCallback } from "react";
import { WebRTCClient, type RTCIceConfig } from "../lib/webrtc-client";
import { useLinkStore } from "../stores/link-store";
import { CHANNELS } from "@shared/ipc/channels";

let cachedLinkUrl: string | null = null;

async function getLinkUrl(): Promise<string> {
  if (cachedLinkUrl) return cachedLinkUrl;
  try {
    const result = (await window.orphix?.invoke(CHANNELS.LINK_GET_URL)) as { linkUrl?: string } | undefined;
    if (result?.linkUrl) {
      cachedLinkUrl = result.linkUrl.replace(/^ws/, "http"); // ICE config is HTTP, not WS
      return cachedLinkUrl;
    }
  } catch { /* ignore */ }
  return (import.meta.env.VITE_LINK_URL as string)?.replace(/^ws/, "http") ?? "http://localhost:2606";
}

function normalizeIceCandidate(candidate: unknown): RTCIceCandidateInit | null {
  if (!candidate) return null;
  if (typeof candidate === "string") {
    try {
      return normalizeIceCandidate(JSON.parse(candidate));
    } catch {
      return { candidate };
    }
  }
  if (typeof candidate === "object") {
    const value = candidate as RTCIceCandidateInit;
    return typeof value.candidate === "string" ? value : null;
  }
  return null;
}

export function useWebRTC() {
  const clientRef = useRef<WebRTCClient | null>(null);
  const iceConfigRef = useRef<RTCIceConfig | null>(null);
  const attachedTerminalsRef = useRef(new Set<string>());

  const setP2PState = useLinkStore((s) => s.setP2PState);

  // Fetch ICE config from link API
  const fetchIceConfig = useCallback(async (): Promise<RTCIceConfig> => {
    if (iceConfigRef.current) return iceConfigRef.current;
    const baseUrl = await getLinkUrl();
    const res = await fetch(`${baseUrl}/v1/link/ice-config`);
    const config: RTCIceConfig = await res.json();
    iceConfigRef.current = config;
    return config;
  }, []);

  // Send a signaling message to the link API via main process
  const sendSignal = useCallback((msg: Record<string, unknown>) => {
    const sessionId = msg.sessionId ?? msg.session_id;
    window.orphix?.link?.sendSignal({
      type: msg.type ?? msg.signal_type,
      session_id: sessionId,
      ...(typeof msg.sdp === "string" ? { sdp: msg.sdp } : {}),
      ...(msg.candidate !== undefined ? { candidate: msg.candidate } : {}),
    });
  }, []);

  // Create WebRTC peer for an incoming offer (mobile-initiated)
  const handleOffer = useCallback(
    async (sessionId: string, sdp: string) => {
      const iceConfig = await fetchIceConfig();

      const client = new WebRTCClient(
        {
          sessionId,
          iceConfig,
          onSignal: sendSignal,
          onDataChannelOpen: () => setP2PState("p2p_connected"),
          onDataChannelClose: () => setP2PState("idle"),
          onTerminalInput: (terminalId, data) => {
            // Forward input from DataChannel to main process terminal
            window.orphix?.invoke(CHANNELS.TERMINAL_WRITE, { terminalId, data });
          },
          onTerminalAttach: async (_sid, terminalId) => {
            if (!terminalId) return;
            attachedTerminalsRef.current.add(terminalId);
            try {
              const chunks = (await window.orphix?.invoke(CHANNELS.TERMINAL_OUTPUT_RANGE, {
                terminalId,
                session_id: terminalId,
                fromSeq: 0,
                from_seq: 0,
                toSeq: Number.MAX_SAFE_INTEGER,
                to_seq: Number.MAX_SAFE_INTEGER,
              })) as Array<{ data?: string }> | undefined;
              for (const chunk of chunks ?? []) {
                if (typeof chunk.data === "string") {
                  clientRef.current?.sendTerminalOutput(chunk.data, terminalId);
                }
              }
            } catch (err) {
              console.warn("[webrtc] Failed to replay terminal output:", err);
            }
          },
          onTerminalResize: (terminalId, cols, rows) => {
            window.orphix?.invoke(CHANNELS.TERMINAL_RESIZE, { terminalId, cols, rows });
          },
        },
        true, // mobile is offerer, desktop handles offer
      );

      await client.start();
      const answerSdp = await client.handleOffer(sdp);

      // Send answer back via signaling
      sendSignal({
        type: "webrtc.answer",
        sessionId,
        sdp: answerSdp,
      });

      clientRef.current = client;
      setP2PState("p2p_connecting");
    },
    [fetchIceConfig, sendSignal, setP2PState],
  );

  // Handle incoming ICE candidate
  const handleIce = useCallback(async (_sessionId: string, candidate: unknown) => {
    const normalized = normalizeIceCandidate(candidate);
    if (clientRef.current && normalized) {
      await clientRef.current.handleIce(normalized);
    }
  }, []);

  // Listen for WebRTC signaling messages from main process (sent via WEBRTC_SIGNAL channel)
  useEffect(() => {
    const unsubSignal = window.orphix?.link?.onWebRTCSignal?.((msg) => {
      const type = msg.type ?? msg.signal_type;
      const sessionId = String(msg.sessionId ?? msg.session_id ?? "");
      switch (type) {
        case "webrtc.offer":
          if (sessionId && typeof msg.sdp === "string") {
            handleOffer(sessionId, msg.sdp);
          }
          break;
        case "webrtc.ice":
          if (sessionId) {
            handleIce(sessionId, msg.candidate);
          }
          break;
      }
    });

    // Forward terminal output to DataChannel for mobile
    const unsubOutput = window.orphix?.on(CHANNELS.TERMINAL_OUTPUT, (data: any) => {
      if (clientRef.current?.dataChannelState === "open" && data) {
        const terminalId = data.terminalId ?? data.session_id;
        if (!terminalId || attachedTerminalsRef.current.has(terminalId)) {
          clientRef.current.sendTerminalOutput(data.data ?? "", terminalId);
        }
      }
    });

    // Forward terminal state changes to DataChannel
    const unsubState = window.orphix?.on(CHANNELS.TERMINAL_STATE, (data: any) => {
      if (clientRef.current?.dataChannelState === "open" && data) {
        clientRef.current.sendTerminalState(data.terminalId ?? data.session_id, data.status ?? "running");
      }
    });

    // Forward terminal exit to DataChannel
    const unsubExit = window.orphix?.on(CHANNELS.TERMINAL_EXIT, (data: any) => {
      if (clientRef.current?.dataChannelState === "open" && data) {
        clientRef.current.sendTerminalExit(data.terminalId ?? data.session_id, data.exitCode ?? data.exit_code ?? null);
      }
    });

    return () => {
      unsubSignal?.();
      unsubOutput?.();
      unsubState?.();
      unsubExit?.();
      clientRef.current?.close();
      clientRef.current = null;
      attachedTerminalsRef.current.clear();
    };
  }, [handleOffer, handleIce]);

  const close = useCallback(() => clientRef.current?.close(), []);
  const isConnected = useCallback(() => clientRef.current?.dataChannelState === "open", []);

  return { close, isConnected };
}
