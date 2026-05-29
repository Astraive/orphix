import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/shell/PageHeader";

interface User {
  id: string;
  githubId: string;
  githubUsername: string;
  githubEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiFetch("/me").then((res) => res.json()).then(setUser).catch(console.error);
  }, []);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("orphix_refresh_token");
    const token = localStorage.getItem("orphix_access_token");
    if (refreshToken && token) {
      apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }).catch(() => {});
    }
    localStorage.removeItem("orphix_access_token");
    localStorage.removeItem("orphix_refresh_token");
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <div className="space-y-8">
        <PageHeader title="Settings" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-slide-up">
      <PageHeader title="Settings" description="Manage your account" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your Orphix account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-lg">{user.githubUsername[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-2xl font-semibold">{user.displayName ?? user.githubUsername}</p>
              <p className="text-muted-foreground">@{user.githubUsername}</p>
              {user.githubEmail && <p className="text-sm text-muted-foreground">{user.githubEmail}</p>}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">GitHub ID</p>
              <p className="font-mono">{user.githubId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member since</p>
              <p>{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <Separator />
          <Button variant="destructive" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </CardContent>
      </Card>
    </div>
  );
}
