import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ui/ThemeToggle";
import UserDropdown from "./UserDropdown";

function Navbar() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const isOfficer = user?.role === "OFFICER";
  const isAdmin = user?.role === "ADMIN";
  const defaultRoute = isAdmin
    ? "/admin/dashboard"
    : isOfficer
    ? "/officer/dashboard"
    : "/dashboard";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={defaultRoute} className="navbar-brand">
          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Complaint Management
          </motion.span>
        </Link>
        <div className="navbar-menu">
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard" className="navbar-link">
                Admin Dashboard
              </Link>
              <Link to="/admin/users" className="navbar-link">
                Users
              </Link>
              <Link to="/admin/flats" className="navbar-link">
                Flats
              </Link>
              <Link to="/admin/assign-flats" className="navbar-link">
                Assignments
              </Link>
              <Link to="/admin/billing" className="navbar-link">
                Billing
              </Link>
              <Link to="/admin/complaints/all" className="navbar-link">
                Complaints
              </Link>
            </>
          ) : isOfficer ? (
            <Link to="/officer/dashboard" className="navbar-link">
              Officer Board
            </Link>
          ) : (
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <>
              <Link to="/admin/announcements" className="navbar-link">
                Announcements
              </Link>
              <Link to="/admin/events" className="navbar-link">
                Admin Events
              </Link>
              <Link to="/tenants" className="navbar-link">
                Manage Tenants
              </Link>
            </>
          )}
          {!isAdmin && !isOfficer && (
            <>
              <Link to="/events" className="navbar-link">
                Events
              </Link>
              <Link to="/billing" className="navbar-link">
                My Maintenance
              </Link>
              <Link to="/tenants" className="navbar-link">
                Manage Tenants
              </Link>
            </>
          )}
          {isOfficer && (
            <Link to="/events" className="navbar-link">
              Events
            </Link>
          )}
          <ThemeToggle />
          {user && <UserDropdown />}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
