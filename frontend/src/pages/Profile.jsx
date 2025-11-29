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
    familyDetails: {
      spouseName: "",
      children: [],
      otherMembers: [],
    },
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

  const fetchData = useCallback(async () => {
    try {
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

      const profile = await api.getProfile().catch(() => null); // Profile might not exist yet

      const stats = {
        total: complaints.length,
        new: complaints.filter((c) => c.status === "NEW").length,
        inProgress: complaints.filter((c) => c.status === "IN_PROGRESS").length,
        resolved: complaints.filter((c) => c.status === "RESOLVED").length,
      };
      setStats(stats);

      if (profile) {
        setProfileData({
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
          familyDetails: profile.familyDetails || {
            spouseName: "",
            children: [],
            otherMembers: [],
          },
          personalDetails: profile.personalDetails || {
            occupation: "",
            dateOfBirth: "",
            gender: "",
          },
        });
        if (profile.avatarUrl) {
          setAvatarPreview(profile.avatarUrl);
        }
      }
    } catch (err) {
      showToast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // Refresh user data to get latest onboarding status
    if (refreshUser) {
      refreshUser();
    }
  }, [fetchData, refreshUser]);

  // Refresh stats when component is focused (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (!isEditing) {
        fetchData();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isEditing, fetchData]);

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
      showToast.success("Profile updated successfully!");
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      showToast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const addChild = () => {
    setProfileData({
      ...profileData,
      familyDetails: {
        ...profileData.familyDetails,
        children: [
          ...profileData.familyDetails.children,
          { name: "", age: "", relationship: "Child" },
        ],
      },
    });
  };

  const addOtherMember = () => {
    setProfileData({
      ...profileData,
      familyDetails: {
        ...profileData.familyDetails,
        otherMembers: [
          ...profileData.familyDetails.otherMembers,
          { name: "", age: "", relationship: "" },
        ],
      },
    });
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
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
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
              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
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

              {/* Rental Agreement Status */}
              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
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
                <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]">
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
              ) : (
                <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No documents uploaded yet. Complete onboarding to upload
                    your ID documents.
                  </p>
                </div>
              )}

              {/* Document Upload Status */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 border border-[var(--color-border)] rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    {user.kycDocumentInfo.hasIdFront ? (
                      <svg
                        className="w-5 h-5 text-[var(--color-success)]"
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
                    ) : (
                      <svg
                        className="w-5 h-5 text-[var(--color-text-secondary)]"
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
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    ID Front
                  </p>
                </div>
                <div className="p-3 border border-[var(--color-border)] rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    {user.kycDocumentInfo.hasIdBack ? (
                      <svg
                        className="w-5 h-5 text-[var(--color-success)]"
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
                    ) : (
                      <svg
                        className="w-5 h-5 text-[var(--color-text-secondary)]"
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
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    ID Back
                  </p>
                </div>
                <div className="p-3 border border-[var(--color-border)] rounded-lg text-center">
                  <div className="flex items-center justify-center mb-2">
                    {user.kycDocumentInfo.hasSelfie ? (
                      <svg
                        className="w-5 h-5 text-[var(--color-success)]"
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
                    ) : (
                      <svg
                        className="w-5 h-5 text-[var(--color-text-secondary)]"
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
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Selfie
                  </p>
                </div>
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

      {/* Marital Status & Family Details */}
      <ScrollAnimation delay={0.5}>
        <Card padding="lg">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
            Family & Personal Details
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

            {profileData.maritalStatus === "MARRIED" && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Spouse Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.familyDetails.spouseName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        familyDetails: {
                          ...profileData.familyDetails,
                          spouseName: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                  />
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.familyDetails.spouseName || "Not provided"}
                  </p>
                )}
              </div>
            )}

            {profileData.maritalStatus === "MARRIED" && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Children
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {profileData.familyDetails.children.map((child, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => {
                            const newChildren = [
                              ...profileData.familyDetails.children,
                            ];
                            newChildren[idx].name = e.target.value;
                            setProfileData({
                              ...profileData,
                              familyDetails: {
                                ...profileData.familyDetails,
                                children: newChildren,
                              },
                            });
                          }}
                          placeholder="Child name"
                          className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                        <input
                          type="number"
                          value={child.age}
                          onChange={(e) => {
                            const newChildren = [
                              ...profileData.familyDetails.children,
                            ];
                            newChildren[idx].age = e.target.value;
                            setProfileData({
                              ...profileData,
                              familyDetails: {
                                ...profileData.familyDetails,
                                children: newChildren,
                              },
                            });
                          }}
                          placeholder="Age"
                          className="w-20 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                        />
                      </div>
                    ))}
                    <Button size="sm" variant="secondary" onClick={addChild}>
                      + Add Child
                    </Button>
                  </div>
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.familyDetails.children.length > 0
                      ? `${profileData.familyDetails.children.length} child(ren)`
                      : "No children"}
                  </p>
                )}
              </div>
            )}

            {(profileData.maritalStatus === "SINGLE" ||
              !profileData.maritalStatus) && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Other Family Members
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {profileData.familyDetails.otherMembers.map(
                      (member, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              const newMembers = [
                                ...profileData.familyDetails.otherMembers,
                              ];
                              newMembers[idx].name = e.target.value;
                              setProfileData({
                                ...profileData,
                                familyDetails: {
                                  ...profileData.familyDetails,
                                  otherMembers: newMembers,
                                },
                              });
                            }}
                            placeholder="Name"
                            className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                          />
                          <input
                            type="text"
                            value={member.relationship}
                            onChange={(e) => {
                              const newMembers = [
                                ...profileData.familyDetails.otherMembers,
                              ];
                              newMembers[idx].relationship = e.target.value;
                              setProfileData({
                                ...profileData,
                                familyDetails: {
                                  ...profileData.familyDetails,
                                  otherMembers: newMembers,
                                },
                              });
                            }}
                            placeholder="Relationship"
                            className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                          />
                        </div>
                      )
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={addOtherMember}
                    >
                      + Add Member
                    </Button>
                  </div>
                ) : (
                  <p className="text-lg text-[var(--color-text-primary)]">
                    {profileData.familyDetails.otherMembers.length > 0
                      ? `${profileData.familyDetails.otherMembers.length} member(s)`
                      : "No other members"}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </ScrollAnimation>
    </div>
  );
}

export default Profile;
