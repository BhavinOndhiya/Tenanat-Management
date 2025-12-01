import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function PgOwnerComplaintDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("OPEN");
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadComplaint();
    }
  }, [id]);

  const loadComplaint = async () => {
    try {
      setLoading(true);
      const data = await api.getOwnerComplaint(id);
      setComplaint(data);
      setNewStatus(data.status);
    } catch (error) {
      showToast.error(error.message || "Failed to load complaint");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComplaint();
    setRefreshing(false);
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdatingStatus(true);
      await api.updateOwnerComplaintStatus(id, newStatus);
      showToast.success("Status updated");
      await loadComplaint();
    } catch (error) {
      showToast.error(error.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      showToast.error("Please enter a comment");
      return;
    }
    try {
      setAddingComment(true);
      await api.addOwnerComplaintComment(id, comment.trim());
      setComment("");
      showToast.success("Comment added");
      await loadComplaint();
    } catch (error) {
      showToast.error(error.message || "Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="lg" />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Complaint not found.</Text>
        <Button
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Back to Complaints
        </Button>
      </View>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <Button
            variant="secondary"
            size="sm"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            ← Back
          </Button>
          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.category}>{complaint.category}</Text>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newStatus}
              onValueChange={setNewStatus}
              style={styles.picker}
            >
              {STATUS_OPTIONS.map((status) => (
                <Picker.Item key={status} label={status} value={status} />
              ))}
            </Picker>
          </View>
          <Button
            onPress={handleStatusUpdate}
            loading={updatingStatus}
            style={styles.updateButton}
          >
            Update Status
          </Button>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.description}>{complaint.description}</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Property</Text>
                <Text style={styles.detailValue}>
                  {complaint.property
                    ? `${complaint.property.buildingName} · ${complaint.property.flatNumber}`
                    : "—"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tenant</Text>
                <Text style={styles.detailValue}>
                  {complaint.tenant?.name || complaint.tenant?.email || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{complaint.status}</Text>
            </View>
          </Card>

          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Add Comment</Text>
            <Text style={styles.cardSubtitle}>
              Use comments to communicate with tenants or internal staff.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={comment}
              onChangeText={setComment}
              placeholder="Add an internal note..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Button
              onPress={handleAddComment}
              loading={addingComment}
              style={styles.commentButton}
            >
              Post Comment
            </Button>
          </Card>
        </View>

        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Activity</Text>
          {complaint.comments?.length ? (
            <View style={styles.activityList}>
              {complaint.comments.map((entry, index) => (
                <View
                  key={entry._id || entry.createdAt || index}
                  style={styles.activityItem}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityAuthor}>
                      {entry.author?.name || "System"}
                    </Text>
                    <Text style={styles.activityDate}>
                      {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.activityMessage}>{entry.message}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No activity yet.</Text>
          )}
        </Card>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: "#6B7280",
  },
  statusSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  updateButton: {
    minWidth: 120,
  },
  grid: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  commentButton: {
    marginTop: 0,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activityAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  activityDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  activityMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 24,
  },
});
