import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteForRole } from "../utils/roles";
import BottomTabNavigator from "./BottomTabNavigator";
import Navbar from "../components/Navbar";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

// Main Screens
import DashboardScreen from "../screens/tenant/DashboardScreen";
import PgOwnerDashboardScreen from "../screens/owner/PgOwnerDashboardScreen";
// Lazy load screens with expo imports - see getLazyScreen functions below
// import TenantOnboardingScreen from "../screens/tenant/TenantOnboardingScreen";
// import ProfileScreen from "../screens/tenant/ProfileScreen";
import EventsScreen from "../screens/tenant/EventsScreen";
// import PgTenantPaymentsScreen from "../screens/tenant/PgTenantPaymentsScreen";
// import DocumentsScreen from "../screens/tenant/DocumentsScreen";
import PgTenantManagementScreen from "../screens/owner/PgTenantManagementScreen";
import PgPropertiesScreen from "../screens/owner/PgPropertiesScreen";
// import PgOwnerPaymentsScreen from "../screens/owner/PgOwnerPaymentsScreen";
// import OwnerDocumentsScreen from "../screens/owner/OwnerDocumentsScreen";
import PgOwnerComplaintsScreen from "../screens/owner/PgOwnerComplaintsScreen";
import PgOwnerComplaintDetailScreen from "../screens/owner/PgOwnerComplaintDetailScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";

// Lazy load screens that import expo packages to prevent native module errors in Expo Go
// Create wrapper components that import only when rendered
const LazyNotificationsScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/NotificationsScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load NotificationsScreen:", error);
      });
  }, []);
  if (!Screen) return <LoadingScreen />;
  return <Screen {...props} />;
};

const LazyTenantOnboardingScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/tenant/TenantOnboardingScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load TenantOnboardingScreen:", error);
      });
  }, []);
  if (!Screen) return <LoadingScreen />;
  return <Screen {...props} />;
};

import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          header: () => <Navbar />,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : (
          // Main App Stack
          <>
            {/* Redirect tenants to onboarding if not completed */}
            {user?.role === "PG_TENANT" &&
            user?.onboardingStatus &&
            user.onboardingStatus !== "completed" ? (
              <Stack.Screen
                name="TenantOnboarding"
                component={LazyTenantOnboardingScreen}
                options={{ headerShown: false }}
              />
            ) : (
              <>
                {/* Main Tab Navigator */}
                <Stack.Screen
                  name="MainTabs"
                  component={BottomTabNavigator}
                  options={{ headerShown: false }}
                />

                {/* Additional screens that aren't in tabs */}
                <Stack.Screen
                  name="TenantOnboarding"
                  component={LazyTenantOnboardingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    headerShown: true,
                    header: () => <Navbar />,
                    title: "Settings",
                  }}
                />
                <Stack.Screen
                  name="Notifications"
                  component={LazyNotificationsScreen}
                  options={{
                    headerShown: true,
                    header: () => <Navbar />,
                    title: "Notifications",
                  }}
                />
                <Stack.Screen
                  name="ImageViewer"
                  component={ImageViewerScreen}
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                  }}
                />
                <Stack.Screen
                  name="PgOwnerComplaintDetail"
                  component={PgOwnerComplaintDetailScreen}
                  options={{
                    headerShown: true,
                    header: () => <Navbar />,
                    title: "Complaint Details",
                  }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
