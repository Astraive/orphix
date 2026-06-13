import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import Sidebar from "@/components/shell/Sidebar";
import MobileSidebar from "@/components/shell/MobileSidebar";
import Topbar from "@/components/shell/Topbar";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useQuery(api.users.getCurrentUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user === null) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { signOut } = useAuthActions();
  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const userData = user ? {
    id: user._id as string,
    githubUsername: (user.githubUsername ?? user.name ?? "user") as string,
    displayName: user.name ?? null,
    avatarUrl: user.image ?? null,
  } : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background lg:pl-64">
      <Sidebar user={userData} onLogout={handleLogout} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} user={userData} onLogout={handleLogout} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full px-4 py-6 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
