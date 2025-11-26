import { motion } from "framer-motion";

/**
 * Modern Card Component with hover animations
 */
function Card({
  children,
  className = "",
  hover = true,
  padding = "lg",
  ...props
}) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <motion.div
      className={`
        bg-[var(--color-bg-primary)]
        rounded-xl
        shadow-md
        border border-[var(--color-border)]
        ${paddingClasses[padding]}
        ${className}
      `}
      whileHover={hover ? { y: -2, boxShadow: "var(--shadow-lg)" } : {}}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default Card;
