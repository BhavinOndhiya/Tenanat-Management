import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

// Citizen screens
import CitizenDashboard from "../screens/citizen/DashboardScreen";
import ComplaintsListScreen from "../screens/citizen/ComplaintsListScreen";
import ComplaintDetailsScreen from "../screens/citizen/ComplaintDetailsScreen";
import ComplaintFormScreen from "../screens/citizen/ComplaintFormScreen";
import EventsScreen from "../screens/citizen/EventsScreen";
import BillingListScreen from "../screens/citizen/BillingListScreen";
import BillingDetailScreen from "../screens/citizen/BillingDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TenantManagementScreen from "../screens/TenantManagementScreen";

// Officer screens
import OfficerDashboard from "../screens/officer/OfficerDashboard";

// Admin screens
import AdminDashboard from "../screens/admin/AdminDashboard";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";
import AdminFlatsScreen from "../screens/admin/AdminFlatsScreen";
import AdminAssignFlatsScreen from "../screens/admin/AdminAssignFlatsScreen";
import AdminAnnouncementsScreen from "../screens/admin/AdminAnnouncementsScreen";
import AdminEventsScreen from "../screens/admin/AdminEventsScreen";
import AdminBillingScreen from "../screens/admin/AdminBillingScreen";
import AdminComplaintsScreen from "../screens/admin/AdminComplaintsScreen";

// Owner screens
import OwnerDashboardScreen from "../screens/owner/OwnerDashboardScreen";
import OwnerPropertiesScreen from "../screens/owner/OwnerPropertiesScreen";
import OwnerCollectionsScreen from "../screens/owner/OwnerCollectionsScreen";
import OwnerMoreScreen from "../screens/owner/OwnerMoreScreen";
import AddPropertyScreen from "../screens/owner/AddPropertyScreen";
import OwnerIncomeExpenseSummaryScreen from "../screens/owner/OwnerIncomeExpenseSummaryScreen";
import ComingSoonScreen from "../screens/owner/ComingSoonScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CitizenTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Complaints") {
            iconName = focused ? "document-text" : "document-text-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Billing") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={CitizenDashboard} />
      <Tab.Screen name="Complaints" component={ComplaintsListScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Billing" component={BillingListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function OfficerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={OfficerDashboard} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Users") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Flats") {
            iconName = focused ? "business" : "business-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Flats" component={AdminFlatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "home-outline";
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Properties") {
            iconName = focused ? "business" : "business-outline";
          } else if (route.name === "Collections") {
            iconName = focused ? "cash" : "cash-outline";
          } else if (route.name === "More") {
            iconName = focused ? "ellipsis-horizontal" : "ellipsis-horizontal";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={OwnerDashboardScreen} />
      <Tab.Screen name="Properties" component={OwnerPropertiesScreen} />
      <Tab.Screen name="Collections" component={OwnerCollectionsScreen} />
      <Tab.Screen name="More" component={OwnerMoreScreen} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isOfficer = user?.role === "OFFICER";
  const isOwner = user?.role === "OWNER";

  return (
    <Stack.Navigator>
      {isAdmin ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={AdminTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdminAssignFlats"
            component={AdminAssignFlatsScreen}
            options={{ title: "Assign Flats" }}
          />
          <Stack.Screen
            name="AdminAnnouncements"
            component={AdminAnnouncementsScreen}
            options={{ title: "Announcements" }}
          />
          <Stack.Screen
            name="AdminEvents"
            component={AdminEventsScreen}
            options={{ title: "Events" }}
          />
          <Stack.Screen
            name="AdminBilling"
            component={AdminBillingScreen}
            options={{ title: "Billing" }}
          />
          <Stack.Screen
            name="AdminComplaints"
            component={AdminComplaintsScreen}
            options={({ route }) => ({
              title:
                route.params?.view === "open"
                  ? "Open Complaints"
                  : route.params?.view === "resolved"
                  ? "Resolved Complaints"
                  : "All Complaints",
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
          <Stack.Screen
            name="TenantManagement"
            component={TenantManagementScreen}
            options={{ title: "Tenant Management" }}
          />
        </>
      ) : isOfficer ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={OfficerTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </>
      ) : isOwner ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={OwnerTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddProperty"
            component={AddPropertyScreen}
            options={{ title: "Add Property" }}
          />
          <Stack.Screen
            name="OwnerIncomeExpenseSummary"
            component={OwnerIncomeExpenseSummaryScreen}
            options={{ title: "Income & Expense" }}
          />
          <Stack.Screen
            name="ComingSoon"
            component={ComingSoonScreen}
            options={({ route }) => ({
              title: route.params?.title || "Coming Soon",
            })}
          />
          <Stack.Screen
            name="TenantManagement"
            component={TenantManagementScreen}
            options={{ title: "Tenant Management" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={CitizenTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ComplaintForm"
            component={ComplaintFormScreen}
            options={{ title: "New Complaint" }}
          />
          <Stack.Screen
            name="ComplaintDetails"
            component={ComplaintDetailsScreen}
            options={{ title: "Complaint Details" }}
          />
          <Stack.Screen
            name="BillingDetail"
            component={BillingDetailScreen}
            options={{ title: "Invoice Details" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
          <Stack.Screen
            name="TenantManagement"
            component={TenantManagementScreen}
            options={{ title: "Tenant Management" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
