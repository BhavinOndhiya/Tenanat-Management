import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../utils/api";

const STATUS_LABELS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const PRIMARY = "#6366f1";
const SUCCESS = "#10b981";
const WARNING = "#f59e0b";
const INFO = "#0ea5e9";
const ACCENT = "#8b5cf6";

export default function AdminDashboard({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      setRefreshing(true);
      const data = await api.getAdminDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error("Error loading admin summary:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const stats = summary?.stats || {};
  const charts = summary?.charts || {
    complaintsByStatus: [],
    complaintsByCategory: [],
  };

  const totalComplaints = useMemo(() => {
    const open = stats.openComplaints || 0;
    const resolved = stats.resolvedComplaints || 0;
    return open + resolved;
  }, [stats.openComplaints, stats.resolvedComplaints]);

  const statusMax = useMemo(() => {
    const counts = charts.complaintsByStatus?.map((item) => item.count) || [];
    const max = Math.max(...counts, 1);
    return max <= 0 ? 1 : max;
  }, [charts.complaintsByStatus]);

  const statCards = useMemo(
    () => [
      {
        label: "Total Complaints",
        value: totalComplaints,
        icon: "document-text",
        color: PRIMARY,
        onPress: () =>
          navigation.navigate("AdminComplaints", {
            view: "all",
          }),
      },
      {
        label: "Open Complaints",
        value: stats.openComplaints || 0,
        icon: "alert-circle",
        color: WARNING,
        onPress: () =>
          navigation.navigate("AdminComplaints", {
            view: "open",
          }),
      },
      {
        label: "Resolved Complaints",
        value: stats.resolvedComplaints || 0,
        icon: "checkmark-circle",
        color: SUCCESS,
        onPress: () =>
          navigation.navigate("AdminComplaints", {
            view: "resolved",
          }),
      },
      {
        label: "Residents",
        value: stats.totalCitizens || 0,
        icon: "people",
        color: PRIMARY,
        onPress: () => navigation.navigate("AdminUsers"),
      },
      {
        label: "Flats",
        value: stats.totalFlats || 0,
        icon: "business",
        color: ACCENT,
        onPress: () => navigation.navigate("AdminFlats"),
      },
      {
        label: "Active Notices",
        value: stats.activeAnnouncements || 0,
        icon: "megaphone",
        color: INFO,
        onPress: () => navigation.navigate("AdminAnnouncements"),
      },
      {
        label: "Upcoming Events",
        value: stats.upcomingEvents || 0,
        icon: "calendar",
        color: PRIMARY,
        onPress: () => navigation.navigate("AdminEvents"),
      },
    ],
    [navigation, stats, totalComplaints]
  );

  const handleCategoryPress = (category) => {
    navigation.navigate("AdminComplaints", {
      view: "all",
      filters: { category },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchSummary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Live snapshot of complaints, residents, notices and billing
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchSummary}>
          <Ionicons name="refresh" size={20} color={PRIMARY} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <TouchableOpacity
            key={card.label}
            style={styles.statCard}
            onPress={card.onPress}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.statIconWrapper,
                { backgroundColor: `${card.color}20` },
              ]}
            >
              <Ionicons name={card.icon} size={24} color={card.color} />
            </View>
            <Text style={styles.statNumber}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionRow}>
        <View style={styles.analyticsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Complaints by Status</Text>
            <TouchableOpacity onPress={fetchSummary}>
              <Text style={styles.cardAction}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {charts.complaintsByStatus?.length === 0 ? (
            <Text style={styles.emptyText}>No complaint data yet.</Text>
          ) : (
            charts.complaintsByStatus.map((item) => (
              <View key={item.status} style={styles.statusBlock}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Text>
                  <Text style={styles.statusValue}>{item.count}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (item.count / statusMax) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.analyticsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Complaints by Category</Text>
          </View>
          {charts.complaintsByCategory?.length === 0 ? (
            <Text style={styles.emptyText}>No categories recorded yet.</Text>
          ) : (
            charts.complaintsByCategory.map((item) => (
              <TouchableOpacity
                key={item.category}
                style={styles.categoryRow}
                onPress={() => handleCategoryPress(item.category)}
              >
                <View>
                  <Text style={styles.categoryLabel}>{item.category}</Text>
                  <Text style={styles.categorySub}>
                    {totalComplaints
                      ? `${((item.count / totalComplaints) * 100).toFixed(
                          1
                        )}% of total`
                      : "—"}
                  </Text>
                </View>
                <Text style={styles.categoryValue}>{item.count}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminAssignFlats")}
          >
            <Ionicons name="link" size={22} color={PRIMARY} />
            <Text style={styles.actionText}>Assign Flats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminAnnouncements")}
          >
            <Ionicons name="megaphone" size={22} color={PRIMARY} />
            <Text style={styles.actionText}>Announcements</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminEvents")}
          >
            <Ionicons name="calendar" size={22} color={PRIMARY} />
            <Text style={styles.actionText}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminBilling")}
          >
            <Ionicons name="card" size={22} color={PRIMARY} />
            <Text style={styles.actionText}>Billing</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  refreshText: {
    color: PRIMARY,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  sectionRow: {
    flexDirection: "column",
    gap: 16,
    paddingHorizontal: 20,
  },
  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  cardAction: {
    color: PRIMARY,
    fontWeight: "600",
  },
  statusBlock: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    marginTop: 8,
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  categorySub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  categoryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
});
