import { useEffect, useMemo, useState } from "react";
import { createSearchParams, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const StatCard = ({ label, value, accent, onClick }) => (
  <Card
    padding="lg"
    className={`h-full ${onClick ? "cursor-pointer focus:outline-none" : ""}`}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(event) => {
      if (onClick && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onClick();
      }
    }}
  >
    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
      {label}
    </p>
    <div className="mt-3 flex items-end gap-2">
      <span className={`text-4xl font-bold ${accent}`}>{value}</span>
    </div>
  </Card>
);

function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminDashboardSummary();
      setSummary(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const maxStatusCount = useMemo(() => {
    if (!summary?.charts?.complaintsByStatus?.length) {
      return 1;
    }
    return Math.max(
      ...summary.charts.complaintsByStatus.map((item) => item.count || 0),
      1
    );
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center space-y-4">
        <p className="text-[var(--color-text-secondary)]">
          No analytics available yet.
        </p>
        <Button onClick={fetchSummary}>Retry</Button>
      </div>
    );
  }

  const { stats, charts } = summary;
  const totalComplaints =
    (stats.openComplaints || 0) + (stats.resolvedComplaints || 0) || 1;
  const handleNavigate = (path) => () => navigate(path);
  const handleCategoryNavigate = (category) => () =>
    navigate({
      pathname: "/admin/complaints/all",
      search: createSearchParams({ category }).toString(),
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Admin Dashboard
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          High-level society health overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Complaints"
          value={(stats.openComplaints || 0) + (stats.resolvedComplaints || 0)}
          accent="text-[var(--color-primary)]"
          onClick={handleNavigate("/admin/complaints/all")}
        />
        <StatCard
          label="Total Flats"
          value={stats.totalFlats}
          accent="text-[var(--color-success)]"
          onClick={handleNavigate("/admin/flats/list")}
        />
        <StatCard
          label="Active Announcements"
          value={stats.activeAnnouncements}
          accent="text-[var(--color-info)]"
          onClick={handleNavigate("/admin/announcements/list")}
        />
        <StatCard
          label="Upcoming Events"
          value={stats.upcomingEvents}
          accent="text-[var(--color-accent)]"
          onClick={handleNavigate("/admin/events/list")}
        />
      </div>

      {(stats.rentPaymentsPaid > 0 || stats.rentPaymentsPending > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            label="PG Rent Payments - Paid"
            value={stats.rentPaymentsPaid || 0}
            accent="text-[var(--color-success)]"
          />
          <StatCard
            label="PG Rent Payments - Pending"
            value={stats.rentPaymentsPending || 0}
            accent="text-[var(--color-warning)]"
          />
          <StatCard
            label="Total Received (₹)"
            value={new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(stats.rentPaymentsTotalReceived || 0)}
            accent="text-[var(--color-success)]"
          />
          <StatCard
            label="Total Pending (₹)"
            value={new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(stats.rentPaymentsTotalPending || 0)}
            accent="text-[var(--color-error)]"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Complaints by Status
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchSummary}>
              Refresh
            </Button>
          </div>
          <div className="space-y-4">
            {charts.complaintsByStatus.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {item.status.replace("_", " ")}
                  </span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full mt-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                    style={{
                      width: `${Math.min(
                        100,
                        (item.count / maxStatusCount) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Complaints by Category
            </h2>
          </div>
          {charts.complaintsByCategory.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">
              No category data yet.
            </p>
          ) : (
            <div className="space-y-3">
              {charts.complaintsByCategory.map((item) => (
                <div
                  key={item.category}
                  role="button"
                  tabIndex={0}
                  onClick={handleCategoryNavigate(item.category)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCategoryNavigate(item.category)();
                    }
                  }}
                  className="flex items-center justify-between border border-[var(--color-border)] rounded-lg px-4 py-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  <div>
                    <p className="text-[var(--color-text-primary)] font-semibold">
                      {item.category}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {((item.count / totalComplaints) * 100).toFixed(1)}% of
                      total complaints
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-[var(--color-primary)]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
