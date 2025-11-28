import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ScrollAnimation } from "../../components/ScrollAnimation";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_LABELS = {
  FLAT: {
    heading: "Flat Owner Dashboard",
    subheading: "Monitor complaints raised in your flats",
    complaintRoute: "/owner/flat-complaints",
  },
  PG: {
    heading: "PG Owner Dashboard",
    subheading: "Track PG complaints and tenant issues",
    complaintRoute: "/owner/pg-complaints",
  },
};

const getCurrentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

function OverviewRow({ label, value, emphasize = false, onClick }) {
  const content = (
    <>
      <span className="text-sm text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span
        className={`text-lg font-semibold ${
          emphasize
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-[var(--color-border)]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-1">{content}</div>
  );
}

export default function OwnerDashboard({ ownerType }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("ALL");
  const initialPeriod = ownerType === "PG" ? getCurrentPeriod() : null;
  const [dashboardParams, setDashboardParams] = useState(
    initialPeriod ? { ...initialPeriod } : {}
  );
  const [incomeFilterKey, setIncomeFilterKey] = useState(
    initialPeriod ? `${initialPeriod.month}-${initialPeriod.year}` : "ALL"
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = ownerType === "PG" ? dashboardParams : {};
        const dashboard = await api.getOwnerDashboard(params);
        setData(dashboard);
      } catch (error) {
        showToast.error(error.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ownerType, dashboardParams]);

  useEffect(() => {
    if (ownerType === "PG") {
      setDashboardParams((prev) => {
        if (prev.month && prev.year) {
          return prev;
        }
        const current = getCurrentPeriod();
        setIncomeFilterKey(`${current.month}-${current.year}`);
        return current;
      });
    } else {
      setDashboardParams((prev) => {
        if (Object.keys(prev).length === 0) {
          return prev;
        }
        return {};
      });
      setIncomeFilterKey("ALL");
    }
  }, [ownerType]);

  useEffect(() => {
    if (ownerType !== "PG") {
      return;
    }
    if (data?.incomeSummary?.filter) {
      const { month, year } = data.incomeSummary.filter;
      setIncomeFilterKey(`${month}-${year}`);
    } else {
      setIncomeFilterKey("ALL");
    }
  }, [ownerType, data?.incomeSummary?.filter]);

  const propertySummary = useMemo(() => {
    if (!data?.byProperty) return [];
    if (selectedPropertyId === "ALL") {
      return data.byProperty;
    }
    return data.byProperty.filter(
      (property) => property.propertyId === selectedPropertyId
    );
  }, [data, selectedPropertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">
          Unable to load dashboard. Please try again.
        </p>
      </div>
    );
  }

  const meta = STATUS_LABELS[ownerType] || STATUS_LABELS.FLAT;
  const incomeSummary = data?.incomeSummary;
  const availableIncomeFilters = incomeSummary?.availableFilters || [];

  const formatCurrency = (value = 0) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  const formatDateLabel = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const handleIncomeFilterChange = (event) => {
    if (ownerType !== "PG") return;
    const value = event.target.value;
    setIncomeFilterKey(value);
    if (value === "ALL") {
      setDashboardParams({});
      return;
    }
    const [month, year] = value.split("-");
    setDashboardParams({
      month,
      year,
    });
  };

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              {meta.heading}
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {meta.subheading}
            </p>
          </div>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Complaint Overview
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Snapshot across all your properties
              </p>
            </div>
            <Button as={Link} to={meta.complaintRoute} size="sm">
              View Complaints
            </Button>
          </div>
          <div className="space-y-3">
            <OverviewRow
              label="Total Complaints"
              value={data.summary.totalComplaints}
            />
            <OverviewRow
              label="Open"
              value={data.summary.open}
              emphasize
              onClick={() => navigate(`${meta.complaintRoute}?status=OPEN`)}
            />
            <OverviewRow
              label="In Progress"
              value={data.summary.inProgress}
              onClick={() =>
                navigate(`${meta.complaintRoute}?status=IN_PROGRESS`)
              }
            />
            <OverviewRow
              label="Resolved / Closed"
              value={data.summary.resolved + data.summary.closed}
              onClick={() => navigate(`${meta.complaintRoute}?status=RESOLVED`)}
            />
          </div>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Payment Overview
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                This month&rsquo;s inflow vs pending dues
              </p>
            </div>
            <div className="flex items-center gap-3">
              {ownerType === "PG" &&
                incomeSummary &&
                availableIncomeFilters.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Month
                    </span>
                    <select
                      value={incomeFilterKey}
                      onChange={handleIncomeFilterChange}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    >
                      <option value="ALL">All Time</option>
                      {availableIncomeFilters.map(({ month, year }) => (
                        <option
                          key={`${month}-${year}`}
                          value={`${month}-${year}`}
                        >
                          {new Date(year, month - 1).toLocaleString("default", {
                            month: "short",
                            year: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              {ownerType === "PG" && (
                <Button
                  as={Link}
                  to="/owner/pg-payments"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  View All Payments
                </Button>
              )}
            </div>
          </div>
          {ownerType !== "PG" ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Payment tracking is available for PG properties. Add a PG property
              to start monitoring collections.
            </p>
          ) : !incomeSummary ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No rent invoices recorded for this period yet.
            </p>
          ) : (
            <div className="space-y-3">
              <OverviewRow
                label="Period"
                value={
                  incomeSummary.filter
                    ? new Date(
                        incomeSummary.filter.year,
                        incomeSummary.filter.month - 1
                      ).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })
                    : "All Time"
                }
              />
              <OverviewRow
                label="Received"
                value={formatCurrency(incomeSummary.period.received)}
                emphasize
                onClick={() =>
                  ownerType === "PG" &&
                  navigate("/owner/pg-payments?status=PAID")
                }
              />
              <OverviewRow
                label="Pending"
                value={formatCurrency(incomeSummary.period.pending)}
                onClick={() =>
                  ownerType === "PG" &&
                  navigate("/owner/pg-payments?status=PENDING")
                }
              />
              <OverviewRow
                label="Total Due"
                value={formatCurrency(incomeSummary.period.totalDue)}
                onClick={() =>
                  ownerType === "PG" && navigate("/owner/pg-payments")
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed border-[var(--color-border)]">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Due Date
                  </p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatDateLabel(incomeSummary.periodDueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Next Invoice Due
                  </p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatDateLabel(incomeSummary.nextDueDate)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Complaints by Category
            </h2>
            <span className="text-sm text-[var(--color-text-secondary)]">
              Overview
            </span>
          </div>
          {data.byCategory.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">
              No complaint data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.byCategory.map((category) => (
                <div
                  key={category.category}
                  className="flex items-center justify-between py-2 border-b border-dashed border-[var(--color-border)] last:border-none"
                >
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {category.category}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {category.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Complaints by Property
            </h2>
            {ownerType === "PG" && data.byProperty.length > 1 && (
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                <option value="ALL">All Properties</option>
                {data.byProperty.map((property) => (
                  <option key={property.propertyId} value={property.propertyId}>
                    {property.propertyName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {propertySummary.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">
              No complaints for this property.
            </p>
          ) : (
            <div className="space-y-3">
              {propertySummary.map((property) => (
                <div
                  key={property.propertyId}
                  className="p-3 rounded-lg border border-[var(--color-border)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {property.propertyName}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {property.totalComplaints} total · {property.open} open
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `${meta.complaintRoute}?propertyId=${property.propertyId}`
                        )
                      }
                    >
                      Filter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Recent Complaints
          </h2>
          <Button as={Link} to={meta.complaintRoute} size="sm">
            View All
          </Button>
        </div>
        {data.recentComplaints.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">
            No recent complaints found.
          </p>
        ) : (
          <div className="space-y-3">
            {data.recentComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="p-3 rounded-lg border border-[var(--color-border)] flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {complaint.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {complaint.category} · {complaint.status}
                  </p>
                </div>
                <Button
                  as={Link}
                  to={`${meta.complaintRoute}/${complaint.id}`}
                  size="sm"
                  variant="secondary"
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
