import { useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppSidebar, AppTopBar } from "./AppTabBar";

export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideChrome = location.pathname.startsWith("/app/onboarding");

  if (loading) {
    return (
      <div className="uw-shell">
        <div className="uw-page" role="status" aria-label="Загрузка">
          <div className="uw-skel" />
          <div className="uw-skel" />
          <div className="uw-skel uw-skel-lg" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/app" replace />;

  if (hideChrome) {
    return (
      <div className="uw-shell">
        <div className="uw-shell-main uw-shell-main-solo">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="uw-shell uw-shell-sidebar">
      <AppSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="uw-shell-content">
        <AppTopBar onMenu={() => setMenuOpen(true)} />
        <div className="uw-shell-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
