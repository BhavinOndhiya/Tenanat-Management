import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";

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

const STATUS_BADGE_CLASS = {
  PENDING: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  PARTIALLY_PAID: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  PAID: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  OVERDUE: "bg-[var(--color-error-light)] text-[var(--color-error)]",
};

function BillingList() {
  const navigate = useNavigate();
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
  const [flatLabels, setFlatLabels] = useState({});
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

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
            ? `${flat.buildingName} ${
                flat.flatNumber ? `• ${flat.flatNumber}` : ""
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
      setLoading(true);
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
      showToast.error(error.message || "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Razorpay is not available in this environment."));
        return;
      }

      if (window.Razorpay) {
        resolve();
        return;
      }

      const scriptId = "razorpay-checkout-js";
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Razorpay Checkout"))
        );
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error("Unable to load Razorpay Checkout. Please try again later.")
        );
      document.body.appendChild(script);
    });

  const handlePayNow = async (invoice) => {
    if (!invoice || payingInvoiceId) return;
    if ((invoice.outstanding || 0) <= 0) {
      showToast.info("This invoice is already paid.");
      return;
    }

    setPayingInvoiceId(invoice._id);

    try {
      const order = await api.createInvoicePaymentOrder(invoice._id);
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Unable to initialize Razorpay Checkout.");
      }

      const keyId =
        order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "";

      if (!keyId) {
        throw new Error(
          "Payment gateway is not configured. Please contact support."
        );
      }

      const amountInPaise =
        order.amountInPaise || Math.round(order.amount * 100);

      const checkout = new window.Razorpay({
        key: keyId,
        amount: amountInPaise,
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
        handler: async (response) => {
          try {
            await api.verifyInvoicePayment({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            showToast.success(
              "Payment successful! Your invoice has been updated."
            );
            await fetchInvoices();
          } catch (verifyError) {
            showToast.error(
              verifyError.message ||
                "We could not verify your payment. Please contact support."
            );
          } finally {
            setPayingInvoiceId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingInvoiceId(null);
            showToast.info("Payment window closed.");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setPayingInvoiceId(null);
        showToast.error(
          response.error?.description ||
            "Payment failed. Please try again or contact support with your payment ID."
        );
      });

      checkout.open();
    } catch (paymentError) {
      setPayingInvoiceId(null);
      showToast.error(
        paymentError.message ||
          "Unable to initiate the payment. Please try again later."
      );
    }
  };

  useEffect(() => {
    fetchFlats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInvoices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const formatMonthYear = (month, year) => {
    if (!month || !year) return "—";
    const option = MONTH_OPTIONS.find((item) => item.value === month);
    const label = option?.label || month;
    return `${label} ${year}`;
  };

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          My Maintenance
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          View your society maintenance invoices and payment history.
        </p>
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(event) =>
                handleFilterChange("month", event.target.value)
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(event) =>
                handleFilterChange("year", Number(event.target.value) || "")
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {yearOptions.map((year) => (
                <option key={year || "all"} value={year}>
                  {year === "" ? "All Years" : year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card padding="md">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] py-12">
            No maintenance invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 pr-4">Month / Year</th>
                  <th className="py-3 pr-4">Flat</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Paid</th>
                  <th className="py-3 pr-4">Outstanding</th>
                  <th className="py-3 pr-4">Due Date</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((invoice) => (
                  <tr
                    key={invoice._id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {formatMonthYear(invoice.month, invoice.year)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-primary)]">
                      {flatLabels[invoice.flat] || "My Flat"}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[var(--color-text-primary)]">
                      ₹{invoice.amount?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      ₹{invoice.totalPaid?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      ₹{invoice.outstanding?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          STATUS_BADGE_CLASS[invoice.status] ||
                          "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {invoice.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-0 text-right space-x-2">
                      {invoice.outstanding > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handlePayNow(invoice)}
                          loading={payingInvoiceId === invoice._id}
                        >
                          Pay Now
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/billing/${invoice._id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.items.length > 0 && (
          <div className="flex items-center justify-between mt-6 text-sm text-[var(--color-text-secondary)]">
            <span>
              Page {data.page} of {totalPages}
            </span>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={data.page === 1}
                onClick={() => fetchInvoices(data.page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={data.page >= totalPages}
                onClick={() => fetchInvoices(data.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default BillingList;
