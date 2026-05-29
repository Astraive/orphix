import { useEffect } from "react";
import { useLinkStore } from "../stores/link-store";
import { useWebRTC } from "./use-webrtc";

export function useLinkConnection() {
  // Initialize WebRTC handler
  const { close } = useWebRTC();

  useEffect(() => {
    const applyStatus = (data: { status: string; deviceId: string | null; event?: string; data?: any }) => {
      const store = useLinkStore.getState();
      const enabled = useLinkStore.getState().enabled;

      // Map status from orphix-core → store
      if (data?.status) {
        const s = data.status;

        if (s === "auth_failed") {
          store.setStatus("error");
          store.setError(data?.data?.reason ?? "Authentication failed — please sign in again");
        } else if (s === "disconnected") {
          // If user explicitly disabled → show disabled
          // If connection dropped while enabled → show error with reconnect
          if (enabled) {
            store.setStatus("error");
            store.setError("Connection lost");
          } else {
            store.setStatus("disabled");
          }
        } else if (s === "error") {
          store.setStatus("error");
          store.setError(data?.data?.error ?? "Connection failed");
        } else if (s === "authenticated") {
          useLinkStore.setState({ enabled: true });
          store.setStatus("authenticated");
          store.setError(null);
        } else if (s === "connecting" || s === "connected") {
          useLinkStore.setState({ enabled: true });
          store.setStatus("connecting");
          store.setError(null);
        }
      }

      if (data?.deviceId) store.setDeviceId(data.deviceId);

      if (data?.event === "approval_request" && data?.data) {
        store.addApproval({
          sessionId: data.data.sessionId ?? data.data.session_id,
          mobileDeviceName: data.data.mobileDeviceName ?? data.data.mobile_device_name ?? "Unknown Device",
          mobileDeviceType: data.data.mobileDeviceType ?? data.data.mobile_device_type ?? "mobile",
          workspaceId: data.data.workspaceId ?? data.data.workspace_id,
          windowId: data.data.windowId ?? data.data.window_id,
          terminalId: data.data.terminalId ?? data.data.terminal_id,
          mode: data.data.mode ?? "full_control",
          transportMode: data.data.transportMode ?? data.data.transport_mode ?? "auto",
          requireE2ee: data.data.requireE2ee ?? data.data.require_e2ee ?? true,
          expiresIn: data.data.expiresIn ?? data.data.expires_in,
        });
      }

      if (data?.event === "link_approved" && data?.data) {
        store.addSession({
          sessionId: data.data.sessionId ?? data.data.session_id,
          desktopDeviceId: data.data.desktopDeviceId ?? data.data.desktop_device_id ?? "",
          mobileDeviceId: data.data.mobileDeviceId ?? data.data.mobile_device_id ?? "",
          status: "active",
          mode: data.data.mode ?? "full_control",
          activeTransport: data.data.activeTransport ?? data.data.active_transport ?? "pending",
        });
      }

      if (data?.event === "link_rejected" && data?.data) {
        store.removeApproval(data.data.sessionId ?? data.data.session_id);
      }
    };

    window.orphix?.link?.getStatus?.().then(applyStatus).catch(() => {});

    const unsub = window.orphix?.link?.onStatus?.((data) => {
      applyStatus(data);
    });

    return () => {
      unsub?.();
      close();
    };
  }, [close]);
}
