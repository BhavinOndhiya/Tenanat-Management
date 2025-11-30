import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import {
  validateEmail,
  validatePassword,
  getEmailGuidelines,
  getPasswordGuidelines,
} from "../utils/validation";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("weak");
  const { login: storeSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.body.classList.add("auth-page");
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  const handleEmailChange = (value) => {
    setEmail(value);
    const validation = validateEmail(value);
    setEmailError(validation.error || "");
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordError(validation.error || "");
    setPasswordStrength(validation.strength || "weak");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate all fields
    if (!name || name.trim() === "") {
      setError("Name is required");
      setLoading(false);
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error);
      setError(emailValidation.error);
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      setError(passwordValidation.error);
      setLoading(false);
      return;
    }

    try {
      const { user, token, redirectTo } = await api.register(
        name,
        email,
        password
      );
      storeSession(
        {
          ...user,
          role: user.role || "PG_TENANT",
        },
        token
      );
      showToast.success("Account created! Redirecting you...");
      // Use redirectTo from backend if provided (e.g., for PG_TENANT onboarding)
      // Otherwise use default route for role
      const destination =
        redirectTo ||
        (user?.role === "OFFICER" ? "/officer/dashboard" : "/dashboard");
      navigate(destination, {
        replace: true,
      });
    } catch (apiError) {
      const message =
        apiError?.message ||
        "We couldn’t create your account. Please try again.";
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        setError(
          "Google Sign-In is not configured. Please use email registration."
        );
        showToast.error(
          "Google Sign-In is not configured. Please use email registration."
        );
        setLoading(false);
        return;
      }

      if (typeof window.google === "undefined") {
        setError("Google Sign-In is loading. Please wait and try again.");
        setLoading(false);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const { user, token, redirectTo } = await api.loginWithGoogle(
              response.credential
            );
            storeSession(
              {
                ...user,
                role: user.role || "PG_TENANT",
              },
              token
            );
            showToast.success("Account created! Redirecting you...");
            const destination =
              redirectTo ||
              (user?.role === "OFFICER" ? "/officer/dashboard" : "/dashboard");
            navigate(destination, { replace: true });
          } catch (error) {
            console.error("Google signup error:", error);
            setError(error.message || "Google signup failed");
            showToast.error(error.message || "Google signup failed");
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.prompt();
    } catch (error) {
      console.error("Google OAuth setup error:", error);
      setError(
        "Google Sign-In is not available. Please use email registration."
      );
      showToast.error(
        "Google Sign-In is not available. Please use email registration."
      );
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    try {
      setLoading(true);
      setError("");

      if (typeof window.FB === "undefined") {
        setError("Facebook SDK is not available. Please refresh the page.");
        setLoading(false);
        return;
      }

      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });

      window.FB.login(
        async (response) => {
          if (response.authResponse) {
            try {
              const { user, token, redirectTo } = await api.loginWithFacebook(
                response.authResponse.accessToken
              );
              storeSession(
                {
                  ...user,
                  role: user.role || "PG_TENANT",
                },
                token
              );
              showToast.success("Account created! Redirecting you...");
              const destination =
                redirectTo ||
                (user?.role === "OFFICER"
                  ? "/officer/dashboard"
                  : "/dashboard");
              navigate(destination, { replace: true });
            } catch (error) {
              console.error("Facebook signup error:", error);
              setError(error.message || "Facebook signup failed");
              showToast.error(error.message || "Facebook signup failed");
              setLoading(false);
            }
          } else {
            setError("Facebook signup was cancelled");
            showToast.error("Facebook signup was cancelled");
            setLoading(false);
          }
        },
        { scope: "email,public_profile" }
      );
    } catch (error) {
      console.error("Facebook OAuth setup error:", error);
      setError(
        "Facebook Sign-In is not configured. Please use email registration."
      );
      showToast.error(
        "Facebook Sign-In is not configured. Please use email registration."
      );
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider) => {
    if (provider.toLowerCase() === "google") {
      handleGoogleSignup();
    } else if (provider.toLowerCase() === "facebook") {
      handleFacebookSignup();
    }
  };

  return (
    <div className="flex min-h-screen bg-white lg:h-screen lg:overflow-hidden">
      {/* Left Side - Register Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 lg:h-full flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-12 lg:py-0 bg-gray-50"
      >
        <div className="max-w-lg mx-auto w-full space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Create your account
              </h1>
              <p className="text-gray-600">
                Join the complaint workspace in minutes
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-wrap gap-2 pt-2"
            >
              <span className="px-3 py-1 rounded-full bg-gray-200/70 text-xs text-gray-700 font-medium">
                Quick onboarding
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-200/70 text-xs text-gray-700 font-medium">
                Secure access
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-200/70 text-xs text-gray-700 font-medium">
                Always available
              </span>
            </motion.div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              onMouseEnter={() => setHoveredButton("google")}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <motion.button
                onClick={() => handleOAuthClick("google")}
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg relative overflow-hidden"
              >
                {/* Google Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#4285F4"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm">Google</span>
                {hoveredButton === "google" && (
                  <motion.div
                    initial={{ x: -5, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="absolute right-2 text-lg"
                  ></motion.div>
                )}
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              onMouseEnter={() => setHoveredButton("facebook")}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <motion.button
                onClick={() => handleOAuthClick("facebook")}
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-[#1877f2] hover:bg-[#166fe0] text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg relative overflow-hidden"
              >
                {/* Facebook Icon */}
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.499v-9.294H9.691v-3.622h3.133V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.919.001c-1.504 0-1.796.715-1.796 1.763v2.312h3.59l-.467 3.622h-3.123V24h6.116C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z" />
                </svg>
                <span className="text-sm">Facebook</span>
                {hoveredButton === "facebook" && (
                  <motion.div
                    initial={{ x: -5, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="absolute right-2 text-lg"
                  ></motion.div>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Or sign up with email
            </span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium flex items-start justify-between gap-4"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-gray-900">
                Full Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                autoComplete="name"
                placeholder="Enter your full name"
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </motion.div>

            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-gray-900">
                Email Address
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => {
                  if (email) {
                    const validation = validateEmail(email);
                    setEmailError(validation.error || "");
                  }
                }}
                required
                disabled={loading}
                autoComplete="email"
                placeholder="Enter your email (e.g., yourname@example.com)"
                className={`w-full px-5 py-3.5 rounded-2xl border-2 ${
                  emailError
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white"
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {emailError && (
                <p className="text-xs text-red-600">{emailError}</p>
              )}
              {!emailError && email && (
                <p className="text-xs text-gray-500">{getEmailGuidelines()}</p>
              )}
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-gray-900">
                Password
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => {
                  if (password) {
                    const validation = validatePassword(password);
                    setPasswordError(validation.error || "");
                    setPasswordStrength(validation.strength || "weak");
                  }
                }}
                required
                disabled={loading}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className={`w-full px-5 py-3.5 rounded-2xl border-2 ${
                  passwordError
                    ? "border-red-300 bg-red-50"
                    : passwordStrength === "strong"
                    ? "border-green-300 bg-green-50"
                    : passwordStrength === "medium"
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-gray-300 bg-white"
                } focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {passwordError && (
                <p className="text-xs text-red-600">{passwordError}</p>
              )}
              {!passwordError && password && (
                <div className="space-y-1">
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
                <p className="text-xs text-gray-500 whitespace-pre-line">
                  {getPasswordGuidelines()}
                </p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              onMouseEnter={() => setHoveredButton("create")}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.96 }}
              className="pt-4 relative"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:bg-[var(--color-primary-dark)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl relative overflow-hidden"
              >
                {loading ? "Creating account..." : "Create Account"}
                {hoveredButton === "create" && !loading && (
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="absolute right-6 text-lg"
                  ></motion.div>
                )}
              </button>
            </motion.div>
          </form>

          {/* Sign In Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-gray-600"
          >
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-opacity"
            >
              Sign in here
            </button>
          </motion.p>
        </div>
      </motion.div>

      {/* Right Side - Message */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 h-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 flex-col justify-center items-center p-12 text-white relative overflow-hidden"
      >
        {/* Animated Background Elements */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-20 right-20 w-40 h-40 rounded-full bg-white/5 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
          className="absolute bottom-20 left-20 w-32 h-32 rounded-full bg-white/5 blur-3xl"
        />

        <div className="max-w-md text-center space-y-8 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="text-6xl font-bold leading-tight">Get Started</div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-lg leading-relaxed text-white/95"
          >
            Join thousands of users managing complaints efficiently. Secure,
            fast, and easy to use.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="pt-8 space-y-4"
          >
            <motion.div
              whileHover={{ scale: 1.05, x: 10 }}
              className="flex items-center gap-3 text-left cursor-default"
            >
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-semibold">Quick Setup</p>
                <p className="text-sm text-white/80">Get started in minutes</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, x: 10 }}
              className="flex items-center gap-3 text-left cursor-default"
            >
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold">Secure & Safe</p>
                <p className="text-sm text-white/80">Your data is protected</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, x: 10 }}
              className="flex items-center gap-3 text-left cursor-default"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <p className="font-semibold">Powerful Tools</p>
                <p className="text-sm text-white/80">Everything you need</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Decorative Line Animation */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="h-1 w-12 bg-white/40 mx-auto origin-center rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
