import { useEffect } from "react";
import { useLinkStore } from "../stores/link-store";
import { useWebRTC } from "./use-webrtc";
import { useNotificationStore } from "@/features/notifications/notification-store";

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
        const mobileDeviceName = data.data.mobileDeviceName ?? data.data.mobile_device_name ?? "Unknown Device";
        store.addApproval({
          sessionId: data.data.sessionId ?? data.data.session_id,
          mobileDeviceName,
          mobileDeviceType: data.data.mobileDeviceType ?? data.data.mobile_device_type ?? "mobile",
          workspaceId: data.data.workspaceId ?? data.data.workspace_id,
          windowId: data.data.windowId ?? data.data.window_id,
          terminalId: data.data.terminalId ?? data.data.terminal_id,
          mode: data.data.mode ?? "full_control",
          transportMode: data.data.transportMode ?? data.data.transport_mode ?? "auto",
          requireE2ee: data.data.requireE2ee ?? data.data.require_e2ee ?? true,
          expiresIn: data.data.expiresIn ?? data.data.expires_in,
        });
        useNotificationStore.getState().push({
          source: "link",
          severity: "info",
          title: "New device wants to connect",
          message: `${mobileDeviceName} requested ${data.data.mode ?? "full_control"} access.`,
          dedupeKey: `link:approval:${data.data.sessionId ?? data.data.session_id}`,
        });
        if (!document.hasFocus()) {
          window.orphix.system.notify({
            title: "New device wants to connect",
            body: `${mobileDeviceName} requested access to this desktop.`,
            severity: "info",
          }).catch(() => {});
        }
      }

      if (data?.event === "link_approved" && data?.data) {
        const mobileDeviceId = data.data.mobileDeviceId ?? data.data.mobile_device_id ?? "";
        store.addSession({
          sessionId: data.data.sessionId ?? data.data.session_id,
          desktopDeviceId: data.data.desktopDeviceId ?? data.data.desktop_device_id ?? "",
          mobileDeviceId,
          status: "active",
          mode: data.data.mode ?? "full_control",
          activeTransport: data.data.activeTransport ?? data.data.active_transport ?? "pending",
        });
        useNotificationStore.getState().push({
          source: "link",
          severity: "success",
          title: "Device connected",
          message: mobileDeviceId ? `${mobileDeviceId} is now linked.` : "A device is now linked.",
          dedupeKey: `link:approved:${data.data.sessionId ?? data.data.session_id}`,
        });
      }

      if (data?.event === "link_rejected" && data?.data) {
        store.removeApproval(data.data.sessionId ?? data.data.session_id);
        useNotificationStore.getState().push({
          source: "link",
          severity: "warning",
          title: "Link request rejected",
          message: "A pending device request was rejected.",
          dedupeKey: `link:rejected:${data.data.sessionId ?? data.data.session_id}`,
        });
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
