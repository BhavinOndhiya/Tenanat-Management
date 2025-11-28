import { useCallback, useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const ROLE_OPTIONS = [
  "CITIZEN",
  "TENANT",
  "PG_TENANT",
  "OFFICER",
  "FLAT_OWNER",
  "PG_OWNER",
  "ADMIN",
];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: "ALL",
    isActive: "ALL",
    search: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "CITIZEN",
  });
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        role: filters.role !== "ALL" ? filters.role : undefined,
        isActive:
          filters.isActive !== "ALL" ? filters.isActive === "true" : undefined,
        search: filters.search || undefined,
      };
      const data = await api.getAdminUsers(params);
      setUsers(data);
    } catch (error) {
      showToast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await api.createAdminUser(formData);
      showToast.success("User created successfully");
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "CITIZEN",
      });
      fetchUsers();
    } catch (error) {
      showToast.error(error.message || "Unable to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      setUpdatingUserId(userId);
      await api.updateUserRole(userId, role);
      showToast.success("Role updated");
      fetchUsers();
    } catch (error) {
      showToast.error(error.message || "Unable to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      setStatusUpdatingId(user.id);
      await api.updateUserStatus(user.id, !user.isActive);
      showToast.success("User status updated");
      fetchUsers();
    } catch (error) {
      showToast.error(error.message || "Unable to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          User Management
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Manage all roles and activation states from a single view.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padding="lg">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <input
              type="search"
              placeholder="Search by name or email"
              className="flex-1 min-w-[200px] px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
            <select
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              value={filters.role}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, role: event.target.value }))
              }
            >
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
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
              <option value="ALL">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button variant="secondary" onClick={fetchUsers}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-8">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-3 pr-4 font-semibold text-[var(--color-text-primary)]">
                        {user.name}
                      </td>
                      <td className="py-3 pr-4 text-[var(--color-text-secondary)]">
                        {user.email}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                          value={user.role}
                          disabled={updatingUserId === user.id}
                          onChange={(event) =>
                            handleRoleChange(user.id, event.target.value)
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.isActive
                              ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
                              : "bg-[var(--color-error-light)] text-[var(--color-error)]"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <Button
                          variant={user.isActive ? "secondary" : "primary"}
                          size="sm"
                          loading={statusUpdatingId === user.id}
                          onClick={() => handleStatusToggle(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Create User
          </h2>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Full name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Temporary password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, role: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" fullWidth loading={creating}>
              Invite User
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminUsers;
