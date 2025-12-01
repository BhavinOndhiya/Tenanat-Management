export const OWNER_ROLES = ["FLAT_OWNER", "PG_OWNER"];

export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case "ADMIN":
      return "AdminDashboard";
    case "OFFICER":
      return "OfficerDashboard";
    case "FLAT_OWNER":
      return "FlatOwnerDashboard";
    case "PG_OWNER":
      return "PgOwnerDashboard";
    default:
      return "Dashboard";
  }
};

export const roleMatches = (role, allowed = []) =>
  role && allowed.includes(role);
