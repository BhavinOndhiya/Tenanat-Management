import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
// Import WebBrowser dynamically to avoid native module errors in Expo Go
// import * as WebBrowser from "expo-web-browser";
// import * as Google from "expo-auth-session/providers/google"; // Not used - causes Expo Go errors
// Don't import expo-linking at module level - causes native module errors in Expo Go
// We'll import it dynamically when needed
import { Linking as RNLinking } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { getDefaultRouteForRole } from "../../utils/roles";
import { config } from "../../utils/config";

// Don't call WebBrowser.maybeCompleteAuthSession() at module level
// It will be called when needed inside the component

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login: storeSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Get the redirect URI for the current platform
  // Use React Native's Linking for basic URL operations (works everywhere)
  // Only use expo-linking.createURL if we need the deep linking scheme
  const redirectUri = React.useMemo(() => {
    if (Platform.OS === "web") {
      const uri = `${
        typeof window !== "undefined" ? window.location.origin : ""
      }/auth/callback/google`;
      console.log("[Google OAuth] Web redirect URI:", uri);
      return uri;
    }
    // For native platforms, use a simple scheme-based URL
    // exp://localhost:8081/auth/callback/google or pgmobile://auth/callback/google
    // We'll construct it manually to avoid expo-linking import
    const scheme = __DEV__ ? "exp" : "pgmobile";
    const uri = `${scheme}://auth/callback/google`;
    console.log("[Google OAuth] Native redirect URI:", uri);
    console.log(
      "[Google OAuth] ⚠️  Add this exact URI to Google OAuth Console!"
    );
    return uri;
  }, []);

  // For native platforms - Use WebBrowser directly (works in Expo Go and dev builds)
  // expo-auth-session causes "native module doesn't exist" errors in Expo Go
  // So we'll skip it entirely and use WebBrowser for all native platforms
  // This is simpler and works everywhere
  const [request, response, promptAsync] = [null, null, null];

  // Note: We're not using expo-auth-session for native anymore (causes Expo Go errors)
  // All native OAuth goes through WebBrowser, so this useEffect is disabled
  // If you want to use expo-auth-session for dev builds, uncomment this and remove the hook initialization above
  /*
  React.useEffect(() => {
    if (Platform.OS === "web" || !response) return;
    
    if (response?.type === "success") {
      let idToken =
        response.authentication?.idToken ||
        response.params?.id_token ||
        response.params?.idToken ||
        response.idToken;

      // expo-auth-session might not parse id_token from URL fragment properly
      // Try to extract it manually from the URL if present (for both web and native)
      if (!idToken && response.url) {
        try {
          // Parse URL fragment for id_token (format: #id_token=...&access_token=...)
          // or query params (format: ?id_token=...&access_token=...)
          const urlParts = response.url.split("#");
          const fragment = urlParts[1] || urlParts[0].split("?")[1];

          if (fragment) {
            const params = new URLSearchParams(fragment);
            idToken = params.get("id_token") || params.get("idToken");
          }
        } catch (e) {
          console.warn("[Google OAuth] Failed to parse URL for ID token:", e);
        }
      }

      // Also check rawResponse if available (expo-auth-session sometimes stores it there)
      if (!idToken && response.authentication?.rawResponse) {
        try {
          const rawResponse = response.authentication.rawResponse;
          if (typeof rawResponse === "string") {
            // Try to parse as URL or JSON
            if (rawResponse.includes("id_token=")) {
              const match = rawResponse.match(/id_token=([^&]+)/);
              if (match) {
                idToken = decodeURIComponent(match[1]);
              }
            }
          } else if (typeof rawResponse === "object" && rawResponse.id_token) {
            idToken = rawResponse.id_token;
          }
        } catch (e) {
          console.warn(
            "[Google OAuth] Failed to parse rawResponse for ID token:",
            e
          );
        }
      }

      const accessToken =
        response.authentication?.accessToken || response.params?.access_token;

      console.log("[Google OAuth] Response structure:", {
        type: response.type,
        platform: Platform.OS,
        hasParams: !!response.params,
        hasAuthentication: !!response.authentication,
        paramsKeys: response.params ? Object.keys(response.params) : [],
        authenticationKeys: response.authentication
          ? Object.keys(response.authentication)
          : [],
        idTokenValue: idToken
          ? `${idToken.substring(0, 20)}...`
          : "null/undefined",
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
        // Log authentication object structure (without sensitive values)
        authenticationStructure: response.authentication
          ? Object.keys(response.authentication).reduce((acc, key) => {
              const value = response.authentication[key];
              acc[key] =
                typeof value === "string" && value.length > 50
                  ? `${value.substring(0, 20)}...`
                  : value;
              return acc;
            }, {})
          : null,
      });

      if (idToken) {
        console.log("[Google OAuth] ID token found, proceeding with login");
        handleGoogleResponse(idToken);
      } else {
        // Log detailed error for debugging
        console.error("[Google OAuth] ID token not found. Full response:", {
          type: response.type,
          url: response.url?.substring(0, 200), // First 200 chars of URL
          params: response.params,
          authentication: response.authentication
            ? {
                ...response.authentication,
                // Mask sensitive tokens in logs
                idToken: response.authentication.idToken
                  ? "***masked***"
                  : undefined,
                accessToken: response.authentication.accessToken
                  ? "***masked***"
                  : undefined,
              }
            : null,
        });

        setGoogleLoading(false);
        showToast.error(
          "Failed to get Google ID token. The OAuth response may not include an ID token. Please check your Google OAuth configuration in Google Cloud Console."
        );
      }
    } else if (response?.type === "error") {
      console.error("[Google OAuth] Error response:", response);
      setGoogleLoading(false);
      const errorMessage =
        response.error?.message ||
        response.error?.error_description ||
        response.error ||
        "Google sign-in failed";
      showToast.error(errorMessage);
    } else if (response?.type === "cancel") {
      console.log("[Google OAuth] User cancelled");
      setGoogleLoading(false);
    }
  }, [response]);
  */

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const { user, token, redirectTo } = await api.login(email, password);
      await storeSession(
        {
          ...user,
          role: user.role || "CITIZEN",
        },
        token
      );
      showToast.success(
        `Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}!`
      );
      // Navigation will be handled by AppNavigator based on auth state
    } catch (apiError) {
      const message =
        apiError?.message ||
        "We couldn't sign you in. Double-check your credentials.";
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!config.GOOGLE_CLIENT_ID) {
      showToast.error("Google Sign-In is not configured");
      return;
    }
    setGoogleLoading(true);
    setError("");

    // For web platform, use Google Identity Services (gets ID token directly)
    // For native platforms, use expo-auth-session
    if (Platform.OS === "web") {
      try {
        // Check if Google Identity Services is loaded
        if (
          typeof window === "undefined" ||
          typeof window.google === "undefined"
        ) {
          // Load Google Identity Services script
          await new Promise((resolve, reject) => {
            if (
              document.querySelector(
                'script[src*="accounts.google.com/gsi/client"]'
              )
            ) {
              // Script already loading/loaded
              const checkGoogle = setInterval(() => {
                if (
                  typeof window.google !== "undefined" &&
                  window.google.accounts
                ) {
                  clearInterval(checkGoogle);
                  resolve();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(checkGoogle);
                if (
                  typeof window.google === "undefined" ||
                  !window.google.accounts
                ) {
                  reject(new Error("Google Identity Services failed to load"));
                }
              }, 5000);
            } else {
              const script = document.createElement("script");
              script.src = "https://accounts.google.com/gsi/client";
              script.async = true;
              script.defer = true;
              script.onload = () => {
                // Wait for Google to be ready
                const checkReady = setInterval(() => {
                  if (
                    typeof window.google !== "undefined" &&
                    window.google.accounts
                  ) {
                    clearInterval(checkReady);
                    resolve();
                  }
                }, 100);
                setTimeout(() => {
                  clearInterval(checkReady);
                  if (
                    typeof window.google === "undefined" ||
                    !window.google.accounts
                  ) {
                    reject(
                      new Error("Google Identity Services failed to initialize")
                    );
                  }
                }, 3000);
              };
              script.onerror = () =>
                reject(new Error("Failed to load Google Identity Services"));
              document.head.appendChild(script);
            }
          });

          // Initialize Google Sign-In
          window.google.accounts.id.initialize({
            client_id: config.GOOGLE_CLIENT_ID,
            callback: async (googleResponse) => {
              try {
                // googleResponse.credential is the ID token
                const idToken = googleResponse.credential;
                if (idToken) {
                  await handleGoogleResponse(idToken);
                } else {
                  setGoogleLoading(false);
                  showToast.error("Failed to get Google ID token");
                }
              } catch (error) {
                console.error("[Google OAuth] Web callback error:", error);
                setGoogleLoading(false);
                showToast.error(error.message || "Google Sign-In failed");
              }
            },
          });

          // Trigger sign-in
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              setGoogleLoading(false);
              showToast.error(
                "Google Sign-In popup was blocked. Please allow popups and try again."
              );
            } else if (
              notification.isSkippedMoment() ||
              notification.isDismissedMoment()
            ) {
              setGoogleLoading(false);
            }
          });
        } else {
          // Google already loaded, use it directly
          window.google.accounts.id.initialize({
            client_id: config.GOOGLE_CLIENT_ID,
            callback: async (googleResponse) => {
              try {
                const idToken = googleResponse.credential;
                if (idToken) {
                  await handleGoogleResponse(idToken);
                } else {
                  setGoogleLoading(false);
                  showToast.error("Failed to get Google ID token");
                }
              } catch (error) {
                console.error("[Google OAuth] Web callback error:", error);
                setGoogleLoading(false);
                showToast.error(error.message || "Google Sign-In failed");
              }
            },
          });
          window.google.accounts.id.prompt();
        }
      } catch (error) {
        console.error("[Google OAuth] Web setup error:", error);
        setGoogleLoading(false);
        showToast.error("Google Sign-In failed to load. Please try again.");
      }
      return;
    }

    // For native platforms (iOS/Android)
    if (Platform.OS === "web") {
      // This shouldn't happen as web is handled above, but just in case
      return;
    }

    // Use WebBrowser directly for all native platforms (works in Expo Go and dev builds)
    await handleGoogleLoginWithWebBrowser();
  };

  // Fallback OAuth flow using WebBrowser (works in Expo Go)
  const handleGoogleLoginWithWebBrowser = async () => {
    if (!config.GOOGLE_CLIENT_ID) {
      throw new Error("Google Client ID not configured");
    }

    // Dynamically import WebBrowser to avoid native module errors
    let WebBrowser;
    try {
      WebBrowser = (await import("expo-web-browser")).default;
      // Call maybeCompleteAuthSession when WebBrowser is loaded
      if (WebBrowser.maybeCompleteAuthSession) {
        WebBrowser.maybeCompleteAuthSession();
      }
    } catch (error) {
      console.error("Failed to load expo-web-browser:", error);
      throw new Error("WebBrowser is not available in this environment");
    }

    // Build Google OAuth URL
    // Use manual URL construction to avoid expo-linking import
    const scheme = __DEV__ ? "exp" : "pgmobile";
    const redirectUri = `${scheme}://auth/callback/google`;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const scopes = encodeURIComponent("openid profile email");
    const state = Math.random().toString(36).substring(7);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodedRedirectUri}&` +
      `response_type=id_token token&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `nonce=${Math.random().toString(36).substring(7)}`;

    console.log("[Google OAuth] Opening WebBrowser for OAuth:", authUrl);

    // Open OAuth URL in WebBrowser
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === "success" && result.url) {
      // Parse the URL to extract ID token
      const url = new URL(result.url);
      const hash = url.hash.substring(1); // Remove #
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");

      if (idToken) {
        console.log(
          "[Google OAuth] ID token extracted from WebBrowser response"
        );
        await handleGoogleResponse(idToken);
      } else {
        throw new Error("ID token not found in OAuth response");
      }
    } else {
      throw new Error("OAuth flow was cancelled or failed");
    }

    // OLD WEB APPROACH - DISABLED (was causing script loading issues)
    /* For web platform, use Google Identity Services (like the web app)
    if (Platform.OS === "web") {
      try {
        // Function to initialize and prompt Google Sign-In
        const initializeAndPrompt = () => {
          try {
            if (!window.google || !window.google.accounts) {
              console.error("Google Identity Services not loaded");
              setGoogleLoading(false);
              showToast.error(
                "Google Sign-In failed to load. Please refresh and try again."
              );
              return;
            }

            window.google.accounts.id.initialize({
              client_id: config.GOOGLE_CLIENT_ID,
              callback: async (response) => {
                try {
                  // response.credential is the ID token
                  await handleGoogleResponse(response.credential);
                } catch (error) {
                  console.error("Google login error:", error);
                  setGoogleLoading(false);
                  showToast.error(error.message || "Google Sign-In failed");
                }
              },
            });

            // Trigger sign-in popup
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed()) {
                setGoogleLoading(false);
                showToast.error(
                  "Google Sign-In popup was blocked. Please allow popups and try again."
                );
              } else if (
                notification.isSkippedMoment() ||
                notification.isDismissedMoment()
              ) {
                setGoogleLoading(false);
              }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
              setGoogleLoading(false);
            }, 10000);
          } catch (error) {
            console.error("Google initialization error:", error);
            setGoogleLoading(false);
            showToast.error("Failed to initialize Google Sign-In");
          }
        };

        // Check if window is available
        if (typeof window === "undefined") {
          setGoogleLoading(false);
          showToast.error("Window object not available");
          return;
        }

        // Check if Google Identity Services is already loaded
        if (typeof window.google !== "undefined" && window.google.accounts) {
          initializeAndPrompt();
          return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector(
          'script[src*="accounts.google.com/gsi/client"]'
        );
        if (existingScript) {
          // Script is loading, wait for it
          const checkGoogle = setInterval(() => {
            if (
              typeof window.google !== "undefined" &&
              window.google.accounts
            ) {
              clearInterval(checkGoogle);
              initializeAndPrompt();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkGoogle);
            if (
              typeof window.google === "undefined" ||
              !window.google.accounts
            ) {
              setGoogleLoading(false);
              showToast.error(
                "Google Sign-In took too long to load. Please refresh and try again."
              );
            }
          }, 5000);
          return;
        }

        // Load Google Identity Services script on demand
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => {
          // Wait for Google to be ready
          const checkReady = setInterval(() => {
            if (
              typeof window.google !== "undefined" &&
              window.google.accounts
            ) {
              clearInterval(checkReady);
              initializeAndPrompt();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkReady);
            if (
              typeof window.google === "undefined" ||
              !window.google.accounts
            ) {
              setGoogleLoading(false);
              showToast.error(
                "Google Sign-In failed to initialize. Please try again."
              );
            }
          }, 3000);
        };

        script.onerror = () => {
          setGoogleLoading(false);
          showToast.error(
            "Failed to load Google Sign-In. Please check your internet connection."
          );
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error("Google OAuth setup error:", error);
        setGoogleLoading(false);
        showToast.error(
          "Google Sign-In is not available. Please use email login."
        );
      }
      return;
    }
    */
  };

  const handleGoogleResponse = async (idToken) => {
    try {
      console.log("[Google OAuth] Attempting to login with ID token");
      // Exchange Google ID token for backend token
      const { user, token, redirectTo } = await api.loginWithGoogle(idToken);
      await storeSession(
        {
          ...user,
          role: user.role || "PG_TENANT",
        },
        token
      );
      showToast.success(
        `Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}!`
      );
      // Navigation will be handled by AppNavigator based on auth state
    } catch (error) {
      console.error("[Google OAuth] Login error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Check if it's a CORS error
      if (
        error.message?.includes("CORS") ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("Network request failed")
      ) {
        const errorMsg =
          "Network error. Please check your API configuration and CORS settings.";
        setError(errorMsg);
        showToast.error(errorMsg);
      } else {
        const errorMsg = error.message || "Google login failed";
        setError(errorMsg);
        showToast.error(errorMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Access your account with email</Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError("")}>
                <Text style={styles.errorClose}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={[
                styles.oauthButton,
                styles.googleButton,
                (loading || googleLoading) && styles.buttonDisabled,
              ]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path
                        fill="#EA4335"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <Path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <Path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <Path
                        fill="#4285F4"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.oauthButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.signUpLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 24,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 16,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  errorClose: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "bold",
    paddingLeft: 16,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#111827",
  },
  submitButton: {
    width: "100%",
    padding: 16,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 16,
    color: "#6B7280",
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
  oauthContainer: {
    marginBottom: 24,
  },
  oauthButton: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleIconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});
