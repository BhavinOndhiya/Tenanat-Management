import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }

      // Fetch user from database to ensure we have the latest role
      const user = await User.findById(decoded.id).select(
        "_id email role isActive"
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      // Set user info on request (include role from DB, fallback to JWT or default)
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role || decoded.role || "CITIZEN",
      };

      next();
    });
  } catch (error) {
    return res.status(500).json({ error: "Authentication error" });
  }
};
