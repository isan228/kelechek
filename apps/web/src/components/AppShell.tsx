import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppBottomNav, AppTopBar } from "./AppTabBar";

export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
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
    <div className="uw-shell uw-shell-social">
      <AppTopBar />
      <div className="uw-shell-main">
        <Outlet />
      </div>
      <AppBottomNav />
    </div>
  );
}
