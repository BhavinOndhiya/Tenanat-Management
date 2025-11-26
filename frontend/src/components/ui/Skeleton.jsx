import { motion } from "framer-motion";

/**
 * Skeleton Loader Component for loading states
 */
function Skeleton({ className = "", width, height }) {
  return (
    <motion.div
      className={`
        bg-[var(--color-bg-tertiary)]
        rounded-md
        ${className}
      `}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/**
 * Skeleton Card for complaint cards
 */
export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-bg-primary)] rounded-xl shadow-md border border-[var(--color-border)] p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <Skeleton height="24px" width="60%" />
          <Skeleton height="24px" width="80px" className="rounded-full" />
        </div>
        <Skeleton height="16px" width="40%" />
        <Skeleton height="60px" width="100%" />
      </div>
    </div>
  );
}

export default Skeleton;
