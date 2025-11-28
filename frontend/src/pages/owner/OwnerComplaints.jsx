import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ScrollAnimation } from "../../components/ScrollAnimation";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const TYPE_META = {
  FLAT: {
    heading: "Flat Complaints",
    detailRoute: (id) => `/owner/flat-complaints/${id}`,
  },
  PG: {
    heading: "PG Complaints",
    detailRoute: (id) => `/owner/pg-complaints/${id}`,
  },
};

const useQuery = () => new URLSearchParams(useLocation().search);

export default function OwnerComplaints({ ownerType }) {
  const query = useQuery();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    status: query.get("status") || "ALL",
    propertyId: query.get("propertyId") || "ALL",
    category: "ALL",
    search: "",
  });

  const meta = TYPE_META[ownerType] || TYPE_META.FLAT;
  const categoryOptions = useMemo(() => {
    const unique = new Set();
    complaints.forEach((complaint) => {
      if (complaint.category) {
        unique.add(complaint.category);
      }
    });
    return ["ALL", ...Array.from(unique)];
  }, [complaints]);

  const fetchComplaints = async (activeFilters = filters) => {
    const cleanParams = {};
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        cleanParams[key] = value;
      }
    });

    try {
      setLoading(true);
      const response = await api.getOwnerComplaints(cleanParams);
      setComplaints(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      showToast.error(error.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const props = await api.getOwnerProperties();
        setProperties(props.filter((prop) => prop.type === ownerType));
      } catch (error) {
        console.warn("Failed to load owner properties", error);
      }
    };
    loadProperties();
  }, [ownerType]);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    fetchComplaints(nextFilters);

    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v && v !== "ALL") {
        params.set(k, v);
      }
    });
    navigate({ search: params.toString() }, { replace: true });
  };

  const tableRows = useMemo(() => complaints, [complaints]);

  return (
    <div className="space-y-8">
      <ScrollAnimation>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              {meta.heading}
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Filter complaints by status, property, or category.
            </p>
          </div>
        </div>
      </ScrollAnimation>

      <Card padding="lg" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All" : status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          {ownerType === "PG" && (
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                Property
              </label>
              <select
                value={filters.propertyId}
                onChange={(e) =>
                  handleFilterChange("propertyId", e.target.value)
                }
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
              >
                <option value="ALL">All Properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.buildingName} · {property.flatNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "ALL" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Title or description"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]"
            />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : tableRows.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)]">
            No complaints match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {complaint.title}
                    </td>
                    <td className="py-3 px-4">
                      {complaint.property
                        ? `${complaint.property.buildingName} · ${complaint.property.flatNumber}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4">{complaint.category}</td>
                    <td className="py-3 px-4">{complaint.status}</td>
                    <td className="py-3 px-4">
                      {complaint.tenant?.name || complaint.tenant?.email || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        as={Link}
                        to={meta.detailRoute(complaint.id)}
                        size="sm"
                        variant="secondary"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4 text-sm text-[var(--color-text-secondary)]">
              Showing {tableRows.length} of {total} complaints
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
