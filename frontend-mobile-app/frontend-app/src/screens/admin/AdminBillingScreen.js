import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { api } from "../../utils/api";

export default function AdminBillingScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await api.getAdminBillingSummary();
        setSummary(data);
      } catch (error) {
        console.error("Error loading billing summary:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
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
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Billed</Text>
          <Text style={styles.summaryAmount}>
            ₹{summary?.totalBilled?.toFixed(2) || "0.00"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryAmount}>
            ₹{summary?.totalPaid?.toFixed(2) || "0.00"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryAmount, styles.outstanding]}>
            ₹{summary?.totalOutstanding?.toFixed(2) || "0.00"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={[styles.summaryAmount, styles.overdue]}>
            ₹{summary?.totalOverdue?.toFixed(2) || "0.00"}
          </Text>
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
  summaryContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  outstanding: {
    color: "#f59e0b",
  },
  overdue: {
    color: "#ef4444",
  },
});
