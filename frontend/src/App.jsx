import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SetupPassword from "./pages/SetupPassword";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import OfficerDashboard from "./pages/OfficerDashboard";
import Profile from "./pages/Profile";
import ComplaintDetails from "./pages/ComplaintDetails";
import Events from "./pages/Events";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFlats from "./pages/admin/AdminFlats";
import AdminAssignFlats from "./pages/admin/AdminAssignFlats";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminComplaintsDrilldown from "./pages/admin/AdminComplaintsDrilldown";
import AdminAnnouncementsList from "./pages/admin/AdminAnnouncementsList";
import AdminEventsList from "./pages/admin/AdminEventsList";
import AdminFlatsList from "./pages/admin/AdminFlatsList";
import AdminBillingOverview from "./pages/admin/AdminBillingOverview";
import AdminBillingInvoices from "./pages/admin/AdminBillingInvoices";
import AdminBillingInvoiceDetail from "./pages/admin/AdminBillingInvoiceDetail";
import AdminRoleAccess from "./pages/admin/AdminRoleAccess";
import BillingList from "./pages/BillingList";
import BillingDetail from "./pages/BillingDetail";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import TenantManagement from "./pages/TenantManagement";
import FlatOwnerDashboard from "./pages/owner/FlatOwnerDashboard";
import PgOwnerDashboard from "./pages/owner/PgOwnerDashboard";
import FlatOwnerComplaints from "./pages/owner/FlatOwnerComplaints";
import PgOwnerComplaints from "./pages/owner/PgOwnerComplaints";
import FlatOwnerComplaintDetail from "./pages/owner/FlatOwnerComplaintDetail";
import PgOwnerComplaintDetail from "./pages/owner/PgOwnerComplaintDetail";
import PgTenantManagement from "./pages/owner/PgTenantManagement";
import PgProperties from "./pages/owner/PgProperties";
import PgOwnerPayments from "./pages/owner/PgOwnerPayments";
import PgTenantPayments from "./pages/PgTenantPayments";
import TenantOnboarding from "./pages/TenantOnboarding";
import Documents from "./pages/Documents";
import OwnerDocuments from "./pages/owner/OwnerDocuments";
import Navbar from "./components/Navbar";
import Loader from "./components/ui/Loader";
import { getDefaultRouteForRole } from "./utils/roles";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Redirect tenants to onboarding if not completed
  if (
    user?.role === "PG_TENANT" &&
    user?.onboardingStatus &&
    user.onboardingStatus !== "completed"
  ) {
    return <Navigate to="/tenant/onboarding" replace />;
  }

  return children;
}

function OfficerRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.role !== "OFFICER") {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

function RoleRoute({ roles, children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!roles.includes(user?.role)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  // For tenant routes (except onboarding), redirect to onboarding if not completed
  if (
    user?.role === "PG_TENANT" &&
    !window.location.pathname.includes("/tenant/onboarding") &&
    user?.onboardingStatus &&
    user.onboardingStatus !== "completed"
  ) {
    return <Navigate to="/tenant/onboarding" replace />;
  }

  return children;
}

function App() {
  const { loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith("/auth");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="app">
      {!isAuthRoute && <Navbar />}
      <main className={`main-content ${isAuthRoute ? "auth-content" : ""}`}>
        <Routes>
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/setup-password"
            element={
              <PublicRoute>
                <SetupPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/update-password"
            element={
              <PublicRoute>
                <UpdatePassword />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/dashboard"
            element={
              <OfficerRoute>
                <OfficerDashboard />
              </OfficerRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants"
            element={
              <ProtectedRoute>
                <TenantManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/flat-dashboard"
            element={
              <RoleRoute roles={["FLAT_OWNER"]}>
                <FlatOwnerDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-dashboard"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgOwnerDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/flat-complaints"
            element={
              <RoleRoute roles={["FLAT_OWNER"]}>
                <FlatOwnerComplaints />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-complaints"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgOwnerComplaints />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/flat-complaints/:id"
            element={
              <RoleRoute roles={["FLAT_OWNER"]}>
                <FlatOwnerComplaintDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-complaints/:id"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgOwnerComplaintDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-tenants"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgTenantManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-properties"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgProperties />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/pg-payments"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <PgOwnerPayments />
              </RoleRoute>
            }
          />
          <Route
            path="/pg-tenant/payments"
            element={
              <RoleRoute roles={["PG_TENANT"]}>
                <PgTenantPayments />
              </RoleRoute>
            }
          />
          <Route
            path="/tenant/onboarding"
            element={
              <RoleRoute roles={["PG_TENANT"]}>
                <TenantOnboarding />
              </RoleRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <RoleRoute roles={["PG_TENANT"]}>
                <Documents />
              </RoleRoute>
            }
          />
          <Route
            path="/owner/documents"
            element={
              <RoleRoute roles={["PG_OWNER"]}>
                <OwnerDocuments />
              </RoleRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/:id"
            element={
              <ProtectedRoute>
                <BillingDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute>
                <ComplaintDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/flats"
            element={
              <AdminRoute>
                <AdminFlats />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/assign-flats"
            element={
              <AdminRoute>
                <AdminAssignFlats />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <AdminRoute>
                <AdminAnnouncements />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <AdminEvents />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/role-access"
            element={
              <AdminRoute>
                <AdminRoleAccess />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/billing"
            element={
              <AdminRoute>
                <AdminBillingOverview />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/billing/invoices"
            element={
              <AdminRoute>
                <AdminBillingInvoices />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/billing/invoices/:id"
            element={
              <AdminRoute>
                <AdminBillingInvoiceDetail />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/complaints/all"
            element={
              <AdminRoute>
                <AdminComplaintsDrilldown
                  variant="all"
                  title="All Complaints"
                />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/complaints/open"
            element={
              <AdminRoute>
                <AdminComplaintsDrilldown
                  variant="open"
                  title="Open Complaints"
                />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/complaints/resolved"
            element={
              <AdminRoute>
                <AdminComplaintsDrilldown
                  variant="resolved"
                  title="Resolved Complaints"
                />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/announcements/list"
            element={
              <AdminRoute>
                <AdminAnnouncementsList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events/list"
            element={
              <AdminRoute>
                <AdminEventsList />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/flats/list"
            element={
              <AdminRoute>
                <AdminFlatsList />
              </AdminRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
