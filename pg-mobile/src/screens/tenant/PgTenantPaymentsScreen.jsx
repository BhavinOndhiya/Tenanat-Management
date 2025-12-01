import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { api, API_BASE_URL } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function PgTenantPaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("currentYear");
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadPayments();
    loadStatistics();
  }, [page, filter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filter !== "currentYear") {
        params.filter = filter;
      }
      const data = await api.getRentPaymentHistory(params);
      setPayments(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("[Payment History] Error loading payments:", error);
      showToast.error(error.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const stats = await api.getRentPaymentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("[Statistics] Error loading statistics:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPayments(), loadStatistics()]);
    setRefreshing(false);
  };

  const resolveInvoiceUrl = (invoiceUrl) => {
    if (!invoiceUrl) return "";
    if (invoiceUrl.startsWith("http")) return invoiceUrl;

    const normalizedPath = invoiceUrl.startsWith("/")
      ? invoiceUrl
      : `/${invoiceUrl}`;

    let base = API_BASE_URL;
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

      // Download file
      const fileUri = `${FileSystem.documentDirectory}${
        fileName || `invoice-${Date.now()}.pdf`
      }`;
      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
        showToast.success("Invoice downloaded successfully!");
      } else {
        // Fallback: open in browser
        await Linking.openURL(fullUrl);
        showToast.info("Opening invoice in browser");
      }
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: open in browser
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

  const handleGenerateInvoice = async (paymentId) => {
    try {
      showToast.info("Generating invoice...");
      const result = await api.generateRentInvoice(paymentId);
      if (result.success && result.invoiceUrl) {
        showToast.success("Invoice generated successfully!");
        await loadPayments();
        handleDownloadInvoice(result.invoiceUrl);
      }
    } catch (error) {
      showToast.error(error.message || "Failed to generate invoice");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: "#FEF3C7", text: "#92400E" },
      PAID: { bg: "#D1FAE5", text: "#065F46" },
      FAILED: { bg: "#FEE2E2", text: "#991B1B" },
      REFUNDED: { bg: "#F3F4F6", text: "#374151" },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{status}</Text>
      </View>
    );
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
          <Text style={styles.title}>Payment History & Receipts</Text>
          <Text style={styles.subtitle}>
            View your rent payment transactions and download receipts (Current
            year only)
          </Text>
        </View>

        {/* Statistics Card */}
        {statistics && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>
              Payment Statistics (Current Year)
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Payments</Text>
                <Text style={styles.statValue}>{statistics.totalPayments}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Paid</Text>
                <Text style={[styles.statValue, styles.statPaid]}>
                  {statistics.paidPayments}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, styles.statPending]}>
                  {statistics.pendingPayments}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Paid</Text>
                <Text style={styles.statValue}>
                  ₹{statistics.totalPaid.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
            {statistics.totalLateFees > 0 && (
              <View style={styles.lateFeeRow}>
                <Text style={styles.lateFeeLabel}>
                  Total Late Fees Paid:{" "}
                  <Text style={styles.lateFeeValue}>
                    ₹{statistics.totalLateFees.toLocaleString("en-IN")}
                  </Text>
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Filter Options */}
        <Card style={styles.card} padding="md">
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "currentYear" && styles.filterButtonActive,
              ]}
              onPress={() => {
                setFilter("currentYear");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "currentYear" && styles.filterButtonTextActive,
                ]}
              >
                Current Year
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "last5" && styles.filterButtonActive,
              ]}
              onPress={() => {
                setFilter("last5");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "last5" && styles.filterButtonTextActive,
                ]}
              >
                Last 5 Entries
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "lastMonth" && styles.filterButtonActive,
              ]}
              onPress={() => {
                setFilter("lastMonth");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "lastMonth" && styles.filterButtonTextActive,
                ]}
              >
                Last Month
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Payments List */}
        <Card style={styles.card} padding="md">
          {loading ? (
            <Loader />
          ) : payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment history found.</Text>
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentPeriod}>
                        {payment.periodLabel}
                      </Text>
                      <Text style={styles.paymentProperty}>
                        {payment.property.name}
                      </Text>
                    </View>
                    {getStatusBadge(payment.status)}
                  </View>

                  <View style={styles.paymentDetails}>
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
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Due Date:</Text>
                      <Text style={styles.paymentValue}>
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                    {payment.paidAt && (
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Paid Date:</Text>
                        <Text style={styles.paymentValue}>
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {payment.status === "PAID" && (
                    <View style={styles.paymentActions}>
                      {payment.invoicePdfUrl ? (
                        <>
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
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => handleGenerateInvoice(payment.id)}
                          style={styles.actionButton}
                        >
                          Generate Invoice
                        </Button>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Text style={styles.pageText}>
                Page {page} of {totalPages}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statPaid: {
    color: "#10B981",
  },
  statPending: {
    color: "#F59E0B",
  },
  lateFeeRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  lateFeeLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  lateFeeValue: {
    fontWeight: "600",
    color: "#1F2937",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
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
  },
  paymentInfo: {
    flex: 1,
  },
  paymentPeriod: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  paymentProperty: {
    fontSize: 14,
    color: "#6B7280",
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
  paymentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  paymentBreakdown: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  paymentValue: {
    fontSize: 14,
    color: "#1F2937",
  },
  paymentActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
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
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  pageText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
