import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync("orphix_access_token");
    set({ isAuthenticated: !!token, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("orphix_access_token");
    await SecureStore.deleteItemAsync("orphix_refresh_token");
    set({ isAuthenticated: false });
  },
}));
