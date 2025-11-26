import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";

const STATUS_BADGE_CLASS = {
  PENDING: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  PARTIALLY_PAID: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  PAID: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  OVERDUE: "bg-[var(--color-error-light)] text-[var(--color-error)]",
};

function BillingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flatLabels, setFlatLabels] = useState({});
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  const fetchFlats = async () => {
    try {
      const flats = await api.getMyFlats();
      const map = flats.reduce((acc, assignment) => {
        const flat = assignment.flat || assignment;
        if (flat?.id || flat?._id) {
          const key = flat.id || flat._id;
          const label = flat.buildingName
            ? `${flat.buildingName} ${
                flat.flatNumber ? `• ${flat.flatNumber}` : ""
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
      const response = await api.getMyBillingInvoice(id);
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
      showToast.error(apiError.message || "Unable to load invoice details");
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

  const handlePayNow = async () => {
    if (!data?.invoice || isPaymentProcessing) {
      return;
    }

    const outstanding = data?.outstanding || 0;
    if (outstanding <= 0) {
      showToast.info("This invoice is already paid.");
      return;
    }

    setIsPaymentProcessing(true);
    try {
      const order = await api.createInvoicePaymentOrder(data.invoice._id);
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
        description: `Maintenance payment for ${data.invoice.month}/${data.invoice.year}`,
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
            await fetchInvoice();
          } catch (verifyError) {
            showToast.error(
              verifyError.message ||
                "We could not verify your payment. Please contact support."
            );
          } finally {
            setIsPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaymentProcessing(false);
            showToast.info("Payment window closed.");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setIsPaymentProcessing(false);
        showToast.error(
          response.error?.description ||
            "Payment failed. Please try again or contact support with your payment ID."
        );
      });

      checkout.open();
    } catch (paymentError) {
      setIsPaymentProcessing(false);
      showToast.error(
        paymentError.message ||
          "Unable to initiate the payment. Please try again later."
      );
    }
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <Button variant="secondary" onClick={() => navigate("/billing")}>
          Back to My Maintenance
        </Button>
      </div>
    );
  }

  const { invoice, payments, totalPaid, outstanding } = data || {};

  if (!invoice) {
    return null;
  }

  const flatLabel =
    flatLabels[invoice.flat] || flatLabels[invoice.flat?._id] || "My Flat";

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "—";

  const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString() : "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            Invoice ID
          </p>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            {invoice._id}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => navigate("/billing")}>
          Back to My Maintenance
        </Button>
      </div>

      <Card padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Flat</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {flatLabel}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Month / Year
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {invoice.month}/{invoice.year}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Amount</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              ₹{invoice.amount?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Due Date
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Status</p>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                STATUS_BADGE_CLASS[invoice.status] ||
                "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
              }`}
            >
              {invoice.status.replace("_", " ")}
            </span>
          </div>
          {invoice.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Notes
              </p>
              <p className="text-[var(--color-text-primary)]">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="lg">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Total Paid
          </p>
          <p className="text-2xl font-bold text-[var(--color-success)] mt-2">
            ₹{totalPaid?.toLocaleString() || 0}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Outstanding
          </p>
          <p className="text-2xl font-bold text-[var(--color-warning)] mt-2">
            ₹{outstanding?.toLocaleString() || 0}
          </p>
          {outstanding > 0 && (
            <Button
              className="mt-4 w-full md:w-auto"
              onClick={handlePayNow}
              loading={isPaymentProcessing}
            >
              Pay Now
            </Button>
          )}
        </Card>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Payment History
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Any payments logged by the management team will appear below.
            </p>
          </div>
        </div>

        {payments?.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] py-12">
            No payments recorded for this invoice yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Method</th>
                  <th className="py-3 pr-4">Reference</th>
                  <th className="py-3 pr-4">Logged By</th>
                  <th className="py-3 pr-4">Paid At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-3 pr-4 font-semibold text-[var(--color-text-primary)]">
                      ₹{payment.amount?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.method}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.reference || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.paidByUser?.name || "Management"}
                      <br />
                      <span className="text-xs">
                        {payment.paidByUser?.email || ""}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {formatDateTime(payment.paidAt)}
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

export default BillingDetail;
