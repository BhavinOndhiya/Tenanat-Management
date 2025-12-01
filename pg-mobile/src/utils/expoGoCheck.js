import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Check if the app is running in Expo Go
 * Expo Go has limited support for native modules
 */
export function isExpoGo() {
  try {
    // In Expo Go, Constants.executionEnvironment is 'storeClient'
    // In development builds, it's 'standalone' or 'bare'
    return (
      Constants.executionEnvironment === "storeClient" ||
      // Fallback check: if Constants.appOwnership is 'expo', we're in Expo Go
      Constants.appOwnership === "expo"
    );
  } catch (error) {
    // If Constants is not available, assume we're not in Expo Go
    return false;
  }
}

/**
 * Check if a native module feature is available
 * Some features require development builds and won't work in Expo Go
 */
export function isNativeModuleAvailable(moduleName) {
  if (!isExpoGo()) {
    // In development builds or bare React Native, assume modules are available
    return true;
  }

  // In Expo Go, some modules are not available
  const unavailableModules = [
    "expo-file-system",
    "expo-sharing",
    "expo-image-picker",
    "expo-notifications",
  ];

  return !unavailableModules.some((name) => moduleName.includes(name));
}

/**
 * Get a user-friendly message about feature limitations in Expo Go
 */
export function getExpoGoLimitationMessage() {
  return {
    title: "Limited Features in Expo Go",
    message:
      "Some features require a development build. The app will work with limited features in Expo Go.",
    availableFeatures: [
      "Login & Authentication",
      "Navigation",
      "API Calls",
      "Most UI Features",
    ],
    limitedFeatures: [
      "Camera/File Picker",
      "Push Notifications",
      "File Downloads",
    ],
  };
}
