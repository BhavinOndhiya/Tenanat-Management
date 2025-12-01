import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
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
  defaultRent: "",
  defaultDeposit: "",
  dueDate: "1",
  lastPenaltyFreeDate: "5",
  lateFeePerDay: "50",
  noticePeriodMonths: "1",
  lockInMonths: "0",
  houseRules: "",
};

export default function PgPropertiesScreen() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

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
      totalRooms: property.totalRooms?.toString() || "",
      totalBeds: property.totalBeds?.toString() || "",
      genderType: property.genderType || "COED",
      facilitiesAvailable: property.facilitiesAvailable || [],
      baseRentPerBed: property.baseRentPerBed?.toString() || "",
      notes: property.notes || "",
      defaultRent: property.defaultRent?.toString() || "",
      defaultDeposit: property.defaultDeposit?.toString() || "",
      dueDate: property.dueDate?.toString() || "1",
      lastPenaltyFreeDate: property.lastPenaltyFreeDate?.toString() || "5",
      lateFeePerDay: property.lateFeePerDay?.toString() || "50",
      noticePeriodMonths: property.noticePeriodMonths?.toString() || "1",
      lockInMonths: property.lockInMonths?.toString() || "0",
      houseRules: property.houseRules || "",
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setDeletingId(deletingId);
      await api.deleteOwnerPgProperty(deletingId);
      showToast.success("Property deleted successfully");
      setShowDeleteModal(false);
      setDeletingId(null);
      await loadProperties();
    } catch (error) {
      showToast.error(error.message || "Failed to delete property");
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.addressLine1 ||
      !formData.city ||
      !formData.state ||
      !formData.pincode
    ) {
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

  const sortedProperties = useMemo(
    () =>
      properties
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [properties]
  );

  const formatFacilityLabel = (value = "") =>
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

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
            <Text style={styles.title}>PG Properties</Text>
            <Text style={styles.subtitle}>
              Define facilities for each PG and manage availability.
            </Text>
          </View>
          <Button
            onPress={() => {
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
        </View>

        {showForm && (
          <Card style={styles.formCard} padding="md">
            <Text style={styles.formTitle}>
              {editingProperty ? "Edit PG Property" : "Create PG Property"}
            </Text>
            <ScrollView style={styles.formScroll}>
              <View style={styles.form}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Property Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Landmark (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.landmark}
                      onChangeText={(text) =>
                        setFormData({ ...formData, landmark: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Address Line 1 *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.addressLine1}
                      onChangeText={(text) =>
                        setFormData({ ...formData, addressLine1: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Address Line 2</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.addressLine2}
                      onChangeText={(text) =>
                        setFormData({ ...formData, addressLine2: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.city}
                      onChangeText={(text) =>
                        setFormData({ ...formData, city: text })
                      }
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>State *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.state}
                      onChangeText={(text) =>
                        setFormData({ ...formData, state: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Pincode *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.pincode}
                      onChangeText={(text) =>
                        setFormData({ ...formData, pincode: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Gender Type</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.genderType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, genderType: value })
                        }
                        style={styles.picker}
                      >
                        {GENDER_OPTIONS.map((option) => (
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

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Total Rooms</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.totalRooms}
                      onChangeText={(text) =>
                        setFormData({ ...formData, totalRooms: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Total Beds</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.totalBeds}
                      onChangeText={(text) =>
                        setFormData({ ...formData, totalBeds: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Facilities Available *</Text>
                  <View style={styles.facilitiesGrid}>
                    {FACILITY_OPTIONS.map((facility) => (
                      <TouchableOpacity
                        key={facility}
                        style={[
                          styles.facilityChip,
                          formData.facilitiesAvailable.includes(facility) &&
                            styles.facilityChipSelected,
                        ]}
                        onPress={() => toggleFacility(facility)}
                      >
                        <Text
                          style={[
                            styles.facilityChipText,
                            formData.facilitiesAvailable.includes(facility) &&
                              styles.facilityChipTextSelected,
                          ]}
                        >
                          {formatFacilityLabel(facility)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Base Rent Per Bed (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.baseRentPerBed}
                      onChangeText={(text) =>
                        setFormData({ ...formData, baseRentPerBed: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Default Rent (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.defaultRent}
                      onChangeText={(text) =>
                        setFormData({ ...formData, defaultRent: text })
                      }
                      keyboardType="numeric"
                      placeholder="Default monthly rent"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Default Deposit (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.defaultDeposit}
                      onChangeText={(text) =>
                        setFormData({ ...formData, defaultDeposit: text })
                      }
                      keyboardType="numeric"
                      placeholder="Security deposit"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Payment Due Date</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.dueDate}
                      onChangeText={(text) =>
                        setFormData({ ...formData, dueDate: text })
                      }
                      keyboardType="numeric"
                      placeholder="Day of month (1-31)"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Last Penalty-Free Date</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lastPenaltyFreeDate}
                      onChangeText={(text) =>
                        setFormData({ ...formData, lastPenaltyFreeDate: text })
                      }
                      keyboardType="numeric"
                      placeholder="Day of month (1-31)"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Late Fee Per Day (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lateFeePerDay}
                      onChangeText={(text) =>
                        setFormData({ ...formData, lateFeePerDay: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Notice Period (Months)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.noticePeriodMonths}
                      onChangeText={(text) =>
                        setFormData({ ...formData, noticePeriodMonths: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Lock-in Period (Months)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lockInMonths}
                      onChangeText={(text) =>
                        setFormData({ ...formData, lockInMonths: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>House Rules</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.houseRules}
                    onChangeText={(text) =>
                      setFormData({ ...formData, houseRules: text })
                    }
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Enter house rules..."
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(text) =>
                      setFormData({ ...formData, notes: text })
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholder="Additional notes..."
                  />
                </View>

                <View style={styles.formActions}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      setShowForm(false);
                      setEditingProperty(null);
                      setFormData(defaultFormData);
                    }}
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
                    {editingProperty ? "Update Property" : "Create Property"}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </Card>
        )}

        <Card style={styles.card} padding="md">
          {loading ? (
            <Loader />
          ) : sortedProperties.length === 0 ? (
            <Text style={styles.emptyText}>
              No PG properties yet. Create your first property to get started.
            </Text>
          ) : (
            <View style={styles.propertiesList}>
              {sortedProperties.map((property) => (
                <View key={property.id} style={styles.propertyCard}>
                  <View style={styles.propertyHeader}>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>
                        {property.name || "Unnamed Property"}
                      </Text>
                      <Text style={styles.propertyAddress}>
                        {[
                          property.address?.line1,
                          property.address?.city,
                          property.address?.state,
                          property.address?.zipCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                      {property.landmark && (
                        <Text style={styles.propertyLandmark}>
                          Near {property.landmark}
                        </Text>
                      )}
                    </View>
                    <View style={styles.propertyActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => handleEdit(property)}
                        style={styles.actionButton}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={() => {
                          setDeletingId(property.id);
                          setShowDeleteModal(true);
                        }}
                        style={styles.actionButton}
                      >
                        Delete
                      </Button>
                    </View>
                  </View>

                  <View style={styles.propertyDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender:</Text>
                      <Text style={styles.detailValue}>
                        {GENDER_OPTIONS.find(
                          (opt) => opt.value === property.genderType
                        )?.label || property.genderType}
                      </Text>
                    </View>
                    {(property.totalRooms || property.totalBeds) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Capacity:</Text>
                        <Text style={styles.detailValue}>
                          {property.totalRooms &&
                            `Rooms: ${property.totalRooms}`}
                          {property.totalRooms && property.totalBeds && " · "}
                          {property.totalBeds && `Beds: ${property.totalBeds}`}
                        </Text>
                      </View>
                    )}
                    {property.baseRentPerBed > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Base Rent:</Text>
                        <Text style={styles.detailValue}>
                          ₹{property.baseRentPerBed.toLocaleString("en-IN")}/bed
                        </Text>
                      </View>
                    )}
                  </View>

                  {property.facilitiesAvailable?.length > 0 && (
                    <View style={styles.facilitiesList}>
                      {property.facilitiesAvailable.map((facility) => (
                        <View key={facility} style={styles.facilityBadge}>
                          <Text style={styles.facilityBadgeText}>
                            {formatFacilityLabel(facility)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          onClose={() => {
            if (!deletingId) {
              setShowDeleteModal(false);
              setDeletingId(null);
            }
          }}
          title="Delete Property"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeletingId(null);
          }}
          loading={!!deletingId}
          variant="danger"
        >
          <Text style={styles.modalText}>
            Are you sure you want to delete this property? This action cannot be
            undone.
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
  formCard: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  formScroll: {
    maxHeight: 600,
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
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
  card: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 48,
  },
  propertiesList: {
    gap: 16,
  },
  propertyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  propertyLandmark: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  propertyActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    minWidth: 70,
  },
  propertyDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  facilitiesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  facilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  facilityBadgeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
});
