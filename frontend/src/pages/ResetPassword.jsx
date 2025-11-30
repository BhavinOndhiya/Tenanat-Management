import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import { validatePassword, getPasswordGuidelines } from "../utils/validation";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: storeSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("weak");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.body.classList.add("auth-page");
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  useEffect(() => {
    console.log(
      "[ResetPassword] Component mounted, token:",
      token ? "Present" : "Missing"
    );

    if (!token) {
      console.error("[ResetPassword] No token found in URL");
      setError("Invalid reset link. Please check your email.");
      setVerifying(false);
      return;
    }

    // Verify token by attempting to decode it
    try {
      // We'll verify on submit, but show form if token exists
      console.log("[ResetPassword] Token found, showing form");
      setVerifying(false);
    } catch (error) {
      console.error("[ResetPassword] Error processing token:", error);
      setError("Invalid or expired reset link");
      setVerifying(false);
    }
  }, [token]);

  const handlePasswordChange = (value) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordError(validation.error || "");
    setPasswordStrength(validation.strength || "weak");

    // Also check confirm password if it's already filled
    if (confirmPassword) {
      if (value !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    if (value !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      setError(passwordValidation.error);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("[ResetPassword] Attempting to reset password...");
      const result = await api.resetPassword(token, password);
      console.log("[ResetPassword] Reset password result:", result);

      if (result.success) {
        showToast.success("Password reset successfully! Redirecting...");

        // If API returned token and redirectTo, use them
        if (result.token && result.redirectTo) {
          // Get user data and store session
          try {
            const userData = await api.getMe();
            storeSession(
              {
                ...userData,
                onboardingStatus: result.onboardingStatus,
              },
              result.token
            );
            navigate(result.redirectTo, { replace: true });
          } catch (error) {
            console.error("Failed to get user data:", error);
            navigate("/auth/login", { replace: true });
          }
        } else {
          // Fallback: redirect to login
          setTimeout(() => {
            navigate("/auth/login", { replace: true });
          }, 1500);
        }
      } else {
        setError(result.error || "Failed to reset password. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("[ResetPassword] Error resetting password:", error);
      console.error("[ResetPassword] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      setError(error.message || "Failed to reset password. Please try again.");
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4"
        >
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Reset Link Invalid
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/auth/login")}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => {
                if (password) {
                  const validation = validatePassword(password);
                  setPasswordError(validation.error || "");
                  setPasswordStrength(validation.strength || "weak");
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${
                passwordError
                  ? "border-red-300 bg-red-50"
                  : passwordStrength === "strong"
                  ? "border-green-300 bg-green-50"
                  : passwordStrength === "medium"
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-300"
              }`}
              placeholder="Enter your new password"
              required
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            )}
            {!passwordError && password && (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-gray-500 whitespace-pre-line">
                  {getPasswordGuidelines()}
                </p>
                {passwordStrength === "strong" && (
                  <p className="text-xs text-green-600 font-semibold">
                    ✓ Strong password
                  </p>
                )}
                {passwordStrength === "medium" && (
                  <p className="text-xs text-yellow-600 font-semibold">
                    ⚠ Medium strength - consider adding more characters
                  </p>
                )}
              </div>
            )}
            {!password && (
              <p className="mt-1 text-xs text-gray-500 whitespace-pre-line">
                {getPasswordGuidelines()}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              onBlur={() => {
                if (confirmPassword && confirmPassword !== password) {
                  setConfirmPasswordError("Passwords do not match");
                } else {
                  setConfirmPasswordError("");
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition ${
                confirmPasswordError
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder="Confirm your new password"
              required
            />
            {confirmPasswordError && (
              <p className="mt-1 text-xs text-red-600">
                {confirmPasswordError}
              </p>
            )}
            {!confirmPasswordError &&
              confirmPassword &&
              password === confirmPassword && (
                <p className="mt-1 text-xs text-green-600 font-semibold">
                  ✓ Passwords match
                </p>
              )}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            }`}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <button
              onClick={() => navigate("/auth/login")}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
