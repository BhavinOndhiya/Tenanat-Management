import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ui/ThemeToggle";
import UserDropdown from "./UserDropdown";
import { getDefaultRouteForRole } from "../utils/roles";

function Navbar() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const navAccess = user?.navAccess || [];
  const isAdmin = user?.role === "ADMIN";
  const isOfficer = user?.role === "OFFICER";
  const isFlatOwner = user?.role === "FLAT_OWNER";
  const isPgOwner = user?.role === "PG_OWNER";
  const defaultRoute = getDefaultRouteForRole(user?.role);
  const hasAccess = (key) => isAdmin || navAccess.includes(key);

  const adminLinks = useMemo(
    () =>
      [
        { key: "ADMIN_DASHBOARD", label: "Dashboard", to: "/admin/dashboard" },
        { key: "ADMIN_USERS", label: "Users", to: "/admin/users" },
        { key: "ADMIN_FLATS", label: "Flats", to: "/admin/flats" },
        {
          key: "ADMIN_ASSIGNMENTS",
          label: "Assignments",
          to: "/admin/assign-flats",
        },
        { key: "ADMIN_BILLING", label: "Billing", to: "/admin/billing" },
        {
          key: "ADMIN_COMPLAINTS",
          label: "Complaints",
          to: "/admin/complaints/all",
        },
        {
          key: "ADMIN_ANNOUNCEMENTS",
          label: "Announcements",
          to: "/admin/announcements",
        },
        { key: "ADMIN_EVENTS", label: "Events", to: "/admin/events" },
        {
          key: "ADMIN_ROLE_ACCESS",
          label: "Role Access",
          to: "/admin/role-access",
        },
      ].filter((link) => hasAccess(link.key)),
    [hasAccess]
  );

  const ownerLinks = useMemo(() => {
    if (isFlatOwner) {
      return [
        {
          key: "OWNER_FLAT_DASHBOARD",
          label: "Flat Dashboard",
          to: "/owner/flat-dashboard",
        },
        {
          key: "OWNER_FLAT_COMPLAINTS",
          label: "Flat Complaints",
          to: "/owner/flat-complaints",
        },
      ].filter((link) => hasAccess(link.key));
    }
    if (isPgOwner) {
      return [
        {
          key: "OWNER_PG_DASHBOARD",
          label: "PG Dashboard",
          to: "/owner/pg-dashboard",
        },
        {
          key: "OWNER_PG_COMPLAINTS",
          label: "PG Complaints",
          to: "/owner/pg-complaints",
        },
        {
          key: "OWNER_PG_PROPERTIES",
          label: "PG Properties",
          to: "/owner/pg-properties",
        },
        {
          key: "OWNER_PG_TENANTS",
          label: "PG Tenants",
          to: "/owner/pg-tenants",
        },
        {
          key: "OWNER_PG_PAYMENTS",
          label: "PG Payments",
          to: "/owner/pg-payments",
        },
        {
          key: "OWNER_PG_DOCUMENTS",
          label: "Documents",
          to: "/owner/documents",
        },
      ].filter((link) => hasAccess(link.key));
    }
    return [];
  }, [hasAccess, isFlatOwner, isPgOwner]);

  const pgTenantLinks = useMemo(() => {
    if (user?.role === "PG_TENANT") {
      return [
        {
          key: "PG_TENANT_PAYMENTS",
          label: "Payment History",
          to: "/pg-tenant/payments",
        },
        {
          key: "PG_TENANT_DOCUMENTS",
          label: "Documents",
          to: "/documents",
        },
      ].filter((link) => hasAccess(link.key));
    }
    return [];
  }, [hasAccess, user?.role]);
  const allLinks = useMemo(() => {
    const links = [];
    if (isAdmin && adminLinks.length > 0) {
      links.push(...adminLinks);
    }
    if (ownerLinks.length > 0) {
      links.push(...ownerLinks);
    }
    if (pgTenantLinks.length > 0) {
      links.push(...pgTenantLinks);
    }
    return links;
  }, [isAdmin, adminLinks, ownerLinks, pgTenantLinks]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={defaultRoute} className="navbar-brand">
          <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Complaint Management
          </motion.span>
        </Link>
        <div className="navbar-menu">
          {adminLinks.length > 0 && (
            <div className="navbar-dropdown">
              <button className="navbar-link">Admin ▾</button>
              <div className="navbar-dropdown-menu">
                {adminLinks.map((link) => (
                  <Link
                    key={link.key}
                    to={link.to}
                    className="navbar-dropdown-item"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {ownerLinks.map((link) => (
            <Link key={link.key} to={link.to} className="navbar-link">
              {link.label}
            </Link>
          ))}

          {pgTenantLinks.map((link) => (
            <Link key={link.key} to={link.to} className="navbar-link">
              {link.label}
            </Link>
          ))}

          {hasAccess("COMMON_DASHBOARD") && (
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
          )}
          {hasAccess("COMMON_EVENTS") && (
            <Link to="/events" className="navbar-link">
              Events
            </Link>
          )}
          {hasAccess("COMMON_BILLING") && (
            <Link to="/billing" className="navbar-link">
              My Maintenance
            </Link>
          )}
          {hasAccess("COMMON_TENANTS") && (
            <Link to="/tenants" className="navbar-link">
              Manage Tenants
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
