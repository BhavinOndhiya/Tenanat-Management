import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import ComplaintForm from "../components/ComplaintForm";
import ComplaintsList from "../components/ComplaintsList";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import RentPaymentCard from "../components/RentPaymentCard";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import { SkeletonCard } from "../components/ui/Skeleton";
import {
  ScrollAnimation,
  StaggerContainer,
  StaggerItem,
} from "../components/ScrollAnimation";

function Dashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "ALL", category: "ALL" });
  const [flatAssignments, setFlatAssignments] = useState([]);
  const [flatLoading, setFlatLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [pgProfile, setPgProfile] = useState(null);
  const [pgProfileLoading, setPgProfileLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentPaymentsLoading, setRecentPaymentsLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await api.getMyComplaints();
      setComplaints(data);
      setError("");
    } catch (err) {
      const errorMessage = err.message || "Failed to load complaints";
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const loadContext = async () => {
    try {
      setFlatLoading(true);
      setAnnouncementLoading(true);
      setEventsLoading(true);
      if (user?.role === "PG_TENANT") {
        setPgProfileLoading(true);
      }
      const promises = [
        api.getMyFlats().catch((err) => {
          console.warn("Failed to load flats", err);
          return [];
        }),
        api.getAnnouncements().catch((err) => {
          console.warn("Failed to load announcements", err);
          return [];
        }),
        api.getEvents().catch((err) => {
          console.warn("Failed to load events", err);
          return [];
        }),
      ];

      if (user?.role === "PG_TENANT") {
        promises.push(
          api.getPgTenantProfile().catch((err) => {
            console.warn("Failed to load PG profile", err);
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      setFlatAssignments(results[0]);
      setAnnouncements(results[1].slice(0, 4));
      setUpcomingEvents(results[2].slice(0, 3));
      if (user?.role === "PG_TENANT") {
        setPgProfile(results[3]);

        // Load a small recent payment history snapshot
        try {
          setRecentPaymentsLoading(true);
          const data = await api.getRentPaymentHistory({
            page: 1,
            limit: 5,
            filter: "last5",
          });
          setRecentPayments(data.items || []);
        } catch (err) {
          console.warn("[Dashboard] Failed to load recent payments", err);
          setRecentPayments([]);
        } finally {
          setRecentPaymentsLoading(false);
        }
      }
    } finally {
      setFlatLoading(false);
      setAnnouncementLoading(false);
      setEventsLoading(false);
      if (user?.role === "PG_TENANT") {
        setPgProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  const handleComplaintCreated = () => {
    fetchComplaints();
    showToast.success("Complaint created successfully!");
  };

  // Handle filter changes with loading state
  const handleFilterChange = (newFilters) => {
    setFilterLoading(true);
    setFilters(newFilters);
    // Show loading animation for a brief moment
    setTimeout(() => {
      setFilterLoading(false);
    }, 300);
  };

  const handleSearchChange = (query) => {
    setFilterLoading(true);
    setSearchQuery(query);
    // Show loading animation for a brief moment
    setTimeout(() => {
      setFilterLoading(false);
    }, 300);
  };

  // Filter and search complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      // Search filter - search by title, description, or category
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        complaint.title?.toLowerCase().includes(searchLower) ||
        complaint.description?.toLowerCase().includes(searchLower) ||
        complaint.category?.toLowerCase().includes(searchLower);

      // Status filter - handle case sensitivity
      const complaintStatus = complaint.status?.toUpperCase();
      const filterStatus = filters.status?.toUpperCase();
      const matchesStatus =
        filterStatus === "ALL" || complaintStatus === filterStatus;

      // Category filter
      const matchesCategory =
        filters.category === "ALL" || complaint.category === filters.category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, searchQuery, filters]);

  const fallbackAssignments =
    flatAssignments.length === 0 &&
    user?.role === "PG_TENANT" &&
    user?.assignedProperty
      ? [
          {
            id: user.assignedProperty.id,
            relation: "PG",
            isPrimary: true,
            flat: {
              id: user.assignedProperty.id,
              buildingName: user.assignedProperty.buildingName,
              block: user.assignedProperty.block,
              flatNumber: user.assignedProperty.flatNumber,
              floor: user.assignedProperty.floor ?? null,
            },
          },
        ]
      : [];

  const visibleAssignments =
    flatAssignments.length > 0 ? flatAssignments : fallbackAssignments;

  return (
    <div className="dashboard space-y-8">
      <ScrollAnimation>
        <div className="dashboard-header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-[var(--color-text-primary)] mb-2"
          >
            Welcome back, {user?.name}! 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[var(--color-text-secondary)] text-lg"
          >
            Manage your complaints and track their status
          </motion.p>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {user?.role === "PG_TENANT" ? (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                My PG
              </h2>
            </div>
            {pgProfileLoading ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : !pgProfile ? (
              <p className="text-[var(--color-text-secondary)] text-sm">
                PG profile not found. Please contact your owner.
              </p>
            ) : (
              <div className="space-y-4">
                {pgProfile.property && (
                  <div className="border border-[var(--color-border)] rounded-lg px-4 py-3">
                    <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      {pgProfile.property.name}
                    </p>
                    {pgProfile.property.address && (
                      <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                        {[
                          pgProfile.property.address.line1,
                          pgProfile.property.address.line2,
                          pgProfile.property.address.city,
                          pgProfile.property.address.state,
                          pgProfile.property.address.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {pgProfile.property.address?.landmark && (
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        Near {pgProfile.property.address.landmark}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[var(--color-border)] rounded-lg px-3 py-2">
                    <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                      Room Number
                    </p>
                    <p className="text-base font-semibold text-[var(--color-text-primary)]">
                      {pgProfile.roomNumber || "—"}
                    </p>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-lg px-3 py-2">
                    <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                      Bed Number
                    </p>
                    <p className="text-base font-semibold text-[var(--color-text-primary)]">
                      {pgProfile.bedNumber || "—"}
                    </p>
                  </div>
                </div>
                <div className="border border-[var(--color-border)] rounded-lg px-3 py-2">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                    Monthly Rent
                  </p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    ₹{pgProfile.monthlyRent?.toLocaleString("en-IN") || 0}
                  </p>
                </div>
                {pgProfile.servicesIncluded &&
                  pgProfile.servicesIncluded.length > 0 && (
                    <div className="border border-[var(--color-border)] rounded-lg px-3 py-2">
                      <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                        Services Included
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pgProfile.servicesIncluded.map((service, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded text-xs font-medium"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--color-text-secondary)]">
                      Sharing:{" "}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {pgProfile.sharingType || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">
                      AC:{" "}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {pgProfile.acPreference === "AC" ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-secondary)]">
                      Food:{" "}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {pgProfile.foodPreference === "WITH_FOOD"
                        ? "Included"
                        : "Not Included"}
                    </span>
                  </div>
                  {pgProfile.moveInDate && (
                    <div>
                      <span className="text-[var(--color-text-secondary)]">
                        Move-in:{" "}
                      </span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {new Date(pgProfile.moveInDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                My Flat
              </h2>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {visibleAssignments.length > 1 && "Multiple units"}
              </span>
            </div>
            {flatLoading ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : visibleAssignments.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-sm">
                No flat assignment yet. Contact your admin to link your
                apartment.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="border border-[var(--color-border)] rounded-lg px-3 py-3"
                  >
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {assignment.flat.buildingName} ·{" "}
                      {assignment.flat.flatNumber}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Block {assignment.flat.block || "—"} · Floor{" "}
                      {assignment.flat.floor ?? "—"} · {assignment.relation}
                    </p>
                    {assignment.isPrimary && (
                      <span className="inline-flex mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white">
                        Primary home
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Notices, Events & Maintenance
            </h2>
            <button
              type="button"
              onClick={loadContext}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Refresh
            </button>
          </div>
          {announcementLoading || eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : announcements.length === 0 && upcomingEvents.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-sm">
              No announcements or events.
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((notice) => (
                <div
                  key={notice.id}
                  className={`rounded-lg border px-3 py-2 ${
                    notice.isUrgent
                      ? "border-[var(--color-error)] bg-[var(--color-error-light)]/30"
                      : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {notice.title}
                    </span>
                    <span className="text-xs uppercase text-[var(--color-text-tertiary)]">
                      {notice.type}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {notice.body}
                  </p>
                </div>
              ))}
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-blue-50 dark:bg-blue-900/20"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {event.title}
                    </span>
                    <span className="text-xs uppercase text-[var(--color-text-tertiary)]">
                      EVENT
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(event.date).toLocaleDateString()} ·{" "}
                    {event.location}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {user?.role === "PG_TENANT" && (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Payment History
              </h2>
              <Link
                to="/pg-tenant/payments"
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                View all
              </Link>
            </div>
            {recentPaymentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : recentPayments.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-sm">
                No payments found yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-secondary)]"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {payment.periodLabel}
                        </span>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {payment.property?.name || "PG Property"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          ₹
                          {payment.totalAmount?.toLocaleString("en-IN") ||
                            payment.amount?.toLocaleString("en-IN") ||
                            "0"}
                        </span>
                        <p
                          className={`text-xs mt-0.5 ${
                            payment.status === "PAID"
                              ? "text-green-600"
                              : payment.status === "PENDING"
                              ? "text-yellow-600"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {payment.status}
                        </p>
                      </div>
                    </div>
                    {payment.paidAt && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        Paid:{" "}
                        {new Date(payment.paidAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {user?.role === "PG_TENANT" && (
        <ScrollAnimation delay={0.1}>
          <div className="mb-8">
            <RentPaymentCard />
          </div>
        </ScrollAnimation>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ScrollAnimation delay={0.2}>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              My Complaints
              {!loading && (
                <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
                  ({filteredComplaints.length} of {complaints.length})
                </span>
              )}
            </h2>
            <div className="space-y-4 mb-6">
              <SearchBar
                onSearch={handleSearchChange}
                placeholder="Search complaints by title or description..."
              />
              <FilterBar
                onFilterChange={handleFilterChange}
                currentFilters={filters}
              />
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="bg-[var(--color-error-light)] border border-[var(--color-error)] text-[var(--color-error)] p-4 rounded-lg">
                {error}
              </div>
            ) : filterLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader />
              </div>
            ) : (
              <ComplaintsList
                complaints={filteredComplaints}
                filters={{ ...filters, searchQuery }}
                totalComplaints={complaints.length}
              />
            )}
          </Card>
        </ScrollAnimation>

        <ScrollAnimation delay={0.3}>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Create New Complaint
            </h2>
            <ComplaintForm
              onComplaintCreated={handleComplaintCreated}
              flats={visibleAssignments}
            />
          </Card>
        </ScrollAnimation>
      </div>
    </div>
  );
}

export default Dashboard;
