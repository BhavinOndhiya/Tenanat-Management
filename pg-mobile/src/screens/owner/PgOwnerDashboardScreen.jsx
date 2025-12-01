import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";

const getCurrentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

function OverviewRow({ label, value, emphasize = false, onPress }) {
  const content = (
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text
        style={[
          styles.overviewValue,
          emphasize && styles.overviewValueEmphasize,
        ]}
      >
        {value}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.overviewRowTouchable} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.overviewRowContainer}>{content}</View>;
}

export default function PgOwnerDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("ALL");
  const initialPeriod = getCurrentPeriod();
  const [dashboardParams, setDashboardParams] = useState(initialPeriod);
  const [incomeFilterKey, setIncomeFilterKey] = useState(
    `${initialPeriod.month}-${initialPeriod.year}`
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [dashboardParams]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboard = await api.getOwnerDashboard(dashboardParams);
      setData(dashboard);
    } catch (error) {
      showToast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const propertySummary = useMemo(() => {
    if (!data?.byProperty) return [];
    if (selectedPropertyId === "ALL") {
      return data.byProperty;
    }
    return data.byProperty.filter(
      (property) => property.propertyId === selectedPropertyId
    );
  }, [data, selectedPropertyId]);

  const formatCurrency = (value = 0) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatDateLabel = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const handleIncomeFilterChange = (value) => {
    setIncomeFilterKey(value);
    if (value === "ALL") {
      setDashboardParams({});
      return;
    }
    const [month, year] = value.split("-");
    setDashboardParams({
      month: parseInt(month),
      year: parseInt(year),
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="lg" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Unable to load dashboard. Please try again.
        </Text>
      </View>
    );
  }

  const incomeSummary = data?.incomeSummary;
  const availableIncomeFilters = incomeSummary?.availableFilters || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>PG Owner Dashboard</Text>
          <Text style={styles.subtitle}>
            Track PG complaints and tenant issues
          </Text>
        </View>

        <View style={styles.grid}>
          {/* Complaint Overview */}
          <Card style={styles.card} padding="md">
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Complaint Overview</Text>
                <Text style={styles.cardSubtitle}>
                  Snapshot across all your properties
                </Text>
              </View>
              <Button
                size="sm"
                onPress={() => navigation.navigate("PgOwnerComplaints")}
              >
                View Complaints
              </Button>
            </View>
            <View style={styles.overviewList}>
              <OverviewRow
                label="Total Complaints"
                value={data.summary.totalComplaints}
              />
              <OverviewRow
                label="Open"
                value={data.summary.open}
                emphasize
                onPress={() =>
                  navigation.navigate("PgOwnerComplaints", {
                    status: "OPEN",
                  })
                }
              />
              <OverviewRow
                label="In Progress"
                value={data.summary.inProgress}
                onPress={() =>
                  navigation.navigate("PgOwnerComplaints", {
                    status: "IN_PROGRESS",
                  })
                }
              />
              <OverviewRow
                label="Resolved / Closed"
                value={data.summary.resolved + data.summary.closed}
                onPress={() =>
                  navigation.navigate("PgOwnerComplaints", {
                    status: "RESOLVED",
                  })
                }
              />
            </View>
          </Card>

          {/* Payment Overview */}
          <Card style={styles.card} padding="md">
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Payment Overview</Text>
                <Text style={styles.cardSubtitle}>
                  This month's inflow vs pending dues
                </Text>
              </View>
              {availableIncomeFilters.length > 0 && (
                <View style={styles.filterContainer}>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={incomeFilterKey}
                      onValueChange={handleIncomeFilterChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="All Time" value="ALL" />
                      {availableIncomeFilters.map(({ month, year }) => (
                        <Picker.Item
                          key={`${month}-${year}`}
                          label={new Date(year, month - 1).toLocaleString(
                            "default",
                            {
                              month: "short",
                              year: "numeric",
                            }
                          )}
                          value={`${month}-${year}`}
                        />
                      ))}
                    </Picker>
                  </View>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => navigation.navigate("PgOwnerPayments")}
                  >
                    View All
                  </Button>
                </View>
              )}
            </View>
            {!incomeSummary ? (
              <Text style={styles.emptyText}>
                No rent invoices recorded for this period yet.
              </Text>
            ) : (
              <View style={styles.overviewList}>
                <OverviewRow
                  label="Period"
                  value={
                    incomeSummary.filter
                      ? new Date(
                          incomeSummary.filter.year,
                          incomeSummary.filter.month - 1
                        ).toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })
                      : "All Time"
                  }
                />
                <OverviewRow
                  label="Received"
                  value={formatCurrency(incomeSummary.period.received)}
                  emphasize
                  onPress={() =>
                    navigation.navigate("PgOwnerPayments", {
                      status: "PAID",
                    })
                  }
                />
                <OverviewRow
                  label="Pending"
                  value={formatCurrency(incomeSummary.period.pending)}
                  onPress={() =>
                    navigation.navigate("PgOwnerPayments", {
                      status: "PENDING",
                    })
                  }
                />
                <OverviewRow
                  label="Total Due"
                  value={formatCurrency(incomeSummary.period.totalDue)}
                  onPress={() => navigation.navigate("PgOwnerPayments")}
                />
                <View style={styles.dateRow}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Due Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDateLabel(incomeSummary.periodDueDate)}
                    </Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Next Invoice Due</Text>
                    <Text style={styles.dateValue}>
                      {formatDateLabel(incomeSummary.nextDueDate)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.grid}>
          {/* Complaints by Category */}
          <Card style={styles.card} padding="md">
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Complaints by Category</Text>
              <Text style={styles.cardSubtitle}>Overview</Text>
            </View>
            {data.byCategory.length === 0 ? (
              <Text style={styles.emptyText}>No complaint data yet.</Text>
            ) : (
              <View style={styles.categoryList}>
                {data.byCategory.map((category) => (
                  <View key={category.category} style={styles.categoryItem}>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryCount}>{category.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Complaints by Property */}
          <Card style={styles.card} padding="md">
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Complaints by Property</Text>
              {data.byProperty.length > 1 && (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedPropertyId}
                    onValueChange={setSelectedPropertyId}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Properties" value="ALL" />
                    {data.byProperty.map((property) => (
                      <Picker.Item
                        key={property.propertyId}
                        label={property.propertyName}
                        value={property.propertyId}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
            {propertySummary.length === 0 ? (
              <Text style={styles.emptyText}>
                No complaints for this property.
              </Text>
            ) : (
              <View style={styles.propertyList}>
                {propertySummary.map((property) => (
                  <View key={property.propertyId} style={styles.propertyCard}>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>
                        {property.propertyName}
                      </Text>
                      <Text style={styles.propertyStats}>
                        {property.totalComplaints} total · {property.open} open
                      </Text>
                    </View>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        navigation.navigate("PgOwnerComplaints", {
                          propertyId: property.propertyId,
                        })
                      }
                    >
                      Filter
                    </Button>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>

        {/* Recent Complaints */}
        <Card style={styles.card} padding="md">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Complaints</Text>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => navigation.navigate("PgOwnerComplaints")}
            >
              View All
            </Button>
          </View>
          {data.recentComplaints.length === 0 ? (
            <Text style={styles.emptyText}>No recent complaints found.</Text>
          ) : (
            <View style={styles.complaintsList}>
              {data.recentComplaints.map((complaint) => (
                <View key={complaint.id} style={styles.complaintCard}>
                  <View style={styles.complaintInfo}>
                    <Text style={styles.complaintTitle}>{complaint.title}</Text>
                    <Text style={styles.complaintMeta}>
                      {complaint.category} · {complaint.status}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate("PgOwnerComplaintDetail", {
                        id: complaint.id,
                      })
                    }
                  >
                    View
                  </Button>
                </View>
              ))}
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
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
  grid: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minWidth: 120,
  },
  picker: {
    height: 40,
  },
  overviewList: {
    gap: 12,
  },
  overviewRowContainer: {
    paddingVertical: 8,
  },
  overviewRowTouchable: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  overviewValueEmphasize: {
    color: "#2563eb",
  },
  dateRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  categoryCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  propertyList: {
    gap: 12,
  },
  propertyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  propertyStats: {
    fontSize: 14,
    color: "#6B7280",
  },
  complaintsList: {
    gap: 12,
  },
  complaintCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
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
});
