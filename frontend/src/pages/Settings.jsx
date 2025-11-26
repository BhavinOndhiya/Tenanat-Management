import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { ScrollAnimation } from "../components/ScrollAnimation";
import Loader from "../components/ui/Loader";

function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    complaintUpdates: true,
    billingReminders: true,
    eventNotifications: true,
    announcementNotifications: true,
    theme: "system", // light, dark, system
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  useEffect(() => {
    // Load saved settings from localStorage or API
    const loadSettings = async () => {
      try {
        // Try to load from localStorage first
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          setSettings({ ...settings, ...JSON.parse(savedSettings) });
        }
        // In the future, you could load from API
        // const userSettings = await api.getUserSettings();
        // setSettings(userSettings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save to localStorage
      localStorage.setItem("userSettings", JSON.stringify(settings));

      // In the future, you could save to API
      // await api.updateUserSettings(settings);

      showToast.success("Settings saved successfully!");
    } catch (err) {
      showToast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
              Settings
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage your application preferences and notifications
            </p>
          </div>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>
      </ScrollAnimation>

      {/* Notification Settings */}
      <ScrollAnimation delay={0.1}>
        <Card padding="lg">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Email Notifications
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Receive notifications via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle("emailNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Push Notifications
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Receive browser push notifications
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => handleToggle("pushNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Complaint Updates
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Get notified about complaint status changes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.complaintUpdates}
                  onChange={() => handleToggle("complaintUpdates")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Billing Reminders
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Receive reminders for maintenance payments
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.billingReminders}
                  onChange={() => handleToggle("billingReminders")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Event Notifications
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Get notified about upcoming events
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.eventNotifications}
                  onChange={() => handleToggle("eventNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Announcement Notifications
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Get notified about new announcements
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcementNotifications}
                  onChange={() => handleToggle("announcementNotifications")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>
          </div>
        </Card>
      </ScrollAnimation>

      {/* Appearance Settings */}
      <ScrollAnimation delay={0.2}>
        <Card padding="lg">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
            Appearance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings({ ...settings, language: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Timezone
              </label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                placeholder="Asia/Kolkata"
              />
            </div>
          </div>
        </Card>
      </ScrollAnimation>

      {/* Account Information */}
      <ScrollAnimation delay={0.3}>
        <Card padding="lg">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Email
              </label>
              <p className="text-lg text-[var(--color-text-primary)]">
                {user?.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Role
              </label>
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium">
                {user?.role || "CITIZEN"}
              </span>
            </div>
          </div>
        </Card>
      </ScrollAnimation>
    </div>
  );
}

export default Settings;
