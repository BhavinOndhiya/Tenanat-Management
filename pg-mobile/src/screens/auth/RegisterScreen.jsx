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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { validateEmail, validatePassword } from "../../utils/validation";

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { login: storeSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleEmailChange = (value) => {
    setEmail(value);
    const validation = validateEmail(value);
    setEmailError(validation.error || "");
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordError(validation.error || "");
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

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
      await storeSession(
        {
          ...user,
          role: user.role || "PG_TENANT",
        },
        token
      );
      showToast.success("Account created! Redirecting you...");
    } catch (apiError) {
      const message =
        apiError?.message ||
        "We couldn't create your account. Please try again.";
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
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
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join the PG Management platform in minutes
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError("")}>
                <Text style={styles.errorClose}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
              {emailError ? (
                <Text style={styles.errorTextSmall}>{emailError}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordError && styles.inputError]}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Create a strong password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              {passwordError ? (
                <Text style={styles.errorTextSmall}>{passwordError}</Text>
              ) : null}
            </View>

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
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signInLink}>Sign in here</Text>
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
    paddingVertical: 40,
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
  errorTextSmall: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
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
  inputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
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
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 16,
    color: "#6B7280",
  },
  signInLink: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
});

