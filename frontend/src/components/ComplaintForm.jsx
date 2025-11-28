import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

function ComplaintForm({ onComplaintCreated, flats = [] }) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[var(--color-error-light)] border border-[var(--color-error)] text-[var(--color-error)] p-4 rounded-lg text-sm flex items-start justify-between gap-4"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="text-[var(--color-error)] hover:text-red-700 transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}

      {!!flats.length && selectedFlatId && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)] space-y-2">
          <strong className="block text-[var(--color-text-primary)]">
            Complaints will be linked to your flat
          </strong>
          <p>
            Selected flat:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {flats.find(
                (item) =>
                  item.flat.id === selectedFlatId || item.id === selectedFlatId
              )?.flat?.buildingName ||
                flats.find((item) => item.id === selectedFlatId)
                  ?.buildingName ||
                "N/A"}
              {", "}
              {flats.find(
                (item) =>
                  item.flat.id === selectedFlatId || item.id === selectedFlatId
              )?.flat?.flatNumber ||
                flats.find((item) => item.id === selectedFlatId)?.flatNumber}
            </span>
          </p>
          {flats.length > 1 && (
            <div className="space-y-1">
              <label
                htmlFor="flat"
                className="block text-xs uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                Choose flat
              </label>
              <select
                id="flat"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                value={selectedFlatId}
                onChange={(event) => setSelectedFlatId(event.target.value)}
                disabled={loading}
              >
                {flats.map((assignment) => (
                  <option key={assignment.flat.id} value={assignment.flat.id}>
                    {assignment.flat.buildingName} •{" "}
                    {assignment.flat.flatNumber}{" "}
                    {assignment.isPrimary
                      ? "(Primary)"
                      : `(${assignment.relation})`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          placeholder="Enter complaint title"
          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          disabled={loading}
          rows={5}
          placeholder="Describe your complaint in detail..."
          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] resize-none"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          disabled={loading}
          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" fullWidth loading={loading} disabled={loading}>
        Submit Complaint
      </Button>
    </form>
  );
}

export default ComplaintForm;
