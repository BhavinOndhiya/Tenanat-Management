import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen({ navigation }) {
  const { user, logout, login, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  const buildStats = (complaints = []) => ({
    total: complaints.length,
    new: complaints.filter((c) => c.status === "NEW").length,
    inProgress: complaints.filter((c) => c.status === "IN_PROGRESS").length,
    resolved: complaints.filter((c) => c.status === "RESOLVED").length,
  });

  const hydrateProfile = (data) => ({
    name: data?.name || user?.name || "",
    phone: data?.phone || "",
    address: {
      street: data?.address?.street || "",
      city: data?.address?.city || "",
      state: data?.address?.state || "",
      zipCode: data?.address?.zipCode || "",
      country: data?.address?.country || "",
    },
  });

  const loadProfile = async () => {
    try {
      setRefreshing(true);
      const [profileData, complaints] = await Promise.all([
        api.getProfile(),
        user?.role === "OFFICER"
          ? api
              .getOfficerComplaints()
              .then((items) =>
                items.filter(
                  (c) => c.assignedOfficer && c.assignedOfficer.id === user?.id
                )
              )
          : api.getMyComplaints(),
      ]);

      setProfile(profileData);
      setFormData(hydrateProfile(profileData));
      setStats(buildStats(complaints));
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert(
        "Profile error",
        error?.message || "Unable to load profile details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(formData);
      setProfile((prev) => ({ ...prev, ...formData }));
      setIsEditing(false);
      if (login && token) {
        await login(
          {
            ...user,
            name: formData.name,
          },
          token
        );
      }
      Alert.alert("Profile updated", "Your profile has been saved.");
    } catch (error) {
      Alert.alert(
        "Update failed",
        error?.message || "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const renderInput = (
    label,
    value,
    onChangeText,
    keyboardType = "default"
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder="Enter value"
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={styles.inputValue}>{value || "—"}</Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadProfile} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#6366f1" />
        </View>
        <Text style={styles.name}>{formData.name}</Text>
        <Text style={styles.email}>{profile?.email || user?.email}</Text>
        <Text style={styles.role}>{profile?.role || user?.role}</Text>
        <View style={styles.actionRow}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  setFormData(hydrateProfile(profile));
                  setIsEditing(false);
                }}
              >
                <Text style={[styles.actionButtonText, styles.secondaryText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  saving && styles.actionButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>
              {user?.role === "OFFICER" ? "Assigned" : "Total"} Complaints
            </Text>
            <Text style={styles.statsValue}>{stats.total}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>New</Text>
            <Text style={styles.statsValue}>{stats.new}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>In Progress</Text>
            <Text style={styles.statsValue}>{stats.inProgress}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Resolved</Text>
            <Text style={styles.statsValue}>{stats.resolved}</Text>
          </View>
        </View>
      )}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {renderInput("Full Name", formData.name, (value) =>
          setFormData((prev) => ({ ...prev, name: value }))
        )}
        {renderInput(
          "Phone",
          formData.phone,
          (value) => setFormData((prev) => ({ ...prev, phone: value })),
          "phone-pad"
        )}
        <Text style={[styles.sectionTitle, styles.addressTitle]}>Address</Text>
        {renderInput("Street", formData.address.street, (value) =>
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, street: value },
          }))
        )}
        {renderInput("City", formData.address.city, (value) =>
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, city: value },
          }))
        )}
        {renderInput("State", formData.address.state, (value) =>
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, state: value },
          }))
        )}
        {renderInput("ZIP Code", formData.address.zipCode, (value) =>
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, zipCode: value },
          }))
        )}
        {renderInput("Country", formData.address.country, (value) =>
          setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, country: value },
          }))
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="settings-outline" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {user?.role === "CITIZEN" && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("TenantManagement")}
          >
            <Ionicons name="people-outline" size={24} color="#6366f1" />
            <Text style={styles.menuText}>Tenant Management</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 32,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#e0e7ff",
  },
  secondaryText: {
    color: "#4c1d95",
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    marginLeft: 12,
  },
  logoutText: {
    color: "#ef4444",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statsCard: {
    flexBasis: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  formCard: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  addressTitle: {
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  inputValue: {
    fontSize: 16,
    color: "#111827",
  },
});
