import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import { config } from "../../utils/config";

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Check route params for edit mode and photo tab
  useEffect(() => {
    if (route.params?.edit) {
      setIsEditing(true);
    }
    if (route.params?.tab === "photo") {
      setActiveTab("photo");
      setIsEditing(true);
    }
  }, [route.params]);
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

  useEffect(() => {
    fetchData();
    // Refresh user data to get latest onboarding status
    if (user?.role === "PG_TENANT" && refreshUser) {
      refreshUser();
    }
  }, [user?.id]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;

      try {
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

        const profile = await api.getProfile().catch(() => null);

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

          if (profile.avatarUrl) {
            setAvatarPreview(profile.avatarUrl);
          }
        }
      } catch (err) {
        showToast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, user?.role]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const handleAvatarChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast.error("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize > 5 * 1024 * 1024) {
        showToast.error("Image size should be less than 5MB");
        return;
      }
      setAvatarFile({
        uri: asset.uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      });
      setAvatarPreview(asset.uri);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      let updatedProfileData = { ...profileData };
      if (avatarFile) {
        // For mobile, we'll send the file URI in FormData
        updatedProfileData.avatarFile = avatarFile;
      }

      await api.updateProfile(updatedProfileData);
      await fetchData(true);
      if (refreshUser) {
        await refreshUser();
      }

      showToast.success("Profile updated successfully!");
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      showToast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleViewDocument = async (type) => {
    try {
      setViewingDocument(type);
      const token = await AsyncStorage.getItem("token");
      const { config } = await import("../../utils/config");
      const url = `${config.API_BASE_URL}/documents/download/${type}`;
      await Linking.openURL(url);
    } catch (error) {
      showToast.error(`Failed to view ${type} document`);
    } finally {
      setViewingDocument(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size="lg" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>
              Manage your account and personal information
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onPress={handleSave} loading={saving}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => fetchData(true)}
                >
                  Refresh
                </Button>
                <Button size="sm" onPress={() => setIsEditing(true)}>
                  Edit
                </Button>
              </>
            )}
          </View>
        </View>

        {/* Avatar Section */}
        {(isEditing || activeTab === "photo") && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Profile Photo</Text>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatarPreview ? (
                  <Image
                    source={{ uri: avatarPreview }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(profileData.name || user?.name)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarActions}>
                <Text style={styles.avatarLabel}>Upload Photo</Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleAvatarChange}
                >
                  Choose Image
                </Button>
                <Text style={styles.avatarHint}>
                  Recommended: Square image, at least 400x400 pixels. Max size:
                  5MB
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Statistics Card */}
        <Card style={styles.card} padding="md">
          <View style={styles.statsHeader}>
            <Text style={styles.cardTitle}>
              {user?.role === "OFFICER"
                ? "Assigned Complaints"
                : "Your Statistics"}
            </Text>
            <Button size="sm" variant="ghost" onPress={() => fetchData(true)}>
              Refresh
            </Button>
          </View>
          {stats && (
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardDefault]}>
                <Text style={styles.statLabel}>
                  {user?.role === "OFFICER"
                    ? "Total Assigned"
                    : "Total Complaints"}
                </Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
              <View style={[styles.statCard, styles.statCardNew]}>
                <Text style={[styles.statLabel, styles.statLabelNew]}>New</Text>
                <Text style={[styles.statValue, styles.statValueNew]}>
                  {stats.new}
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardProgress]}>
                <Text style={[styles.statLabel, styles.statLabelProgress]}>
                  In Progress
                </Text>
                <Text style={[styles.statValue, styles.statValueProgress]}>
                  {stats.inProgress}
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardResolved]}>
                <Text style={[styles.statLabel, styles.statLabelResolved]}>
                  Resolved
                </Text>
                <Text style={[styles.statValue, styles.statValueResolved]}>
                  {stats.resolved}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Personal Information */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Personal Information</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profileData.name}
                  onChangeText={(text) =>
                    setProfileData({ ...profileData, name: text })
                  }
                />
              ) : (
                <Text style={styles.value}>
                  {profileData.name || user?.name}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profileData.phone}
                  onChangeText={(text) =>
                    setProfileData({ ...profileData, phone: text })
                  }
                  placeholder="+1 234 567 8900"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>
                  {profileData.phone || "Not provided"}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role || "CITIZEN"}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Address Information */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Address</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Street</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profileData.address.street}
                  onChangeText={(text) =>
                    setProfileData({
                      ...profileData,
                      address: {
                        ...profileData.address,
                        street: text,
                      },
                    })
                  }
                  placeholder="123 Main Street"
                />
              ) : (
                <Text style={styles.value}>
                  {profileData.address.street || "Not provided"}
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>City</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={profileData.address.city}
                    onChangeText={(text) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          city: text,
                        },
                      })
                    }
                  />
                ) : (
                  <Text style={styles.value}>
                    {profileData.address.city || "-"}
                  </Text>
                )}
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>State</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={profileData.address.state}
                    onChangeText={(text) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          state: text,
                        },
                      })
                    }
                  />
                ) : (
                  <Text style={styles.value}>
                    {profileData.address.state || "-"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>ZIP Code</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={profileData.address.zipCode}
                    onChangeText={(text) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          zipCode: text,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.value}>
                    {profileData.address.zipCode || "-"}
                  </Text>
                )}
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Country</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={profileData.address.country}
                    onChangeText={(text) =>
                      setProfileData({
                        ...profileData,
                        address: {
                          ...profileData.address,
                          country: text,
                        },
                      })
                    }
                  />
                ) : (
                  <Text style={styles.value}>
                    {profileData.address.country || "-"}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Personal Details */}
        <Card style={styles.card} padding="md">
          <Text style={styles.cardTitle}>Personal Details</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Marital Status</Text>
              {isEditing ? (
                <View style={styles.pickerContainer}>
                  <Text style={styles.value}>
                    {profileData.maritalStatus
                      ? profileData.maritalStatus.charAt(0) +
                        profileData.maritalStatus.slice(1).toLowerCase()
                      : "Not provided"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.value}>
                  {profileData.maritalStatus
                    ? profileData.maritalStatus.charAt(0) +
                      profileData.maritalStatus.slice(1).toLowerCase()
                    : "Not provided"}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Occupation</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profileData.personalDetails.occupation}
                  onChangeText={(text) =>
                    setProfileData({
                      ...profileData,
                      personalDetails: {
                        ...profileData.personalDetails,
                        occupation: text,
                      },
                    })
                  }
                  placeholder="e.g., Software Engineer"
                />
              ) : (
                <Text style={styles.value}>
                  {profileData.personalDetails.occupation || "Not provided"}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Onboarding Status Section - For PG_TENANT */}
        {user?.role === "PG_TENANT" && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Onboarding Status</Text>
            <View style={styles.onboardingSection}>
              {/* Overall Status */}
              {user?.onboardingStatus === "completed" && (
                <View style={styles.overallStatus}>
                  <View style={styles.statusCompleted}>
                    <Text style={styles.statusCheckmarkLarge}>✓</Text>
                    <Text style={styles.statusCompletedTextLarge}>
                      Onboarding Completed
                    </Text>
                  </View>
                </View>
              )}

              {/* Show pending status if not completed */}
              {user?.onboardingStatus &&
                user.onboardingStatus !== "completed" && (
                  <View style={styles.overallStatusPending}>
                    <Text style={styles.statusPendingText}>
                      Onboarding Status:{" "}
                      {user.onboardingStatus.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                )}

              {/* eKYC Status */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>eKYC Verification</Text>
                    <Text style={styles.statusSubtitle}>
                      Identity verification status
                    </Text>
                  </View>
                  {user?.kycStatus === "verified" ||
                  user?.onboardingStatus === "completed" ? (
                    <View style={styles.statusCompleted}>
                      <Text style={styles.statusCheckmark}>✓</Text>
                      <Text style={styles.statusCompletedText}>Completed</Text>
                    </View>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        showToast.info("Complete onboarding to verify eKYC");
                      }}
                    >
                      Complete Now
                    </Button>
                  )}
                </View>
                {(user?.kycStatus === "verified" ||
                  user?.onboardingStatus === "completed") && (
                  <View style={styles.statusActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={viewingDocument === "ekyc"}
                      onPress={() => handleViewDocument("ekyc")}
                    >
                      View eKYC Document
                    </Button>
                  </View>
                )}
              </View>

              {/* Rental Agreement Status */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>Rental Agreement</Text>
                    <Text style={styles.statusSubtitle}>
                      PG rental agreement status
                    </Text>
                  </View>
                  {user?.agreementAccepted ||
                  user?.onboardingStatus === "completed" ? (
                    <View style={styles.statusCompleted}>
                      <Text style={styles.statusCheckmark}>✓</Text>
                      <Text style={styles.statusCompletedText}>Completed</Text>
                    </View>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        showToast.info(
                          "Complete onboarding to accept agreement"
                        );
                      }}
                    >
                      Complete Now
                    </Button>
                  )}
                </View>
                {(user?.agreementAccepted ||
                  user?.onboardingStatus === "completed") && (
                  <View style={styles.statusActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={viewingDocument === "agreement"}
                      onPress={() => handleViewDocument("agreement")}
                    >
                      View Agreement Document
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Uploaded Documents Section - For PG_TENANT */}
        {user?.role === "PG_TENANT" && user?.kycDocumentInfo && (
          <Card style={styles.card} padding="md">
            <Text style={styles.cardTitle}>Uploaded Documents</Text>
            <View style={styles.documentsSection}>
              {/* ID Type and Number */}
              {user.kycDocumentInfo.idType && user.kycDocumentInfo.idNumber ? (
                <View style={styles.documentInfoCard}>
                  <View style={styles.documentInfoHeader}>
                    <View style={styles.documentIcon}>
                      <Text style={styles.documentIconText}>🆔</Text>
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentType}>
                        {user.kycDocumentInfo.idType}
                      </Text>
                      <Text style={styles.documentNumber}>
                        {user.kycDocumentInfo.idNumber}
                      </Text>
                    </View>
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
                    </View>
                  </View>
                  <View style={styles.documentActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => navigation.navigate("Documents")}
                    >
                      View All Documents
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.noDocumentsCard}>
                  <Text style={styles.noDocumentsText}>
                    No documents uploaded yet. Complete onboarding to upload
                    your ID documents.
                  </Text>
                </View>
              )}

              {/* Uploaded Images Display */}
              <View style={styles.imagesSection}>
                <Text style={styles.imagesSectionTitle}>Uploaded Images</Text>
                <View style={styles.imagesGrid}>
                  {/* ID Front Image */}
                  <View style={styles.imageCard}>
                    <Text style={styles.imageTitle}>ID Front</Text>
                    {user.kycDocumentInfo.idFrontBase64 ? (
                      <>
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${user.kycDocumentInfo.idFrontBase64}`,
                          }}
                          style={styles.kycImage}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            // Open image in full screen view
                            navigation.navigate("ImageViewer", {
                              imageUri: `data:image/jpeg;base64,${user.kycDocumentInfo.idFrontBase64}`,
                              title: "ID Front",
                            });
                          }}
                          style={styles.viewImageButton}
                        >
                          <Text style={styles.viewImageButtonText}>
                            View Image
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>📷</Text>
                        <Text style={styles.imagePlaceholderText}>
                          Not uploaded
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ID Back Image */}
                  <View style={styles.imageCard}>
                    <Text style={styles.imageTitle}>ID Back</Text>
                    {user.kycDocumentInfo.idBackBase64 ? (
                      <>
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${user.kycDocumentInfo.idBackBase64}`,
                          }}
                          style={styles.kycImage}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            navigation.navigate("ImageViewer", {
                              imageUri: `data:image/jpeg;base64,${user.kycDocumentInfo.idBackBase64}`,
                              title: "ID Back",
                            });
                          }}
                          style={styles.viewImageButton}
                        >
                          <Text style={styles.viewImageButtonText}>
                            View Image
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>📷</Text>
                        <Text style={styles.imagePlaceholderText}>
                          Not uploaded
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Selfie Image */}
                  <View style={styles.imageCard}>
                    <Text style={styles.imageTitle}>Selfie</Text>
                    {user.kycDocumentInfo.selfieBase64 ? (
                      <>
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${user.kycDocumentInfo.selfieBase64}`,
                          }}
                          style={styles.kycImage}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            navigation.navigate("ImageViewer", {
                              imageUri: `data:image/jpeg;base64,${user.kycDocumentInfo.selfieBase64}`,
                              title: "Selfie",
                            });
                          }}
                          style={styles.viewImageButton}
                        >
                          <Text style={styles.viewImageButtonText}>
                            View Image
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>👤</Text>
                        <Text style={styles.imagePlaceholderText}>
                          Not uploaded
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* View All Images as PDF Button */}
                {(user.kycDocumentInfo.idFrontBase64 ||
                  user.kycDocumentInfo.idBackBase64 ||
                  user.kycDocumentInfo.selfieBase64) && (
                  <View style={styles.pdfButtonContainer}>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={async () => {
                        try {
                          const token = await AsyncStorage.getItem("token");
                          const response = await fetch(
                            `${config.API_BASE_URL}/documents/generate-images-pdf`,
                            {
                              method: "GET",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(
                              error.error || "Failed to generate PDF"
                            );
                          }

                          // Download PDF to file system
                          const fileUri = `${
                            FileSystem.documentDirectory
                          }kyc-images-${Date.now()}.pdf`;

                          // Get response as blob first, then convert
                          const blob = await response.blob();
                          const reader = new FileReader();

                          reader.onloadend = async () => {
                            try {
                              const base64data = reader.result;
                              // Extract base64 string (remove data URL prefix if present)
                              const base64 = base64data.includes(",")
                                ? base64data.split(",")[1]
                                : base64data;

                              // Save to file system
                              await FileSystem.writeAsStringAsync(
                                fileUri,
                                base64,
                                {
                                  encoding: FileSystem.EncodingType.Base64,
                                }
                              );

                              // Share/open the PDF
                              if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(fileUri, {
                                  mimeType: "application/pdf",
                                  dialogTitle: "KYC Images PDF",
                                });
                                showToast.success("PDF generated successfully");
                              } else {
                                await Linking.openURL(fileUri);
                                showToast.success("PDF generated successfully");
                              }
                            } catch (error) {
                              console.error("PDF save error:", error);
                              showToast.error("Failed to save PDF");
                            }
                          };

                          reader.readAsDataURL(blob);
                        } catch (error) {
                          console.error("PDF generation error:", error);
                          showToast.error(
                            error.message ||
                              "Failed to generate PDF. Please try again."
                          );
                        }
                      }}
                    >
                      View All Images as PDF
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Logout Button */}
        <Card style={styles.card}>
          <View style={styles.logoutSection}>
            <Text style={styles.logoutTitle}>Account Actions</Text>
            <Text style={styles.logoutDescription}>
              Sign out from your account
            </Text>
            <Button
              variant="danger"
              onPress={() => {
                logout();
                showToast.success("Logged out successfully");
              }}
              style={styles.logoutButton}
            >
              Logout
            </Button>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: "#2563eb",
  },
  avatarPlaceholder: {
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 48,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  avatarActions: {
    flex: 1,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  avatarHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  statCardDefault: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  statCardNew: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
  statCardProgress: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  statCardResolved: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  statLabelNew: {
    color: "#3B82F6",
  },
  statLabelProgress: {
    color: "#F59E0B",
  },
  statLabelResolved: {
    color: "#10B981",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statValueNew: {
    color: "#3B82F6",
  },
  statValueProgress: {
    color: "#F59E0B",
  },
  statValueResolved: {
    color: "#10B981",
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  value: {
    fontSize: 16,
    color: "#1F2937",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  onboardingSection: {
    gap: 16,
  },
  overallStatus: {
    padding: 16,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 8,
  },
  overallStatusPending: {
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
    marginBottom: 8,
  },
  statusPendingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F59E0B",
    textAlign: "center",
  },
  statusCheckmarkLarge: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#10B981",
  },
  statusCompletedTextLarge: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10B981",
  },
  statusCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusCompleted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusCheckmark: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
  },
  statusCompletedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  statusActions: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  documentsSection: {
    gap: 16,
  },
  documentInfoCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  documentInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  documentIconText: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: "#6B7280",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  uploadedBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
  },
  documentActions: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  noDocumentsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  noDocumentsText: {
    fontSize: 14,
    color: "#6B7280",
  },
  imagesSection: {
    marginTop: 16,
  },
  imagesSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageCard: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  kycImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: "#6B7280",
  },
  viewImageButton: {
    width: "100%",
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  viewImageButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563EB",
  },
  pdfButtonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  logoutSection: {
    padding: 16,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  logoutDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  logoutButton: {
    width: "100%",
  },
});
