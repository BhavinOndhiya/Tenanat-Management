import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Button from "./Button";

/**
 * Modal Component with theme support
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "primary",
  showCancel = true,
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, loading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl max-w-md w-full pointer-events-auto max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              {title && (
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {title}
                  </h3>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <div className="text-[var(--color-text-secondary)]">
                  {children}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                {showCancel && (
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    {cancelText}
                  </Button>
                )}
                <Button
                  variant={variant}
                  onClick={handleConfirm}
                  loading={loading}
                  disabled={loading}
                >
                  {confirmText}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Modal;
