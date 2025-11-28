import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const ROUTES = {
  FLAT: "/owner/flat-complaints",
  PG: "/owner/pg-complaints",
};

export default function OwnerComplaintDetail({ ownerType }) {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("OPEN");
  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const backRoute = ROUTES[ownerType] || ROUTES.FLAT;

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

  useEffect(() => {
    loadComplaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-text-secondary)]">
          Complaint not found.
        </p>
        <Button as={Link} to={backRoute}>
          Back to Complaints
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button as={Link} to={backRoute} variant="secondary" size="sm">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mt-4">
            {complaint.title}
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {complaint.category}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button onClick={handleStatusUpdate} loading={updatingStatus}>
            Update Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="lg" className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Description
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {complaint.description}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase">
                Property
              </p>
              <p className="text-[var(--color-text-primary)] font-medium">
                {complaint.property
                  ? `${complaint.property.buildingName} · ${complaint.property.flatNumber}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] uppercase">
                Tenant
              </p>
              <p className="text-[var(--color-text-primary)] font-medium">
                {complaint.tenant?.name || complaint.tenant?.email || "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase">
              Status
            </p>
            <p className="text-[var(--color-text-primary)] font-medium">
              {complaint.status}
            </p>
          </div>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Add Comment
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Use comments to communicate with tenants or internal staff.
            </p>
          </div>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add an internal note..."
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
          />
          <Button onClick={handleAddComment} loading={addingComment}>
            Post Comment
          </Button>
        </Card>
      </div>

      <Card padding="lg" className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Activity
        </h3>
        {complaint.comments?.length ? (
          <div className="space-y-3">
            {complaint.comments.map((entry) => (
              <div
                key={entry._id || entry.createdAt}
                className="p-3 border border-[var(--color-border)] rounded-lg"
              >
                <p className="text-[var(--color-text-primary)]">
                  {entry.message}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-text-secondary)]">No comments yet.</p>
        )}
      </Card>
    </div>
  );
}
