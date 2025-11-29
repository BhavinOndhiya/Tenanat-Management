import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ScrollAnimation } from "../../components/ScrollAnimation";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { FACILITY_OPTIONS, GENDER_OPTIONS } from "../../constants/facilities";

const defaultFormData = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  totalRooms: "",
  totalBeds: "",
  genderType: "COED",
  facilitiesAvailable: [],
  baseRentPerBed: "",
  notes: "",
  // PG onboarding fields
  defaultRent: "",
  defaultDeposit: "",
  dueDate: "1",
  lastPenaltyFreeDate: "5",
  lateFeePerDay: "50",
  noticePeriodMonths: "1",
  lockInMonths: "0",
  houseRules: "",
};

export default function PgProperties() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const items = await api.getOwnerPgProperties();
      setProperties(items || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load PG properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const toggleFacility = (facility) => {
    setFormData((prev) => {
      const exists = prev.facilitiesAvailable.includes(facility);
      const updated = exists
        ? prev.facilitiesAvailable.filter((item) => item !== facility)
        : [...prev.facilitiesAvailable, facility];
      return { ...prev, facilitiesAvailable: updated };
    });
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name || "",
      addressLine1: property.address?.line1 || "",
      addressLine2: property.address?.line2 || "",
      city: property.address?.city || "",
      state: property.address?.state || "",
      pincode: property.address?.zipCode || "",
      landmark: property.landmark || "",
      totalRooms: property.totalRooms || "",
      totalBeds: property.totalBeds || "",
      genderType: property.genderType || "COED",
      facilitiesAvailable: property.facilitiesAvailable || [],
      baseRentPerBed: property.baseRentPerBed || "",
      notes: property.notes || "",
      // PG onboarding fields
      defaultRent: property.defaultRent || "",
      defaultDeposit: property.defaultDeposit || "",
      dueDate: property.dueDate?.toString() || "1",
      lastPenaltyFreeDate: property.lastPenaltyFreeDate?.toString() || "5",
      lateFeePerDay: property.lateFeePerDay?.toString() || "50",
      noticePeriodMonths: property.noticePeriodMonths?.toString() || "1",
      lockInMonths: property.lockInMonths?.toString() || "0",
      houseRules: property.houseRules || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this property? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteOwnerPgProperty(id);
      showToast.success("Property deleted successfully");
      await loadProperties();
    } catch (error) {
      showToast.error(error.message || "Failed to delete property");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.addressLine1 || !formData.city) {
      showToast.error("Name, address, city, state, and pincode are required");
      return;
    }
    if (!formData.state || !formData.pincode) {
      showToast.error("Name, address, city, state, and pincode are required");
      return;
    }
    if (!formData.facilitiesAvailable.length) {
      showToast.error("Select at least one facility");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        baseRentPerBed: formData.baseRentPerBed
          ? Number(formData.baseRentPerBed)
          : 0,
        totalRooms: formData.totalRooms
          ? Number(formData.totalRooms)
          : undefined,
        totalBeds: formData.totalBeds ? Number(formData.totalBeds) : undefined,
        // PG onboarding fields
        defaultRent: formData.defaultRent
          ? Number(formData.defaultRent)
          : undefined,
        defaultDeposit: formData.defaultDeposit
          ? Number(formData.defaultDeposit)
          : undefined,
        dueDate: formData.dueDate ? Number(formData.dueDate) : 1,
        lastPenaltyFreeDate: formData.lastPenaltyFreeDate
          ? Number(formData.lastPenaltyFreeDate)
          : 5,
        lateFeePerDay: formData.lateFeePerDay
          ? Number(formData.lateFeePerDay)
          : 50,
        noticePeriodMonths: formData.noticePeriodMonths
          ? Number(formData.noticePeriodMonths)
          : 1,
        lockInMonths: formData.lockInMonths ? Number(formData.lockInMonths) : 0,
        houseRules: formData.houseRules || "",
      };
      if (editingProperty) {
        await api.updateOwnerPgProperty(editingProperty.id, payload);
        showToast.success("PG property updated");
      } else {
        await api.createOwnerPgProperty(payload);
        showToast.success("PG property created");
      }
      setShowForm(false);
      setEditingProperty(null);
      setFormData(defaultFormData);
      await loadProperties();
    } catch (error) {
      showToast.error(
        error.message ||
          `Failed to ${editingProperty ? "update" : "create"} PG property`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const facilityBadge = (facility) => (
    <span
      key={facility}
      className="px-2 py-1 text-xs rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
    >
      {facility}
    </span>
  );

  const sortedProperties = useMemo(
    () =>
      properties
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [properties]
  );

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              PG Properties
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Define facilities for each PG and manage availability.
            </p>
          </div>
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingProperty(null);
                setFormData(defaultFormData);
              } else {
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Close Form" : "Add PG Property"}
          </Button>
        </div>
      </ScrollAnimation>

      {showForm && (
        <Card
          padding="lg"
          className="space-y-4 border-2 border-[var(--color-primary)]"
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {editingProperty ? "Edit PG Property" : "Create PG Property"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Property Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Landmark (optional)
              </label>
              <input
                type="text"
                value={formData.landmark}
                onChange={(e) =>
                  setFormData({ ...formData, landmark: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine2: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Gender Type
              </label>
              <select
                value={formData.genderType}
                onChange={(e) =>
                  setFormData({ ...formData, genderType: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Total Rooms
              </label>
              <input
                type="number"
                min="0"
                value={formData.totalRooms}
                onChange={(e) =>
                  setFormData({ ...formData, totalRooms: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Total Beds
              </label>
              <input
                type="number"
                min="0"
                value={formData.totalBeds}
                onChange={(e) =>
                  setFormData({ ...formData, totalBeds: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Facilities Available
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-dashed border-[var(--color-border)] rounded-lg p-3">
                {FACILITY_OPTIONS.map((facility) => (
                  <label
                    key={facility}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
                  >
                    <input
                      type="checkbox"
                      checked={formData.facilitiesAvailable.includes(facility)}
                      onChange={() => toggleFacility(facility)}
                    />
                    <span>{facility}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Base Rent Per Bed (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.baseRentPerBed}
                onChange={(e) =>
                  setFormData({ ...formData, baseRentPerBed: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] min-h-[80px]"
              />
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 mt-4">
                PG Agreement & Billing Settings
              </h3>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Default Rent (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultRent}
                onChange={(e) =>
                  setFormData({ ...formData, defaultRent: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                placeholder="Default monthly rent"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Default Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultDeposit}
                onChange={(e) =>
                  setFormData({ ...formData, defaultDeposit: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                placeholder="Security deposit"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Payment Due Date (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Last Penalty-Free Date (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.lastPenaltyFreeDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastPenaltyFreeDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Late Fee Per Day (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.lateFeePerDay}
                onChange={(e) =>
                  setFormData({ ...formData, lateFeePerDay: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Notice Period (Months)
              </label>
              <input
                type="number"
                min="0"
                value={formData.noticePeriodMonths}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    noticePeriodMonths: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Lock-In Period (Months)
              </label>
              <input
                type="number"
                min="0"
                value={formData.lockInMonths}
                onChange={(e) =>
                  setFormData({ ...formData, lockInMonths: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                House Rules
              </label>
              <textarea
                value={formData.houseRules}
                onChange={(e) =>
                  setFormData({ ...formData, houseRules: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] min-h-[100px]"
                placeholder="Enter house rules and policies for tenants..."
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" loading={submitting}>
                Save Property
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingProperty(null);
                  setFormData(defaultFormData);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : sortedProperties.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            No PG properties added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Base Rent</th>
                  <th className="py-3 px-4">Facilities</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProperties.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-[var(--color-border)]"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {property.name || property.buildingName}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {property.address?.city || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {property.genderType || "COED"}
                    </td>
                    <td className="py-3 px-4">
                      ₹
                      {Number(property.baseRentPerBed || 0).toLocaleString(
                        "en-IN"
                      )}
                    </td>
                    <td className="py-3 px-4 space-x-1">
                      {property.facilitiesAvailable.length === 0
                        ? "—"
                        : property.facilitiesAvailable
                            .slice(0, 4)
                            .map((facility) => facilityBadge(facility))}
                      {property.facilitiesAvailable.length > 4 && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          +{property.facilitiesAvailable.length - 4} more
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(property)}
                          className="px-3 py-1 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
                          disabled={deletingId === property.id}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          {deletingId === property.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
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
