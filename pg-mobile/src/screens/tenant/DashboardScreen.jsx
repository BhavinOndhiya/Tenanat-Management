import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import RentPaymentCard from "../../components/RentPaymentCard";
import ComplaintForm from "../../components/ComplaintForm";
import ComplaintsList from "../../components/ComplaintsList";

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchComplaints(), loadContext()]);
    setRefreshing(false);
  };

  // Filter and search complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        complaint.title?.toLowerCase().includes(searchLower) ||
        complaint.description?.toLowerCase().includes(searchLower) ||
        complaint.category?.toLowerCase().includes(searchLower);

      // Status filter
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back, {user?.name}! 👋</Text>
          <Text style={styles.subtitle}>
            Manage your complaints and track their status
          </Text>
        </View>

        {/* PG Profile / Flat Assignment Card */}
        {user?.role === "PG_TENANT" ? (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>My PG</Text>
            {pgProfileLoading ? (
              <Loader />
            ) : !pgProfile ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>
                  Waiting for PG Owner Assignment
                </Text>
                <Text style={styles.infoText}>
                  You haven't been assigned to a PG property yet. Please contact
                  your PG owner to add you as a tenant.
                </Text>
                <Text style={styles.infoEmail}>
                  Your email: <Text style={styles.bold}>{user?.email}</Text>
                </Text>
              </View>
            ) : (
              <View style={styles.pgInfo}>
                {pgProfile.property && (
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>
                      {pgProfile.property.name}
                    </Text>
                    {pgProfile.property.address && (
                      <Text style={styles.propertyAddress}>
                        {[
                          pgProfile.property.address.line1,
                          pgProfile.property.address.line2,
                          pgProfile.property.address.city,
                          pgProfile.property.address.state,
                          pgProfile.property.address.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    )}
                    {pgProfile.property.address?.landmark && (
                      <Text style={styles.landmark}>
                        Near {pgProfile.property.address.landmark}
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.row}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Room Number</Text>
                    <Text style={styles.infoValue}>
                      {pgProfile.roomNumber || "—"}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Bed Number</Text>
                    <Text style={styles.infoValue}>
                      {pgProfile.bedNumber || "—"}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Monthly Rent</Text>
                  <Text style={styles.rentAmount}>
                    ₹{pgProfile.monthlyRent?.toLocaleString("en-IN") || 0}
                  </Text>
                </View>
                {pgProfile.servicesIncluded &&
                  pgProfile.servicesIncluded.length > 0 && (
                    <View style={styles.servicesContainer}>
                      <Text style={styles.infoLabel}>Services Included</Text>
                      <View style={styles.servicesList}>
                        {pgProfile.servicesIncluded.map((service, idx) => (
                          <View key={idx} style={styles.serviceTag}>
                            <Text style={styles.serviceText}>{service}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailText}>
                    Sharing:{" "}
                    <Text style={styles.bold}>
                      {pgProfile.sharingType || "—"}
                    </Text>
                  </Text>
                  <Text style={styles.detailText}>
                    AC:{" "}
                    <Text style={styles.bold}>
                      {pgProfile.acPreference === "AC" ? "Yes" : "No"}
                    </Text>
                  </Text>
                  <Text style={styles.detailText}>
                    Food:{" "}
                    <Text style={styles.bold}>
                      {pgProfile.foodPreference === "WITH_FOOD"
                        ? "Included"
                        : "Not Included"}
                    </Text>
                  </Text>
                  {pgProfile.moveInDate && (
                    <Text style={styles.detailText}>
                      Move-in:{" "}
                      <Text style={styles.bold}>
                        {formatDate(pgProfile.moveInDate)}
                      </Text>
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>My Flat</Text>
            {flatLoading ? (
              <Loader />
            ) : visibleAssignments.length === 0 ? (
              <Text style={styles.emptyText}>
                No flat assignment yet. Contact your admin to link your
                apartment.
              </Text>
            ) : (
              <View style={styles.flatsList}>
                {visibleAssignments.map((assignment) => (
                  <View key={assignment.id} style={styles.flatItem}>
                    <Text style={styles.flatName}>
                      {assignment.flat.buildingName} ·{" "}
                      {assignment.flat.flatNumber}
                    </Text>
                    <Text style={styles.flatDetails}>
                      Block {assignment.flat.block || "—"} · Floor{" "}
                      {assignment.flat.floor ?? "—"} · {assignment.relation}
                    </Text>
                    {assignment.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>Primary home</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Notices, Events & Maintenance */}
        <Card style={styles.card} padding="md">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Notices, Events & Maintenance</Text>
            <TouchableOpacity onPress={loadContext}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {announcementLoading || eventsLoading ? (
            <Loader />
          ) : announcements.length === 0 && upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>No announcements or events.</Text>
          ) : (
            <View style={styles.noticesList}>
              {announcements.map((notice) => (
                <View
                  key={notice.id}
                  style={[
                    styles.noticeItem,
                    notice.isUrgent && styles.urgentNotice,
                  ]}
                >
                  <View style={styles.noticeHeader}>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    <Text style={styles.noticeType}>{notice.type}</Text>
                  </View>
                  <Text style={styles.noticeBody}>{notice.body}</Text>
                </View>
              ))}
              {upcomingEvents.map((event) => (
                <View key={event.id} style={styles.noticeItem}>
                  <View style={styles.noticeHeader}>
                    <Text style={styles.noticeTitle}>{event.title}</Text>
                    <Text style={styles.noticeType}>EVENT</Text>
                  </View>
                  <Text style={styles.noticeBody}>
                    {formatDate(event.date)} · {event.location}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Payment History (PG Tenant only) */}
        {user?.role === "PG_TENANT" && (
          <Card style={styles.card} padding="md">
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Payment History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("PgTenantPayments")}
              >
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentPaymentsLoading ? (
              <Loader />
            ) : recentPayments.length === 0 ? (
              <Text style={styles.emptyText}>No payments found yet.</Text>
            ) : (
              <View style={styles.paymentsList}>
                {recentPayments.map((payment) => (
                  <View key={payment.id} style={styles.paymentItem}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentPeriod}>
                        {payment.periodLabel}
                      </Text>
                      <Text style={styles.paymentProperty}>
                        {payment.property?.name || "PG Property"}
                      </Text>
                    </View>
                    <View style={styles.paymentAmount}>
                      <Text style={styles.paymentValue}>
                        ₹
                        {(
                          payment.totalAmount ||
                          payment.amount ||
                          0
                        ).toLocaleString("en-IN")}
                      </Text>
                      <Text
                        style={[
                          styles.paymentStatus,
                          payment.status === "PAID" && styles.statusPaid,
                          payment.status === "PENDING" && styles.statusPending,
                        ]}
                      >
                        {payment.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Rent Payment Card (PG Tenant only) */}
        {user?.role === "PG_TENANT" && (
          <View style={styles.rentPaymentContainer}>
            <RentPaymentCard />
          </View>
        )}

        {/* Complaints Section */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>
            My Complaints
            {!loading && (
              <Text style={styles.countText}>
                {" "}
                ({filteredComplaints.length} of {complaints.length})
              </Text>
            )}
          </Text>
          {loading ? (
            <Loader />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ComplaintsList
              complaints={filteredComplaints}
              filters={{ ...filters, searchQuery }}
              totalComplaints={complaints.length}
              // TODO: Add ComplaintDetail screen and navigation
              // onComplaintPress={(complaintId) =>
              //   navigation.navigate("ComplaintDetail", { id: complaintId })
              // }
            />
          )}
        </Card>

        {/* Create Complaint Section */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Create New Complaint</Text>
          <ComplaintForm
            onComplaintCreated={handleComplaintCreated}
            flats={visibleAssignments}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  refreshText: {
    fontSize: 12,
    color: "#2563eb",
  },
  linkText: {
    fontSize: 12,
    color: "#2563eb",
  },
  countText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#6B7280",
  },
  infoBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#312E81",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#4338CA",
    marginBottom: 12,
  },
  infoEmail: {
    fontSize: 12,
    color: "#4F46E5",
  },
  bold: {
    fontWeight: "600",
  },
  pgInfo: {
    gap: 12,
  },
  propertyInfo: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  landmark: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  infoItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  rentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  servicesContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  servicesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  serviceTag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563eb",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  flatsList: {
    gap: 12,
  },
  flatItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  flatName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  flatDetails: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  primaryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noticesList: {
    gap: 12,
  },
  noticeItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  urgentNotice: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  noticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  noticeType: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#9CA3AF",
  },
  noticeBody: {
    fontSize: 12,
    color: "#6B7280",
  },
  rentPaymentContainer: {
    marginBottom: 16,
  },
  paymentsList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentPeriod: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  paymentProperty: {
    fontSize: 12,
    color: "#6B7280",
  },
  paymentAmount: {
    alignItems: "flex-end",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusPaid: {
    color: "#10B981",
  },
  statusPending: {
    color: "#F59E0B",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
});
