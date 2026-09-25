import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppTabBar } from "./AppTabBar";

export function AppShell() {
  const { user, loading } = useAuth();

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

  return (
    <div className="uw-shell">
      <div className="uw-shell-main">
        <Outlet />
      </div>
      <AppTabBar />
    </div>
  );
}
