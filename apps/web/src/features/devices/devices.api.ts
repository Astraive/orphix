import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface Device {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  platform: string | null;
  publicKey: string;
  status: string;
  online: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  appVersion?: string | null;
  seenInLast7Days?: boolean;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/me/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load devices:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  return { devices, loading, reload: loadDevices };
}
