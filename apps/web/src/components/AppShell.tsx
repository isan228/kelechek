import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CabBottomNav, CabTopNav } from "./AppTabBar";

export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hideChrome = location.pathname.startsWith("/app/onboarding");

  if (loading) {
    return (
      <div className="uw-shell cab">
        <div className="cab-main" role="status" aria-label="Загрузка">
          <div className="uw-skel" />
          <div className="uw-skel uw-skel-lg" />
          <div className="uw-skel" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/app" replace />;

  if (hideChrome) {
    return (
      <div className="uw-shell uw-shell-solo">
        <div className="uw-shell-main uw-shell-main-solo">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="uw-shell cab">
      <CabTopNav />
      <main className="cab-main">
        <Outlet />
      </main>
      <CabBottomNav />
    </div>
  );
}
