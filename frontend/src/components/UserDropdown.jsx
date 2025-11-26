import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";

function UserDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    showToast.success("Logged out successfully");
    navigate("/auth/login");
    setIsOpen(false);
  };

  const handleMenuItemClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get avatar URL if available (we'll add this later)
  const avatarUrl = user?.avatarUrl || null;

  const isAdmin = user?.role === "ADMIN";
  const isOfficer = user?.role === "OFFICER";

  const menuItems = [
    {
      label: "View Profile",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      onClick: () => handleMenuItemClick("/profile"),
      divider: false,
    },
    {
      label: "Edit Profile",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      onClick: () => handleMenuItemClick("/profile?edit=true"),
      divider: false,
    },
    {
      label: "Change Photo",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      onClick: () => handleMenuItemClick("/profile?edit=true&tab=photo"),
      divider: false,
    },
    {
      label: "Settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      onClick: () => handleMenuItemClick("/settings"),
      divider: true,
    },
    {
      label: "Notifications",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
      onClick: () => handleMenuItemClick("/notifications"),
      divider: false,
    },
    {
      label: "Logout",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
      onClick: handleLogout,
      divider: true,
      variant: "danger",
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name || "User"}
            className="w-10 h-10 rounded-full object-cover border-2 border-[var(--color-primary)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-semibold text-sm border-2 border-[var(--color-primary)]">
            {getInitials(user?.name)}
          </div>
        )}
        <svg
          className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 bg-[var(--color-bg-primary)] rounded-lg shadow-lg border border-[var(--color-border)] py-2 z-50"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.name || "User"}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--color-primary)]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-semibold border-2 border-[var(--color-primary)]">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    {user?.email}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-primary)] text-white">
                    {user?.role || "CITIZEN"}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {menuItems.map((item, index) => (
                <div key={index}>
                  {item.divider && index > 0 && (
                    <div className="my-1 border-t border-[var(--color-border)]" />
                  )}
                  <button
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      item.variant === "danger"
                        ? "text-[var(--color-error)] hover:bg-[var(--color-error-light)]"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                    }`}
                  >
                    <span
                      className={
                        item.variant === "danger"
                          ? "text-[var(--color-error)]"
                          : ""
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserDropdown;
