import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { MembershipsPage } from "./pages/MembershipsPage";
import { WorkoutItemPage, WorkoutsPage } from "./pages/WorkoutsPage";
import { CoachesPublicPage } from "./pages/CoachesPublicPage";
import { CabinetPage, GoalPage } from "./pages/CabinetPages";
import { BalancePage } from "./pages/PayPage";
import { CoachPage, InvitesPage, ProfilePage } from "./pages/MiscPages";

function Guard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/memberships" element={<MembershipsPage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/workouts/:id" element={<WorkoutItemPage />} />
        <Route path="/coaches" element={<CoachesPublicPage />} />
        <Route path="/goal" element={<GoalPage />} />
        <Route
          path="/login"
          element={user && !loading ? <Navigate to="/cabinet" replace /> : <LoginPage />}
        />
        <Route element={<Guard />}>
          <Route path="/cabinet" element={<CabinetPage />} />
          <Route path="/progress" element={<BalancePage />} />
          <Route path="/invites" element={<InvitesPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
