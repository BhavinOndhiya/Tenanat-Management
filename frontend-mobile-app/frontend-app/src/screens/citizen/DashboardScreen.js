import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [flats, setFlats] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [flatsData, announcementsData, eventsData] = await Promise.all([
        api.getMyFlats().catch(() => []),
        api.getAnnouncements().catch(() => []),
        api.getEvents().catch(() => []),
      ]);
      setFlats(flatsData);
      setAnnouncements(announcementsData.slice(0, 4));
      setEvents(eventsData.slice(0, 3));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.name}! 👋</Text>
        <Text style={styles.subtitle}>
          Manage your complaints and track their status
        </Text>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate("ComplaintForm")}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create New Complaint</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Flat</Text>
        {flats.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No flat assignment yet. Contact your admin to link your apartment.
            </Text>
          </View>
        ) : (
          flats.map((assignment) => (
            <View key={assignment.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {assignment.flat.buildingName} · {assignment.flat.flatNumber}
              </Text>
              <Text style={styles.cardSubtitle}>
                Block {assignment.flat.block || "—"} · Floor{" "}
                {assignment.flat.floor ?? "—"} · {assignment.relation}
              </Text>
              {assignment.isPrimary && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Primary home</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notices & Maintenance</Text>
        {announcements.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No active announcements.</Text>
          </View>
        ) : (
          announcements.map((notice) => (
            <View
              key={notice.id}
              style={[styles.card, notice.isUrgent && styles.urgentCard]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{notice.title}</Text>
                <Text style={styles.cardType}>{notice.type}</Text>
              </View>
              <Text style={styles.cardBody}>{notice.body}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Events")}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {events.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No events scheduled yet.</Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.card}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.cardSubtitle}>
                {new Date(event.date).toLocaleDateString()} · {event.location}
              </Text>
            </View>
          ))
        )}
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
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  urgentCard: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  cardType: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  cardBody: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#6366f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
