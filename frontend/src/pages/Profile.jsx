import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { ScrollAnimation } from "../components/ScrollAnimation";
import Loader from "../components/ui/Loader";

// Cache utility functions (outside component to avoid recreation)
const getCachedProfileData = (userId) => {
  try {
    const cached = sessionStorage.getItem(`profile_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache is valid for 5 minutes
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn("Failed to read cached profile data:", error);
  }
  return null;
};

const setCachedProfileData = (userId, data) => {
  try {
    sessionStorage.setItem(
      `profile_${userId}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Failed to cache profile data:", error);
  }
};

function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [showCompleteOnboardingModal, setShowCompleteOnboardingModal] =
    useState(false);
  const [showImagesPdfViewer, setShowImagesPdfViewer] = useState(false);
  const [imagesPdfUrl, setImagesPdfUrl] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null); // Track which document is being viewed
  const [profileDataFetched, setProfileDataFetched] = useState(false); // Track if profile data has been fetched
  const [lastFetchTime, setLastFetchTime] = useState(null); // Track when data was last fetched
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: "",
    avatarUrl: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    maritalStatus: "",
    personalDetails: {
      occupation: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  // Check for edit mode from query params
  useEffect(() => {
    const editParam = searchParams.get("edit");
    const tabParam = searchParams.get("tab");
    if (editParam === "true") {
      setIsEditing(true);
    }
    if (tabParam === "photo") {
      setActiveTab("photo");
    }
  }, [searchParams]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;

      try {
        // Check cache first (unless force refresh)
        if (!forceRefresh && profileDataFetched) {
          const cached = getCachedProfileData(user.id);
          if (cached) {
            // Use cached data, only fetch complaints (they change more frequently)
            setLoading(true);
            let complaints = [];
            if (user?.role === "OFFICER") {
              const allComplaints = await api.getOfficerComplaints();
              complaints = allComplaints.filter(
                (c) => c.assignedOfficer && c.assignedOfficer.id === user.id
              );
            } else {
              complaints = await api.getMyComplaints();
            }

            const stats = {
              total: complaints.length,
              new: complaints.filter((c) => c.status === "NEW").length,
              inProgress: complaints.filter((c) => c.status === "IN_PROGRESS")
                .length,
              resolved: complaints.filter((c) => c.status === "RESOLVED")
                .length,
            };
            setStats(stats);
            setLoading(false);
            return; // Use cached profile data
          }
        }

        setLoading(true);

        // Fetch complaints based on user role
        let complaints = [];
        if (user?.role === "OFFICER") {
          // For officers, get all complaints and filter by assigned to them
          const allComplaints = await api.getOfficerComplaints();
          complaints = allComplaints.filter(
            (c) => c.assignedOfficer && c.assignedOfficer.id === user.id
          );
        } else {
          // For citizens, get their own complaints
          complaints = await api.getMyComplaints();
        }

        // Fetch profile data
        const profile = await api.getProfile().catch(() => null); // Profile might not exist yet

        const stats = {
          total: complaints.length,
          new: complaints.filter((c) => c.status === "NEW").length,
          inProgress: complaints.filter((c) => c.status === "IN_PROGRESS")
            .length,
          resolved: complaints.filter((c) => c.status === "RESOLVED").length,
        };
        setStats(stats);

        if (profile) {
          const updatedProfileData = {
            name: profile.name || user?.name || "",
            phone: profile.phone || "",
            avatarUrl: profile.avatarUrl || "",
            address: profile.address || {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "",
            },
            maritalStatus: profile.maritalStatus || "",
            personalDetails: profile.personalDetails || {
              occupation: "",
              dateOfBirth: "",
              gender: "",
            },
          };
          setProfileData(updatedProfileData);

          // Cache the profile data
          setCachedProfileData(user.id, updatedProfileData);

          if (profile.avatarUrl) {
            setAvatarPreview(profile.avatarUrl);
          }
        }

        setProfileDataFetched(true);
        setLastFetchTime(Date.now());
      } catch (err) {
        showToast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, user?.role, profileDataFetched]
  );

  // Fetch data only on initial mount or when user changes
  useEffect(() => {
    if (user?.id) {
      // Check if we have cached data first
      const cached = getCachedProfileData(user.id);
      if (cached) {
        // Use cached data immediately
        setProfileData({
          name: cached.name || user?.name || "",
          phone: cached.phone || "",
          avatarUrl: cached.avatarUrl || "",
          address: cached.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          maritalStatus: cached.maritalStatus || "",
          personalDetails: cached.personalDetails || {
            occupation: "",
            dateOfBirth: "",
            gender: "",
          },
        });
        if (cached.avatarUrl) {
          setAvatarPreview(cached.avatarUrl);
        }
        setProfileDataFetched(true);
        setLoading(false);

        // Fetch fresh data in background (but don't block UI)
        fetchData(false).catch(() => {
          // Silently fail - we already have cached data
        });
      } else {
        // No cache, fetch fresh data
        fetchData(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only refetch when user ID changes

  // Refresh user data separately to avoid infinite loops
  // Only refresh if user data might be stale (e.g., after onboarding)
  useEffect(() => {
    // Only refresh if we're on the profile page and user is PG_TENANT
    // This prevents unnecessary API calls
    if (user?.role === "PG_TENANT" && refreshUser) {
      refreshUser();
    }
  }, []); // Only run once on mount

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showToast.error("Please select an image file");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // If avatar file is selected, convert to base64 or upload
      let updatedProfileData = { ...profileData };
      if (avatarFile) {
        // For now, we'll store as base64 data URL
        // In production, you'd upload to a storage service (S3, Cloudinary, etc.)
        updatedProfileData.avatarUrl = avatarPreview;
      }

      await api.updateProfile(updatedProfileData);

      // Clear cache and refetch to get updated data
      if (user?.id) {
        sessionStorage.removeItem(`profile_${user.id}`);
      }
      await fetchData(true); // Force refresh after update

      showToast.success("Profile updated successfully!");
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      showToast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
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
      <ScrollAnimation>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              Profile
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage your account and personal information
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Clear cache and force refresh
                    if (user?.id) {
                      sessionStorage.removeItem(`profile_${user.id}`);
                    }
                    setProfileDataFetched(false);
                    fetchData(true);
                  }}
                  disabled={loading}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </Button>
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              </>
            )}
          </div>
        </div>
      </ScrollAnimation>

      {/* Avatar Section */}
      {(isEditing || activeTab === "photo") && (
        <ScrollAnimation delay={0.05}>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-[var(--color-primary)]"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-semibold text-4xl border-4 border-[var(--color-primary)]">
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)
                      : "U"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-[var(--color-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-dark)] cursor-pointer"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  Recommended: Square image, at least 400x400 pixels. Max size:
                  5MB
                </p>
              </div>
            </div>
          </Card>
        </ScrollAnimation>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Card */}
        <ScrollAnimation delay={0.1}>
          <Card padding="lg" className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {user?.role === "OFFICER"
                  ? "Assigned Complaints"
                  : "Your Statistics"}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchData}
                className="!px-3"
                title="Refresh statistics"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
            </div>
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
                >
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                    {user?.role === "OFFICER"
                      ? "Total Assigned"
                      : "Total Complaints"}
                  </p>
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {stats.total}
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-[var(--color-info-light)] rounded-lg border border-[var(--color-info)]"
                >
                  <p className="text-sm text-[var(--color-info)] mb-1">New</p>
                  <p className="text-3xl font-bold text-[var(--color-info)]">
                    {stats.new}
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-[var(--color-warning-light)] rounded-lg border border-[var(--color-warning)]"
                >
                  <p className="text-sm text-[var(--color-warning)] mb-1">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold text-[var(--color-warning)]">
                    {stats.inProgress}
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 bg-[var(--color-success-light)] rounded-lg border border-[var(--color-success)]"
                >
                  <p className="text-sm text-[var(--color-success)] mb-1">
                    Resolved
                  </p>
                  <p className="text-3xl font-bold text-[var(--color-success)]">
                    {stats.resolved}
                  </p>
                </motion.div>
              </div>
            )}
          </Card>
        </ScrollAnimation>

        {/* Personal Information */}
        <ScrollAnimation delay={0.2}>
          <Card padding="lg" className="h-full">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                  />
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.name || user?.name}
                  </p>
                )}
              </div>

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
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    placeholder="+1 234 567 8900"
                  />
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.phone || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Role
                </label>
                <span className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-sm font-medium">
                  {user?.role || "CITIZEN"}
                </span>
              </div>
            </div>
          </Card>
        </ScrollAnimation>

        {/* Address Information */}
        <ScrollAnimation delay={0.3}>
          <Card padding="lg" className="h-full">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Street
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.address.street}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          street: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    placeholder="123 Main Street"
                  />
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.address.street || "Not provided"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.address.city}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          address: {
                            ...profileData.address,
                            city: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <p className="text-lg text-[var(--color-text-primary)]">
                      {profileData.address.city || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    State
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.address.state}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          address: {
                            ...profileData.address,
                            state: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <p className="text-lg text-[var(--color-text-primary)]">
                      {profileData.address.state || "-"}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    ZIP Code
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.address.zipCode}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          address: {
                            ...profileData.address,
                            zipCode: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <p className="text-lg text-[var(--color-text-primary)]">
                      {profileData.address.zipCode || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.address.country}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          address: {
                            ...profileData.address,
                            country: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <p className="text-lg text-[var(--color-text-primary)]">
                      {profileData.address.country || "-"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </ScrollAnimation>
      </div>

      {/* Onboarding Status Section - For PG_TENANT */}
      {user?.role === "PG_TENANT" && (
        <ScrollAnimation delay={0.4}>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Onboarding Status
            </h2>
            <div className="space-y-4">
              {/* eKYC Status */}
              <div className="p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        eKYC Verification
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Identity verification status
                      </p>
                    </div>
                    {user?.kycStatus === "verified" ? (
                      <div className="flex items-center gap-2 text-[var(--color-success)]">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-semibold">Completed</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (user?.onboardingStatus === "completed") {
                            showToast.info("eKYC is already completed");
                          } else {
                            setShowCompleteOnboardingModal(true);
                          }
                        }}
                      >
                        Complete Now
                      </Button>
                    )}
                  </div>
                </div>
                {user?.kycStatus === "verified" && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={viewingDocument === "ekyc"}
                      onClick={async () => {
                        try {
                          setViewingDocument("ekyc");
                          await api.viewDocument("ekyc");
                        } catch (error) {
                          showToast.error("Failed to view eKYC document");
                        } finally {
                          setViewingDocument(null);
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View eKYC Document
                    </Button>
                  </div>
                )}
              </div>

              {/* Rental Agreement Status */}
              <div className="p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Rental Agreement
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        PG rental agreement status
                      </p>
                    </div>
                    {user?.agreementAccepted ? (
                      <div className="flex items-center gap-2 text-[var(--color-success)]">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-semibold">Completed</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (user?.onboardingStatus === "completed") {
                            showToast.info("Agreement is already completed");
                          } else {
                            setShowCompleteOnboardingModal(true);
                          }
                        }}
                      >
                        Complete Now
                      </Button>
                    )}
                  </div>
                </div>
                {user?.agreementAccepted && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={viewingDocument === "agreement"}
                      onClick={async () => {
                        try {
                          setViewingDocument("agreement");
                          await api.viewDocument("agreement");
                        } catch (error) {
                          showToast.error("Failed to view Agreement document");
                        } finally {
                          setViewingDocument(null);
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View Agreement Document
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </ScrollAnimation>
      )}

      {/* Uploaded Documents Section - For PG_TENANT */}
      {user?.role === "PG_TENANT" && user?.kycDocumentInfo && (
        <ScrollAnimation delay={0.45}>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
              Uploaded Documents
            </h2>
            <div className="space-y-3">
              {user.kycDocumentInfo.idType && user.kycDocumentInfo.idNumber ? (
                <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                          {user.kycDocumentInfo.idType}
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {user.kycDocumentInfo.idNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-success)]">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Uploaded</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate("/documents")}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View All Documents
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No documents uploaded yet. Complete onboarding to upload
                    your ID documents.
                  </p>
                </div>
              )}

              {/* Uploaded Images Display */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                  Uploaded Images
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ID Front Image */}
                  <div className="p-4 border border-[var(--color-border)] rounded-lg">
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                        ID Front
                      </h5>
                      {user.kycDocumentInfo.idFrontBase64 ? (
                        <div className="relative w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden border border-[var(--color-border)]">
                          <img
                            src={`data:image/jpeg;base64,${user.kycDocumentInfo.idFrontBase64}`}
                            alt="ID Front"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex items-center justify-center">
                          <div className="text-center">
                            <svg
                              className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-2"
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
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Not uploaded
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {user.kycDocumentInfo.idFrontBase64 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const img = new Image();
                          img.src = `data:image/jpeg;base64,${user.kycDocumentInfo.idFrontBase64}`;
                          const newWindow = window.open();
                          newWindow.document.write(`
                            <html>
                              <head><title>ID Front</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
                                <img src="${img.src}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                        }}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Image
                      </Button>
                    )}
                  </div>

                  {/* ID Back Image */}
                  <div className="p-4 border border-[var(--color-border)] rounded-lg">
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                        ID Back
                      </h5>
                      {user.kycDocumentInfo.idBackBase64 ? (
                        <div className="relative w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden border border-[var(--color-border)]">
                          <img
                            src={`data:image/jpeg;base64,${user.kycDocumentInfo.idBackBase64}`}
                            alt="ID Back"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex items-center justify-center">
                          <div className="text-center">
                            <svg
                              className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-2"
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
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Not uploaded
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {user.kycDocumentInfo.idBackBase64 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const img = new Image();
                          img.src = `data:image/jpeg;base64,${user.kycDocumentInfo.idBackBase64}`;
                          const newWindow = window.open();
                          newWindow.document.write(`
                            <html>
                              <head><title>ID Back</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
                                <img src="${img.src}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                        }}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Image
                      </Button>
                    )}
                  </div>

                  {/* Selfie Image */}
                  <div className="p-4 border border-[var(--color-border)] rounded-lg">
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                        Selfie
                      </h5>
                      {user.kycDocumentInfo.selfieBase64 ? (
                        <div className="relative w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden border border-[var(--color-border)]">
                          <img
                            src={`data:image/jpeg;base64,${user.kycDocumentInfo.selfieBase64}`}
                            alt="Selfie"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex items-center justify-center">
                          <div className="text-center">
                            <svg
                              className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-2"
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
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Not uploaded
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {user.kycDocumentInfo.selfieBase64 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const img = new Image();
                          img.src = `data:image/jpeg;base64,${user.kycDocumentInfo.selfieBase64}`;
                          const newWindow = window.open();
                          newWindow.document.write(`
                            <html>
                              <head><title>Selfie</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
                                <img src="${img.src}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                        }}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Image
                      </Button>
                    )}
                  </div>
                </div>

                {/* View All Images as PDF Button */}
                {(user.kycDocumentInfo.idFrontBase64 ||
                  user.kycDocumentInfo.idBackBase64 ||
                  user.kycDocumentInfo.selfieBase64) && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        try {
                          // Generate PDF on the fly and display inline
                          const API_BASE_URL =
                            import.meta.env.VITE_BACKEND_BASE_URL?.replace(
                              /\/$/,
                              ""
                            ) || "/api";
                          const response = await fetch(
                            `${API_BASE_URL}/documents/generate-images-pdf`,
                            {
                              method: "GET",
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "token"
                                )}`,
                              },
                            }
                          );

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(
                              error.error || "Failed to generate PDF"
                            );
                          }

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          setImagesPdfUrl(url);
                          setShowImagesPdfViewer(true);
                        } catch (error) {
                          showToast.error(
                            error.message ||
                              "Failed to generate PDF. Please try again."
                          );
                        }
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      View All Images as PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </ScrollAnimation>
      )}

      {/* Complete Onboarding Modal */}
      <Modal
        isOpen={showCompleteOnboardingModal}
        onClose={() => setShowCompleteOnboardingModal(false)}
        title="Complete Onboarding"
        confirmText="Go to Onboarding"
        cancelText="Cancel"
        onConfirm={() => {
          setShowCompleteOnboardingModal(false);
          navigate("/tenant/onboarding");
        }}
        onCancel={() => setShowCompleteOnboardingModal(false)}
        variant="primary"
      >
        <p className="text-[var(--color-text-secondary)] mb-4">
          You need to complete the onboarding process to access all features.
          This includes:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-2 mb-4">
          <li>eKYC Verification (upload ID documents and selfie)</li>
          <li>Signing the PG Rental Agreement</li>
        </ul>
        <p className="text-[var(--color-text-primary)] font-medium">
          Would you like to proceed to the onboarding page?
        </p>
      </Modal>

      {/* Images PDF Viewer Modal */}
      {showImagesPdfViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--color-bg-primary)] rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-[var(--color-border)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                KYC Images - All Documents
              </h3>
              <button
                onClick={() => {
                  setShowImagesPdfViewer(false);
                  if (imagesPdfUrl) {
                    window.URL.revokeObjectURL(imagesPdfUrl);
                    setImagesPdfUrl(null);
                  }
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden p-4">
              {imagesPdfUrl ? (
                <iframe
                  src={imagesPdfUrl}
                  className="w-full h-full border border-[var(--color-border)] rounded-lg"
                  style={{ minHeight: "600px", height: "calc(90vh - 120px)" }}
                  title="KYC Images PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader size="lg" />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Personal Details */}
      <ScrollAnimation delay={0.5}>
        <Card padding="lg">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
            Personal Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Marital Status
              </label>
              {isEditing ? (
                <select
                  value={profileData.maritalStatus}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      maritalStatus: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="">Select status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              ) : (
                <p className="text-lg text-[var(--color-text-primary)]">
                  {profileData.maritalStatus
                    ? profileData.maritalStatus.charAt(0) +
                      profileData.maritalStatus.slice(1).toLowerCase()
                    : "Not provided"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Occupation
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.personalDetails.occupation}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      personalDetails: {
                        ...profileData.personalDetails,
                        occupation: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                  placeholder="e.g., Software Engineer"
                />
              ) : (
                <p className="text-lg text-[var(--color-text-primary)]">
                  {profileData.personalDetails.occupation || "Not provided"}
                </p>
              )}
            </div>
          </div>
        </Card>
      </ScrollAnimation>
    </div>
  );
}

export default Profile;
