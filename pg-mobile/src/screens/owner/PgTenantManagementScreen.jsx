import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { FACILITY_OPTIONS } from "../../constants/facilities";

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
  firstMonthAmount: "",
  securityDeposit: "",
  joiningFee: "",
  otherCharges: [],
  monthlyRent: "",
  moveInDate: "",
  servicesIncluded: [],
  status: "ACTIVE",
  sharingType: SHARING_OPTIONS[0].value,
  acPreference: AC_OPTIONS[0].value,
  foodPreference: FOOD_OPTIONS[0].value,
  password: "",
};

export default function PgTenantManagementScreen() {
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
  const [addMode, setAddMode] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [loadingAvailableTenants, setLoadingAvailableTenants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    tenant: null,
    loading: false,
  });
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTenants();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({ ...defaultFormData, servicesIncluded: [] });
    setEditingTenantId(null);
  };

  const isEditing = !!editingTenantId;

  const handleSubmit = async () => {
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
        if (selectedTenantId) {
          showToast.success("Existing tenant assigned successfully!");
        } else {
          showToast.success("Tenant invited. Password setup email sent.");
        }
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
      setAddMode(null);
      setSelectedTenantId(null);
      setSearchQuery("");
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
    setAddMode(null);
    setSelectedTenantId(null);
    setSearchQuery("");
  };

  const loadAvailableTenants = async () => {
    try {
      setLoadingAvailableTenants(true);
      const response = await api.getAvailablePgTenants();
      setAvailableTenants(response.tenants || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load available tenants");
    } finally {
      setLoadingAvailableTenants(false);
    }
  };

  const handleAddModeSelect = (mode) => {
    setAddMode(mode);
    if (mode === "existing") {
      loadAvailableTenants();
    }
  };

  const handleSelectExistingTenant = (tenant) => {
    setSelectedTenantId(tenant.id);
    setFormData({
      ...defaultFormData,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || "",
      propertyId: formData.propertyId || properties[0]?.id || "",
      servicesIncluded: [],
    });
  };

  const filteredAvailableTenants = availableTenants.filter((tenant) => {
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.email.toLowerCase().includes(query) ||
      (tenant.phone && tenant.phone.includes(query))
    );
  });

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

  const addOtherCharge = () => {
    setFormData({
      ...formData,
      otherCharges: [...formData.otherCharges, { description: "", amount: "" }],
    });
  };

  const removeOtherCharge = (index) => {
    const updated = formData.otherCharges.filter((_, i) => i !== index);
    setFormData({ ...formData, otherCharges: updated });
  };

  const updateOtherCharge = (index, field, value) => {
    const updated = [...formData.otherCharges];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, otherCharges: updated });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PG Tenant Management</Text>
            <Text style={styles.subtitle}>
              Add and track PG tenants across your properties.
            </Text>
          </View>
          <Button
            onPress={() => {
              if (showForm) {
                handleCloseForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Close" : isEditing ? "Close Edit" : "Add Tenant"}
          </Button>
        </View>

        {showForm && !isEditing && !addMode && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Add Tenant</Text>
            <Text style={styles.cardSubtitle}>
              Choose how you want to add a tenant:
            </Text>
            <View style={styles.addModeGrid}>
              <TouchableOpacity
                style={styles.addModeCard}
                onPress={() => handleAddModeSelect("new")}
              >
                <View style={styles.addModeIcon}>
                  <Text style={styles.addModeIconText}>➕</Text>
                </View>
                <Text style={styles.addModeTitle}>Add New Tenant</Text>
                <Text style={styles.addModeDescription}>
                  Create a new tenant account with email and password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModeCard}
                onPress={() => handleAddModeSelect("existing")}
              >
                <View style={[styles.addModeIcon, styles.addModeIconGreen]}>
                  <Text style={styles.addModeIconText}>👥</Text>
                </View>
                <Text style={styles.addModeTitle}>Assign Existing Tenant</Text>
                <Text style={styles.addModeDescription}>
                  Assign a tenant who already has an account
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {showForm && !isEditing && addMode === "existing" && (
          <Card style={[styles.card, styles.cardHighlight]} padding="md">
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Assign Existing Tenant</Text>
                <Text style={styles.cardSubtitle}>
                  Select a tenant from the list below
                </Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setAddMode(null)}
              >
                Back
              </Button>
            </View>

            {loadingAvailableTenants ? (
              <Loader />
            ) : (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {filteredAvailableTenants.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "No tenants found matching your search"
                      : "No available tenants found"}
                  </Text>
                ) : (
                  <ScrollView style={styles.tenantsList} nestedScrollEnabled>
                    {filteredAvailableTenants.map((tenant) => (
                      <TouchableOpacity
                        key={tenant.id}
                        style={[
                          styles.tenantSelectCard,
                          selectedTenantId === tenant.id &&
                            styles.tenantSelectCardSelected,
                        ]}
                        onPress={() => handleSelectExistingTenant(tenant)}
                      >
                        <View style={styles.tenantSelectInfo}>
                          <Text style={styles.tenantSelectName}>
                            {tenant.name}
                          </Text>
                          <Text style={styles.tenantSelectEmail}>
                            {tenant.email}
                          </Text>
                          {tenant.phone && (
                            <Text style={styles.tenantSelectPhone}>
                              {tenant.phone}
                            </Text>
                          )}
                          {tenant.assignedProperty && (
                            <Text style={styles.tenantSelectWarning}>
                              Currently assigned to another property
                            </Text>
                          )}
                        </View>
                        {selectedTenantId === tenant.id && (
                          <View style={styles.checkIcon}>
                            <Text style={styles.checkIconText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {selectedTenantId && (
                  <View style={styles.continueSection}>
                    <Button
                      fullWidth
                      onPress={() => {
                        const selectedTenant = availableTenants.find(
                          (t) => t.id === selectedTenantId
                        );
                        if (selectedTenant) {
                          setAddMode("new");
                          setFormData({
                            ...defaultFormData,
                            name: selectedTenant.name,
                            email: selectedTenant.email,
                            phone: selectedTenant.phone || "",
                            propertyId:
                              formData.propertyId || properties[0]?.id || "",
                            servicesIncluded: [],
                          });
                        }
                      }}
                    >
                      Continue with Selected Tenant
                    </Button>
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {showForm && (isEditing || addMode === "new") && (
          <Card style={[styles.card, styles.cardHighlight]} padding="md">
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isEditing ? "Edit PG Tenant" : "Create PG Tenant"}
              </Text>
              {!isEditing && addMode === "new" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setAddMode(null)}
                >
                  Back
                </Button>
              )}
            </View>
            <ScrollView style={styles.formScroll} nestedScrollEnabled>
              <View style={styles.form}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>
                      Email *
                      {selectedTenantId && (
                        <Text style={styles.hint}>
                          {" "}
                          (Existing tenant - cannot be changed)
                        </Text>
                      )}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        selectedTenantId && styles.inputDisabled,
                      ]}
                      value={formData.email}
                      onChangeText={(text) =>
                        setFormData({ ...formData, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!selectedTenantId}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) =>
                        setFormData({ ...formData, phone: text })
                      }
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Property *</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.propertyId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, propertyId: value })
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="Select property" value="" />
                        {properties.map((property) => (
                          <Picker.Item
                            key={property.id}
                            label={`${
                              property.name ||
                              property.buildingName ||
                              "Property"
                            } · ${property.address?.city || ""}`}
                            value={property.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Room Number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.roomNumber}
                      onChangeText={(text) =>
                        setFormData({ ...formData, roomNumber: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Bed Number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.bedNumber}
                      onChangeText={(text) =>
                        setFormData({ ...formData, bedNumber: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Sharing Type</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.sharingType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sharingType: value })
                        }
                        style={styles.picker}
                      >
                        {SHARING_OPTIONS.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>AC Preference</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.acPreference}
                        onValueChange={(value) =>
                          setFormData({ ...formData, acPreference: value })
                        }
                        style={styles.picker}
                      >
                        {acOptionsForProperty.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Food Preference</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.foodPreference}
                      onValueChange={(value) =>
                        setFormData({ ...formData, foodPreference: value })
                      }
                      style={styles.picker}
                    >
                      {foodOptionsForProperty.map((option) => (
                        <Picker.Item
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {!isEditing && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        First Payment (Variable Charges)
                      </Text>
                    </View>
                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>
                          First Month Amount (₹) *
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={formData.firstMonthAmount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, firstMonthAmount: text })
                          }
                          keyboardType="numeric"
                          placeholder="Enter first month rent amount"
                        />
                        <Text style={styles.hint}>
                          Variable amount for the first month
                        </Text>
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Security Deposit (₹)</Text>
                        <TextInput
                          style={styles.input}
                          value={formData.securityDeposit}
                          onChangeText={(text) =>
                            setFormData({ ...formData, securityDeposit: text })
                          }
                          keyboardType="numeric"
                          placeholder="Optional"
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Joining Fee (₹)</Text>
                        <TextInput
                          style={styles.input}
                          value={formData.joiningFee}
                          onChangeText={(text) =>
                            setFormData({ ...formData, joiningFee: text })
                          }
                          keyboardType="numeric"
                          placeholder="Optional"
                        />
                      </View>
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.label}>Other Charges (Optional)</Text>
                      {formData.otherCharges.map((charge, index) => (
                        <View key={index} style={styles.otherChargeRow}>
                          <TextInput
                            style={[styles.input, styles.otherChargeInput]}
                            value={charge.description}
                            onChangeText={(text) =>
                              updateOtherCharge(index, "description", text)
                            }
                            placeholder="Charge description"
                          />
                          <TextInput
                            style={[styles.input, styles.otherChargeAmount]}
                            value={charge.amount}
                            onChangeText={(text) =>
                              updateOtherCharge(index, "amount", text)
                            }
                            keyboardType="numeric"
                            placeholder="Amount"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            onPress={() => removeOtherCharge(index)}
                            style={styles.removeButton}
                          >
                            Remove
                          </Button>
                        </View>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={addOtherCharge}
                        style={styles.addChargeButton}
                      >
                        + Add Other Charge
                      </Button>
                    </View>
                  </>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {isEditing
                      ? "Rent Information"
                      : "Fixed Monthly Rent (From Month 2)"}
                  </Text>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Fixed Monthly Rent (₹) *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.monthlyRent}
                      onChangeText={(text) =>
                        setFormData({ ...formData, monthlyRent: text })
                      }
                      keyboardType="numeric"
                      placeholder="Fixed amount for subsequent months"
                    />
                    <Text style={styles.hint}>
                      {isEditing
                        ? "Fixed monthly rent amount"
                        : "This amount will be charged from the second month onwards"}
                    </Text>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>
                      Move-In Date {!isEditing && "*"}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.moveInDate}
                      onChangeText={(text) =>
                        setFormData({ ...formData, moveInDate: text })
                      }
                      placeholder="YYYY-MM-DD"
                    />
                    <Text style={styles.hint}>
                      {isEditing
                        ? "Updating move-in date will create first payment if missing"
                        : "First payment will be created for this month"}
                    </Text>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Services Included</Text>
                  {availableFacilities.length === 0 ? (
                    <Text style={styles.hint}>
                      {selectedProperty
                        ? "No facilities are configured for this property yet."
                        : "Select a property to choose available services."}
                    </Text>
                  ) : (
                    <View style={styles.facilitiesGrid}>
                      {availableFacilities.map((facility) => (
                        <TouchableOpacity
                          key={facility}
                          style={[
                            styles.facilityChip,
                            formData.servicesIncluded.includes(facility) &&
                              styles.facilityChipSelected,
                          ]}
                          onPress={() => toggleService(facility)}
                        >
                          <Text
                            style={[
                              styles.facilityChipText,
                              formData.servicesIncluded.includes(facility) &&
                                styles.facilityChipTextSelected,
                            ]}
                          >
                            {formatFacilityLabel(facility)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Text style={styles.hint}>
                    Only facilities configured for the selected property can be
                    assigned.
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Active" value="ACTIVE" />
                      <Picker.Item label="Inactive" value="INACTIVE" />
                    </Picker>
                  </View>
                </View>

                {!isEditing && (
                  <View style={styles.formField}>
                    <Text style={styles.label}>Password (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.password}
                      onChangeText={(text) =>
                        setFormData({ ...formData, password: text })
                      }
                      placeholder="Leave blank to auto-generate"
                      secureTextEntry
                    />
                    <Text style={styles.hint}>
                      Minimum 6 characters. Leave blank to generate a secure
                      password.
                    </Text>
                  </View>
                )}

                <View style={styles.formActions}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={handleCloseForm}
                    disabled={submitting}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    onPress={handleSubmit}
                    loading={submitting}
                    style={styles.submitButton}
                  >
                    {isEditing ? "Update Tenant" : "Save Tenant"}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </Card>
        )}

        {tempPasswordInfo && (
          <Card style={[styles.card, styles.passwordCard]} padding="md">
            <Text style={styles.passwordLabel}>
              Share this temporary password with{" "}
              <Text style={styles.passwordEmail}>{tempPasswordInfo.email}</Text>
            </Text>
            <Text style={styles.passwordValue}>
              {tempPasswordInfo.password}
            </Text>
          </Card>
        )}

        <Card style={styles.card} padding="md">
          {loading ? (
            <Loader />
          ) : tenants.length === 0 ? (
            <Text style={styles.emptyText}>No PG tenants found.</Text>
          ) : (
            <View style={styles.tenantsList}>
              {tenants.map((tenant) => (
                <View key={tenant.id} style={styles.tenantCard}>
                  <View style={styles.tenantHeader}>
                    <View style={styles.tenantInfo}>
                      <Text style={styles.tenantName}>{tenant.name}</Text>
                      <Text style={styles.tenantEmail}>{tenant.email}</Text>
                      {tenant.phone && (
                        <Text style={styles.tenantPhone}>{tenant.phone}</Text>
                      )}
                    </View>
                    <View style={styles.tenantActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => handleEditTenant(tenant)}
                        style={styles.actionButton}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={() => promptDeleteTenant(tenant)}
                        style={styles.actionButton}
                      >
                        Delete
                      </Button>
                    </View>
                  </View>

                  <View style={styles.tenantDetails}>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Property:</Text>
                      <Text style={styles.tenantDetailValue}>
                        {tenant.property?.name || "—"}
                      </Text>
                    </View>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Room/Bed:</Text>
                      <Text style={styles.tenantDetailValue}>
                        {tenant.roomNumber || "—"} / {tenant.bedNumber || "—"}
                      </Text>
                    </View>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Package:</Text>
                      <Text style={styles.tenantDetailValue}>
                        {tenant.sharingType || "—"}-bed ·{" "}
                        {tenant.acPreference === "NON_AC" ? "Non-AC" : "AC"} ·{" "}
                        {tenant.foodPreference === "WITHOUT_FOOD"
                          ? "No food"
                          : "With food"}
                      </Text>
                    </View>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Rent:</Text>
                      <Text style={styles.tenantDetailValue}>
                        ₹
                        {Number(tenant.monthlyRent || 0).toLocaleString(
                          "en-IN"
                        )}
                      </Text>
                    </View>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Services:</Text>
                      <Text style={styles.tenantDetailValue}>
                        {(tenant.servicesIncluded || []).length
                          ? tenant.servicesIncluded
                              .map((service) => formatFacilityLabel(service))
                              .join(", ")
                          : "—"}
                      </Text>
                    </View>
                    <View style={styles.tenantDetailRow}>
                      <Text style={styles.tenantDetailLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          tenant.status === "ACTIVE"
                            ? styles.statusBadgeActive
                            : styles.statusBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            tenant.status === "ACTIVE"
                              ? styles.statusTextActive
                              : styles.statusTextInactive,
                          ]}
                        >
                          {tenant.status || "ACTIVE"}
                        </Text>
                      </View>
                    </View>
                    {tenant.openComplaints > 0 && (
                      <View style={styles.tenantDetailRow}>
                        <Text style={styles.tenantDetailLabel}>
                          Open Complaints:
                        </Text>
                        <Text style={styles.tenantDetailValue}>
                          {tenant.openComplaints}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={!!deleteDialog.tenant}
          onClose={handleCancelDelete}
          title="Delete Tenant"
          confirmText="Yes, Delete"
          cancelText="No, Keep Tenant"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          loading={deleteDialog.loading}
          variant="danger"
        >
          <Text style={styles.modalText}>
            Are you sure you want to delete{" "}
            <Text style={styles.modalBold}>
              {deleteDialog.tenant?.name || "this tenant"}
            </Text>
            ? This action cannot be undone and will remove their access.
          </Text>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  card: {
    marginBottom: 16,
  },
  cardHighlight: {
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  addModeGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  addModeCard: {
    flex: 1,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  addModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  addModeIconGreen: {
    backgroundColor: "#D1FAE5",
  },
  addModeIconText: {
    fontSize: 24,
  },
  addModeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  addModeDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  tenantsList: {
    maxHeight: 400,
    gap: 12,
  },
  tenantSelectCard: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tenantSelectCardSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#EEF2FF",
  },
  tenantSelectInfo: {
    flex: 1,
  },
  tenantSelectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  tenantSelectEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  tenantSelectPhone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  tenantSelectWarning: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 4,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  checkIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  continueSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  formScroll: {
    maxHeight: 800,
  },
  form: {
    gap: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  otherChargeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  otherChargeInput: {
    flex: 1,
  },
  otherChargeAmount: {
    width: 120,
  },
  removeButton: {
    minWidth: 80,
  },
  addChargeButton: {
    marginTop: 8,
  },
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 8,
    maxHeight: 200,
  },
  facilityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  facilityChipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  facilityChipText: {
    fontSize: 12,
    color: "#6B7280",
  },
  facilityChipTextSelected: {
    color: "#FFFFFF",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  passwordCard: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderStyle: "dashed",
    backgroundColor: "#EEF2FF",
  },
  passwordLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  passwordEmail: {
    fontWeight: "600",
    color: "#1F2937",
  },
  passwordValue: {
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 48,
  },
  tenantsList: {
    gap: 16,
  },
  tenantCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  tenantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  tenantEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  tenantPhone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  tenantActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    minWidth: 70,
  },
  tenantDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tenantDetailRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tenantDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
    minWidth: 100,
  },
  tenantDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusBadgeActive: {
    backgroundColor: "#D1FAE5",
  },
  statusBadgeInactive: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextActive: {
    color: "#065F46",
  },
  statusTextInactive: {
    color: "#374151",
  },
  modalText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  modalBold: {
    fontWeight: "600",
  },
});
