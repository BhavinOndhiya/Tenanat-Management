import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { config } from "../../utils/config";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function PgOwnerPaymentsScreen() {
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [filters, setFilters] = useState({
    propertyId: route.params?.propertyId || "",
    tenantId: "",
    status: route.params?.status || "",
    from: "",
    to: "",
  });

  useEffect(() => {
    loadProperties();
    loadPayments();
    loadSummary();
  }, []);

  useEffect(() => {
    loadPayments();
    loadSummary();
  }, [filters]);

  const loadProperties = async () => {
    try {
      const items = await api.getOwnerPgProperties();
      setProperties(items || []);
    } catch (error) {
      console.error("Failed to load properties:", error);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.propertyId) params.propertyId = filters.propertyId;
      if (filters.tenantId) params.tenantId = filters.tenantId;
      if (filters.status) params.status = filters.status;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await api.getOwnerRentPayments(params);
      setPayments(data.items || []);

      const uniqueTenants = Array.from(
        new Map(
          data.items
            ?.filter((p) => p.tenant)
            .map((p) => [p.tenant.id, p.tenant])
        ).values()
      );
      setTenants(uniqueTenants);
    } catch (error) {
      showToast.error(error.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      const params = {};
      if (filters.propertyId) params.propertyId = filters.propertyId;
      if (filters.tenantId) params.tenantId = filters.tenantId;

      const data = await api.getOwnerRentPaymentsSummary(params);
      setSummary(data);
    } catch (error) {
      console.error("Failed to load summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPayments(), loadSummary()]);
    setRefreshing(false);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      propertyId: "",
      tenantId: "",
      status: "",
      from: "",
      to: "",
    });
  };

  const resolveInvoiceUrl = (invoiceUrl) => {
    if (!invoiceUrl) return "";
    if (invoiceUrl.startsWith("http")) return invoiceUrl;

    const normalizedPath = invoiceUrl.startsWith("/")
      ? invoiceUrl
      : `/${invoiceUrl}`;

    let base = config.API_BASE_URL;
    if (base.endsWith("/")) {
      base = base.slice(0, -1);
    }

    if (base.endsWith("/api") && normalizedPath.startsWith("/api")) {
      return `${base}${normalizedPath.slice(4) || "/"}`;
    }

    return `${base}${normalizedPath}`;
  };

  const handleDownloadInvoice = async (invoiceUrl, fileName) => {
    if (!invoiceUrl) {
      showToast.error("Invoice not available");
      return;
    }

    try {
      setDownloading(invoiceUrl);
      const fullUrl = resolveInvoiceUrl(invoiceUrl);
      const fileUri = `${FileSystem.documentDirectory}${
        fileName || `invoice-${Date.now()}.pdf`
      }`;
      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
        showToast.success("Invoice downloaded successfully!");
      } else {
        await Linking.openURL(fullUrl);
        showToast.info("Opening invoice in browser");
      }
    } catch (error) {
      console.error("Download error:", error);
      const fullUrl = resolveInvoiceUrl(invoiceUrl);
      await Linking.openURL(fullUrl);
      showToast.info("Opening invoice in browser");
    } finally {
      setDownloading(null);
    }
  };

  const handleViewInvoice = async (invoiceUrl) => {
    if (!invoiceUrl) {
      showToast.error("Invoice not available");
      return;
    }

    const fullUrl = resolveInvoiceUrl(invoiceUrl);
    await Linking.openURL(fullUrl);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      PENDING: { bg: "#FEF3C7", text: "#92400E" },
      PAID: { bg: "#D1FAE5", text: "#065F46" },
      FAILED: { bg: "#FEE2E2", text: "#991B1B" },
      REFUNDED: { bg: "#F3F4F6", text: "#374151" },
    };
    const style = statusStyles[status] || statusStyles.PENDING;
    return { bg: style.bg, text: style.text };
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
          <Text style={styles.title}>PG Payments</Text>
          <Text style={styles.subtitle}>
            View rent payment history for your PG properties
          </Text>
        </View>

        {/* Summary Card */}
        {summary && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Payment Summary</Text>
            {summaryLoading ? (
              <Loader />
            ) : (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, styles.summaryCardBlue]}>
                  <Text style={styles.summaryLabel}>Total Due</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueBlue]}>
                    ₹{summary.totalDue?.toLocaleString("en-IN") || 0}
                  </Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardGreen]}>
                  <Text style={styles.summaryLabel}>Received</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueGreen]}>
                    ₹{summary.totalReceived?.toLocaleString("en-IN") || 0}
                  </Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardYellow]}>
                  <Text style={styles.summaryLabel}>Pending</Text>
                  <Text
                    style={[styles.summaryValue, styles.summaryValueYellow]}
                  >
                    ₹{summary.totalPending?.toLocaleString("en-IN") || 0}
                  </Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardGray]}>
                  <Text style={styles.summaryLabel}>Total Payments</Text>
                  <Text style={styles.summaryValue}>
                    {summary.totalCount || 0}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Filters */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Filters</Text>
          <View style={styles.filtersGrid}>
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
                  <Picker.Item label="All Properties" value="" />
                  {properties.map((prop) => (
                    <Picker.Item
                      key={prop.id}
                      label={prop.name || prop.buildingName}
                      value={prop.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Tenant</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.tenantId}
                  onValueChange={(value) =>
                    handleFilterChange("tenantId", value)
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Tenants" value="" />
                  {tenants.map((tenant) => (
                    <Picker.Item
                      key={tenant.id}
                      label={tenant.name}
                      value={tenant.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="PENDING" value="PENDING" />
                  <Picker.Item label="PAID" value="PAID" />
                  <Picker.Item label="FAILED" value="FAILED" />
                  <Picker.Item label="REFUNDED" value="REFUNDED" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>From Date</Text>
              <TextInput
                style={styles.input}
                value={filters.from}
                onChangeText={(text) => handleFilterChange("from", text)}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>To Date</Text>
              <TextInput
                style={styles.input}
                value={filters.to}
                onChangeText={(text) => handleFilterChange("to", text)}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.filterItem}>
              <Button variant="secondary" onPress={clearFilters}>
                Clear Filters
              </Button>
            </View>
          </View>
        </Card>

        {/* Payments List */}
        <Card style={styles.card} padding="md">
          {loading ? (
            <Loader />
          ) : payments.length === 0 ? (
            <Text style={styles.emptyText}>No payments found.</Text>
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((payment) => {
                const statusColors = getStatusBadge(payment.status);
                return (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View style={styles.paymentHeader}>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentTenant}>
                          {payment.tenant?.name || "—"}
                        </Text>
                        {payment.tenant?.email && (
                          <Text style={styles.paymentEmail}>
                            {payment.tenant.email}
                          </Text>
                        )}
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
                          {payment.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.paymentDetails}>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Property:</Text>
                        <Text style={styles.paymentValue}>
                          {payment.property?.name || "—"}
                        </Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Period:</Text>
                        <Text style={styles.paymentValue}>
                          {payment.periodLabel}
                        </Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Amount:</Text>
                        <Text style={styles.paymentAmount}>
                          ₹{payment.totalAmount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      <Text style={styles.paymentBreakdown}>
                        Base: ₹
                        {(payment.baseAmount || payment.amount).toLocaleString(
                          "en-IN"
                        )}
                        {payment.lateFeeAmount > 0 && (
                          <>
                            {" "}
                            + Late: ₹
                            {payment.lateFeeAmount.toLocaleString("en-IN")}
                          </>
                        )}
                      </Text>
                      {payment.paidAt && (
                        <View style={styles.paymentRow}>
                          <Text style={styles.paymentLabel}>Paid Date:</Text>
                          <Text style={styles.paymentValue}>
                            {new Date(payment.paidAt).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {payment.status === "PAID" && payment.invoicePdfUrl && (
                      <View style={styles.paymentActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() =>
                            handleViewInvoice(payment.invoicePdfUrl)
                          }
                          style={styles.actionButton}
                        >
                          View
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={downloading === payment.invoicePdfUrl}
                          onPress={() => {
                            const invoiceNumber = `INV-${
                              payment.periodYear
                            }${String(payment.periodMonth).padStart(
                              2,
                              "0"
                            )}-${payment.id.slice(-6).toUpperCase()}`;
                            handleDownloadInvoice(
                              payment.invoicePdfUrl,
                              `${invoiceNumber}.pdf`
                            );
                          }}
                          style={styles.actionButton}
                        >
                          Download
                        </Button>
                      </View>
                    )}
                  </View>
                );
              })}
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 8,
  },
  summaryCardBlue: {
    backgroundColor: "#DBEAFE",
  },
  summaryCardGreen: {
    backgroundColor: "#D1FAE5",
  },
  summaryCardYellow: {
    backgroundColor: "#FEF3C7",
  },
  summaryCardGray: {
    backgroundColor: "#F3F4F6",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  summaryValueBlue: {
    color: "#2563EB",
  },
  summaryValueGreen: {
    color: "#10B981",
  },
  summaryValueYellow: {
    color: "#F59E0B",
  },
  filtersGrid: {
    gap: 16,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
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
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  paymentsList: {
    gap: 12,
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTenant: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  paymentEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  paymentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  paymentBreakdown: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  paymentActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 48,
  },
});
