import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import Sidebar from "@/components/shell/Sidebar";
import MobileSidebar from "@/components/shell/MobileSidebar";
import Topbar from "@/components/shell/Topbar";

interface User {
  id: string;
  githubUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("orphix_access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    apiFetch("/me")
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("orphix_access_token");
          localStorage.removeItem("orphix_refresh_token");
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("orphix_refresh_token");
    const token = localStorage.getItem("orphix_access_token");
    if (refreshToken && token) {
      apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem("orphix_access_token");
    localStorage.removeItem("orphix_refresh_token");
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background lg:pl-64">
      <Sidebar user={user} onLogout={handleLogout} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} onLogout={handleLogout} />
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
