import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { PayPage, BalancePage } from "./pages/PayPage";
import { ContentItemPage, ContentListPage } from "./pages/ContentPages";
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
        <Route
          path="/login"
          element={user && !loading ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route element={<Guard />}>
          <Route path="/pay" element={<PayPage />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/content/:id" element={<ContentItemPage />} />
          <Route path="/invites" element={<InvitesPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
