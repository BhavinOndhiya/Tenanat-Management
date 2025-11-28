import { useState, useEffect } from "react";
import { api, API_BASE_URL } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import { ScrollAnimation } from "../components/ScrollAnimation";

export default function PgTenantPayments() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("currentYear"); // 'currentYear', 'last5', 'lastMonth'
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  const handleDownloadInvoice = async (
    invoiceUrl,
    fileName = "invoice.pdf"
  ) => {
    if (!invoiceUrl) {
      showToast.error("Invoice not available");
      return;
    }

    try {
      const fullUrl = resolveInvoiceUrl(invoiceUrl);

      // Fetch the PDF file
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Failed to fetch invoice");

      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `invoice-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: open in new tab
      const fullUrl = resolveInvoiceUrl(invoiceUrl);
      window.open(fullUrl, "_blank");
      showToast.info(
        "Opening invoice in new tab. You can download it from there."
      );
    }
  };

  const handleViewInvoice = (invoiceUrl) => {
    if (!invoiceUrl) {
      showToast.error("Invoice not available");
      return;
    }

    // Open invoice in new tab for viewing
    const fullUrl = resolveInvoiceUrl(invoiceUrl);
    window.open(fullUrl, "_blank");
  };

  const handleGenerateInvoice = async (paymentId) => {
    try {
      showToast.info("Generating invoice...");
      const result = await api.generateRentInvoice(paymentId);
      if (result.success && result.invoiceUrl) {
        showToast.success("Invoice generated successfully!");
        // Reload payments to show the new invoice
        await loadPayments();
        // Open the invoice
        handleDownloadInvoice(result.invoiceUrl);
      }
    } catch (error) {
      showToast.error(error.message || "Failed to generate invoice");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PAID: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      REFUNDED: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          styles[status] || styles.PENDING
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            Payment History & Receipts
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            View your rent payment transactions and download receipts (Current
            year only)
          </p>
        </div>
      </ScrollAnimation>

      {/* Statistics Card */}
      {statistics && (
        <Card
          padding="lg"
          className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10"
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Payment Statistics (Current Year)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Total Payments
              </p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {statistics.totalPayments}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics.paidPayments}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {statistics.pendingPayments}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Total Paid
              </p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                ₹{statistics.totalPaid.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          {statistics.totalLateFees > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Total Late Fees Paid:{" "}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  ₹{statistics.totalLateFees.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Filter Options */}
      <Card padding="md">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Filter:
          </span>
          <button
            onClick={() => {
              setFilter("currentYear");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "currentYear"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            }`}
          >
            Current Year
          </button>
          <button
            onClick={() => {
              setFilter("last5");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "last5"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            }`}
          >
            Last 5 Entries
          </button>
          <button
            onClick={() => {
              setFilter("lastMonth");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "lastMonth"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            }`}
          >
            Last Month
          </button>
        </div>
      </Card>

      <Card padding="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            No payment history found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Paid Date</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-[var(--color-border)]"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {payment.periodLabel}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {payment.property.name}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          ₹{payment.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Base: ₹
                          {(
                            payment.baseAmount || payment.amount
                          ).toLocaleString("en-IN")}
                          {payment.lateFeeAmount > 0 && (
                            <>
                              {" "}
                              + Late: ₹
                              {payment.lateFeeAmount.toLocaleString("en-IN")}
                            </>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {payment.status === "PAID" ? (
                        payment.invoicePdfUrl ? (
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() =>
                                handleViewInvoice(payment.invoicePdfUrl)
                              }
                              className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                              title="View invoice in new tab"
                            >
                              View
                            </button>
                            <span className="text-[var(--color-text-tertiary)]">
                              |
                            </span>
                            <button
                              onClick={() => {
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
                              className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                              title="Download invoice PDF"
                            >
                              Download
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvoice(payment.id)}
                            className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                            title="Invoice not generated yet. Click to generate."
                          >
                            Generate Invoice
                          </button>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
