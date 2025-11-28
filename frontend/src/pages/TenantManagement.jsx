import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { ScrollAnimation } from "../components/ScrollAnimation";

function TenantManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [ownedFlats, setOwnedFlats] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [filters, setFilters] = useState({
    roomType: "ALL", // ALL, AC, NON_AC
    foodIncluded: "ALL", // ALL, true, false
  });
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [creatingTenantUser, setCreatingTenantUser] = useState(false);
  const [newTenantUser, setNewTenantUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);
  const [formData, setFormData] = useState({
    tenantUserId: "",
    rentAmount: "",
    rentDueDate: "1",
    leaseStartDate: "",
    leaseEndDate: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
    roomType: "NON_AC",
    foodIncluded: false,
    roomNumber: "",
    sharing: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedFlatId) {
      loadTenants(selectedFlatId);
    } else {
      setTenants([]);
      setFilteredTenants([]);
      resetForm();
    }
  }, [selectedFlatId]);

  useEffect(() => {
    applyFilters();
  }, [tenants, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flatsData, usersData] = await Promise.all([
        api.getMyOwnedFlats().catch(() => []),
        api.getTenantUsers().catch(() => []),
      ]);
      setOwnedFlats(flatsData);
      setUsers(usersData);
      if (flatsData.length > 0 && !selectedFlatId) {
        setSelectedFlatId(flatsData[0].id);
      }
    } catch (err) {
      showToast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async (flatId) => {
    try {
      const tenantsData = await api.getTenantForFlat(flatId);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (err) {
      if (err.message?.includes("403")) {
        showToast.error("You are not the owner of this flat");
      } else {
        showToast.error("Failed to load tenant details");
      }
      setTenants([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...tenants];

    if (filters.roomType !== "ALL") {
      filtered = filtered.filter((t) => t.roomType === filters.roomType);
    }

    if (filters.foodIncluded !== "ALL") {
      const foodValue = filters.foodIncluded === "true";
      filtered = filtered.filter((t) => t.foodIncluded === foodValue);
    }

    setFilteredTenants(filtered);
  };

  const resetForm = () => {
    setFormData({
      tenantUserId: "",
      rentAmount: "",
      rentDueDate: "1",
      leaseStartDate: "",
      leaseEndDate: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      roomType: "NON_AC",
      foodIncluded: false,
      roomNumber: "",
      sharing: 1,
    });
    setShowAddForm(false);
    setEditingTenantId(null);
    setShowNewTenantForm(false);
    setNewTenantUser({ name: "", email: "", phone: "", password: "" });
    setTempPasswordInfo(null);
  };

  // Calculate lease end date based on start date and rent due date
  const calculateLeaseEndDate = (startDate, dueDay) => {
    if (!startDate || !dueDay) return "";

    const start = new Date(startDate);
    const due = parseInt(dueDay);

    // Calculate next month's due date
    const nextDue = new Date(start);
    nextDue.setMonth(nextDue.getMonth() + 1);
    nextDue.setDate(due);

    // If calculated date is before or equal to start date, move to next month
    if (nextDue <= start) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    return nextDue.toISOString().split("T")[0];
  };

  const handleEdit = (tenant) => {
    setFormData({
      tenantUserId: tenant.tenant.id,
      rentAmount: tenant.rentAmount.toString(),
      rentDueDate: tenant.rentDueDate.toString(),
      leaseStartDate: tenant.leaseStartDate
        ? new Date(tenant.leaseStartDate).toISOString().split("T")[0]
        : "",
      leaseEndDate: tenant.leaseEndDate
        ? new Date(tenant.leaseEndDate).toISOString().split("T")[0]
        : "",
      contactPhone: tenant.contactPhone || "",
      contactEmail: tenant.contactEmail || "",
      notes: tenant.notes || "",
      roomType: tenant.roomType || "NON_AC",
      foodIncluded: tenant.foodIncluded || false,
      roomNumber: tenant.roomNumber || "",
      sharing: tenant.sharing || 1,
    });
    setEditingTenantId(tenant.id);
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFlatId) {
      showToast.error("Please select a flat");
      return;
    }

    try {
      setSaving(true);
      if (editingTenantId) {
        // Update existing tenant
        // Auto-calculate lease end date if start date or due date changed
        let finalLeaseEndDate = formData.leaseEndDate;
        if (formData.leaseStartDate && formData.rentDueDate) {
          const calculated = calculateLeaseEndDate(
            formData.leaseStartDate,
            formData.rentDueDate
          );
          if (calculated) {
            finalLeaseEndDate = calculated;
          }
        }

        await api.updateTenant(editingTenantId, {
          ...formData,
          rentAmount: parseFloat(formData.rentAmount),
          rentDueDate: parseInt(formData.rentDueDate),
          leaseEndDate: finalLeaseEndDate || null,
          sharing: parseInt(formData.sharing),
        });
        showToast.success("Tenant details updated successfully");
      } else {
        // Create new tenant
        if (!formData.tenantUserId) {
          showToast.error("Please select a tenant");
          return;
        }
        // Auto-calculate lease end date if not provided
        let finalLeaseEndDate = formData.leaseEndDate;
        if (
          !finalLeaseEndDate &&
          formData.leaseStartDate &&
          formData.rentDueDate
        ) {
          finalLeaseEndDate = calculateLeaseEndDate(
            formData.leaseStartDate,
            formData.rentDueDate
          );
        }

        await api.createTenant({
          flatId: selectedFlatId,
          ...formData,
          rentAmount: parseFloat(formData.rentAmount),
          rentDueDate: parseInt(formData.rentDueDate),
          leaseEndDate: finalLeaseEndDate || null,
          sharing: parseInt(formData.sharing),
        });
        showToast.success("Tenant assigned successfully");
      }
      await loadTenants(selectedFlatId);
      resetForm();
    } catch (err) {
      showToast.error(err.message || "Failed to save tenant details");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTenantUser = async () => {
    if (!selectedFlatId) {
      showToast.error("Select a flat before adding a tenant user");
      return;
    }
    if (!newTenantUser.name.trim() || !newTenantUser.email.trim()) {
      showToast.error("Name and email are required for tenant users");
      return;
    }
    const suppliedPassword = (newTenantUser.password || "").trim();
    if (suppliedPassword.length > 0 && suppliedPassword.length < 6) {
      showToast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setCreatingTenantUser(true);
      const trimmedPhone = (newTenantUser.phone || "").trim();
      const payload = {
        flatId: selectedFlatId,
        name: newTenantUser.name.trim(),
        email: newTenantUser.email.trim(),
        phone: trimmedPhone,
      };
      if (suppliedPassword.length >= 6) {
        payload.password = suppliedPassword;
      }

      const response = await api.createTenantUser(payload);
      const createdUser = response.user;
      setUsers((prev) =>
        [...prev, createdUser].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
      setFormData((prev) => ({
        ...prev,
        tenantUserId: createdUser.id,
        contactEmail: prev.contactEmail || createdUser.email,
        contactPhone: prev.contactPhone || createdUser.phone || "",
      }));
      setTempPasswordInfo(
        response.temporaryPassword
          ? {
              email: createdUser.email,
              password: response.temporaryPassword,
            }
          : null
      );
      setShowNewTenantForm(false);
      setNewTenantUser({ name: "", email: "", phone: "", password: "" });
      showToast.success("Tenant user created. Share credentials with them.");
    } catch (err) {
      showToast.error(err.message || "Failed to create tenant user");
    } finally {
      setCreatingTenantUser(false);
    }
  };

  const handleRemoveTenant = async (tenantId) => {
    if (!window.confirm("Are you sure you want to remove this tenant?")) {
      return;
    }

    try {
      setSaving(true);
      await api.removeTenant(tenantId);
      showToast.success("Tenant removed successfully");
      await loadTenants(selectedFlatId);
    } catch (err) {
      showToast.error(err.message || "Failed to remove tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async (tenantId) => {
    try {
      setSendingReminder(tenantId);
      await api.sendRentReminder(tenantId);
      showToast.success("Rent reminder sent successfully");
      await loadTenants(selectedFlatId);
    } catch (err) {
      showToast.error(err.message || "Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const selectedFlat = ownedFlats.find((f) => f.id === selectedFlatId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (ownedFlats.length === 0) {
    return (
      <div className="space-y-8">
        <ScrollAnimation>
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              Tenant Management
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {isAdmin
                ? "Manage tenants and rent collection for all flats"
                : "Manage tenants and rent collection for your flats"}
            </p>
          </div>
        </ScrollAnimation>
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-lg text-[var(--color-text-secondary)]">
              {isAdmin
                ? "No flats available. Create flats first to assign tenants."
                : "You don't own any flats yet. Contact admin to assign flats to you as owner."}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            Tenant Management
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {isAdmin
              ? "Manage tenants and rent collection for all flats"
              : "Manage tenants and rent collection for your flats"}
          </p>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Flat Selection */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Select Flat
          </h2>
          <div className="space-y-2">
            {ownedFlats.map((flat) => (
              <button
                key={flat.id}
                onClick={() => setSelectedFlatId(flat.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedFlatId === flat.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                }`}
              >
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {flat.buildingName} · {flat.flatNumber}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Block {flat.block || "—"} · Floor {flat.floor ?? "—"}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Tenants List */}
        <Card padding="lg" className="lg:col-span-3">
          {selectedFlat && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {selectedFlat.buildingName} · {selectedFlat.flatNumber}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Block {selectedFlat.block || "—"} · Floor{" "}
                    {selectedFlat.floor ?? "—"}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetForm();
                    setShowAddForm(true);
                  }}
                  size="sm"
                >
                  + Add Tenant
                </Button>
              </div>

              {/* Filters */}
              {tenants.length > 0 && (
                <div className="mb-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
                    Filters
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                        Room Type
                      </label>
                      <select
                        value={filters.roomType}
                        onChange={(e) =>
                          setFilters({ ...filters, roomType: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                      >
                        <option value="ALL">All Types</option>
                        <option value="AC">AC Room</option>
                        <option value="NON_AC">Non-AC Room</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                        Food Option
                      </label>
                      <select
                        value={filters.foodIncluded}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            foodIncluded: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                      >
                        <option value="ALL">All Options</option>
                        <option value="true">With Food</option>
                        <option value="false">Without Food</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Add/Edit Form */}
              {showAddForm && (
                <Card
                  padding="md"
                  className="mb-6 border-2 border-[var(--color-primary)]"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    {editingTenantId ? "Edit Tenant" : "Add New Tenant"}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        Select Tenant
                      </label>
                      <div className="flex flex-col gap-2">
                        <select
                          value={formData.tenantUserId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tenantUserId: e.target.value,
                            })
                          }
                          required={!editingTenantId}
                          disabled={!!editingTenantId}
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] disabled:opacity-50"
                        >
                          <option value="">Select tenant user</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                        {!editingTenantId && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowNewTenantForm((prev) => !prev)
                            }
                            className="self-start text-sm font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {showNewTenantForm
                              ? "Close tenant user form"
                              : "Can't find tenant? Add new tenant user"}
                          </button>
                        )}
                      </div>
                      {tempPasswordInfo && (
                        <div className="mt-3 p-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Share this temporary password with{" "}
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {tempPasswordInfo.email}
                            </span>
                          </p>
                          <p className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
                            {tempPasswordInfo.password}
                          </p>
                        </div>
                      )}
                    </div>

                    {showNewTenantForm && !editingTenantId && (
                      <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                            New Tenant User
                          </h4>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            Details for login access
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={newTenantUser.name}
                              onChange={(e) =>
                                setNewTenantUser({
                                  ...newTenantUser,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Tenant name"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={newTenantUser.email}
                              onChange={(e) =>
                                setNewTenantUser({
                                  ...newTenantUser,
                                  email: e.target.value,
                                })
                              }
                              placeholder="tenant@email.com"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                              Phone (optional)
                            </label>
                            <input
                              type="tel"
                              value={newTenantUser.phone}
                              onChange={(e) =>
                                setNewTenantUser({
                                  ...newTenantUser,
                                  phone: e.target.value,
                                })
                              }
                              placeholder="+91 9876543210"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                              Password (optional)
                            </label>
                            <input
                              type="text"
                              value={newTenantUser.password}
                              onChange={(e) =>
                                setNewTenantUser({
                                  ...newTenantUser,
                                  password: e.target.value,
                                })
                              }
                              placeholder="Leave blank to auto-generate"
                              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Password must be at least 6 characters. Leave blank to
                          auto-generate a secure password.
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          <Button
                            type="button"
                            onClick={handleCreateTenantUser}
                            loading={creatingTenantUser}
                          >
                            Save Tenant User
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowNewTenantForm(false)}
                            disabled={creatingTenantUser}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Room Number{" "}
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            (Optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={formData.roomNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roomNumber: e.target.value,
                            })
                          }
                          placeholder="e.g., Room 1, A-101"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Sharing
                        </label>
                        <select
                          value={formData.sharing}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sharing: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        >
                          <option value="1">1 Sharing</option>
                          <option value="2">2 Sharing</option>
                          <option value="3">3 Sharing</option>
                          <option value="4">4 Sharing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Room Type
                        </label>
                        <select
                          value={formData.roomType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              roomType: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        >
                          <option value="AC">AC Room</option>
                          <option value="NON_AC">Non-AC Room</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Food Included
                        </label>
                        <select
                          value={formData.foodIncluded ? "true" : "false"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              foodIncluded: e.target.value === "true",
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        >
                          <option value="false">Without Food</option>
                          <option value="true">With Food</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Rent Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.rentAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rentAmount: e.target.value,
                            })
                          }
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Rent Due Date (Day of Month)
                        </label>
                        <select
                          value={formData.rentDueDate}
                          onChange={(e) => {
                            const newDueDate = e.target.value;
                            const calculatedEndDate = calculateLeaseEndDate(
                              formData.leaseStartDate,
                              newDueDate
                            );
                            setFormData({
                              ...formData,
                              rentDueDate: newDueDate,
                              leaseEndDate:
                                calculatedEndDate || formData.leaseEndDate,
                            });
                          }}
                          required
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (day) => (
                              <option key={day} value={day}>
                                {day}
                                {day === 1
                                  ? "st"
                                  : day === 2
                                  ? "nd"
                                  : day === 3
                                  ? "rd"
                                  : "th"}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Lease Start Date
                        </label>
                        <input
                          type="date"
                          value={formData.leaseStartDate}
                          onChange={(e) => {
                            const newStartDate = e.target.value;
                            const calculatedEndDate = calculateLeaseEndDate(
                              newStartDate,
                              formData.rentDueDate
                            );
                            setFormData({
                              ...formData,
                              leaseStartDate: newStartDate,
                              leaseEndDate:
                                calculatedEndDate || formData.leaseEndDate,
                            });
                          }}
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Lease End Date{" "}
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            (Auto-calculated)
                          </span>
                        </label>
                        <input
                          type="date"
                          value={formData.leaseEndDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leaseEndDate: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Auto-calculated as next month's due date
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.contactPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contactPhone: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contactEmail: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" loading={saving}>
                        {editingTenantId ? "Update Tenant" : "Add Tenant"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Tenants List */}
              {filteredTenants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-[var(--color-text-secondary)]">
                    {tenants.length === 0
                      ? "No tenants assigned yet. Click 'Add Tenant' to assign one."
                      : "No tenants match the selected filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTenants.map((tenant) => (
                    <Card
                      key={tenant.id}
                      padding="md"
                      className="border border-[var(--color-border)]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                              {tenant.tenant.name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                tenant.roomType === "AC"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {tenant.roomType === "AC" ? "AC" : "Non-AC"}
                            </span>
                            {tenant.foodIncluded && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                With Food
                              </span>
                            )}
                            {tenant.roomNumber && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                {tenant.roomNumber}
                              </span>
                            )}
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                              {tenant.sharing || 1} Sharing
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--color-text-secondary)]">
                                Email
                              </p>
                              <p className="font-medium text-[var(--color-text-primary)]">
                                {tenant.tenant.email}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)]">
                                Phone
                              </p>
                              <p className="font-medium text-[var(--color-text-primary)]">
                                {tenant.contactPhone ||
                                  tenant.tenant.phone ||
                                  "Not provided"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)]">
                                Rent Amount
                              </p>
                              <p className="font-medium text-[var(--color-text-primary)] text-lg">
                                ₹{tenant.rentAmount.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)]">
                                Due Date
                              </p>
                              <p className="font-medium text-[var(--color-text-primary)]">
                                {tenant.rentDueDate}
                                {tenant.rentDueDate === 1
                                  ? "st"
                                  : tenant.rentDueDate === 2
                                  ? "nd"
                                  : tenant.rentDueDate === 3
                                  ? "rd"
                                  : "th"}{" "}
                                of month
                              </p>
                            </div>
                          </div>
                          {tenant.notes && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                              <p className="text-sm text-[var(--color-text-secondary)]">
                                Notes: {tenant.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(tenant)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendReminder(tenant.id)}
                            loading={sendingReminder === tenant.id}
                          >
                            Remind
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveTenant(tenant.id)}
                            loading={saving}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default TenantManagement;
