import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

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

function AdminBillingInvoices() {
  const navigate = useNavigate();
  const currentDate = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    status: "",
    month: "",
    year: currentDate.getFullYear(),
    flatQuery: "",
  });
  const [data, setData] = useState({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => {
    const base = currentDate.getFullYear();
    return ["", base - 1, base, base + 1, base + 2];
  }, [currentDate]);

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

      if (filters.flatQuery && filters.flatQuery.trim().length === 24) {
        params.flatId = filters.flatQuery.trim();
      }

      const response = await api.getAdminBillingInvoices(params);
      setData(response);
    } catch (error) {
      showToast.error(error.message || "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Maintenance Invoices
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Review maintenance invoices, status, and outstanding dues.
          </p>
        </div>
        <Button onClick={() => navigate("/admin/billing")}>
          Back to Overview
        </Button>
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Flat ID (optional)
            </label>
            <input
              type="text"
              placeholder="Enter 24-character flat ID"
              value={filters.flatQuery}
              onChange={(event) =>
                handleFilterChange("flatQuery", event.target.value)
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
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
            No invoices match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 pr-4">Flat</th>
                  <th className="py-3 pr-4">Month/Year</th>
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
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {invoice.flat?.buildingName || "—"}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {invoice.flat?.flatNumber || ""}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {invoice.month}/{invoice.year}
                    </td>
                    <td className="py-3 pr-4">
                      ₹{invoice.amount?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      ₹{invoice.totalPaid?.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
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
                    <td className="py-3 pr-0 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          navigate(`/admin/billing/invoices/${invoice._id}`)
                        }
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

export default AdminBillingInvoices;
