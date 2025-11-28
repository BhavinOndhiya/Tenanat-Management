import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";

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

export default function ComplaintFormScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFlats, setLoadingFlats] = useState(true);

  useEffect(() => {
    const loadFlats = async () => {
      try {
        const data = await api.getMyFlats();
        setFlats(data);
        if (data.length > 0) {
          const primary = data.find((assignment) => assignment.isPrimary);
          setSelectedFlatId(primary?.flat?.id || data[0]?.flat?.id || "");
        }
      } catch (error) {
        console.error("Error loading flats:", error);
      } finally {
        setLoadingFlats(false);
      }
    };
    loadFlats();
  }, []);

  const handleSubmit = async () => {
    if (!title || !description || !category) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.createComplaint(title, description, category, selectedFlatId);
      Alert.alert("Success", "Complaint created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message =
        error?.error || error?.message || "Failed to create complaint";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const selectedFlat = flats.find((item) => item.flat.id === selectedFlatId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {loadingFlats ? (
          <ActivityIndicator size="large" color="#6366f1" />
        ) : flats.length > 0 ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              Complaints will be linked to your flat
            </Text>
            <Text style={styles.infoText}>
              Selected flat:{" "}
              <Text style={styles.infoBold}>
                {selectedFlat?.flat?.buildingName || "N/A"},{" "}
                {selectedFlat?.flat?.flatNumber || "N/A"}
              </Text>
            </Text>
            {flats.length > 1 && (
              <View style={styles.flatSelector}>
                <Text style={styles.label}>Select Flat</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedFlatId}
                    onValueChange={setSelectedFlatId}
                    style={styles.picker}
                  >
                    {flats.map((assignment) => (
                      <Picker.Item
                        key={assignment.flat.id}
                        label={`${assignment.flat.buildingName} - ${assignment.flat.flatNumber}`}
                        value={assignment.flat.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              No flat assignment found. Contact your admin to link your
              apartment.
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter complaint title"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
              enabled={!loading}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your complaint in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !flats.length}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Complaint</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#1e40af",
    marginBottom: 12,
  },
  infoBold: {
    fontWeight: "600",
  },
  warningBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: "#dc2626",
  },
  flatSelector: {
    marginTop: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
