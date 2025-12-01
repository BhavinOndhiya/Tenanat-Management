import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { showToast } from "../utils/toast";

export default function SettingsScreen() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Save settings to backend
      showToast.success("Settings saved successfully!");
    } catch (error) {
      showToast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your app preferences and account settings
          </Text>
        </View>

        {/* Notification Settings */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications for important updates
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications via email
                  </Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive push notifications on your device
                  </Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </Card>

        {/* Account Settings */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              showToast.info("Change password feature coming soon");
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingDescription}>
                Update your account password
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              showToast.info("Privacy settings coming soon");
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy</Text>
              <Text style={styles.settingDescription}>
                Manage your privacy settings
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* App Settings */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>App</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              showToast.info("About information coming soon");
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>About</Text>
              <Text style={styles.settingDescription}>
                App version and information
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              showToast.info("Help and support coming soon");
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Help & Support</Text>
              <Text style={styles.settingDescription}>
                Get help and contact support
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button onPress={handleSave} loading={saving} style={styles.saveButton}>
          Save Settings
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  chevron: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
  },
});
