import { useState } from "react";
import { Monitor, Smartphone, Shield, ShieldOff, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDevices, type Device } from "./devices.api";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/shell/PageHeader";
import LoadingState from "@/components/shell/LoadingState";
import EmptyState from "@/components/shell/EmptyState";

export default function DevicesPage() {
  const { devices, loading, reload } = useDevices();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState({ deviceId: "", deviceType: "desktop", deviceName: "", publicKey: "" });

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
        description="Manage your registered devices and trust relationships"
        action={
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Register Device</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
                <DialogDescription>Register a device with its public key</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceId">Device ID</Label>
                  <Input id="deviceId" value={newDevice.deviceId} onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })} placeholder="dev_abc123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input id="deviceName" value={newDevice.deviceName} onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })} placeholder="Neeraj's PC" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceType">Type</Label>
                  <select id="deviceType" value={newDevice.deviceType} onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publicKey">Public Key (Ed25519)</Label>
                  <Input id="publicKey" value={newDevice.publicKey} onChange={(e) => setNewDevice({ ...newDevice, publicKey: e.target.value })} placeholder="ed25519_public_key_base64" />
                </div>
              </div>
              <DialogFooter><Button onClick={handleRegister}>Register</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full"><LoadingState /></div>
        ) : devices.length === 0 ? (
          <div className="col-span-full">
            <Card><CardContent className="p-0"><EmptyState icon={Monitor} title="No devices registered" description='Click "Register Device" to add one.' /></CardContent></Card>
          </div>
        ) : (
          devices.map((device: Device) => (
            <Card key={device.id} className="hover:border-primary/20 transition-all duration-200">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {device.deviceType === "desktop" ? <Monitor className="h-5 w-5 text-foreground" /> : <Smartphone className="h-5 w-5 text-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{device.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{device.platform ?? device.deviceType}</p>
                    </div>
                  </div>
                  <Badge className="shrink-0 text-[10px]" variant={device.status === "trusted" ? "default" : device.status === "revoked" ? "destructive" : "secondary"}>
                    {device.status}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {device.deviceId}
                  <span className="ml-2">&middot; registered {new Date(device.createdAt).toLocaleDateString()}</span>
                </p>
                <div className="flex items-center gap-2">
                  {device.deviceType === "mobile" && device.status !== "trusted" && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setTrustOpen(device.deviceId)}>
                      <Shield className="mr-2 h-4 w-4" /> Trust
                    </Button>
                  )}
                  {device.status !== "revoked" && (
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRevoke(device.deviceId)}>
                      <ShieldOff className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={trustOpen !== null} onOpenChange={() => setTrustOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trust Device</DialogTitle>
            <DialogDescription>Select a desktop device to pair with this mobile</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {devices.filter((d: Device) => d.deviceType === "desktop").map((desktop: Device) => (
              <Button key={desktop.id} variant="outline" className="w-full justify-start" onClick={() => handleTrust(desktop.deviceId, trustOpen!)}>
                <Monitor className="mr-2 h-4 w-4" /> {desktop.deviceName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
