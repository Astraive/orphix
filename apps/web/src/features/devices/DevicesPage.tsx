import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Monitor, Smartphone, Shield, ShieldOff, Plus, Globe, Wifi, WifiOff, History } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@orphix/ui";
import { Button } from "@orphix/ui";
import { Badge } from "@orphix/ui";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@orphix/ui";
import { Input } from "@orphix/ui";
import { Label } from "@orphix/ui";
import { Separator } from "@orphix/ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@orphix/ui";
import { Skeleton } from "@orphix/ui";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/shell/EmptyState";

function formatLastSeen(value: number | null | undefined): string {
  if (value == null) return "Not seen yet";
  const minutes = Math.max(1, Math.floor((Date.now() - value) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case "desktop":
      return <Monitor className="h-5 w-5 text-foreground" />;
    case "web":
      return <Globe className="h-5 w-5 text-foreground" />;
    case "mobile":
    default:
      return <Smartphone className="h-5 w-5 text-foreground" />;
  }
}

export default function DevicesPage() {
  const user = useQuery(api.users.getCurrentUser);
  const devices = useQuery(
    api.devices.listByUser,
    user ? { userId: user._id } : "skip"
  );
  const registerDevice = useMutation(api.devices.register);
  const trustDevice = useMutation(api.trustedDevices.trust);
  const revokeDevice = useMutation(api.trustedDevices.revoke);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState({ deviceId: "", deviceType: "desktop", deviceName: "", publicKey: "" });

  const loading = devices === undefined;
  const deviceList = devices ?? [];

  const onlineCount = useMemo(() => {
    // Online status is tracked in Redis, not in Convex
    // For now, treat devices with recent lastSeenAt as online
    return deviceList.filter((d) => d.lastSeenAt && Date.now() - d.lastSeenAt < 60_000).length;
  }, [deviceList]);

  const trustedCount = useMemo(() => deviceList.filter((d) => d.status === "trusted").length, [deviceList]);

  const handleRegister = async () => {
    if (!user) return;
    try {
      await registerDevice({
        userId: user._id,
        ...newDevice,
      });
      setRegisterOpen(false);
      setNewDevice({ deviceId: "", deviceType: "desktop", deviceName: "", publicKey: "" });
    } catch (err) {
      console.error("Failed to register device:", err);
    }
  };

  const handleTrust = async (desktopId: string, mobileId: string) => {
    if (!user) return;
    try {
      await trustDevice({
        userId: user._id,
        desktopDeviceId: desktopId,
        mobileDeviceId: mobileId,
        trustLevel: "full_control",
      });
      setTrustOpen(null);
    } catch (err) {
      console.error("Failed to trust device:", err);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!user) return;
    try {
      await revokeDevice({ userId: user._id, deviceId });
    } catch (err) {
      console.error("Failed to revoke device:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 anim-slide-up">
      <PageHeader
        title="Devices"
        description="Manage devices, review recent activity, and control trusted access."
        action={
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus data-icon="inline-start" />
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
                  <Select value={newDevice.deviceType} onValueChange={(value) => setNewDevice({ ...newDevice, deviceType: value })}>
                    <SelectTrigger id="deviceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                    </SelectContent>
                  </Select>
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
            <CardTitle className="text-3xl">{loading ? <Skeleton className="h-8 w-12" /> : onlineCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Devices that are actively reachable.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Devices</CardDescription>
            <CardTitle className="text-3xl">{loading ? <Skeleton className="h-8 w-12" /> : deviceList.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">All registered devices.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Trusted Devices</CardDescription>
            <CardTitle className="text-3xl">{loading ? <Skeleton className="h-8 w-12" /> : trustedCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">Devices with trusted approval status.</CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : deviceList.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Monitor} title="No devices registered" description='Click "Register Device" to add one.' />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Registered Devices</CardTitle>
            <CardDescription>Manage access, trust mobile clients, and verify device status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {deviceList.map((device) => (
              <div key={device._id} className="rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{device.deviceName}</p>
                        <Badge variant={device.status === "revoked" ? "destructive" : device.status === "trusted" ? "default" : "secondary"}>
                          {device.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(device.platform ?? device.deviceType).toUpperCase()} · {device.deviceId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {device.lastSeenAt && Date.now() - device.lastSeenAt < 60_000 ? (
                      <><Wifi className="h-3.5 w-3.5 text-primary" /> Live</>
                    ) : (
                      <><WifiOff className="h-3.5 w-3.5" /> {formatLastSeen(device.lastSeenAt)}</>
                    )}
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex flex-wrap items-center gap-2">
                  {device.deviceType === "mobile" && device.status !== "trusted" && (
                    <Button size="sm" variant="outline" onClick={() => setTrustOpen(device.deviceId)}>
                      <Shield data-icon="inline-start" /> Trust
                    </Button>
                  )}
                  {device.status !== "revoked" && (
                    <Button size="sm" variant="destructive" onClick={() => handleRevoke(device.deviceId)}>
                      <ShieldOff data-icon="inline-start" /> Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={trustOpen !== null} onOpenChange={() => setTrustOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trust Device</DialogTitle>
            <DialogDescription>Select a desktop device to pair with this mobile client.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {deviceList.filter((d) => d.deviceType === "desktop").map((desktop) => (
              <Button key={desktop._id} variant="outline" className="w-full justify-start" onClick={() => handleTrust(desktop.deviceId, trustOpen!)}>
                <Monitor data-icon="inline-start" /> {desktop.deviceName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
