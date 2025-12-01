import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a native module error
    const isNativeModuleError =
      error?.message?.includes("native module") ||
      error?.message?.includes("doesn't exist") ||
      error?.message?.includes("Invariant Violation") ||
      error?.name === "Invariant Violation";

    if (isNativeModuleError) {
      return {
        hasError: true,
        error: {
          type: "native_module",
          message:
            "Some features require a development build. The app will work with limited features in Expo Go.",
          originalError: error,
        },
      };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error?.type === "native_module") {
        return (
          <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.title}>Limited Features Mode</Text>
              <Text style={styles.message}>
                Some features require a development build. The app will work
                with limited features in Expo Go.
              </Text>
              <Text style={styles.subtitle}>Available Features:</Text>
              <Text style={styles.feature}>✅ Login & Authentication</Text>
              <Text style={styles.feature}>✅ Navigation</Text>
              <Text style={styles.feature}>✅ API Calls</Text>
              <Text style={styles.feature}>✅ Most UI Features</Text>
              <Text style={styles.subtitle}>Limited Features:</Text>
              <Text style={styles.feature}>⚠️ Camera/File Picker</Text>
              <Text style={styles.feature}>⚠️ Push Notifications</Text>
              <Text style={styles.feature}>⚠️ File Downloads</Text>
              <Text style={styles.note}>
                💡 Tip: Use "npm run web" for full features, or create a
                development build for native.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  // Try to continue - the error might be recoverable
                  this.setState({ hasError: false, error: null });
                }}
              >
                <Text style={styles.buttonText}>Continue Anyway</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  // Reload the app
                  if (typeof window !== "undefined" && window.location) {
                    window.location.reload();
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Reload App</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        );
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  feature: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
