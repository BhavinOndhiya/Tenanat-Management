import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_OPTIONS = ["ALL", "NEW", "IN_PROGRESS", "RESOLVED"];

const createFilterState = (overrides = {}) => ({
  search: "",
  status: "ALL",
  from: "",
  to: "",
  category: "",
  ...overrides,
});

const csvTypeMap = {
  all: "complaints_all",
  open: "complaints_open",
  resolved: "complaints_resolved",
};

function AdminComplaintsDrilldown({ variant = "all", title }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromQuery = searchParams.get("category") || "";
  const [filters, setFilters] = useState(() =>
    createFilterState({ category: categoryFromQuery })
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    createFilterState({ category: categoryFromQuery })
  );

  const params = useMemo(() => {
    const query = {};
    if (appliedFilters.search) {
      query.search = appliedFilters.search;
    }
    if (appliedFilters.from) {
      query.from = appliedFilters.from;
    }
    if (appliedFilters.to) {
      query.to = appliedFilters.to;
    }
    if (appliedFilters.status && appliedFilters.status !== "ALL") {
      query.status = appliedFilters.status;
    }
    if (appliedFilters.category) {
      query.category = appliedFilters.category;
    }
    return query;
  }, [appliedFilters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppliedFilters(filters);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    if (categoryFromQuery === (filters.category || "")) {
      return;
    }
    setFilters((prev) => ({ ...prev, category: categoryFromQuery }));
    setAppliedFilters((prev) => ({ ...prev, category: categoryFromQuery }));
  }, [categoryFromQuery]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminComplaints(variant, params);
      setRecords(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, params]);

  const handleReset = () => {
    setFilters(createFilterState());
    setAppliedFilters(createFilterState());
    setSearchParams({});
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportAdminCsv(
        csvTypeMap[variant] || "complaints_all",
        params
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${variant}-complaints.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast.success("Export started");
    } catch (error) {
      showToast.error(error.message || "Failed to export CSV");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Detailed view with advanced filters
          </p>
        </div>
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card padding="md">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col xl:flex-row gap-4 xl:items-end"
        >
          <div className="flex-1">
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by title or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              From
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              To
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Category
            </label>
            <input
              type="text"
              placeholder="e.g. Maintenance"
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  category: event.target.value,
                }))
              }
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            className="xl:self-end"
          >
            Reset
          </Button>
        </form>
      </Card>

      <Card padding="md">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-8">
            No complaints found for the selected range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">Title</th>
                  <th className="py-3 pr-4">Citizen</th>
                  <th className="py-3 pr-4">Flat</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-3 pr-4 text-[var(--color-text-tertiary)]">
                      {record.id}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[var(--color-text-primary)]">
                      {record.title}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {record.citizen?.name || record.citizen?.email || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {record.flat
                        ? `${record.flat.buildingName} • ${record.flat.flatNumber}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                        {record.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleString()
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

export default AdminComplaintsDrilldown;
