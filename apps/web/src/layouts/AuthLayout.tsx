import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="anim-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
