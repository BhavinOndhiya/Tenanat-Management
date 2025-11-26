import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import BillingList from "./pages/BillingList";
import BillingDetail from "./pages/BillingDetail";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import TenantManagement from "./pages/TenantManagement";
import Navbar from "./components/Navbar";
import Loader from "./components/ui/Loader";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth/login" replace />;
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
    return <Navigate to="/dashboard" replace />;
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
    if (user?.role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user?.role === "OFFICER") {
      return <Navigate to="/officer/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
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
    return <Navigate to="/dashboard" replace />;
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
