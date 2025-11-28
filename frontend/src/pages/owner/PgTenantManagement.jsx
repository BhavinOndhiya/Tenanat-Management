import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ScrollAnimation } from "../../components/ScrollAnimation";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const SHARING_OPTIONS = [
  { value: "1", label: "1 Bed" },
  { value: "2", label: "2 Bed" },
  { value: "3", label: "3 Bed" },
  { value: "4", label: "4 Bed" },
];

const AC_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];

const FOOD_OPTIONS = [
  { value: "WITH_FOOD", label: "With Food" },
  { value: "WITHOUT_FOOD", label: "Without Food" },
];

const defaultFormData = {
  name: "",
  email: "",
  phone: "",
  propertyId: "",
  roomNumber: "",
  bedNumber: "",
  // First payment (variable charges)
  firstMonthAmount: "",
  securityDeposit: "",
  joiningFee: "",
  otherCharges: [], // Array of {description: "", amount: ""}
  // Fixed monthly rent (for subsequent months)
  monthlyRent: "",
  moveInDate: "",
  servicesIncluded: [],
  status: "ACTIVE",
  sharingType: SHARING_OPTIONS[0].value,
  acPreference: AC_OPTIONS[0].value,
  foodPreference: FOOD_OPTIONS[0].value,
  password: "",
};

