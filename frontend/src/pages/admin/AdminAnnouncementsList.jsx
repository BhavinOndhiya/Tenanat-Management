import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const TYPE_OPTIONS = ["ALL", "GENERAL", "MAINTENANCE", "EVENT_NOTICE", "OTHER"];

const defaultFilters = {
  search: "",
  type: "ALL",
  from: "",
  to: "",
};

function AdminAnnouncementsList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const filteredRecords = records.filter((item) => {
    const matchesType =
      appliedFilters.type === "ALL" || item.type === appliedFilters.type;
    const matchesSearch =
      !appliedFilters.search ||
      item.title.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
      item.body?.toLowerCase().includes(appliedFilters.search.toLowerCase());
    const created = item.createdAt ? new Date(item.createdAt) : null;
    const fromValid = appliedFilters.from
      ? created >= new Date(appliedFilters.from)
      : true;
    const toValid = appliedFilters.to
      ? created <= new Date(appliedFilters.to)
      : true;
    return matchesType && matchesSearch && fromValid && toValid;
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminAnnouncementsList();
      setRecords(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
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
      const blob = await api.exportAdminCsv("announcements");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "announcements.csv";
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
            Announcements Drill-down
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Review every broadcast with quick filters.
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
              placeholder="Search title or body"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, type: event.target.value }))
              }
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
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
            No announcements found.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {announcement.title}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {announcement.type} •{" "}
                      {announcement.targetBuilding || "All Buildings"}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                    {announcement.status}
                  </span>
                </div>
                <p className="text-[var(--color-text-secondary)] mt-2">
                  {announcement.body}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                  Active{" "}
                  {announcement.startsAt
                    ? new Date(announcement.startsAt).toLocaleString()
                    : "now"}{" "}
                  →{" "}
                  {announcement.endsAt
                    ? new Date(announcement.endsAt).toLocaleString()
                    : "open"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminAnnouncementsList;
