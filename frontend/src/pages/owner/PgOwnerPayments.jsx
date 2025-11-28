import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api, API_BASE_URL } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import { ScrollAnimation } from "../../components/ScrollAnimation";

export default function PgOwnerPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filters, setFilters] = useState({
    propertyId: searchParams.get("propertyId") || "",
    tenantId: searchParams.get("tenantId") || "",
    status: searchParams.get("status") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
  });

  useEffect(() => {
    loadProperties();
    loadPayments();
    loadSummary();
  }, []);

  useEffect(() => {
    loadPayments();
    loadSummary();

    // Update URL params when filters change
    const params = new URLSearchParams();
    if (filters.propertyId) params.set("propertyId", filters.propertyId);
    if (filters.tenantId) params.set("tenantId", filters.tenantId);
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    setSearchParams(params, { replace: true });
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

      // Extract unique tenants from payments
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

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
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

  const clearFilters = () => {
    setFilters({
      propertyId: "",
      tenantId: "",
      status: "",
      from: "",
      to: "",
    });
  };

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            PG Payments
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            View rent payment history for your PG properties
          </p>
        </div>
      </ScrollAnimation>

      {/* Summary Card */}
      {summary && (
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Payment Summary
          </h2>
          {summaryLoading ? (
            <div className="flex justify-center py-4">
              <Loader />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Total Due
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{summary.totalDue?.toLocaleString("en-IN") || 0}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Received
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₹{summary.totalReceived?.toLocaleString("en-IN") || 0}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  ₹{summary.totalPending?.toLocaleString("en-IN") || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Total Payments
                </p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {summary.totalCount || 0}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Property
            </label>
            <select
              value={filters.propertyId}
              onChange={(e) => handleFilterChange("propertyId", e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            >
              <option value="">All Properties</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name || prop.buildingName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Tenant
            </label>
            <select
              value={filters.tenantId}
              onChange={(e) => handleFilterChange("tenantId", e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            >
              <option value="">All Tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            >
              <option value="">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            />
          </div>

          <div className="flex items-end">
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Amount</th>
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
                    <td className="py-3 px-4">
                      {payment.tenant ? (
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {payment.tenant.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {payment.tenant.email}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {payment.property?.name || "—"}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {payment.periodLabel}
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
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            Invoice pending
                          </span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
