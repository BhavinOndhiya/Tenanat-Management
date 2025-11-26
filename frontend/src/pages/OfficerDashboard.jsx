import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { ScrollAnimation } from "../components/ScrollAnimation";
import Card from "../components/ui/Card";
import "./OfficerDashboard.css";

function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedComplaint, setDraggedComplaint] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await api.getOfficerComplaints();
      setComplaints(data);
      setError("");
    } catch (err) {
      const errorMessage = err.message || "Failed to load complaints";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await api.getOfficerSummary();
        setSummary(data);
      } catch (err) {
        console.warn("Unable to load officer summary", err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const handleDragStart = (e, complaint) => {
    setDraggedComplaint(complaint);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();

    if (!draggedComplaint || draggedComplaint.status === targetStatus) {
      setDraggedComplaint(null);
      return;
    }

    const originalStatus = draggedComplaint.status;
    const complaintId = draggedComplaint.id;

    // Optimistically update UI
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId ? { ...c, status: targetStatus } : c
      )
    );

    try {
      await api.updateComplaintStatus(complaintId, targetStatus);
      showToast.success(`Complaint moved to ${targetStatus.replace("_", " ")}`);
      // Refresh to get latest data
      await fetchComplaints();
    } catch (err) {
      // Revert on error
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId ? { ...c, status: originalStatus } : c
        )
      );
      const errorMessage = err.message || "Failed to update complaint status";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setDraggedComplaint(null);
    }
  };

  const handleAssignToMe = async (complaintId) => {
    setAssigningId(complaintId);
    try {
      await api.assignComplaintToMe(complaintId);
      showToast.success("Complaint assigned to you");
      await fetchComplaints();
    } catch (err) {
      const errorMessage = err.message || "Failed to assign complaint";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setAssigningId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getComplaintsByStatus = (status) => {
    return complaints.filter((c) => c.status === status);
  };

  const isAssignedToMe = (complaint) => {
    return (
      complaint.assignedOfficer && complaint.assignedOfficer.id === user?.id
    );
  };

  const renderComplaintCard = (complaint) => {
    const assignedToMe = isAssignedToMe(complaint);
    const isUnassigned = !complaint.assignedOfficer;

    return (
      <motion.div
        key={complaint.id}
        className="kanban-card"
        draggable
        onDragStart={(e) => handleDragStart(e, complaint)}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ scale: 1.05, opacity: 0.8 }}
      >
        <div className="kanban-card-header">
          <h4>{complaint.title}</h4>
        </div>
        <div className="kanban-card-body">
          <div className="kanban-card-meta">
            <span className="kanban-card-category">{complaint.category}</span>
            <span className="kanban-card-date">
              {formatDate(complaint.createdAt)}
            </span>
          </div>
          <p className="kanban-card-description">{complaint.description}</p>
          <div className="kanban-card-citizen">
            <strong>Citizen:</strong>{" "}
            {complaint.citizen
              ? complaint.citizen.name || complaint.citizen.email || "Unknown"
              : "Unknown"}
          </div>
          {complaint.flat && (
            <div className="kanban-card-flat">
              <strong>Flat:</strong> {complaint.flat.buildingName} ·{" "}
              {complaint.flat.flatNumber}
            </div>
          )}
          <div className="kanban-card-assignment">
            {assignedToMe ? (
              <span className="assigned-badge assigned-to-me">
                Assigned to you
              </span>
            ) : isUnassigned ? (
              <div className="relative">
                {assigningId === complaint.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)] bg-opacity-75 rounded-lg z-10">
                    <Loader size="sm" />
                  </div>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAssignToMe(complaint.id)}
                  loading={assigningId === complaint.id}
                  disabled={assigningId === complaint.id}
                  className="w-full"
                >
                  Assign to me
                </Button>
              </div>
            ) : (
              <span className="assigned-badge">Assigned</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="officer-dashboard flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="officer-dashboard space-y-8">
      <ScrollAnimation>
        <div className="officer-dashboard-header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-[var(--color-text-primary)] mb-2"
          >
            Officer Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[var(--color-text-secondary)] text-lg"
          >
            Welcome, {user?.name}! Manage and track complaints
          </motion.p>
        </div>
      </ScrollAnimation>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-error-light)] border border-[var(--color-error)] text-[var(--color-error)] p-4 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryLoading ? (
          <div className="col-span-3 flex justify-center py-6">
            <Loader />
          </div>
        ) : (
          <>
            <Card hover={false} padding="md">
              <p className="text-xs uppercase text-[var(--color-text-secondary)]">
                New
              </p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                {summary?.newComplaints ?? 0}
              </p>
            </Card>
            <Card hover={false} padding="md">
              <p className="text-xs uppercase text-[var(--color-text-secondary)]">
                In progress
              </p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                {summary?.inProgressComplaints ?? 0}
              </p>
            </Card>
            <Card hover={false} padding="md">
              <p className="text-xs uppercase text-[var(--color-text-secondary)]">
                Resolved (7d)
              </p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                {summary?.resolvedLast7Days ?? 0}
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="kanban-board">
        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "NEW")}
        >
          <div className="kanban-column-header">
            <h2>New</h2>
            <span className="kanban-count">
              {getComplaintsByStatus("NEW").length}
            </span>
          </div>
          <div className="kanban-column-content">
            {getComplaintsByStatus("NEW").map(renderComplaintCard)}
          </div>
        </div>

        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "IN_PROGRESS")}
        >
          <div className="kanban-column-header">
            <h2>In Progress</h2>
            <span className="kanban-count">
              {getComplaintsByStatus("IN_PROGRESS").length}
            </span>
          </div>
          <div className="kanban-column-content">
            {getComplaintsByStatus("IN_PROGRESS").map(renderComplaintCard)}
          </div>
        </div>

        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "RESOLVED")}
        >
          <div className="kanban-column-header">
            <h2>Resolved</h2>
            <span className="kanban-count">
              {getComplaintsByStatus("RESOLVED").length}
            </span>
          </div>
          <div className="kanban-column-content">
            {getComplaintsByStatus("RESOLVED").map(renderComplaintCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfficerDashboard;
