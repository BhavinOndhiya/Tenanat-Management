import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = [
  "ROAD",
  "WATER",
  "ELECTRICITY",
  "SANITATION",
  "SECURITY",
  "MAINTENANCE",
  "ELEVATOR",
  "PARKING",
  "OTHER",
];
const STATUSES = ["ALL", "NEW", "IN_PROGRESS", "RESOLVED"];

export default function ComplaintsListScreen({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const loadComplaints = async () => {
    try {
      const data = await api.getMyComplaints();
      setComplaints(data);
    } catch (error) {
      console.error("Error loading complaints:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesSearch =
        searchQuery === "" ||
        complaint.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        complaint.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        complaint.status?.toUpperCase() === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" || complaint.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

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

  const renderComplaint = ({ item }) => (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() =>
        navigation.navigate("ComplaintDetails", { complaintId: item.id })
      }
    >
      <View style={styles.complaintHeader}>
        <Text style={styles.complaintTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {formatStatus(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.complaintDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.complaintFooter}>
        <Text style={styles.complaintCategory}>{item.category}</Text>
        <Text style={styles.complaintDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("ComplaintForm")}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>New Complaint</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#6b7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search complaints..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={STATUSES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === item && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === item && styles.filterChipTextActive,
                  ]}
                >
                  {item === "ALL" ? "All" : formatStatus(item)}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </View>

      <FlatList
        data={filteredComplaints}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadComplaints} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  filters: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  filterRow: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#6366f1",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  list: {
    padding: 16,
  },
  complaintCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  complaintHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  complaintDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  complaintFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  complaintCategory: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "500",
  },
  complaintDate: {
    fontSize: 12,
    color: "#9ca3af",
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
