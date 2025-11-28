import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

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

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
};

const formatDateTime = (date) => (date ? new Date(date).toLocaleString() : "—");

const buildCheckoutHtml = (options) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Razorpay Checkout</title>
</head>
<body style="background:#f1f5f9;margin:0;padding:0;">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    const options = ${JSON.stringify(options)};
    options.handler = function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: "SUCCESS", payload: response }));
    };
    options.modal = {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event: "DISMISS" }));
      }
    };
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: "FAILED", payload: response.error }));
    });
    rzp.open();
  </script>
</body>
</html>`;

export default function BillingDetailScreen({ route, navigation }) {
  const { invoiceId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flatLabels, setFlatLabels] = useState({});
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState("");
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const fetchFlats = async () => {
    try {
      const flats = await api.getMyFlats();
      const map = flats.reduce((acc, assignment) => {
        const flat = assignment.flat || assignment;
        if (flat?.id || flat?._id) {
          const key = flat.id || flat._id;
          const label = flat.buildingName
            ? `${flat.buildingName}${
                flat.flatNumber ? ` • ${flat.flatNumber}` : ""
              }`
            : flat.flatNumber || "My Flat";
          acc[key] = label;
        }
        return acc;
      }, {});
      setFlatLabels(map);
    } catch (err) {
      console.warn("Unable to load flats for billing detail:", err);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.getMyBillingInvoice(invoiceId);
      setData(response);
      setError("");
    } catch (apiError) {
      if (apiError.message?.includes("access")) {
        setError("You do not have access to this invoice.");
      } else if (apiError.message?.includes("not found")) {
        setError("Invoice not found.");
      } else {
        setError("Unable to load invoice details.");
      }
      console.error("Error loading invoice:", apiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const outstandingAmount = useMemo(() => data?.outstanding || 0, [data]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to My Maintenance</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { invoice, payments, totalPaid, outstanding } = data || {};

  if (!invoice) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Invoice not found</Text>
      </View>
    );
  }

  const flatLabel =
    flatLabels[invoice.flat] ||
    flatLabels[invoice.flat?._id] ||
    invoice.flat?.buildingName
      ? `${invoice.flat.buildingName}${
          invoice.flat.flatNumber ? ` • ${invoice.flat.flatNumber}` : ""
        }`
      : "My Flat";

  const statusColor = getStatusColor(invoice.status);

  const closeCheckout = () => {
    setCheckoutHtml("");
    setCheckoutVisible(false);
  };

  const handleCheckoutMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.event === "SUCCESS") {
        closeCheckout();
        setVerificationLoading(true);
        try {
          await api.verifyInvoicePayment({
            razorpayPaymentId: payload.payload.razorpay_payment_id,
            razorpayOrderId: payload.payload.razorpay_order_id,
            razorpaySignature: payload.payload.razorpay_signature,
          });
          Alert.alert("Payment successful", "Your payment has been verified.");
          fetchInvoice();
        } catch (verifyError) {
          Alert.alert(
            "Verification failed",
            verifyError?.message ||
              "We could not verify your payment. Please contact support."
          );
        } finally {
          setVerificationLoading(false);
        }
      } else if (payload.event === "FAILED") {
        closeCheckout();
        Alert.alert(
          "Payment failed",
          payload.payload?.description ||
            "Payment failed. Please try again or contact support."
        );
      } else if (payload.event === "DISMISS") {
        closeCheckout();
      }
    } catch (messageError) {
      console.warn("Checkout message parse failed", messageError);
      closeCheckout();
    }
  };

  const handlePayNow = async () => {
    if (!invoice || outstandingAmount <= 0) {
      Alert.alert("Nothing to pay", "This invoice is already settled.");
      return;
    }
    if (isPaymentProcessing || verificationLoading) {
      return;
    }

    setIsPaymentProcessing(true);
    try {
      const order = await api.createInvoicePaymentOrder(invoice._id);
      if (!order?.razorpayKeyId || !order?.orderId) {
        throw new Error(
          "Payment gateway is not configured. Please contact support."
        );
      }

      const checkoutOptions = {
        key: order.razorpayKeyId,
        amount: order.amountInPaise || Math.round(order.amount * 100),
        currency: order.currency || "INR",
        name: "Society Portal",
        description: `Maintenance payment for ${invoice.month}/${invoice.year}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phoneNumber || "",
        },
        notes: {
          invoiceId: order.invoiceId,
        },
        theme: {
          color: "#2563eb",
        },
      };

      setCheckoutHtml(buildCheckoutHtml(checkoutOptions));
      setCheckoutVisible(true);
    } catch (paymentError) {
      Alert.alert(
        "Payment error",
        paymentError?.message || "Unable to initiate the payment."
      );
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Invoice ID</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {invoice._id || invoice.id}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.label}>Flat</Text>
            <Text style={styles.value}>{flatLabel}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Month / Year</Text>
            <Text style={styles.value}>
              {invoice.month}/{invoice.year}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amount}>
              ₹{invoice.amount?.toLocaleString() || "0"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{formatDate(invoice.dueDate)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {formatStatus(invoice.status)}
              </Text>
            </View>
          </View>

          {invoice.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{invoice.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountsRow}>
          <View style={styles.amountCard}>
            <Text style={styles.amountCardLabel}>Total Paid</Text>
            <Text style={[styles.amountCardValue, { color: "#10b981" }]}>
              ₹{totalPaid?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.amountCard}>
            <Text style={styles.amountCardLabel}>Outstanding</Text>
            <Text style={[styles.amountCardValue, { color: "#f59e0b" }]}>
              ₹{outstanding?.toLocaleString() || "0"}
            </Text>
            {outstanding > 0 && (
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (isPaymentProcessing || verificationLoading) &&
                    styles.payButtonDisabled,
                ]}
                disabled={isPaymentProcessing || verificationLoading}
                onPress={handlePayNow}
              >
                {isPaymentProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payButtonText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            )}
            {verificationLoading && (
              <Text style={styles.verificationText}>
                Verifying payment, please wait...
              </Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.paymentHeader}>
            <View>
              <Text style={styles.paymentTitle}>Payment History</Text>
              <Text style={styles.paymentSubtitle}>
                Any payments logged by the management team will appear below.
              </Text>
            </View>
          </View>

          {payments?.length === 0 ? (
            <View style={styles.emptyPaymentContainer}>
              <Text style={styles.emptyPaymentText}>
                No payments recorded for this invoice yet.
              </Text>
            </View>
          ) : (
            <View style={styles.paymentList}>
              {payments.map((payment) => (
                <View
                  key={payment._id || payment.id}
                  style={styles.paymentItem}
                >
                  <View style={styles.paymentItemLeft}>
                    <Text style={styles.paymentAmount}>
                      ₹{payment.amount?.toLocaleString() || "0"}
                    </Text>
                    <Text style={styles.paymentMethod}>{payment.method}</Text>
                  </View>
                  <View style={styles.paymentItemRight}>
                    {payment.reference && (
                      <Text style={styles.paymentReference}>
                        Ref: {payment.reference}
                      </Text>
                    )}
                    {payment.paidByUser?.name && (
                      <Text style={styles.paymentBy}>
                        By: {payment.paidByUser.name}
                      </Text>
                    )}
                    <Text style={styles.paymentDate}>
                      {formatDateTime(payment.paidAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={checkoutVisible}
        animationType="slide"
        onRequestClose={closeCheckout}
      >
        <View style={styles.checkoutContainer}>
          <View style={styles.checkoutHeader}>
            <Text style={styles.checkoutTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={closeCheckout}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          {checkoutHtml ? (
            <WebView
              source={{ html: checkoutHtml }}
              originWhitelist={["*"]}
              onMessage={handleCheckoutMessage}
              startInLoadingState
            />
          ) : (
            <View style={styles.checkoutLoading}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
  amount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  amountsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  amountCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  amountCardLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  amountCardValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  payButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  verificationText: {
    marginTop: 8,
    color: "#6b7280",
    fontSize: 12,
  },
  paymentHeader: {
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyPaymentContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyPaymentText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  paymentList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: "#6b7280",
  },
  paymentItemRight: {
    alignItems: "flex-end",
  },
  paymentReference: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  paymentBy: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
  },
  checkoutContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  checkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  checkoutTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  checkoutLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
