export const OWNER_ROLES = ["FLAT_OWNER", "PG_OWNER"];

export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "OFFICER":
      return "/officer/dashboard";
    case "FLAT_OWNER":
      return "/owner/flat-dashboard";
    case "PG_OWNER":
      return "/owner/pg-dashboard";
    default:
      return "/dashboard";
  }
};

export const roleMatches = (role, allowed = []) =>
  role && allowed.includes(role);