export default function PgTenantManagement() {
  const formatFacilityLabel = (value = "") =>
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [properties, setProperties] = useState([]);
  const [availableFacilities, setAvailableFacilities] = useState([]);
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null);
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === formData.propertyId),
    [properties, formData.propertyId]
  );
  const acOptionsForProperty = useMemo(() => {
    if (!selectedProperty) {
      return AC_OPTIONS;
    }
    const facilities = selectedProperty.facilitiesAvailable || [];
    const options = [];
    if (facilities.includes("AC")) {
      options.push(AC_OPTIONS.find((opt) => opt.value === "AC"));
    }
    if (facilities.includes("NON_AC")) {
      options.push(AC_OPTIONS.find((opt) => opt.value === "NON_AC"));
    }
    if (!options.length) {
      options.push(AC_OPTIONS.find((opt) => opt.value === "NON_AC"));
    }
    return options.filter(Boolean);
  }, [selectedProperty]);
  const foodOptionsForProperty = useMemo(() => {
    if (!selectedProperty) {
      return FOOD_OPTIONS;
    }
    const facilities = selectedProperty.facilitiesAvailable || [];
    const options = [];
    if (facilities.includes("FOOD")) {
      options.push(FOOD_OPTIONS.find((opt) => opt.value === "WITH_FOOD"));
    }
    options.push(FOOD_OPTIONS.find((opt) => opt.value === "WITHOUT_FOOD"));
    return options.filter(Boolean);
  }, [selectedProperty]);

  const [deleteDialog, setDeleteDialog] = useState({
    tenant: null,
    loading: false,
  });

  const loadTenants = async () => {
    try {
      setLoading(true);
      const [tenantResponse, props] = await Promise.all([
        api.getPgTenants(),
        api.getOwnerPgProperties(),
      ]);
      setTenants(tenantResponse.items || []);
      setProperties(props || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load PG tenants");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...defaultFormData, servicesIncluded: [] });
    setEditingTenantId(null);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (properties.length > 0 && !editingTenantId && !formData.propertyId) {
      setFormData((prev) => ({
        ...prev,
        propertyId: properties[0].id,
      }));
    }
  }, [properties, editingTenantId, formData.propertyId]);

  useEffect(() => {
    if (!selectedProperty) {
      setAvailableFacilities([]);
      return;
    }
    const facilities = selectedProperty.facilitiesAvailable || [];
    setAvailableFacilities(facilities);
    setFormData((prev) => {
      const filtered = prev.servicesIncluded.filter((svc) =>
        facilities.includes(svc)
      );
      return filtered.length === prev.servicesIncluded.length
        ? prev
        : { ...prev, servicesIncluded: filtered };
    });
  }, [selectedProperty]);

  useEffect(() => {
    if (
      acOptionsForProperty.length &&
      !acOptionsForProperty.some((opt) => opt.value === formData.acPreference)
    ) {
      setFormData((prev) => ({
        ...prev,
        acPreference: acOptionsForProperty[0].value,
      }));
    }
  }, [acOptionsForProperty, formData.acPreference]);

  useEffect(() => {
    if (
      foodOptionsForProperty.length &&
      !foodOptionsForProperty.some(
        (opt) => opt.value === formData.foodPreference
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        foodPreference: foodOptionsForProperty[0].value,
      }));
    }
  }, [foodOptionsForProperty, formData.foodPreference]);

  useEffect(() => {
    if (!formData.propertyId) {
      setAvailableFacilities([]);
      return;
    }
    const property = properties.find((prop) => prop.id === formData.propertyId);
    const facilities = property?.facilitiesAvailable || [];
    setAvailableFacilities(facilities);
    setFormData((prev) => {
      const filtered = prev.servicesIncluded.filter((svc) =>
        facilities.includes(svc)
      );
      if (filtered.length === prev.servicesIncluded.length) {
        return prev;
      }
      return { ...prev, servicesIncluded: filtered };
    });
  }, [formData.propertyId, properties]);

  const isEditing = !!editingTenantId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      (!formData.propertyId && !isEditing)
    ) {
      showToast.error("Name, email, and property are required");
      return;
    }
    if (!isEditing) {
      if (
        !formData.firstMonthAmount ||
        Number(formData.firstMonthAmount) <= 0
      ) {
        showToast.error(
          "First month amount is required and must be greater than 0"
        );
        return;
      }
      if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) {
        showToast.error(
          "Fixed monthly rent is required and must be greater than 0"
        );
        return;
      }
      if (!formData.moveInDate) {
        showToast.error("Move-in date is required");
        return;
      }
      if (
        formData.password &&
        formData.password.length > 0 &&
        formData.password.length < 6
      ) {
        showToast.error("Password must be at least 6 characters");
        return;
      }
    }
    try {
      setSubmitting(true);
      if (isEditing) {
        await api.updatePgTenant(editingTenantId, {
          name: formData.name,
          email: formData.email,
          propertyId: formData.propertyId,
          roomNumber: formData.roomNumber,
          bedNumber: formData.bedNumber,
          phone: formData.phone,
          monthlyRent: formData.monthlyRent,
          moveInDate: formData.moveInDate,
          servicesIncluded: formData.servicesIncluded,
          status: formData.status,
          sharingType: formData.sharingType,
          acPreference: formData.acPreference,
          foodPreference: formData.foodPreference,
        });
        showToast.success("PG tenant updated");
        setTempPasswordInfo(null);
      } else {
        const response = await api.createPgTenant(formData);
        showToast.success("PG tenant created");
        if (response.temporaryPassword) {
          setTempPasswordInfo({
            email: response.tenant?.email,
            password: response.temporaryPassword,
          });
        } else {
          setTempPasswordInfo(null);
        }
      }
      setShowForm(false);
      resetForm();
      await loadTenants();
    } catch (error) {
      showToast.error(
        error.message ||
          (isEditing ? "Failed to update tenant" : "Failed to create PG tenant")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTenant = (tenant) => {
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || "",
      propertyId: tenant.property?.id || "",
      roomNumber: tenant.roomNumber || "",
      bedNumber: tenant.bedNumber || "",
      monthlyRent:
        typeof tenant.monthlyRent === "number" && tenant.monthlyRent > 0
          ? tenant.monthlyRent.toString()
          : "",
      moveInDate: tenant.moveInDate
        ? new Date(tenant.moveInDate).toISOString().split("T")[0]
        : "",
      firstMonthAmount: tenant.firstMonthAmount
        ? tenant.firstMonthAmount.toString()
        : "",
      securityDeposit: tenant.securityDeposit
        ? tenant.securityDeposit.toString()
        : "",
      joiningFee: tenant.joiningFee ? tenant.joiningFee.toString() : "",
      otherCharges: tenant.otherCharges || [],
      servicesIncluded: tenant.servicesIncluded || [],
      status: tenant.status || "ACTIVE",
      sharingType: tenant.sharingType || SHARING_OPTIONS[0].value,
      acPreference: tenant.acPreference || AC_OPTIONS[0].value,
      foodPreference: tenant.foodPreference || FOOD_OPTIONS[0].value,
      password: "",
    });
    setEditingTenantId(tenant.id);
    setTempPasswordInfo(null);
    setShowForm(true);
  };

  const toggleService = (value) => {
    setFormData((prev) => {
      const exists = prev.servicesIncluded.includes(value);
      const updated = exists
        ? prev.servicesIncluded.filter((svc) => svc !== value)
        : [...prev.servicesIncluded, value];
      return { ...prev, servicesIncluded: updated };
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
    setTempPasswordInfo(null);
  };

  const promptDeleteTenant = (tenant) => {
    setDeleteDialog({ tenant, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.tenant) return;
    try {
      setDeleteDialog((prev) => ({ ...prev, loading: true }));
      await api.deletePgTenant(deleteDialog.tenant.id);
      showToast.success("Tenant deleted successfully");
      setDeleteDialog({ tenant: null, loading: false });
      await loadTenants();
    } catch (error) {
      showToast.error(error.message || "Failed to delete tenant");
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ tenant: null, loading: false });
  };

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              PG Tenant Management
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Add and track PG tenants across your properties.
            </p>
          </div>
          <Button
            onClick={() => {
              if (showForm) {
                handleCloseForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Close Form" : isEditing ? "Close Edit" : "Add Tenant"}
          </Button>
        </div>
      </ScrollAnimation>

      {showForm && (
        <Card
          padding="lg"
          className="space-y-4 border-2 border-[var(--color-primary)]"
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {isEditing ? "Edit PG Tenant" : "Create PG Tenant"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Full Name
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Property
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) =>
                  setFormData({ ...formData, propertyId: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {(
                      property.name ||
                      property.buildingName ||
                      "Property"
                    ).trim()}{" "}
                    · {property.address?.city || property.address?.state || ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) =>
                  setFormData({ ...formData, roomNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Bed Number
              </label>
              <input
                type="text"
                value={formData.bedNumber}
                onChange={(e) =>
                  setFormData({ ...formData, bedNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Sharing Type
              </label>
              <select
                value={formData.sharingType}
                onChange={(e) =>
                  setFormData({ ...formData, sharingType: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                {SHARING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                AC Preference
              </label>
              <select
                value={formData.acPreference}
                onChange={(e) =>
                  setFormData({ ...formData, acPreference: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                {acOptionsForProperty.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Food Preference
              </label>
              <select
                value={formData.foodPreference}
                onChange={(e) =>
                  setFormData({ ...formData, foodPreference: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                {foodOptionsForProperty.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {/* First Payment Section */}
            {!isEditing && (
              <>
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 border-b border-[var(--color-border)] pb-2">
                    First Payment (Variable Charges)
                  </h3>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                    First Month Amount (₹){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.firstMonthAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstMonthAmount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                    required
                    placeholder="Enter first month rent amount"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Variable amount for the first month
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.securityDeposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        securityDeposit: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                    Joining Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.joiningFee}
                    onChange={(e) =>
                      setFormData({ ...formData, joiningFee: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                    placeholder="Optional"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                    Other Charges (Optional)
                  </label>
                  <div className="space-y-2">
                    {formData.otherCharges.map((charge, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={charge.description}
                          onChange={(e) => {
                            const updated = [...formData.otherCharges];
                            updated[index].description = e.target.value;
                            setFormData({ ...formData, otherCharges: updated });
                          }}
                          className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                          placeholder="Charge description"
                        />
                        <input
                          type="number"
                          min="0"
                          value={charge.amount}
                          onChange={(e) => {
                            const updated = [...formData.otherCharges];
                            updated[index].amount = e.target.value;
                            setFormData({ ...formData, otherCharges: updated });
                          }}
                          className="w-32 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                          placeholder="Amount"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            const updated = formData.otherCharges.filter(
                              (_, i) => i !== index
                            );
                            setFormData({ ...formData, otherCharges: updated });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          otherCharges: [
                            ...formData.otherCharges,
                            { description: "", amount: "" },
                          ],
                        });
                      }}
                    >
                      + Add Other Charge
                    </Button>
                  </div>
                </div>
              </>
            )}
            {/* Fixed Monthly Rent Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 border-b border-[var(--color-border)] pb-2">
                {isEditing
                  ? "Rent Information"
                  : "Fixed Monthly Rent (From Month 2)"}
              </h3>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Fixed Monthly Rent (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthlyRent}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyRent: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required={!isEditing}
                placeholder="Fixed amount for subsequent months"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {isEditing
                  ? "Fixed monthly rent amount"
                  : "This amount will be charged from the second month onwards"}
              </p>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Move-In Date{" "}
                {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                value={formData.moveInDate}
                onChange={(e) =>
                  setFormData({ ...formData, moveInDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                required={!isEditing}
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {isEditing
                  ? "Updating move-in date will create first payment if missing"
                  : "First payment will be created for this month"}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Services Included
              </label>
              {availableFacilities.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {selectedProperty
                    ? "No facilities are configured for this property yet."
                    : "Select a property to choose available services."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-dashed border-[var(--color-border)] rounded-lg p-3">
                  {availableFacilities.map((facility) => (
                    <label
                      key={facility}
                      className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.servicesIncluded.includes(facility)}
                        onChange={() => toggleService(facility)}
                      />
                      <span>{formatFacilityLabel(facility)}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Only facilities configured for the selected property can be
                assigned.
              </p>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            {!isEditing && (
              <div className="md:col-span-2">
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Minimum 6 characters. Leave blank to generate a secure
                  password.
                </p>
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" loading={submitting}>
                {isEditing ? "Update Tenant" : "Save Tenant"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseForm}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tempPasswordInfo && (
        <Card
          padding="md"
          className="border border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)]/20"
        >
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            Share this temporary password with{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {tempPasswordInfo.email}
            </span>
          </p>
          <p className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
            {tempPasswordInfo.password}
          </p>
        </Card>
      )}

      <Card padding="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : tenants.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            No PG tenants found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Room/Bed</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Rent</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Open Complaints</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-[var(--color-border)]"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {tenant.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {tenant.email}
                      </p>
                      {tenant.phone && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {tenant.phone}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {tenant.property?.name || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {tenant.roomNumber || "—"} / {tenant.bedNumber || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {tenant.sharingType || "—"}-bed ·{" "}
                      {tenant.acPreference === "NON_AC" ? "Non-AC" : "AC"} ·{" "}
                      {tenant.foodPreference === "WITHOUT_FOOD"
                        ? "No food"
                        : "With food"}
                    </td>
                    <td className="py-3 px-4">
                      ₹{Number(tenant.monthlyRent || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      {(tenant.servicesIncluded || []).length
                        ? tenant.servicesIncluded
                            .map((service) => formatFacilityLabel(service))
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tenant.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {tenant.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 px-4">{tenant.openComplaints}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditTenant(tenant)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => promptDeleteTenant(tenant)}
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
      {deleteDialog.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md space-y-4 bg-[var(--color-bg-primary)]">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Delete Tenant
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                {deleteDialog.tenant.name || "this tenant"}
              </span>
              ? This action cannot be undone and will remove their access.
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={handleCancelDelete}
                disabled={deleteDialog.loading}
              >
                No, Keep Tenant
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleteDialog.loading}
              >
                {deleteDialog.loading ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
