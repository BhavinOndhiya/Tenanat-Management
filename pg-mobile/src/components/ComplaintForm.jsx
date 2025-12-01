import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Button from "./ui/Button";

const CATEGORIES = [
  "ROAD",
  "WATER",
  "ELECTRICITY",
  "SANITATION",
  "SECURITY",
  "MAINTENANCE",
  "ELEVATOR",
  "PARKING",
  "OTHER",
];

export default function ComplaintForm({ onComplaintCreated, flats = [] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!flats.length) {
      setSelectedFlatId("");
      return;
    }
    const firstFlat = flats[0];
    const primary = flats.find((assignment) => assignment.isPrimary);
    setSelectedFlatId(
      primary?.flat?.id || firstFlat?.flat?.id || firstFlat?.id || ""
    );
  }, [flats]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (!title || !description || !category) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      await api.createComplaint(title, description, category, selectedFlatId);
      setTitle("");
      setDescription("");
      setCategory(CATEGORIES[0]);
      setSelectedFlatId((prev) => prev);
      onComplaintCreated();
    } catch (err) {
      const errorMessage = err.message || "Failed to create complaint";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFlatDisplayName = (assignment) => {
    if (assignment.flat) {
      return `${assignment.flat.buildingName} • ${assignment.flat.flatNumber} ${
        assignment.isPrimary ? "(Primary)" : `(${assignment.relation})`
      }`;
    }
    return `${assignment.buildingName} • ${assignment.flatNumber}`;
  };

  return (
    <ScrollView style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View />
      )}

      {!!flats.length && selectedFlatId && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            Complaints will be linked to your flat
          </Text>
          <Text style={styles.infoText}>
            Selected flat:{" "}
            <Text style={styles.bold}>
              {flats.find(
                (item) =>
                  item.flat?.id === selectedFlatId || item.id === selectedFlatId
              )
                ? getFlatDisplayName(
                    flats.find(
                      (item) =>
                        item.flat?.id === selectedFlatId ||
                        item.id === selectedFlatId
                    )
                  )
                : "N/A"}
            </Text>
          </Text>
          {flats.length > 1 && (
            <View style={styles.flatPicker}>
              <Text style={styles.label}>Choose flat</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedFlatId}
                  onValueChange={(value) => setSelectedFlatId(value)}
                  enabled={!loading}
                  style={styles.picker}
                >
                  {flats.map((assignment) => (
                    <Picker.Item
                      key={assignment.flat?.id || assignment.id}
                      label={getFlatDisplayName(assignment)}
                      value={assignment.flat?.id || assignment.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter complaint title"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your complaint in detail..."
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!loading}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={(value) => setCategory(value)}
            enabled={!loading}
            style={styles.picker}
          >
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </View>

      <Button
        onPress={handleSubmit}
        fullWidth
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        Submit Complaint
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  bold: {
    fontWeight: "600",
    color: "#1F2937",
  },
  flatPicker: {
    marginTop: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
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
  submitButton: {
    marginTop: 8,
  },
});
