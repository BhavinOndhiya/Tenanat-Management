import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const emptyFlat = {
  id: null,
  buildingName: "",
  block: "",
  flatNumber: "",
  floor: "",
  isActive: true,
};

function AdminFlats() {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(emptyFlat);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    building: "",
    block: "",
    isActive: "true",
  });

  const fetchFlats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminFlats({
        building: filters.building || undefined,
        block: filters.block || undefined,
        isActive:
          filters.isActive === "ALL" ? undefined : filters.isActive === "true",
      });
      setFlats(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load flats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [filters]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (formState.id) {
        await api.updateFlat(formState.id, {
          buildingName: formState.buildingName,
          block: formState.block,
          flatNumber: formState.flatNumber,
          floor: formState.floor || null,
          isActive: formState.isActive,
        });
        showToast.success("Flat updated");
      } else {
        await api.createFlat({
          buildingName: formState.buildingName,
          block: formState.block,
          flatNumber: formState.flatNumber,
          floor: formState.floor || null,
          isActive: formState.isActive,
        });
        showToast.success("Flat created");
      }
      setFormState(emptyFlat);
      fetchFlats();
    } catch (error) {
      showToast.error(error.message || "Unable to save flat");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (flat) => {
    setFormState({
      id: flat.id,
      buildingName: flat.buildingName,
      block: flat.block,
      flatNumber: flat.flatNumber,
      floor: flat.floor ?? "",
      isActive: flat.isActive,
    });
  };

  const handleDelete = async (flat) => {
    if (!window.confirm(`Delete flat ${flat.flatNumber} permanently?`)) {
      return;
    }
    try {
      await api.deleteFlat(flat.id);
      showToast.success("Flat deleted");
      fetchFlats();
    } catch (error) {
      showToast.error(
        error.message || "Unable to delete flat. Check dependencies."
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Flats Directory
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Manage every unit, block, and building from a single place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              type="text"
              placeholder="Filter by building"
              className="flex-1 min-w-[180px] px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.building}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  building: event.target.value,
                }))
              }
            />
            <input
              type="text"
              placeholder="Block"
              className="w-32 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.block}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, block: event.target.value }))
              }
            />
            <select
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.isActive}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  isActive: event.target.value,
                }))
              }
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="ALL">All</option>
            </select>
            <Button variant="secondary" onClick={fetchFlats}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : flats.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">
              No flats found with current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {flats.map((flat) => (
                <div
                  key={flat.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-[var(--color-border)] rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {flat.buildingName} • {flat.flatNumber}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Block {flat.block || "—"} · Floor {flat.floor ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        flat.isActive
                          ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                          : "bg-[var(--color-error-light)] text-[var(--color-error)]"
                      }`}
                    >
                      {flat.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEdit(flat)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(flat)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            {formState.id ? "Edit flat" : "Add flat"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Building name
              </label>
              <input
                type="text"
                required
                value={formState.buildingName}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    buildingName: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Block
                </label>
                <input
                  type="text"
                  value={formState.block}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      block: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Flat number
                </label>
                <input
                  type="text"
                  required
                  value={formState.flatNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      flatNumber: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Floor
              </label>
              <input
                type="number"
                value={formState.floor}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    floor: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flat-active"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label
                htmlFor="flat-active"
                className="text-sm text-[var(--color-text-secondary)]"
              >
                Flat is active
              </label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" fullWidth loading={saving}>
                {formState.id ? "Update Flat" : "Create Flat"}
              </Button>
              {formState.id && (
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setFormState(emptyFlat)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminFlats;
