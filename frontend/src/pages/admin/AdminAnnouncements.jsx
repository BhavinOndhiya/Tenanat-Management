import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const TYPE_OPTIONS = ["GENERAL", "MAINTENANCE", "EVENT_NOTICE", "OTHER"];

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    type: "ALL",
    status: "ACTIVE",
  });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "GENERAL",
    targetBuilding: "",
    targetFlatId: "",
    isUrgent: false,
    startsAt: "",
    endsAt: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [annData, flatData] = await Promise.all([
        api.getAdminAnnouncements({
          type: filters.type !== "ALL" ? filters.type : undefined,
          status: filters.status,
        }),
        api.getAdminFlats({ isActive: true }),
      ]);
      setAnnouncements(annData);
      setFlats(flatData);
    } catch (error) {
      showToast.error(error.message || "Unable to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const resetForm = () => {
    setForm({
      title: "",
      body: "",
      type: "GENERAL",
      targetBuilding: "",
      targetFlatId: "",
      isUrgent: false,
      startsAt: "",
      endsAt: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetFlatId: form.targetFlatId || undefined,
        targetBuilding: form.targetBuilding || undefined,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      };
      if (editingId) {
        await api.updateAnnouncement(editingId, payload);
        showToast.success("Announcement updated");
      } else {
        await api.createAnnouncement(payload);
        showToast.success("Announcement created");
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast.error(error.message || "Unable to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      type: announcement.type,
      targetBuilding: announcement.targetBuilding || "",
      targetFlatId: announcement.targetFlat?.id || "",
      isUrgent: announcement.isUrgent,
      startsAt: announcement.startsAt
        ? new Date(announcement.startsAt).toISOString().slice(0, 16)
        : "",
      endsAt: announcement.endsAt
        ? new Date(announcement.endsAt).toISOString().slice(0, 16)
        : "",
    });
  };

  const handleDelete = async (announcement) => {
    if (!window.confirm(`Archive "${announcement.title}"?`)) {
      return;
    }
    try {
      await api.deleteAnnouncement(announcement.id);
      showToast.success("Announcement archived");
      loadData();
    } catch (error) {
      showToast.error(error.message || "Unable to archive announcement");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Announcements & Maintenance
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Broadcast urgent notices, maintenance windows, and society updates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              <option value="ALL">All types</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Button variant="secondary" onClick={loadData}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">
              No announcements found.
            </p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border border-[var(--color-border)] rounded-xl px-4 py-3 ${
                    announcement.isUrgent
                      ? "bg-[var(--color-error-light)]/20"
                      : "bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {announcement.title}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {announcement.type}
                        {announcement.targetBuilding
                          ? ` • ${announcement.targetBuilding}`
                          : ""}
                        {announcement.targetFlat
                          ? ` • ${announcement.targetFlat.flatNumber}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(announcement)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(announcement)}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                  <p className="text-[var(--color-text-secondary)] mt-2">
                    {announcement.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            {editingId ? "Edit announcement" : "Create announcement"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Body
              </label>
              <textarea
                required
                rows={3}
                value={form.body}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, body: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={form.isUrgent}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isUrgent: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label
                  htmlFor="urgent"
                  className="text-sm text-[var(--color-text-secondary)]"
                >
                  Mark as urgent
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Target building (optional)
              </label>
              <input
                type="text"
                value={form.targetBuilding}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetBuilding: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Target flat (optional)
              </label>
              <select
                value={form.targetFlatId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    targetFlatId: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              >
                <option value="">All flats</option>
                {flats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.buildingName} • {flat.flatNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Starts at
                </label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      startsAt: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Ends at
                </label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, endsAt: event.target.value }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Update" : "Publish"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={resetForm}
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

export default AdminAnnouncements;
