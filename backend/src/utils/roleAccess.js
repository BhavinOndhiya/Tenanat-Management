import RoleAccess from "../models/RoleAccess.js";

export const NAV_KEYS = [
  "COMMON_DASHBOARD",
  "COMMON_EVENTS",
  "COMMON_BILLING",
  "COMMON_TENANTS",
  "ADMIN_DASHBOARD",
  "ADMIN_USERS",
  "ADMIN_FLATS",
  "ADMIN_ASSIGNMENTS",
  "ADMIN_BILLING",
  "ADMIN_COMPLAINTS",
  "ADMIN_ANNOUNCEMENTS",
  "ADMIN_EVENTS",
  "ADMIN_ROLE_ACCESS",
  "OFFICER_DASHBOARD",
  "OWNER_FLAT_DASHBOARD",
  "OWNER_FLAT_COMPLAINTS",
  "OWNER_PG_DASHBOARD",
  "OWNER_PG_COMPLAINTS",
  "OWNER_PG_TENANTS",
  "OWNER_PG_PROPERTIES",
  "OWNER_PG_PAYMENTS",
  "PG_TENANT_PAYMENTS",
  "PG_TENANT_DOCUMENTS",
  "OWNER_PG_DOCUMENTS",
];

export const DEFAULT_ROLE_NAV = {
  ADMIN: NAV_KEYS,
  OFFICER: ["OFFICER_DASHBOARD", "COMMON_EVENTS"],
  CITIZEN: ["COMMON_DASHBOARD", "COMMON_EVENTS", "COMMON_BILLING"],
  TENANT: ["COMMON_DASHBOARD", "COMMON_EVENTS", "COMMON_BILLING"],
  PG_TENANT: [
    "COMMON_DASHBOARD",
    "COMMON_EVENTS",
    "PG_TENANT_PAYMENTS",
    "PG_TENANT_DOCUMENTS",
  ],
  FLAT_OWNER: ["OWNER_FLAT_DASHBOARD", "OWNER_FLAT_COMPLAINTS"],
  PG_OWNER: [
    "OWNER_PG_DASHBOARD",
    "OWNER_PG_COMPLAINTS",
    "OWNER_PG_TENANTS",
    "OWNER_PG_PROPERTIES",
    "OWNER_PG_PAYMENTS",
    "OWNER_PG_DOCUMENTS",
  ],
};

export const getNavForRole = async (role) => {
  const normalizedRole = (role || "").toUpperCase();
  const allowedKeys = DEFAULT_ROLE_NAV[normalizedRole] || NAV_KEYS;
  const existing = await RoleAccess.findOne({ role: normalizedRole }).lean();

  const fromDb = existing?.navItems || [];
  const filtered = fromDb.filter((key) => allowedKeys.includes(key));

  if (filtered.length) {
    return filtered;
  }

  return allowedKeys;
};

export const setNavForRole = async (role, navItems = []) => {
  const normalizedRole = (role || "").toUpperCase();
  if (!normalizedRole) {
    throw new Error("Role is required");
  }
  const uniqueItems = Array.from(
    new Set(navItems.map((key) => key.trim()))
  ).filter((key) => NAV_KEYS.includes(key));
  const updated = await RoleAccess.findOneAndUpdate(
    { role: normalizedRole },
    { $set: { navItems: uniqueItems } },
    { upsert: true, new: true }
  );
  return updated.navItems;
};
