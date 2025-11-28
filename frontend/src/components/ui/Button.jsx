import { motion } from "framer-motion";

/**
 * Modern Button Component with animations
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  as: ComponentProp,
  ...props
}) {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? "w-full" : ""}
  `;

  const variants = {
    primary: `
      bg-[var(--color-primary)] text-white
      hover:bg-[var(--color-primary-dark)]
      focus:ring-[var(--color-primary)]
      shadow-md hover:shadow-lg
    `,
    secondary: `
      bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]
      border border-[var(--color-border)]
      hover:bg-[var(--color-bg-tertiary)]
      focus:ring-[var(--color-primary)]
    `,
    danger: `
      bg-[var(--color-error)] text-white
      hover:bg-[#dc2626]
      focus:ring-[var(--color-error)]
      shadow-md hover:shadow-lg
    `,
    ghost: `
      bg-transparent text-[var(--color-text-primary)]
      hover:bg-[var(--color-bg-secondary)]
      focus:ring-[var(--color-primary)]
    `,
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const MotionComponent = ComponentProp ? motion(ComponentProp) : motion.button;

  const componentProps = {
    onClick,
    disabled: disabled || loading,
    className: `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`,
    whileHover: { scale: disabled || loading ? 1 : 1.02 },
    whileTap: { scale: disabled || loading ? 1 : 0.98 },
    transition: { duration: 0.2 },
    ...props,
  };

  if (!ComponentProp) {
    componentProps.type = type;
  }

  return (
    <MotionComponent {...componentProps}>
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </MotionComponent>
  );
}

export default Button;
