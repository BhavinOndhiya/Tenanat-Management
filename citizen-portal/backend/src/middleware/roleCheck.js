/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole('OFFICER') or requireAnyRole(['OFFICER', 'ADMIN'])
 */

// Require a specific role
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ error: `Access denied. Required role: ${role}` });
        }

        next();
    };
};

// Require any of the specified roles
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
        }

        next();
    };
};

module.exports = {
    requireRole,
    requireAnyRole,
};

