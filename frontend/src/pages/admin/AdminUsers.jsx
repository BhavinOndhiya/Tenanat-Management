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

  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [updatingUser, setUpdatingUser] = useState(false);

  // Password update state
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete state
  const [deletingUserId, setDeletingUserId] = useState(null);

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

  const handleEditUser = async (user) => {
    try {
      const fullUser = await api.getAdminUser(user.id);
      setEditingUser(fullUser);
      setEditFormData({
        name: fullUser.name || "",
        email: fullUser.email || "",
        phone: fullUser.phone || "",
        role: fullUser.role || "CITIZEN",
        isActive: fullUser.isActive !== undefined ? fullUser.isActive : true,
      });
    } catch (error) {
      showToast.error(error.message || "Failed to load user details");
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;

    setUpdatingUser(true);
    try {
      await api.updateAdminUser(editingUser.id, editFormData);
      showToast.success("User updated successfully");
      setEditingUser(null);
      setEditFormData({});
      fetchUsers();
    } catch (error) {
      showToast.error(error.message || "Unable to update user");
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (!passwordUserId || !newPassword || newPassword.length < 6) {
      showToast.error("Password must be at least 6 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.updateAdminUserPassword(passwordUserId, newPassword);
      showToast.success("Password updated successfully");
      setPasswordUserId(null);
      setNewPassword("");
    } catch (error) {
      showToast.error(error.message || "Unable to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this user? This action cannot be undone and the user will be removed from the database. The email can be reused for new users."
      )
    ) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const result = await api.deleteAdminUser(userId);
      showToast.success(
        result.message || "User permanently deleted from database"
      );
      fetchUsers();
    } catch (error) {
      showToast.error(error.message || "Unable to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          User Management
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Full administrator access - update passwords, edit details, and manage
          all users.
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPasswordUserId(user.id)}
                          >
                            Password
                          </Button>
                          <Button
                            variant={user.isActive ? "secondary" : "primary"}
                            size="sm"
                            loading={statusUpdatingId === user.id}
                            onClick={() => handleStatusToggle(user)}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deletingUserId === user.id}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
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
                minLength={6}
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            padding="lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Edit User
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  setEditFormData({});
                }}
              >
                ✕
              </Button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
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
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.phone || ""}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
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
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
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
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Active
                  </span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" fullWidth loading={updatingUser}>
                  Update User
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Update Password Modal */}
      {passwordUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full" padding="lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Update Password
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPasswordUserId(null);
                  setNewPassword("");
                }}
              >
                ✕
              </Button>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" fullWidth loading={updatingPassword}>
                  Update Password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setPasswordUserId(null);
                    setNewPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
