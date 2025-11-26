import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { StaggerContainer, StaggerItem } from "./ScrollAnimation";

function ComplaintsList({ complaints, filters = {}, totalComplaints = 0 }) {
  const navigate = useNavigate();

  const getEmptyMessage = () => {
    // If there are no complaints at all
    if (totalComplaints === 0) {
      return {
        icon: "📝",
        message: "No complaints yet. Create your first complaint above!",
      };
    }

    // If filters are active, show filter-specific message
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

    // Default case (shouldn't happen if totalComplaints > 0, but just in case)
    return {
      icon: "📝",
      message: "No complaints found.",
    };
  };

  if (complaints.length === 0) {
    const emptyState = getEmptyMessage();
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="empty-state text-center py-12"
      >
        <div className="text-6xl mb-4">{emptyState.icon}</div>
        <p className="text-[var(--color-text-secondary)] text-lg">
          {emptyState.message}
        </p>
      </motion.div>
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
        return "bg-[var(--color-info-light)] text-[var(--color-info)]";
      case "IN_PROGRESS":
        return "bg-[var(--color-warning-light)] text-[var(--color-warning)]";
      case "RESOLVED":
        return "bg-[var(--color-success-light)] text-[var(--color-success)]";
      default:
        return "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]";
    }
  };

  return (
    <StaggerContainer className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      {complaints.map((complaint) => (
        <StaggerItem key={complaint.id}>
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => navigate(`/complaints/${complaint.id}`)}
            className="bg-[var(--color-bg-secondary)] p-5 rounded-xl border border-[var(--color-border)] hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3 gap-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex-1">
                {complaint.title}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                  complaint.status
                )}`}
              >
                {formatStatus(complaint.status)}
              </span>
            </div>
            <div className="flex gap-4 mb-3 text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-primary)]">
                {formatCategory(complaint.category)}
              </span>
              <span className="text-[var(--color-text-tertiary)]">
                {formatDate(complaint.createdAt)}
              </span>
              {complaint.flat && (
                <span className="text-[var(--color-text-tertiary)]">
                  Flat {complaint.flat.flatNumber} ·{" "}
                  {complaint.flat.buildingName}
                </span>
              )}
            </div>
            <p className="text-[var(--color-text-secondary)] line-clamp-3">
              {complaint.description}
            </p>
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-primary)] font-medium">
                View Details →
              </span>
            </div>
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

export default ComplaintsList;
