import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Terminal, Monitor, Smartphone, Loader2, Mail, Lock } from "lucide-react";
import { Button, Input } from "@orphix/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const client = searchParams.get("client") ?? "web";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuthActions();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", {
        email,
        password,
        flow: mode,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Auth failed:", err);
      setError(mode === "signin" ? "Invalid email or password" : "Could not create account");
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      await signIn("github");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signIn("google");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  const clientLabel = client === "desktop" ? "Desktop App" : client === "mobile" ? "Mobile App" : "Web Dashboard";
  const ClientIcon = client === "desktop" ? Monitor : client === "mobile" ? Smartphone : Terminal;

  return (
    <div className="w-full max-w-sm space-y-5 px-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Terminal className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Orphix</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to continue to {clientLabel}
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 pl-9"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-10 pl-9"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10"
        >
          {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {loading ? "Connecting..." : mode === "signin" ? "Sign in with Email" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-foreground underline underline-offset-2 hover:text-primary">
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => { setMode("signin"); setError(""); }} className="text-foreground underline underline-offset-2 hover:text-primary">
              Sign in
            </button>
          </>
        )}
      </p>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          onClick={handleGitHubLogin}
          disabled={loading}
          variant="outline"
          className="w-full h-10"
        >
          {loading ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Terminal data-icon="inline-start" />
          )}
          {loading ? "Connecting..." : "Sign in with GitHub"}
        </Button>

        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          variant="outline"
          className="w-full h-10"
        >
          {loading ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Terminal data-icon="inline-start" />
          )}
          {loading ? "Connecting..." : "Sign in with Google"}
        </Button>
      </div>

      {client !== "web" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2">
          <ClientIcon className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            Authenticating for <span className="font-medium text-foreground">{clientLabel}</span>
          </span>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        By signing in, you agree to Orphix&apos;s terms of service
      </p>
    </div>
  );
}
