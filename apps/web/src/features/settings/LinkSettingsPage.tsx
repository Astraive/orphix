import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { LinkSettings, TransportMode } from "@orphix/types";

export function LinkSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<LinkSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/me/link-settings").then(async (res) => {
      if (!res.ok) throw new Error("Failed to load");
      setSettings(await res.json());
    }).catch(() => setError("Failed to load settings"));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/me/link-settings", { method: "POST", body: JSON.stringify(settings) });
      if (!res.ok) throw new Error("Failed to save");
      setSettings(await res.json());
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-medium">Link Settings</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connection</h2>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <Label className="text-sm font-medium">Connection Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["auto", "Auto"],
                  ["webrtc", "Direct P2P"],
                  ["websocket", "Reliable Relay"],
                  ["local", "Local/LAN"],
                ] as Array<[TransportMode, string]>).map(([mode, label]) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={settings.transport.mode === mode ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, transport: { mode } })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Auto-approve connections</Label>
                <p className="text-xs text-muted-foreground">Automatically approve link requests from your devices</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.autoApprove}
                className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${settings.autoApprove ? "bg-primary" : "bg-input"}`}
                onClick={() => setSettings({ ...settings, autoApprove: !settings.autoApprove })}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${settings.autoApprove ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">End-to-end encryption</Label>
                <p className="text-xs text-muted-foreground">Relayed payloads stay unreadable to the Link API</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.encryption.e2ee}
                className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${settings.encryption.e2ee ? "bg-primary" : "bg-input"}`}
                onClick={() => setSettings({ ...settings, encryption: { ...settings.encryption, e2ee: !settings.encryption.e2ee } })}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${settings.encryption.e2ee ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Allow unencrypted relay traffic</Label>
                <p className="text-xs text-muted-foreground">Development only; production keeps this off</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.encryption.allowPlainRelay}
                className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${settings.encryption.allowPlainRelay ? "bg-primary" : "bg-input"}`}
                onClick={() => setSettings({ ...settings, encryption: { ...settings.encryption, allowPlainRelay: !settings.encryption.allowPlainRelay, securityMode: settings.encryption.allowPlainRelay ? "E2EE_REQUIRED" : "DEV_PLAINTEXT_ALLOWED" } })}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${settings.encryption.allowPlainRelay ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-sm font-medium">Auto-approve same-user devices</Label>
                <p className="text-xs text-muted-foreground">Trust devices logged into the same account</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.autoApproveSameUser}
                className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${settings.autoApproveSameUser ? "bg-primary" : "bg-input"}`}
                onClick={() => setSettings({ ...settings, autoApproveSameUser: !settings.autoApproveSameUser })}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${settings.autoApproveSameUser ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Label className="text-sm font-medium">Approval timeout (seconds)</Label>
              <p className="text-xs text-muted-foreground">How long to wait for manual approval before the request expires</p>
              <Input
                type="number"
                min={5}
                max={300}
                value={settings.approvalTimeout}
                onChange={(e) => setSettings({ ...settings, approvalTimeout: Number(e.target.value) })}
                className="w-32"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </main>
    </div>
  );
}
