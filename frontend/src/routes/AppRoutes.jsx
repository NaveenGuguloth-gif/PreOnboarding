import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

import Login           from "../pages/auth/Login";
import Signup          from "../pages/auth/Signup";
import ForgotPassword  from "../pages/auth/ForgotPassword";
import ResetPassword   from "../pages/auth/ResetPassword";
import OAuthCallback   from "../pages/auth/OAuthCallback";
import Dashboard       from "../pages/dashboard/Dashboard";
import Documents       from "../pages/dashboard/Documents";
import Learning        from "../pages/dashboard/Learning";
import Assistant       from "../pages/dashboard/Assistant";
import Relocation      from "../pages/dashboard/Relocation";
import PlantMap        from "../pages/dashboard/PlantMap";
import Notifications   from "../pages/dashboard/Notifications";
import HrDashboard     from "../pages/hr/HrDashboard";
import CandidateDetail from "../pages/hr/CandidateDetail";
import CinematicHero   from "../pages/CinematicHero";
import HrTasks         from "../pages/hr/HrTasks";
import HrDocuments     from "../pages/hr/HrDocuments";

function PrivateRoute({ children, hrOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner full />;
  if (!user)   return <Navigate to="/" replace />;
  if (hrOnly && user.userType !== "hr") return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner full />;
  if (user)    return <Navigate to={user.userType === "hr" ? "/hr" : "/dashboard"} replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/hero" element={<CinematicHero />} />

      <Route element={<AuthLayout />}>
        <Route path="/"                  element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup"            element={<GuestRoute><Signup /></GuestRoute>} />
        <Route path="/forgot-password"   element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password"    element={<GuestRoute><ResetPassword /></GuestRoute>} />
        <Route path="/auth/oauth/callback" element={<OAuthCallback />} />
      </Route>

      {/* Candidate dashboard routes */}
      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path="/dashboard"              element={<Dashboard />} />
        <Route path="/dashboard/documents"    element={<Documents />} />
        <Route path="/dashboard/learning"     element={<Learning />} />
        <Route path="/dashboard/assistant"    element={<Assistant />} />
        <Route path="/dashboard/plant-map"    element={<PlantMap />} />
        <Route path="/dashboard/relocation"   element={<Relocation />} />
        <Route path="/dashboard/notifications" element={<Notifications />} />
      </Route>

      {/* HR routes */}
      <Route element={<PrivateRoute hrOnly><DashboardLayout /></PrivateRoute>}>
        <Route path="/hr"                     element={<HrDashboard />} />
        <Route path="/hr/candidates"          element={<HrDashboard />} />
        <Route path="/hr/departments"         element={<Navigate to="/hr" replace />} />
        <Route path="/hr/tasks"               element={<HrTasks />} />
        <Route path="/hr/documents"           element={<HrDocuments />} />
        <Route path="/hr/candidates/:id"      element={<CandidateDetail />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
