import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import UserDropdown from "./UserDropdown";

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();

  if (!isAuthenticated) {
    return null;
  }

  const getDefaultRoute = () => {
    if (user?.role === "PG_OWNER") return "PgOwnerDashboard";
    if (user?.role === "PG_TENANT") return "Dashboard";
    return "Dashboard";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => navigation.navigate(getDefaultRoute())}
          style={styles.brandContainer}
        >
          <Text style={styles.brand}>Complaint Management</Text>
        </TouchableOpacity>
        <UserDropdown />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  brandContainer: {
    flex: 1,
  },
  brand: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
});
