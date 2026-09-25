import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppTabBar } from "./AppTabBar";
import { getOnboardingGoal } from "../app/investData";

export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="sx-shell">
        <div className="sx-state" role="status" aria-label="Загрузка">
          <div className="sx-skeleton sx-skeleton-lg" />
          <div className="sx-skeleton" />
          <div className="sx-skeleton" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/app" replace />;

  const goal = getOnboardingGoal();
  const onOnboarding = location.pathname === "/app/onboarding";
  if (!goal && !onOnboarding) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return (
    <div className="sx-shell">
      <div className="sx-shell-main">
        <Outlet />
      </div>
      <AppTabBar />
    </div>
  );
}
