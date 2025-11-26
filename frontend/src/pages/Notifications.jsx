import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { ScrollAnimation } from "../components/ScrollAnimation";
import Loader from "../components/ui/Loader";
import { motion } from "framer-motion";

function Notifications() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // all, unread, read

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // For now, we'll create mock notifications
      // In the future, you can fetch from API: const data = await api.getNotifications({ filter });

      // Mock notifications based on user role
      const mockNotifications = [
        {
          id: "1",
          type: "complaint",
          title: "Complaint Status Updated",
          message: "Your complaint #12345 has been marked as IN_PROGRESS",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          read: false,
          link: "/complaints/12345",
        },
        {
          id: "2",
          type: "billing",
          title: "Maintenance Payment Reminder",
          message: "Your maintenance payment for March 2024 is due in 3 days",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          read: false,
          link: "/billing",
        },
        {
          id: "3",
          type: "event",
          title: "New Event: Community Meeting",
          message:
            "A new community meeting has been scheduled for March 15, 2024",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          read: true,
          link: "/events",
        },
        {
          id: "4",
          type: "announcement",
          title: "New Announcement",
          message:
            "Important notice: Water supply will be interrupted on March 10",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          read: true,
          link: "/dashboard",
        },
      ];

      // Filter notifications
      let filtered = mockNotifications;
      if (filter === "unread") {
        filtered = mockNotifications.filter((n) => !n.read);
      } else if (filter === "read") {
        filtered = mockNotifications.filter((n) => n.read);
      }

      setNotifications(filtered);
    } catch (err) {
      showToast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // In the future: await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      showToast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      // In the future: await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast.success("All notifications marked as read");
    } catch (err) {
      showToast.error("Failed to update notifications");
    }
  };

  const deleteNotification = async (id) => {
    try {
      // In the future: await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast.success("Notification deleted");
    } catch (err) {
      showToast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "complaint":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "billing":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "event":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "announcement":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6"
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
        );
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "complaint":
        return "bg-[var(--color-warning-light)] text-[var(--color-warning)]";
      case "billing":
        return "bg-[var(--color-info-light)] text-[var(--color-info)]";
      case "event":
        return "bg-[var(--color-success-light)] text-[var(--color-success)]";
      case "announcement":
        return "bg-[var(--color-primary-light)] text-[var(--color-primary)]";
      default:
        return "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]";
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return timestamp.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              Notifications
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount > 1 ? "s" : ""
                  }`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          )}
        </div>
      </ScrollAnimation>

      {/* Filter Tabs */}
      <ScrollAnimation delay={0.1}>
        <div className="flex gap-2 border-b border-[var(--color-border)]">
          {["all", "unread", "read"].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                filter === filterType
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === "unread" && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[var(--color-primary)] text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </ScrollAnimation>

      {/* Notifications List */}
      <ScrollAnimation delay={0.2}>
        {notifications.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-[var(--color-text-secondary)] mb-4"
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
              <p className="text-lg text-[var(--color-text-secondary)]">
                No notifications found
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <Card
                  padding="md"
                  className={`cursor-pointer transition-all ${
                    !notification.read
                      ? "border-l-4 border-l-[var(--color-primary)] bg-[var(--color-bg-secondary)]"
                      : ""
                  }`}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                    if (notification.link)
                      window.location.href = notification.link;
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 hover:bg-[var(--color-error-light)] rounded transition-colors"
                            aria-label="Delete notification"
                          >
                            <svg
                              className="w-4 h-4 text-[var(--color-error)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollAnimation>
    </div>
  );
}

export default Notifications;
