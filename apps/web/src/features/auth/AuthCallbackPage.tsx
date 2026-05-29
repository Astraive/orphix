import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { CONTROL_URL } from "@/lib/env";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "forwarding" | "error">("loading");
  const [message, setMessage] = useState("Authenticating...");
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Authentication was denied.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    if (!code || !state) {
      navigate("/login", { replace: true });
      return;
    }

    fetch(`${CONTROL_URL}/auth/github/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Exchange failed");
        return res.json();
      })
      .then((data) => {
        const accessToken = data.tokens?.accessToken;
        const refreshToken = data.tokens?.refreshToken;
        if (!accessToken || !refreshToken) throw new Error("No tokens returned");

        localStorage.setItem("orphix_access_token", accessToken);
        localStorage.setItem("orphix_refresh_token", refreshToken);

        const CLIENT_REDIRECTS: Record<string, string> = {
          desktop: "orphix://auth/callback",
          mobile_android: "orphix://auth/callback",
          mobile_ios: "orphix://auth/callback",
        };

        const client = sessionStorage.getItem("orphix_client");
        sessionStorage.removeItem("orphix_client");
        sessionStorage.removeItem("orphix_state");

        if (client && CLIENT_REDIRECTS[client]) {
          setStatus("forwarding");
          setMessage("Signed in! Returning to app...");
          const deepLink = new URL(CLIENT_REDIRECTS[client]);
          deepLink.hash = `access_token=${accessToken}&refresh_token=${refreshToken}`;
          window.location.href = deepLink.toString();
          return;
        }

        setStatus("success");
        setMessage("Signed in successfully!");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      })
      .catch(() => {
        if (localStorage.getItem("orphix_access_token")) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setStatus("error");
        setMessage("Authentication failed. Redirecting...");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-foreground">{message}</p>
          </>
        )}
        {status === "forwarding" && (
          <>
            <ArrowRight className="h-8 w-8 mx-auto text-primary animate-pulse" />
            <p className="text-sm text-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">You can close this tab</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
