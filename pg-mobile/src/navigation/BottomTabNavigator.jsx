import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { Text, StyleSheet, View, ActivityIndicator } from "react-native";
import Navbar from "../components/Navbar";

// Tenant Screens
import DashboardScreen from "../screens/tenant/DashboardScreen";
// Lazy load screens with expo imports to prevent native module errors
// import PgTenantPaymentsScreen from "../screens/tenant/PgTenantPaymentsScreen";
// import DocumentsScreen from "../screens/tenant/DocumentsScreen";
import EventsScreen from "../screens/tenant/EventsScreen";
// import ProfileScreen from "../screens/tenant/ProfileScreen";

// Owner Screens
import PgOwnerDashboardScreen from "../screens/owner/PgOwnerDashboardScreen";
import PgTenantManagementScreen from "../screens/owner/PgTenantManagementScreen";
import PgPropertiesScreen from "../screens/owner/PgPropertiesScreen";
// import PgOwnerPaymentsScreen from "../screens/owner/PgOwnerPaymentsScreen";
import PgOwnerComplaintsScreen from "../screens/owner/PgOwnerComplaintsScreen";
// import OwnerDocumentsScreen from "../screens/owner/OwnerDocumentsScreen";

// Lazy load screens that import expo packages - create wrapper components
const LazyPgTenantPaymentsScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/tenant/PgTenantPaymentsScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load PgTenantPaymentsScreen:", error);
      });
  }, []);
  if (!Screen)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  return <Screen {...props} />;
};

const LazyDocumentsScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/tenant/DocumentsScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load DocumentsScreen:", error);
      });
  }, []);
  if (!Screen)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  return <Screen {...props} />;
};

const LazyProfileScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/tenant/ProfileScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load ProfileScreen:", error);
      });
  }, []);
  if (!Screen)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  return <Screen {...props} />;
};

const LazyPgOwnerPaymentsScreen = (props) => {
  const [Screen, setScreen] = React.useState(null);
  React.useEffect(() => {
    import("../screens/owner/PgOwnerPaymentsScreen")
      .then((module) => {
        setScreen(() => module.default);
      })
      .catch((error) => {
        console.error("Failed to load PgOwnerPaymentsScreen:", error);
      });
  }, []);
  if (!Screen)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  return <Screen {...props} />;
};

const Tab = createBottomTabNavigator();

// Simple icon component (you can replace with react-native-vector-icons later)
const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: "🏠",
    Payments: "💳",
    Documents: "📄",
    Events: "📅",
    Profile: "👤",
    Tenants: "👥",
    Properties: "🏢",
    Complaints: "📋",
  };
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[name] || "•"}
    </Text>
  );
};

export default function BottomTabNavigator() {
  const { user } = useAuth();

  if (user?.role === "PG_TENANT") {
    return (
      <View style={{ flex: 1 }}>
        <Navbar />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#2563EB",
            tabBarInactiveTintColor: "#6B7280",
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              tabBarLabel: "Home",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Home" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="PgTenantPayments"
            component={LazyPgTenantPaymentsScreen}
            options={{
              tabBarLabel: "Payments",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Payments" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Documents"
            component={LazyDocumentsScreen}
            options={{
              tabBarLabel: "Documents",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Documents" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Events"
            component={EventsScreen}
            options={{
              tabBarLabel: "Events",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Events" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={LazyProfileScreen}
            options={{
              tabBarLabel: "Profile",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Profile" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    );
  }

  if (user?.role === "PG_OWNER") {
    return (
      <View style={{ flex: 1 }}>
        <Navbar />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#2563EB",
            tabBarInactiveTintColor: "#6B7280",
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tab.Screen
            name="PgOwnerDashboard"
            component={PgOwnerDashboardScreen}
            options={{
              tabBarLabel: "Dashboard",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Home" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="PgTenantManagement"
            component={PgTenantManagementScreen}
            options={{
              tabBarLabel: "Tenants",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Tenants" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="PgProperties"
            component={PgPropertiesScreen}
            options={{
              tabBarLabel: "Properties",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Properties" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="PgOwnerPayments"
            component={LazyPgOwnerPaymentsScreen}
            options={{
              tabBarLabel: "Payments",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Payments" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="PgOwnerComplaints"
            component={PgOwnerComplaintsScreen}
            options={{
              tabBarLabel: "Complaints",
              tabBarIcon: ({ focused }) => (
                <TabIcon name="Complaints" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    );
  }

  // Default fallback
  return (
    <View style={{ flex: 1 }}>
      <Navbar />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon name="Home" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={LazyProfileScreen}
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ focused }) => (
              <TabIcon name="Profile" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  icon: {
    fontSize: 24,
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
});
