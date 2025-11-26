import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_BADGE_CLASS = {
  PENDING: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  PARTIALLY_PAID: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  PAID: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  OVERDUE: "bg-[var(--color-error-light)] text-[var(--color-error)]",
};

function AdminBillingInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminBillingInvoice(id);
      setData(response);
      setError("");
    } catch (apiError) {
      if (apiError.message?.includes("not found")) {
        setError("Invoice not found.");
      } else {
        setError("Unable to load invoice details.");
      }
      showToast.error(apiError.message || "Unable to load invoice details");
    } finally {
      setLoading(false);
    }
  };

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
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const { invoice, payments, totalPaid, outstanding } = data || {};

  if (!invoice) {
    return null;
  }

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
        <Button
          variant="secondary"
          onClick={() => navigate("/admin/billing/invoices")}
        >
          Back to Invoices
        </Button>
      </div>

      <Card padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Flat</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {invoice.flat?.buildingName || "—"} •{" "}
              {invoice.flat?.flatNumber || ""}
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
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              ₹{invoice.amount?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Due Date
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "—"}
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
        </Card>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Payment History
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Recorded maintenance payments for this invoice.
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
                  <th className="py-3 pr-4">Paid By</th>
                  <th className="py-3 pr-4">Method</th>
                  <th className="py-3 pr-4">Reference</th>
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
                      {payment.paidByUser?.name || "—"}
                      <br />
                      <span className="text-xs">
                        {payment.paidByUser?.email || ""}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.method}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.reference || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleString()
                        : "—"}
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

export default AdminBillingInvoiceDetail;
