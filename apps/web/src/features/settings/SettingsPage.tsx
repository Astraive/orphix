import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Separator, Avatar, AvatarImage, AvatarFallback } from "@orphix/ui";
import PageHeader from "@/components/shell/PageHeader";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);

  const handleLogout = async () => {
    await signOut();
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
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-lg">{user.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-2xl font-semibold">{user.name ?? "User"}</p>
              {user.email && <p className="text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono text-xs">{user._id}</p>
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
