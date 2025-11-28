import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { NAV_ITEMS_CONFIG, NAV_KEYS } from "../../utils/navConfig";

const ROLE_LABELS = {
  ADMIN: "Admin",
  OFFICER: "Officer",
  FLAT_OWNER: "Flat Owner",
  PG_OWNER: "PG Owner",
  TENANT: "Flat Tenant",
  PG_TENANT: "PG Tenant",
  CITIZEN: "Citizen",
};

function AdminRoleAccess() {
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [roleData, setRoleData] = useState([]);

  const fetchRoleAccess = async () => {
    try {
      setLoading(true);
      const response = await api.getRoleAccess();
      setRoleData(response.data || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load role access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleAccess();
  }, []);

  const updateRoleNav = (role, navKey, enabled) => {
    setRoleData((prev) =>
      prev.map((entry) =>
        entry.role === role
          ? {
              ...entry,
              navItems: enabled
                ? Array.from(new Set([...(entry.navItems || []), navKey]))
                : (entry.navItems || []).filter((key) => key !== navKey),
            }
          : entry
      )
    );
  };

  const handleSave = async (role) => {
    const entry = roleData.find((item) => item.role === role);
    if (!entry) return;
    try {
      setSavingRole(role);
      await api.updateRoleAccess(role, entry.navItems);
      showToast.success(`Saved access for ${ROLE_LABELS[role] || role}`);
    } catch (error) {
      showToast.error(error.message || "Failed to save role access");
      fetchRoleAccess();
    } finally {
      setSavingRole(null);
    }
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
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Role Navigation Access
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Choose which sections appear in each role’s navigation.
        </p>
      </div>

      <Card padding="lg" className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
              <th className="py-3 px-4">Role</th>
              {NAV_KEYS.map((key) => (
                <th
                  key={key}
                  className="py-3 px-2 text-center whitespace-nowrap"
                >
                  {NAV_ITEMS_CONFIG[key]?.label || key}
                </th>
              ))}
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roleData.map((entry) => (
              <tr
                key={entry.role}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                  {ROLE_LABELS[entry.role] || entry.role}
                </td>
                {NAV_KEYS.map((key) => (
                  <td key={key} className="py-3 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={entry.navItems?.includes(key) || false}
                      onChange={(event) =>
                        updateRoleNav(entry.role, key, event.target.checked)
                      }
                    />
                  </td>
                ))}
                <td className="py-3 px-4 text-right">
                  <Button
                    size="sm"
                    loading={savingRole === entry.role}
                    onClick={() => handleSave(entry.role)}
                  >
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default AdminRoleAccess;
