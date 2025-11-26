import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_OPTIONS = ["ALL", "PUBLISHED", "PENDING", "CANCELLED"];

const defaultFilters = {
  search: "",
  status: "ALL",
  from: "",
  to: "",
};

function AdminEventsList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const filteredRecords = records.filter((event) => {
    const matchesStatus =
      appliedFilters.status === "ALL" || event.status === appliedFilters.status;
    const matchesSearch =
      !appliedFilters.search ||
      event.title.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
      event.description
        ?.toLowerCase()
        .includes(appliedFilters.search.toLowerCase());
    const date = event.date ? new Date(event.date) : null;
    const fromValid = appliedFilters.from
      ? date >= new Date(appliedFilters.from)
      : true;
    const toValid = appliedFilters.to
      ? date <= new Date(appliedFilters.to)
      : true;
    return matchesStatus && matchesSearch && fromValid && toValid;
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminEventsList();
      setRecords(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportAdminCsv("events");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "events.csv";
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
            Events Drill-down
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Track every function with quick filters and exports.
          </p>
        </div>
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card padding="md">
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-col lg:flex-row gap-4 lg:items-end"
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
                  {status}
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
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="md">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : filteredRecords.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-8">
            No events match these filters.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((event) => (
              <div
                key={event.id}
                className="border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                      {event.title}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {new Date(event.date).toLocaleString()} • {event.location}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                      Created by{" "}
                      {event.createdBy?.name ||
                        event.createdBy?.email ||
                        "Unknown"}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                    {event.status}
                  </span>
                </div>
                <p className="text-[var(--color-text-secondary)] mt-2">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminEventsList;
