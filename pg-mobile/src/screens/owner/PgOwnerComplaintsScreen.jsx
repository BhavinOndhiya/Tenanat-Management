import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function PgOwnerComplaintsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [properties, setProperties] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: route.params?.status || "ALL",
    propertyId: route.params?.propertyId || "ALL",
    category: "ALL",
    search: "",
  });

  useEffect(() => {
    fetchComplaints();
    loadProperties();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [filters]);

  const fetchComplaints = async () => {
    const cleanParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        cleanParams[key] = value;
      }
    });

    try {
      setLoading(true);
      const response = await api.getOwnerComplaints(cleanParams);
      setComplaints(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      showToast.error(error.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const props = await api.getOwnerProperties();
      setProperties(props.filter((prop) => prop.type === "PG"));
    } catch (error) {
      console.warn("Failed to load owner properties", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchComplaints(), loadProperties()]);
    setRefreshing(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const categoryOptions = useMemo(() => {
    const unique = new Set();
    complaints.forEach((complaint) => {
      if (complaint.category) {
        unique.add(complaint.category);
      }
    });
    return ["ALL", ...Array.from(unique)];
  }, [complaints]);

  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "IN_PROGRESS":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "RESOLVED":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "CLOSED":
        return { bg: "#F3F4F6", text: "#374151" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>PG Complaints</Text>
          <Text style={styles.subtitle}>
            Filter complaints by status, property, or category.
          </Text>
        </View>

        {/* Filters */}
        <Card style={styles.card} padding="md">
          <View style={styles.filtersGrid}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                  style={styles.picker}
                >
                  {STATUS_FILTERS.map((status) => (
                    <Picker.Item
                      key={status}
                      label={
                        status === "ALL" ? "All" : status.replace("_", " ")
                      }
                      value={status}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Property</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.propertyId}
                  onValueChange={(value) =>
                    handleFilterChange("propertyId", value)
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Properties" value="ALL" />
                  {properties.map((property) => (
                    <Picker.Item
                      key={property.id}
                      label={`${property.buildingName} · ${property.flatNumber}`}
                      value={property.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.category}
                  onValueChange={(value) =>
                    handleFilterChange("category", value)
                  }
                  style={styles.picker}
                >
                  {categoryOptions.map((category) => (
                    <Picker.Item
                      key={category}
                      label={category === "ALL" ? "All Categories" : category}
                      value={category}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Search</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Title or description"
                value={filters.search}
                onChangeText={(text) => handleFilterChange("search", text)}
              />
            </View>
          </View>
        </Card>

        {/* Complaints List */}
        <Card style={styles.card} padding="md">
          {loading ? (
            <Loader />
          ) : complaints.length === 0 ? (
            <Text style={styles.emptyText}>
              No complaints match the current filters.
            </Text>
          ) : (
            <View style={styles.complaintsList}>
              {complaints.map((complaint) => {
                const statusColors = getStatusColor(complaint.status);
                return (
                  <TouchableOpacity
                    key={complaint.id}
                    style={styles.complaintCard}
                    onPress={() =>
                      navigation.navigate("PgOwnerComplaintDetail", {
                        id: complaint.id,
                      })
                    }
                  >
                    <View style={styles.complaintHeader}>
                      <View style={styles.complaintInfo}>
                        <Text style={styles.complaintTitle}>
                          {complaint.title}
                        </Text>
                        <Text style={styles.complaintMeta}>
                          {complaint.category}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: statusColors.text },
                          ]}
                        >
                          {complaint.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.complaintDetails}>
                      <Text style={styles.complaintDetail}>
                        Property:{" "}
                        {complaint.property
                          ? `${complaint.property.buildingName} · ${complaint.property.flatNumber}`
                          : "—"}
                      </Text>
                      <Text style={styles.complaintDetail}>
                        Tenant:{" "}
                        {complaint.tenant?.name ||
                          complaint.tenant?.email ||
                          "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {!loading && complaints.length > 0 && (
            <Text style={styles.countText}>
              Showing {complaints.length} of {total} complaints
            </Text>
          )}
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
  filtersGrid: {
    gap: 16,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  complaintsList: {
    gap: 12,
  },
  complaintCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  complaintHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  complaintInfo: {
    flex: 1,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  complaintMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  complaintDetails: {
    gap: 4,
  },
  complaintDetail: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 48,
  },
  countText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
