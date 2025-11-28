import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { api } from "../../utils/api";

export default function AdminAssignFlatsScreen() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const data = await api.getFlatAssignments();
        setAssignments(data);
      } catch (error) {
        console.error("Error loading assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAssignments();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.list}>
        {assignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentCard}>
            <Text style={styles.userName}>{assignment.user.name}</Text>
            <Text style={styles.userEmail}>{assignment.user.email}</Text>
            <Text style={styles.flatInfo}>
              {assignment.flat.buildingName} · {assignment.flat.flatNumber}
            </Text>
            <Text style={styles.relation}>Relation: {assignment.relation}</Text>
            {assignment.isPrimary && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Primary</Text>
              </View>
            )}
          </View>
        ))}
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
  list: {
    padding: 16,
  },
  assignmentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  flatInfo: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6366f1",
    marginBottom: 4,
  },
  relation: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
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
});
