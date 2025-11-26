import { motion } from "framer-motion";

const STATUSES = ["ALL", "NEW", "IN_PROGRESS", "RESOLVED"];
const CATEGORIES = [
  "ALL",
  "Road",
  "Water",
  "Electricity",
  "Sanitation",
  "Other",
];

function FilterBar({ onFilterChange, currentFilters }) {
  const { status = "ALL", category = "ALL" } = currentFilters || {};

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">
          Status:
        </label>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFilterChange({ status: s, category })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === s
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              {s === "ALL"
                ? "All"
                : s
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">
          Category:
        </label>
        <select
          value={category}
          onChange={(e) => onFilterChange({ status, category: e.target.value })}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default FilterBar;
