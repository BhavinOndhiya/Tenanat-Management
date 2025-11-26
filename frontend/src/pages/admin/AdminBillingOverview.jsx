import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const MONTH_OPTIONS = [
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

function AdminBillingOverview() {
  const navigate = useNavigate();
  const currentDate = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => {
    const base = currentDate.getFullYear();
    return [base - 1, base, base + 1, base + 2];
  }, [currentDate]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminBillingSummary(filters);
      setSummary(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load billing summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const cards = summary
    ? [
        {
          label: "Total Invoices",
          value: summary.totalInvoices,
          accent: "text-[var(--color-primary)]",
        },
        {
          label: "Total Billed",
          value: `₹${summary.totalAmount?.toLocaleString() || 0}`,
          accent: "text-[var(--color-text-primary)]",
        },
        {
          label: "Total Paid",
          value: `₹${summary.totalPaid?.toLocaleString() || 0}`,
          accent: "text-[var(--color-success)]",
        },
        {
          label: "Outstanding",
          value: `₹${summary.totalOutstanding?.toLocaleString() || 0}`,
          accent: "text-[var(--color-warning)]",
        },
        {
          label: "Overdue Invoices",
          value: summary.countOverdue,
          accent: "text-[var(--color-error)]",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Billing & Maintenance
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Track maintenance invoices, payments, and outstanding dues.
          </p>
        </div>
        <Button onClick={() => navigate("/admin/billing/invoices")}>
          View All Invoices
        </Button>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(event) =>
                handleChange("month", Number(event.target.value))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(event) =>
                handleChange("year", Number(event.target.value))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.label} padding="lg" className="h-full">
              <p className="text-sm text-[var(--color-text-secondary)] uppercase tracking-wide font-semibold">
                {card.label}
              </p>
              <p className={`text-3xl font-bold mt-3 ${card.accent}`}>
                {card.value}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBillingOverview;
