import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Authenticating...");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("success");
      setMessage("Signed in successfully!");
      setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
