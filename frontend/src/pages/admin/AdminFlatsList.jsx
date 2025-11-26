import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const defaultFilters = {
  search: "",
};

function AdminFlatsList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const filteredRecords = records.filter((flat) => {
    if (!appliedFilters.search) return true;
    const term = appliedFilters.search.toLowerCase();
    return (
      flat.buildingName.toLowerCase().includes(term) ||
      flat.flatNumber.toLowerCase().includes(term) ||
      flat.occupants.some(
        (occupant) =>
          occupant.user?.name?.toLowerCase().includes(term) ||
          occupant.user?.email?.toLowerCase().includes(term)
      )
    );
  });

  const fetchFlats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminFlatsDetailed();
      setRecords(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load flats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Flats & Occupants
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Quick look at every flat and assigned residents.
          </p>
        </div>
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
              placeholder="Search building, flat, or resident"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
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
            No flats found.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((flat) => (
              <div
                key={flat.id}
                className="border border-[var(--color-border)] rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {flat.buildingName} • {flat.flatNumber}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Block {flat.block || "—"} · Floor {flat.floor ?? "—"}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                    {flat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {flat.occupants.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-3">
                    No occupants assigned.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {flat.occupants.map((occupant) => (
                      <li
                        key={occupant.id}
                        className="flex flex-wrap items-center justify-between text-sm border border-[var(--color-border)] rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {occupant.user?.name || "Unassigned"}
                          </p>
                          <p className="text-[var(--color-text-secondary)]">
                            {occupant.user?.email || ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            {occupant.relation}
                          </p>
                          {occupant.isPrimary && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white">
                              Primary
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminFlatsList;
