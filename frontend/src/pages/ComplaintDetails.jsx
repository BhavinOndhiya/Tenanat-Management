import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { ScrollAnimation } from "../components/ScrollAnimation";

function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        const complaints = await api.getMyComplaints();
        const found = complaints.find((c) => c.id === id);
        if (found) {
          setComplaint(found);
        } else {
          setError("Complaint not found");
        }
      } catch (err) {
        setError(err.message || "Failed to load complaint");
        showToast.error(err.message || "Failed to load complaint");
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "NEW":
        return "bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]";
      case "IN_PROGRESS":
        return "bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]";
      case "RESOLVED":
        return "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]";
      default:
        return "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]";
    }
  };

  const formatStatus = (status) => {
    return status.replace("_", " ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Complaint Not Found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <ScrollAnimation>
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="text-[var(--color-primary)] hover:underline mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
              Complaint Details
            </h1>
          </div>
        </div>
      </ScrollAnimation>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card padding="lg">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)] flex-1">
              {complaint.title}
            </h2>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                complaint.status
              )}`}
            >
              {formatStatus(complaint.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Category
              </label>
              <p className="text-lg text-[var(--color-primary)] font-medium mt-1">
                {complaint.category}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Created Date
              </label>
              <p className="text-lg text-[var(--color-text-primary)] mt-1">
                {formatDate(complaint.createdAt)}
              </p>
            </div>
            {complaint.flat && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Linked Flat
                </label>
                <p className="text-lg text-[var(--color-text-primary)] mt-1">
                  {complaint.flat.buildingName} · {complaint.flat.flatNumber} (
                  {complaint.flat.block || "Block —"})
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
              Description
            </label>
            <p className="text-lg text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          <div className="pt-6 border-t border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Status Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[var(--color-info)]"></div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Complaint Created
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatDate(complaint.createdAt)}
                  </p>
                </div>
              </div>
              {complaint.status !== "NEW" && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-warning)]"></div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Status Updated
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Currently: {formatStatus(complaint.status)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {complaint.comments && complaint.comments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card padding="lg">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              Comments & Updates
            </h3>
            <div className="space-y-4">
              {complaint.comments.map((comment, idx) => (
                <div
                  key={comment._id || idx}
                  className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]"
                >
                  <p className="text-[var(--color-text-primary)] mb-2">
                    {comment.message}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ComplaintDetails;
