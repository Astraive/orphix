import { useNavigate } from "react-router-dom";
import { Monitor, Wifi, WifiOff, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDevices, type Device } from "@/features/devices/devices.api";
import LoadingState from "@/components/shell/LoadingState";
import EmptyState from "@/components/shell/EmptyState";
import PageHeader from "@/components/shell/PageHeader";

export default function DashboardHomePage() {
  const { devices, loading } = useDevices();
  const desktops = devices.filter((d: Device) => d.deviceType === "desktop");

  return (
    <div className="space-y-6 anim-slide-up">
      <PageHeader title="Orphix" description="Control your desktop terminals from anywhere" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            Your Desktops
          </CardTitle>
          <CardDescription>Link to an online desktop to access its terminals</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : desktops.length === 0 ? (
            <EmptyState icon={Monitor} title="No desktop devices registered" description="Install Orphix on your desktop to get started" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {desktops.map((device: Device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceCard({ device }: { device: Device }) {
  const navigate = useNavigate();
  const isOnline = device.online;

  return (
    <Card className="hover:border-primary/20 transition-all duration-200">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Monitor className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{device.deviceName}</p>
              <p className="text-[11px] text-muted-foreground">{device.platform ?? "Desktop"}</p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="shrink-0 text-[10px]">
            {isOnline ? (
              <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Online</span>
            ) : (
              <span className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Offline</span>
            )}
          </Badge>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {device.deviceId}
          {device.lastSeenAt && <span className="ml-2">&middot; last seen {new Date(device.lastSeenAt).toLocaleString()}</span>}
        </p>
        <Button className="w-full" size="sm" disabled={!isOnline} onClick={() => navigate(`/dashboard/link/${device.deviceId}`)}>
          <Link2 className="mr-2 h-3.5 w-3.5" /> Link
        </Button>
      </CardContent>
    </Card>
  );
}
