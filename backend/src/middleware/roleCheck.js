/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Ensure authenticateToken middleware runs first
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.user.role || "CITIZEN";

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Convenience middleware for officer-only routes
 */
export const requireOfficer = requireRole("OFFICER");

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole("ADMIN");
