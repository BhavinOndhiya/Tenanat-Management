import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Partially Paid", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

const MONTH_OPTIONS = [
  { label: "All Months", value: "" },
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case "PAID":
      return "#10b981";
    case "PARTIALLY_PAID":
      return "#3b82f6";
    case "PENDING":
      return "#f59e0b";
    case "OVERDUE":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const formatStatus = (status) => {
  return status?.replace("_", " ") || "";
};

const formatMonthYear = (month, year) => {
  if (!month || !year) return "—";
  const option = MONTH_OPTIONS.find((item) => item.value === month);
  const label = option?.label || month;
  return `${label} ${year}`;
};

export default function BillingListScreen({ navigation }) {
  const { user } = useAuth();
  const currentDate = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    status: "",
    month: "",
    year: currentDate.getFullYear(),
  });
  const [data, setData] = useState({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flatLabels, setFlatLabels] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const yearOptions = useMemo(() => {
    const base = currentDate.getFullYear();
    return ["", base - 1, base, base + 1, base + 2];
  }, [currentDate]);

  const fetchFlats = async () => {
    try {
      const flats = await api.getMyFlats();
      const map = flats.reduce((acc, assignment) => {
        const flat = assignment.flat || assignment;
        if (flat?.id || flat?._id) {
          const id = flat.id || flat._id;
          const label = flat.buildingName
            ? `${flat.buildingName}${
                flat.flatNumber ? ` • ${flat.flatNumber}` : ""
              }`
            : flat.flatNumber || "My Flat";
          acc[id] = label;
        }
        return acc;
      }, {});
      setFlatLabels(map);
    } catch (error) {
      console.warn("Unable to load flats for billing view:", error);
    }
  };

  const fetchInvoices = async (page = 1) => {
    try {
      setLoading(page === 1);
      setRefreshing(false);
      const params = {
        page,
        pageSize: data.pageSize,
        status: filters.status || undefined,
        month: filters.month || undefined,
        year: filters.year || undefined,
      };
      const response = await api.getMyBillingInvoices(params);
      setData(response);
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  useEffect(() => {
    fetchInvoices(1);
  }, [filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(data.page);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const renderInvoice = ({ item }) => {
    const flatLabel = flatLabels[item.flat] || "My Flat";
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() =>
          navigation.navigate("BillingDetail", {
            invoiceId: item._id || item.id,
          })
        }
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>{flatLabel}</Text>
            <Text style={styles.invoiceDate}>
              {formatMonthYear(item.month, item.year)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {formatStatus(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.invoiceAmounts}>
          <View style={styles.amountGroup}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>
              ₹{item.amount?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.amountGroup}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={styles.amountValue}>
              ₹{item.totalPaid?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.amountGroup}>
            <Text style={styles.amountLabel}>Outstanding</Text>
            <Text style={[styles.amountValue, styles.outstanding]}>
              ₹{item.outstanding?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  if (loading && data.items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Maintenance</Text>
          <Text style={styles.headerSubtitle}>
            View your society maintenance invoices
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data.items}
        renderItem={renderInvoice}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No maintenance invoices found</Text>
          </View>
        }
      />

      {!loading && data.items.length > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              data.page === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() => fetchInvoices(data.page - 1)}
            disabled={data.page === 1}
          >
            <Text
              style={[
                styles.paginationButtonText,
                data.page === 1 && styles.paginationButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>
          <Text style={styles.paginationInfo}>
            Page {data.page} of {totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              data.page >= totalPages && styles.paginationButtonDisabled,
            ]}
            onPress={() => fetchInvoices(data.page + 1)}
            disabled={data.page >= totalPages}
          >
            <Text
              style={[
                styles.paginationButtonText,
                data.page >= totalPages && styles.paginationButtonTextDisabled,
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.status}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                    style={styles.picker}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Month</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.month}
                    onValueChange={(value) =>
                      handleFilterChange("month", value)
                    }
                    style={styles.picker}
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Year</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.year}
                    onValueChange={(value) => handleFilterChange("year", value)}
                    style={styles.picker}
                  >
                    {yearOptions.map((year) => (
                      <Picker.Item
                        key={year || "all"}
                        label={year === "" ? "All Years" : year.toString()}
                        value={year}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </ScrollView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#6366f1",
    borderRadius: 8,
  },
  filterButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  invoiceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  invoiceAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  amountGroup: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  outstanding: {
    color: "#ef4444",
  },
  dueDate: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#6366f1",
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  paginationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  paginationButtonTextDisabled: {
    color: "#9ca3af",
  },
  paginationInfo: {
    fontSize: 14,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalClose: {
    fontSize: 16,
    color: "#6366f1",
    fontWeight: "600",
  },
  modalBody: {
    padding: 16,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    backgroundColor: "#f9fafb",
  },
});
