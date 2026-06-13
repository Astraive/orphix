import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  user: { username?: string } | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  token: null,
  user: null,
  login: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username?: string } | null>(null);

  // Check auth status on mount — never blocks rendering
  useEffect(() => {
    window.orphix.auth
      .getStatus()
      .then((status) => {
        if (status?.isAuthenticated) {
          setIsAuthenticated(true);
          setUser(status.user ?? null);
          return window.orphix.auth.getToken();
        }
        return null;
      })
      .then((t) => {
        if (t) setToken(t);
      })
      .catch(() => {});
  }, []);

  // Listen for deep link callback arriving from the main process
  useEffect(() => {
    const unsub = window.orphix?.auth?.onCallback?.((tokens) => {
      setToken(tokens.accessToken);
      setIsAuthenticated(true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  const login = useCallback(async () => {
    await window.orphix.auth.login();
  }, []);

  const logout = useCallback(async () => {
    await window.orphix.auth.logout();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Never gate rendering — app always opens, auth is optional
  return (
    <AuthContext.Provider value={{ isAuthenticated, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
