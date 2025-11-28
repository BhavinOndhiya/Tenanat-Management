import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { api } from "../../utils/api";

export default function ComplaintDetailsScreen({ route }) {
  const { complaintId } = route.params;
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComplaint = async () => {
      try {
        const data = await api.getComplaint(complaintId);
        setComplaint(data);
      } catch (error) {
        console.error("Error loading complaint:", error);
      } finally {
        setLoading(false);
      }
    };
    loadComplaint();
  }, [complaintId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Complaint not found</Text>
      </View>
    );
  }

  const formatStatus = (status) => {
    return status
      .replace("_", " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "NEW":
        return "#3b82f6";
      case "IN_PROGRESS":
        return "#f59e0b";
      case "RESOLVED":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{complaint.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(complaint.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(complaint.status) },
              ]}
            >
              {formatStatus(complaint.status)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{complaint.category}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{complaint.description}</Text>
        </View>

        {complaint.flat && (
          <View style={styles.section}>
            <Text style={styles.label}>Flat</Text>
            <Text style={styles.value}>
              {complaint.flat.buildingName} · {complaint.flat.flatNumber}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>
            {new Date(complaint.createdAt).toLocaleString()}
          </Text>
        </View>

        {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
          <View style={styles.section}>
            <Text style={styles.label}>Last Updated</Text>
            <Text style={styles.value}>
              {new Date(complaint.updatedAt).toLocaleString()}
            </Text>
          </View>
        )}

        {complaint.assignedOfficer && (
          <View style={styles.section}>
            <Text style={styles.label}>Assigned Officer</Text>
            <Text style={styles.value}>{complaint.assignedOfficer.name}</Text>
          </View>
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
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: "#1f2937",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
  },
});
