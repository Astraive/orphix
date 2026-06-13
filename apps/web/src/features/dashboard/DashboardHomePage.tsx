import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Monitor, Wifi, WifiOff, Link2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@orphix/ui";
import { Button } from "@orphix/ui";
import { Badge } from "@orphix/ui";
import { Skeleton } from "@orphix/ui";
import EmptyState from "@/components/shell/EmptyState";
import PageHeader from "@/components/shell/PageHeader";

export default function DashboardHomePage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const devices = useQuery(
    api.devices.listByUser,
    user ? { userId: user._id } : "skip"
  );

  const loading = devices === undefined;
  const deviceList = devices ?? [];
  const desktops = deviceList.filter((d) => d.deviceType === "desktop");
  const mobiles = deviceList.filter((d) => d.deviceType === "mobile");
  const onlineCount = deviceList.filter((d) => d.lastSeenAt && Date.now() - d.lastSeenAt < 60_000).length;

  return (
    <div className="flex flex-col gap-6 anim-slide-up">
      <PageHeader title="Dashboard" description="Welcome back to Orphix" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Devices</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {loading ? <Skeleton className="h-8 w-12" /> : deviceList.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {loading ? <Skeleton className="h-4 w-32 inline-block" /> : `${desktops.length} desktops, ${mobiles.length} mobile`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Online Now</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {loading ? <Skeleton className="h-8 w-12" /> : onlineCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {loading ? <Skeleton className="h-4 w-32 inline-block" /> : "Devices currently reachable"}
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription>Quick Actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/dashboard/devices")}>
              <Monitor data-icon="inline-start" /> Manage Devices
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/dashboard/notes")}>
              <Globe data-icon="inline-start" /> View Notes
            </Button>
          </CardContent>
        </Card>
      </div>

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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : desktops.length === 0 ? (
            <EmptyState icon={Monitor} title="No desktop devices registered" description="Install Orphix on your desktop to get started" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {desktops.map((device) => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceCard({ device }: { device: { _id: string; deviceId: string; deviceName: string; deviceType: string; platform?: string; status: string; lastSeenAt?: number } }) {
  const navigate = useNavigate();
  const isOnline = device.lastSeenAt && Date.now() - device.lastSeenAt < 60_000;

  return (
    <Card className="hover:border-primary/20 transition-all duration-200">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
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
          <Link2 data-icon="inline-start" /> Link
        </Button>
      </CardContent>
    </Card>
  );
}
