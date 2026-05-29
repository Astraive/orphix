import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/features/auth/LoginPage";
import AuthCallbackPage from "@/features/auth/AuthCallbackPage";

const DashboardHomePage = lazy(() => import("@/features/dashboard/DashboardHomePage"));
const DevicesPage = lazy(() => import("@/features/devices/DevicesPage"));
const NotesPage = lazy(() => import("@/features/notes/NotesPage"));
const NoteEditorPage = lazy(() => import("@/features/notes/NoteEditorPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const LinkSettingsPage = lazy(() => import("@/features/settings/LinkSettingsPage").then(m => ({ default: m.LinkSettingsPage })));
const LinkControlPage = lazy(() => import("@/features/link/LinkControlPage"));

function AuthRedirect() {
  const token = localStorage.getItem("orphix_access_token");
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Route>

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardHomePage /></Suspense>} />
        <Route path="/dashboard/devices" element={<Suspense fallback={<PageLoader />}><DevicesPage /></Suspense>} />
        <Route path="/dashboard/notes" element={<Suspense fallback={<PageLoader />}><NotesPage /></Suspense>} />
        <Route path="/dashboard/notes/:id" element={<Suspense fallback={<PageLoader />}><NoteEditorPage /></Suspense>} />
        <Route path="/dashboard/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        <Route path="/dashboard/settings/link" element={<Suspense fallback={<PageLoader />}><LinkSettingsPage /></Suspense>} />
      </Route>

      <Route path="/dashboard/link/:deviceId" element={<Suspense fallback={<PageLoader />}><LinkControlPage /></Suspense>} />

      <Route path="/" element={<AuthRedirect />} />
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  );
}
