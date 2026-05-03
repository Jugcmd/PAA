import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MonitoringProvider } from "./monitoring/MonitoringContext";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportsPage } from "./pages/ReportsPage";
import { RoomsPage } from "./pages/RoomsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SimulatePage } from "./pages/SimulatePage";

const ProtectedRoute = () => {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

const AuthenticatedLayout = () => (
  <MonitoringProvider>
    <AppShell />
  </MonitoringProvider>
);

const SimulateGuard = () => {
  const { user } = useAuth();
  return user?.role === "FacilitiesManager" ? (
    <SimulatePage />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

const SettingsGuard = () => {
  const { user } = useAuth();
  return user?.role === "FacilitiesManager" ? (
    <SettingsPage />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/simulate" element={<SimulateGuard />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsGuard />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
