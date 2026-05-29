import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export interface Device {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  platform: string | null;
  status: string;
  online: boolean;
  lastSeenAt: string | null;
}

interface DeviceState {
  devices: Device[];
  loading: boolean;
  loadDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  loading: true,

  loadDevices: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch("/me/devices");
      if (res.ok) {
        set({ devices: await res.json() });
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      set({ loading: false });
    }
  },
}));
