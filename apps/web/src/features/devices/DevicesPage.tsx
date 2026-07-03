import { useMemo, useState } from "react";
import { Monitor, Smartphone, Shield, ShieldOff, Plus, Globe, Wifi, WifiOff, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDevices, type Device } from "./devices.api";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/shell/PageHeader";
import LoadingState from "@/components/shell/LoadingState";
import EmptyState from "@/components/shell/EmptyState";

function formatLastSeen(value: string | null): string {
  if (!value) return "Not seen yet";

  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getDeviceIcon(device: Device) {
  switch (device.deviceType) {
    case "desktop":
      return <Monitor className="h-5 w-5 text-foreground" />;
    case "web":
      return <Globe className="h-5 w-5 text-foreground" />;
    case "mobile":
    default:
      return <Smartphone className="h-5 w-5 text-foreground" />;
  }
}

function getStatusBadgeVariant(device: Device): "default" | "secondary" | "destructive" {
  if (device.status === "revoked") return "destructive";
  if (device.online) return "default";
  return "secondary";
}

export default function DevicesPage() {
  const { devices, loading, reload } = useDevices();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState({ deviceId: "", deviceType: "desktop", deviceName: "", publicKey: "" });

  const onlineCount = useMemo(() => devices.filter((device) => device.online).length, [devices]);
  const recentDevices = useMemo(
    () => devices.filter((device) => device.online || device.seenInLast7Days),
    [devices],
  );
  const trustedCount = useMemo(() => devices.filter((device) => device.status === "trusted").length, [devices]);

  const handleRegister = async () => {
    await apiFetch("/devices/register", {
      method: "POST",
      body: JSON.stringify(newDevice),
    });
    setRegisterOpen(false);
    setNewDevice({ deviceId: "", deviceType: "desktop", deviceName: "", publicKey: "" });
    reload();
  };

  const handleTrust = async (desktopId: string, mobileId: string) => {
    await apiFetch(`/devices/${desktopId}/trust`, {
      method: "POST",
      body: JSON.stringify({ targetDeviceId: mobileId, trustLevel: "full_control" }),
    });
    setTrustOpen(null);
    reload();
  };

  const handleRevoke = async (deviceId: string) => {
    await apiFetch(`/devices/${deviceId}/revoke`, { method: "POST" });
    reload();
  };

  return (
    <div className="space-y-6 anim-slide-up">
      <PageHeader
        title="Devices"
        description="Disconnect devices, review recent activity, and manage trusted access across desktop, web, and mobile."
        action={
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
                <DialogDescription>Save a new desktop, mobile, or web client with its public key.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deviceId">Device ID</Label>
                  <Input id="deviceId" value={newDevice.deviceId} onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })} placeholder="dev_abc123" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input id="deviceName" value={newDevice.deviceName} onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })} placeholder="Studio Desktop" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deviceType">Type</Label>
                  <select
                    id="deviceType"
                    value={newDevice.deviceType}
                    onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                    <option value="web">Web</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="publicKey">Public Key (Ed25519)</Label>
                  <Input id="publicKey" value={newDevice.publicKey} onChange={(e) => setNewDevice({ ...newDevice, publicKey: e.target.value })} placeholder="ed25519_public_key_base64" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRegister}>Register</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Online Right Now</CardDescription>
            <CardTitle className="text-3xl">{onlineCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Devices that are actively reachable from your account right now.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Seen In 7 Days</CardDescription>
            <CardTitle className="text-3xl">{recentDevices.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Desktop, web, and mobile clients that were recently active.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Trusted Devices</CardDescription>
            <CardTitle className="text-3xl">{trustedCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Devices with trusted approval status for tighter handoff flows.</CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingState />
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Monitor} title="No devices registered" description='Click "Register Device" to add one.' />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>All Registered Devices</CardTitle>
              <CardDescription>Disconnect access, trust mobile clients, and verify which names were last seen by your account.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {devices.map((device) => (
                <div key={device.id} className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                        {getDeviceIcon(device)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{device.deviceName}</p>
                          <Badge variant={getStatusBadgeVariant(device)}>
                            {device.online ? "online" : device.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(device.platform ?? device.deviceType).toUpperCase()} · {device.deviceId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {device.online ? <Wifi className="h-3.5 w-3.5 text-primary" /> : <WifiOff className="h-3.5 w-3.5" />}
                      {device.online ? "Live" : formatLastSeen(device.lastSeenAt)}
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap items-center gap-2">
                    {device.deviceType === "mobile" && device.status !== "trusted" && (
                      <Button size="sm" variant="outline" onClick={() => setTrustOpen(device.deviceId)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Trust
                      </Button>
                    )}
                    {device.status !== "revoked" && (
                      <Button size="sm" variant="destructive" onClick={() => handleRevoke(device.deviceId)}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Disconnect Device
                      </Button>
                    )}
                    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      {device.seenInLast7Days ? "Seen in the last 7 days" : "Older activity"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Clients that are online now or were active in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentDevices.length > 0 ? (
                recentDevices.map((device) => (
                  <div key={device.id} className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        {getDeviceIcon(device)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{device.deviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(device.platform ?? device.deviceType).toUpperCase()} · {device.online ? "online now" : `last seen ${formatLastSeen(device.lastSeenAt)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={History} title="No recent device activity" description="Recent devices will appear here once they connect." />
              )}
            </CardContent>
            <CardFooter className="pt-0 text-xs text-muted-foreground">
              Desktop registrations now preserve the OS device name and keep last-seen timestamps fresh as link presence updates arrive.
            </CardFooter>
          </Card>
        </div>
      )}

      <Dialog open={trustOpen !== null} onOpenChange={() => setTrustOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trust Device</DialogTitle>
            <DialogDescription>Select a desktop device to pair with this mobile client.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {devices.filter((device) => device.deviceType === "desktop").map((desktop) => (
              <Button key={desktop.id} variant="outline" className="w-full justify-start" onClick={() => handleTrust(desktop.deviceId, trustOpen!)}>
                <Monitor className="mr-2 h-4 w-4" />
                {desktop.deviceName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
