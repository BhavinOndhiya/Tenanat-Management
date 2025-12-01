import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function ComplaintsList({
  complaints,
  filters = {},
  totalComplaints = 0,
  onComplaintPress,
}) {
  const getEmptyMessage = () => {
    if (totalComplaints === 0) {
      return {
        icon: "📝",
        message: "No complaints yet. Create your first complaint above!",
      };
    }

    const hasActiveFilters =
      (filters.status && filters.status !== "ALL") ||
      (filters.category && filters.category !== "ALL") ||
      (filters.searchQuery && filters.searchQuery.trim() !== "");

    if (hasActiveFilters) {
      const filterParts = [];

      if (filters.status && filters.status !== "ALL") {
        const statusLabel = filters.status
          .replace("_", " ")
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        filterParts.push(statusLabel.toLowerCase());
      }

      if (filters.category && filters.category !== "ALL") {
        filterParts.push(filters.category.toLowerCase());
      }

      if (filters.searchQuery && filters.searchQuery.trim() !== "") {
        filterParts.push(`matching "${filters.searchQuery}"`);
      }

      const filterText =
        filterParts.length > 0
          ? filterParts.join(" ")
          : "matching your filters";

      return {
        icon: "🔍",
        message: `No ${filterText} complaints found. Try adjusting your filters or search.`,
      };
    }

    return {
      icon: "📝",
      message: "No complaints found.",
    };
  };

  if (complaints.length === 0) {
    const emptyState = getEmptyMessage();
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{emptyState.icon}</Text>
        <Text style={styles.emptyText}>{emptyState.message}</Text>
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

  const formatStatus = (status) => {
    return status
      .replace("_", " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatCategory = (category = "") => {
    return category
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "NEW":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "IN_PROGRESS":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "RESOLVED":
        return { bg: "#D1FAE5", text: "#065F46" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      {complaints.map((complaint) => {
        const statusColors = getStatusColor(complaint.status);
        return (
          <TouchableOpacity
            key={complaint.id}
            style={styles.complaintCard}
            onPress={() => onComplaintPress?.(complaint.id)}
            activeOpacity={0.7}
          >
            <View style={styles.complaintHeader}>
              <Text style={styles.complaintTitle} numberOfLines={2}>
                {complaint.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors.bg },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {formatStatus(complaint.status)}
                </Text>
              </View>
            </View>
            <View style={styles.complaintMeta}>
              <Text style={styles.categoryText}>
                {formatCategory(complaint.category)}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(complaint.createdAt)}
              </Text>
              {complaint.flat && (
                <Text style={styles.flatText}>
                  Flat {complaint.flat.flatNumber} ·{" "}
                  {complaint.flat.buildingName}
                </Text>
              )}
            </View>
            <Text style={styles.complaintDescription} numberOfLines={3}>
              {complaint.description}
            </Text>
            <View style={styles.viewDetails}>
              <Text style={styles.viewDetailsText}>View Details →</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  complaintCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  complaintHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  complaintTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  complaintMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563eb",
  },
  dateText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  flatText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  complaintDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  viewDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  viewDetailsText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "500",
  },
});

