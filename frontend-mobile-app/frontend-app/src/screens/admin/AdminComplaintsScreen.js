import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../utils/api";

const STATUS_FILTERS = ["ALL", "NEW", "IN_PROGRESS", "RESOLVED"];
const CATEGORY_OPTIONS = [
  "ALL",
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
const VIEW_SEGMENTS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

export default function AdminComplaintsScreen({ route }) {
  const initialView = route?.params?.view || "all";
  const initialFilters = route?.params?.filters || {};

  const [currentView, setCurrentView] = useState(initialView);
  const [filters, setFilters] = useState({
    search: initialFilters.search || "",
    status: initialFilters.status || "ALL",
    category: initialFilters.category || "ALL",
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const formatStatus = (status) =>
    status
      .replace("_", " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const params = {
        search: filters.search || undefined,
        status: filters.status === "ALL" ? undefined : filters.status,
        category: filters.category === "ALL" ? undefined : filters.category,
      };
      const data = await api.getAdminComplaints(currentView, params);
      setComplaints(data);
      setError("");
    } catch (err) {
      console.error("Error loading complaints:", err);
      setError(err?.message || "Unable to load complaints");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const nextView = route?.params?.view;
    if (nextView && nextView !== currentView) {
      setCurrentView(nextView);
    }
  }, [route?.params?.view, currentView]);

  useEffect(() => {
    if (route?.params?.filters) {
      setFilters((prev) => ({
        ...prev,
        ...route.params.filters,
        status: route.params.filters.status || prev.status || "ALL",
        category: route.params.filters.category || prev.category || "ALL",
        search:
          typeof route.params.filters.search === "string"
            ? route.params.filters.search
            : prev.search,
      }));
    }
  }, [route?.params?.filters]);

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, JSON.stringify(filters)]);

  const appliedFilters = useMemo(() => {
    const chips = [];
    if (filters.status !== "ALL") chips.push(filters.status);
    if (filters.category !== "ALL") chips.push(filters.category);
    if (filters.search) chips.push(`Search: ${filters.search}`);
    return chips;
  }, [filters]);

  const renderComplaint = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.status}>{formatStatus(item.status)}</Text>
      </View>
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.metaRow}>
        {item.citizen && (
          <Text style={styles.metaText}>
            👤 {item.citizen.name || item.citizen.email}
          </Text>
        )}
        <Text style={styles.metaText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.flat && (
        <Text style={styles.metaText}>
          🏢 {item.flat.buildingName} · {item.flat.flatNumber}
        </Text>
      )}
      {item.category && (
        <Text style={styles.categoryBadge}>{item.category}</Text>
      )}
    </View>
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
      <View style={styles.topBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.segmentRow}>
            {VIEW_SEGMENTS.map((segment) => (
              <TouchableOpacity
                key={segment.key}
                style={[
                  styles.segmentChip,
                  currentView === segment.key && styles.segmentChipActive,
                ]}
                onPress={() => setCurrentView(segment.key)}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    currentView === segment.key && styles.segmentLabelActive,
                  ]}
                >
                  {segment.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search complaints"
            value={filters.search}
            onChangeText={(text) =>
              setFilters((prev) => ({ ...prev, search: text }))
            }
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color="#fff" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {appliedFilters.length > 0 && (
        <View style={styles.appliedFilters}>
          {appliedFilters.map((chip) => (
            <View key={chip} style={styles.appliedChip}>
              <Text style={styles.appliedChipText}>{chip}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={() =>
              setFilters({ search: "", status: "ALL", category: "ALL" })
            }
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.resultCount}>
          Showing {complaints.length} complaints
        </Text>
      )}

      <FlatList
        data={complaints}
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

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.chipGrid}>
                {STATUS_FILTERS.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chip,
                      filters.status === status && styles.chipActive,
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev, status }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.status === status && styles.chipTextActive,
                      ]}
                    >
                      {status === "ALL" ? "All" : formatStatus(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterLabel, { marginTop: 24 }]}>
                Category
              </Text>
              <View style={styles.chipGrid}>
                {CATEGORY_OPTIONS.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.chip,
                      filters.category === category && styles.chipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, category }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.category === category && styles.chipTextActive,
                      ]}
                    >
                      {category === "ALL" ? "All" : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() =>
                  setFilters({ search: "", status: "ALL", category: "ALL" })
                }
              >
                <Text style={styles.clearFiltersText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  segmentChipActive: {
    backgroundColor: "#6366f1",
  },
  segmentLabel: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  segmentLabelActive: {
    color: "#fff",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  filterButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  appliedFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "center",
  },
  appliedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e0e7ff",
  },
  appliedChipText: {
    color: "#3730a3",
    fontWeight: "600",
  },
  clearFiltersText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: "#6b7280",
  },
  list: {
    padding: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  status: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "600",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#ecfccb",
    color: "#4d7c0f",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  chipActive: {
    backgroundColor: "#6366f1",
  },
  chipText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  applyButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
