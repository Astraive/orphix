import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Github, Terminal, Shield, Smartphone, Monitor, Loader2 } from "lucide-react";
import { CONTROL_URL } from "@/lib/env";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const client = searchParams.get("client") ?? "web";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client === "web" && localStorage.getItem("orphix_access_token")) {
      navigate("/dashboard", { replace: true });
    }
  }, [client, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(`${CONTROL_URL}/auth/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUri }),
      });
      const data = await res.json();

      sessionStorage.setItem("orphix_client", client);
      sessionStorage.setItem("orphix_state", data.state);

      window.location.href = data.githubUrl;
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  const clientLabel = client === "desktop" ? "Desktop App" : client === "mobile" ? "Mobile App" : "Web Dashboard";
  const ClientIcon = client === "desktop" ? Monitor : client === "mobile" ? Smartphone : Terminal;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Terminal className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">Orphix</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to {clientLabel}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {[
            { icon: Terminal, text: "Control your desktop terminals from mobile" },
            { icon: Shield, text: "End-to-end encrypted P2P connection" },
            { icon: Smartphone, text: "Works from any device, anywhere" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-foreground/80">{text}</span>
            </div>
          ))}
        </div>

        {/* Client badge */}
        {client !== "web" && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-4">
            <ClientIcon className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Authenticating for <span className="font-medium text-foreground">{clientLabel}</span>
            </span>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Github className="h-5 w-5" />
          )}
          {loading ? "Connecting..." : "Sign in with GitHub"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to Orphix&apos;s terms of service
        </p>
      </div>
    </div>
  );
}
