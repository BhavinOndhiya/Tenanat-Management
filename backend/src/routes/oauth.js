import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getNavForRole } from "../utils/roleAccess.js";

const router = express.Router();

/**
 * Verify Google OAuth ID token and get user info
 */
async function verifyGoogleToken(idToken) {
  try {
    // Verify ID token using Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!response.ok) {
      throw new Error("Invalid Google token");
    }
    const data = await response.json();

    // Verify the token is for our client
    if (
      process.env.GOOGLE_CLIENT_ID &&
      data.aud !== process.env.GOOGLE_CLIENT_ID
    ) {
      throw new Error("Token audience mismatch");
    }

    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
      verified: data.email_verified === true,
    };
  } catch (error) {
    console.error("[OAuth Google] Token verification error:", error);
    throw error;
  }
}

/**
 * Verify Facebook access token and get user info
 */
async function verifyFacebookToken(accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    if (!response.ok) {
      throw new Error("Invalid Facebook token");
    }
    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture?.data?.url || null,
      verified: true, // Facebook emails are verified
    };
  } catch (error) {
    console.error("[OAuth Facebook] Token verification error:", error);
    throw error;
  }
}

/**
 * Handle OAuth user creation/update and return JWT
 */
async function handleOAuthUser(profile, provider) {
  const { id, email, name, picture } = profile;

  if (!email) {
    throw new Error("Email is required for OAuth login");
  }

  // Check if user exists by email
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // User exists - update OAuth info if not set
    if (!user.oauthProvider) {
      user.oauthProvider = provider;
      user.oauthId = id;
      if (picture && !user.avatarUrl) {
        user.avatarUrl = picture;
      }
      await user.save();
    } else if (user.oauthProvider !== provider) {
      // User exists with different OAuth provider - link accounts
      user.oauthProvider = provider;
      user.oauthId = id;
      if (picture && !user.avatarUrl) {
        user.avatarUrl = picture;
      }
      await user.save();
    } else if (picture && !user.avatarUrl) {
      // Update avatar if not set
      user.avatarUrl = picture;
      await user.save();
    }
  } else {
    // New user - create account with PG_TENANT role by default
    user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: "", // OAuth users don't need password
      role: "PG_TENANT", // Default role for all registrations
      oauthProvider: provider,
      oauthId: id,
      avatarUrl: picture || null,
      onboardingStatus: null, // Will be set when assigned to a property
      isActive: true,
    });
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  // Generate JWT token
  const navAccess = await getNavForRole(user.role);
  await user.populate(
    "assignedProperty",
    "buildingName block flatNumber floor type"
  );
  const assignedProperty = user.assignedProperty
    ? {
        id: user.assignedProperty._id.toString(),
        buildingName: user.assignedProperty.buildingName,
        block: user.assignedProperty.block,
        flatNumber: user.assignedProperty.flatNumber,
        floor: user.assignedProperty.floor,
        type: user.assignedProperty.type,
      }
    : null;

  const token = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role || "PG_TENANT",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Determine redirect path
  let redirectTo = null;
  if (user.role === "PG_TENANT") {
    if (!user.onboardingStatus || user.onboardingStatus !== "completed") {
      redirectTo = "/tenant/onboarding";
    }
  }

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "PG_TENANT",
      isActive: user.isActive,
      onboardingStatus: user.onboardingStatus,
      avatarUrl: user.avatarUrl,
      navAccess,
      assignedProperty,
    },
    token,
    redirectTo,
  };
}

/**
 * POST /api/auth/google
 * Verify Google OAuth token and login/register user
 */
router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    // Verify Google token
    const profile = await verifyGoogleToken(idToken);

    if (!profile.verified) {
      return res.status(400).json({ error: "Google email not verified" });
    }

    // Handle user creation/update and get JWT
    const result = await handleOAuthUser(profile, "GOOGLE");

    res.json(result);
  } catch (error) {
    console.error("[OAuth Google] Error:", error);
    if (error.message === "Invalid Google token") {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    if (error.message === "Email is required for OAuth login") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Account is deactivated") {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/auth/facebook
 * Verify Facebook access token and login/register user
 */
router.post("/facebook", async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res
        .status(400)
        .json({ error: "Facebook access token is required" });
    }

    // Verify Facebook token
    const profile = await verifyFacebookToken(accessToken);

    if (!profile.email) {
      return res
        .status(400)
        .json({ error: "Email is required for Facebook login" });
    }

    // Handle user creation/update and get JWT
    const result = await handleOAuthUser(profile, "FACEBOOK");

    res.json(result);
  } catch (error) {
    console.error("[OAuth Facebook] Error:", error);
    if (error.message === "Invalid Facebook token") {
      return res.status(401).json({ error: "Invalid Facebook token" });
    }
    if (error.message === "Email is required for OAuth login") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Account is deactivated") {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
