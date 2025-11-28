import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { api } from "../../utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function OfficerDashboard() {
  const [summary, setSummary] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [summaryData, complaintsData] = await Promise.all([
        api.getOfficerSummary(),
        api.getOfficerComplaints(),
      ]);
      setSummary(summaryData);
      setComplaints(complaintsData);
      setError("");
    } catch (error) {
      console.error("Error loading officer data:", error);
      setError(error?.message || "Unable to load officer dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await api.updateComplaintStatus(complaintId, newStatus);
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAssign = async (complaintId) => {
    try {
      await api.assignComplaintToMe(complaintId);
      loadData();
    } catch (error) {
      console.error("Error assigning complaint:", error);
    }
  };

  const formatStatus = (status) => {
    return status
      .replace("_", " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderComplaint = ({ item }) => (
    <View style={styles.complaintCard}>
      <Text style={styles.complaintTitle}>{item.title}</Text>
      <Text style={styles.complaintDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.complaintActions}>
        {!item.assignedOfficer && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAssign(item.id)}
          >
            <Text style={styles.actionButtonText}>Assign to Me</Text>
          </TouchableOpacity>
        )}
        {item.status === "NEW" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => handleStatusChange(item.id, "IN_PROGRESS")}
          >
            <Text
              style={[styles.actionButtonText, styles.actionButtonTextPrimary]}
            >
              Start
            </Text>
          </TouchableOpacity>
        )}
        {item.status === "IN_PROGRESS" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => handleStatusChange(item.id, "RESOLVED")}
          >
            <Text
              style={[styles.actionButtonText, styles.actionButtonTextPrimary]}
            >
              Resolve
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={loadData} />
  );

  return (
    <ScrollView style={styles.container} refreshControl={refreshControl}>
      <View style={styles.header}>
        <Text style={styles.title}>Officer Dashboard</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.newComplaints || 0}
            </Text>
            <Text style={styles.summaryLabel}>New</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.inProgressComplaints || 0}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.resolvedLast7Days || 0}
            </Text>
            <Text style={styles.summaryLabel}>Resolved (7d)</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Complaints</Text>
        <FlatList
          data={complaints}
          renderItem={renderComplaint}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No complaints assigned</Text>
            </View>
          }
        />
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  errorText: {
    paddingHorizontal: 20,
    color: "#ef4444",
    marginBottom: 12,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6366f1",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  complaintCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  complaintDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  complaintActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  actionButtonPrimary: {
    backgroundColor: "#6366f1",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
  },
  actionButtonTextPrimary: {
    color: "#fff",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
