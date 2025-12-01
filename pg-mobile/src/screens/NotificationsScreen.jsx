import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
} from "react-native";
// Don't import expo-notifications at module level - it causes native module errors in Expo Go
// We'll import it dynamically inside the component
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { showToast } from "../utils/toast";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [Notifications, setNotifications] = useState(null);
  const [notificationsAvailable, setNotificationsAvailable] = useState(false);

  useEffect(() => {
    // Dynamically import expo-notifications only when component mounts
    // This prevents native module access during app initialization
    const loadNotifications = async () => {
      try {
        const NotificationsModule = await import("expo-notifications");
        setNotifications(NotificationsModule.default || NotificationsModule);
        setNotificationsAvailable(true);

        // Configure notification handler
        try {
          (
            NotificationsModule.default || NotificationsModule
          ).setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        } catch (error) {
          console.warn("Failed to set notification handler:", error);
        }

        checkPermissions(NotificationsModule.default || NotificationsModule);
        registerForPushNotifications(
          NotificationsModule.default || NotificationsModule
        );
      } catch (error) {
        console.error("Failed to load expo-notifications:", error);
        setLoading(false);
        showToast.error("Notifications are not available in this environment");
      }
    };

    loadNotifications();
  }, []);

  const checkPermissions = async (NotificationsModule) => {
    if (!NotificationsModule) return;
    try {
      const { status } = await NotificationsModule.getPermissionsAsync();
      setNotificationPermission(status === "granted");
    } catch (error) {
      console.error("Error checking permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const registerForPushNotifications = async (NotificationsModule) => {
    if (!NotificationsModule) return;
    try {
      const { status: existingStatus } =
        await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setNotificationPermission(false);
        return;
      }

      setNotificationPermission(true);
      const token = await NotificationsModule.getExpoPushTokenAsync({
        projectId: "your-project-id", // Replace with your Expo project ID
      });
      setExpoPushToken(token.data);

      if (Platform.OS === "android") {
        await NotificationsModule.setNotificationChannelAsync("default", {
          name: "Default",
          importance: NotificationsModule.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      showToast.error("Failed to register for notifications");
    }
  };

  const requestPermission = async () => {
    if (!Notifications) {
      showToast.error("Notifications are not available");
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setNotificationPermission(true);
        await registerForPushNotifications(Notifications);
        showToast.success("Notification permission granted!");
      } else {
        setNotificationPermission(false);
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings to receive updates."
        );
      }
    } catch (error) {
      showToast.error("Failed to request notification permission");
    }
  };

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  // Show loading or error state if notifications not available
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!notificationsAvailable) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Notifications are not available in this environment.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Manage your notification preferences
          </Text>
        </View>

        {/* Permission Status */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Permission Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Notification Permission</Text>
              <Text
                style={[
                  styles.statusValue,
                  notificationPermission
                    ? styles.statusValueGranted
                    : styles.statusValueDenied,
                ]}
              >
                {notificationPermission ? "✓ Granted" : "✗ Denied"}
              </Text>
            </View>
            {!notificationPermission && (
              <Button
                variant="primary"
                size="sm"
                onPress={requestPermission}
                style={styles.permissionButton}
              >
                Request Permission
              </Button>
            )}
            {!notificationPermission && (
              <Button
                variant="secondary"
                size="sm"
                onPress={openSettings}
                style={styles.permissionButton}
              >
                Open Settings
              </Button>
            )}
          </View>
          {expoPushToken && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Push Token:</Text>
              <Text style={styles.tokenValue} numberOfLines={2}>
                {expoPushToken}
              </Text>
            </View>
          )}
        </Card>

        {/* Notification Preferences */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Complaint Updates</Text>
              <Text style={styles.preferenceDescription}>
                Get notified about complaint status changes
              </Text>
            </View>
            <Switch
              value={notificationPermission}
              onValueChange={(value) => {
                if (value && !notificationPermission) {
                  requestPermission();
                }
              }}
              disabled={!notificationPermission}
              trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Payment Reminders</Text>
              <Text style={styles.preferenceDescription}>
                Receive reminders for upcoming payments
              </Text>
            </View>
            <Switch
              value={notificationPermission}
              onValueChange={(value) => {
                if (value && !notificationPermission) {
                  requestPermission();
                }
              }}
              disabled={!notificationPermission}
              trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceLabel}>Event Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Get notified about upcoming events
              </Text>
            </View>
            <Switch
              value={notificationPermission}
              onValueChange={(value) => {
                if (value && !notificationPermission) {
                  requestPermission();
                }
              }}
              disabled={!notificationPermission}
              trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Recent Notifications */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Recent Notifications</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No notifications yet. You'll see updates here when you receive
              them.
            </Text>
          </View>
        </Card>
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
  statusContainer: {
    gap: 12,
  },
  statusInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusValueGranted: {
    color: "#2563EB",
  },
  statusValueDenied: {
    color: "#EF4444",
  },
  permissionButton: {
    marginTop: 8,
  },
  tokenContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 12,
    color: "#1F2937",
    fontFamily: "monospace",
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
