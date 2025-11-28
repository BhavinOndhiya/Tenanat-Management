import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.body.classList.add("auth-page");
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const result = await api.forgotPassword(email);

      if (result.success) {
        setSuccess(true);
        showToast.success("Password reset link sent to your email!");
      }
    } catch (error) {
      if (
        error.message.includes("exceeded") ||
        error.message.includes("contact")
      ) {
        setError(error.message);
      } else {
        setError(
          error.message || "Failed to send reset link. Please try again."
        );
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <p className="font-semibold mb-2">✓ Reset link sent!</p>
              <p>
                Check your email for the password reset link. It's valid for 24
                hours.
              </p>
            </div>
            <button
              onClick={() => navigate("/auth/login")}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
                {error.includes("contact") && (
                  <p className="mt-2 text-xs">
                    Please contact your PG owner to reset your password.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your email"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can request a password reset up to 3 times in 24 hours
                </p>
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
                {loading ? "Sending..." : "Send Reset Link"}
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
          </>
        )}
      </motion.div>
    </div>
  );
}
