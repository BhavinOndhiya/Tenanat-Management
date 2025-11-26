import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const RELATION_OPTIONS = ["OWNER", "TENANT", "FAMILY", "OTHER"];

function AdminAssignFlats() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    userId: "",
    flatId: "",
    relation: "OWNER",
    isPrimary: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentData, userData, flatData] = await Promise.all([
        api.getFlatAssignments(),
        api.getAdminUsers({ isActive: true }),
        api.getAdminFlats({ isActive: true }),
      ]);
      setAssignments(assignmentData);
      setUsers(userData);
      setFlats(flatData);
      if (!form.userId && userData.length) {
        setForm((prev) => ({ ...prev, userId: userData[0].id }));
      }
      if (!form.flatId && flatData.length) {
        setForm((prev) => ({ ...prev, flatId: flatData[0].id }));
      }
    } catch (error) {
      showToast.error(error.message || "Unable to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.userId || !form.flatId) {
      showToast.error("Select a user and a flat");
      return;
    }
    setSaving(true);
    try {
      await api.createFlatAssignment(form);
      showToast.success("Assignment created");
      setForm((prev) => ({ ...prev, isPrimary: false }));
      loadData();
    } catch (error) {
      showToast.error(error.message || "Unable to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    setDeletingId(assignmentId);
    try {
      await api.deleteFlatAssignment(assignmentId);
      showToast.success("Assignment removed");
      setAssignments((prev) => prev.filter((item) => item.id !== assignmentId));
    } catch (error) {
      showToast.error(error.message || "Unable to delete assignment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Flat Assignments
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Link residents to their homes and mark primary occupants.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">
              No assignments yet. Create one using the form.
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border)] rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {assignment.user?.name} → {assignment.flat?.buildingName}{" "}
                      {assignment.flat?.flatNumber}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {assignment.relation} · Block{" "}
                      {assignment.flat?.block || "—"} · Floor{" "}
                      {assignment.flat?.floor ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {assignment.isPrimary && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--color-primary)] text-white">
                        Primary
                      </span>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      loading={deletingId === assignment.id}
                      onClick={() => handleDelete(assignment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Assign resident to flat
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Resident
              </label>
              <select
                value={form.userId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, userId: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Flat
              </label>
              <select
                value={form.flatId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, flatId: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              >
                <option value="">Select flat</option>
                {flats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.buildingName} • {flat.flatNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Relation
              </label>
              <select
                value={form.relation}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relation: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              >
                {RELATION_OPTIONS.map((relation) => (
                  <option key={relation} value={relation}>
                    {relation}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="primary-flat"
                checked={form.isPrimary}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPrimary: event.target.checked,
                  }))
                }
                className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label
                htmlFor="primary-flat"
                className="text-sm text-[var(--color-text-secondary)]"
              >
                Set as primary home
              </label>
            </div>
            <Button type="submit" fullWidth loading={saving}>
              Assign Flat
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminAssignFlats;
