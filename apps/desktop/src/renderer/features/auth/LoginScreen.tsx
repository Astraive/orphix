import { useEffect, useState, useCallback } from "react";
import { Terminal, Shield, Smartphone, Loader2 } from "lucide-react";

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Listen for auth callback from deep link
  useEffect(() => {
    const unsub = window.orphix?.auth?.onCallback?.(() => {
      setWaiting(false);
      onLoginSuccess();
    });
    return () => {
      unsub?.();
    };
  }, [onLoginSuccess]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      await window.orphix.auth.login();
      setWaiting(true);
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--orphix-color-base-background)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 380, padding: "0 24px" }}>
        {/* Logo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            margin: "0 auto 24px",
            background: "rgba(50,224,196,0.1)",
            border: "1px solid rgba(50,224,196,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Terminal size={32} color="#32E0C4" />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--orphix-color-text)",
            margin: "0 0 8px",
          }}
        >
          Orphix
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--orphix-color-text-muted)",
            margin: "0 0 32px",
          }}
        >
          Secure terminal control from anywhere
        </p>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {[
            { icon: Terminal, text: "Control your desktop terminals from mobile" },
            { icon: Shield, text: "End-to-end encrypted P2P connection" },
            { icon: Smartphone, text: "Works from any device, anywhere" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--orphix-color-base-surface)",
                border: "1px solid var(--orphix-color-base-border)",
              }}
            >
              <Icon size={14} color="var(--orphix-color-primary)" />
              <span style={{ fontSize: 14, color: "var(--orphix-color-text-muted)" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Login Button */}
        {waiting ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "var(--orphix-color-text-muted)", marginBottom: 8 }}>
              Complete login in your browser...
            </div>
            <Loader2
              size={20}
              color="var(--orphix-color-primary)"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 8,
              background: "var(--orphix-color-text)",
              color: "var(--orphix-color-background)",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <GithubIcon size={18} />
            )}
            Sign in with GitHub
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
