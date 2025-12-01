import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast.success("Logged out successfully");
    setIsOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const menuItems = [
    {
      label: "View Profile",
      onPress: () => {
        // Navigate to Profile tab in the bottom tab navigator
        navigation.getParent()?.navigate("Profile");
        setIsOpen(false);
      },
    },
    {
      label: "Edit Profile",
      onPress: () => {
        // Navigate to Profile tab in the bottom tab navigator
        navigation.getParent()?.navigate("Profile", { edit: true });
        setIsOpen(false);
      },
    },
    {
      label: "Change Photo",
      onPress: () => {
        navigation.navigate("Profile", { edit: true, tab: "photo" });
        setIsOpen(false);
      },
    },
    {
      label: "Settings",
      onPress: () => {
        navigation.navigate("Settings");
        setIsOpen(false);
      },
      divider: true,
    },
    {
      label: "Notifications",
      onPress: () => {
        navigation.navigate("Notifications");
        setIsOpen(false);
      },
    },
    {
      label: "Logout",
      onPress: handleLogout,
      variant: "danger",
      divider: true,
    },
  ];

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.avatarButton}
      >
        {user?.avatarUrl ? (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>IMG</Text>
          </View>
        ) : (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.avatarContainerLarge}>
                <Text style={styles.avatarTextLarge}>
                  {getInitials(user?.name)}
                </Text>
              </View>
              <Text style={styles.userName}>{user?.name || "User"}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role || "CITIZEN"}</Text>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <View key={index}>
                  {item.divider && index > 0 && (
                    <View style={styles.menuDivider} />
                  )}
                  <TouchableOpacity
                    onPress={item.onPress}
                    style={[
                      styles.menuItem,
                      item.variant === "danger" && styles.menuItemDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuItemText,
                        item.variant === "danger" && styles.menuItemTextDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    padding: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  userInfo: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainerLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  avatarTextLarge: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  menuContainer: {
    maxHeight: 300,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemDanger: {
    borderBottomColor: "#FEE2E2",
  },
  menuItemText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  menuItemTextDanger: {
    color: "#DC2626",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
});
