import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function DocumentsScreen() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (user?.onboardingStatus === "completed") {
      const timer = setTimeout(() => {
        fetchDocuments();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.onboardingStatus]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getMyDocuments();
      setDocuments(data.documents || []);
      setUserInfo(data.user);
    } catch (error) {
      showToast.error(error.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  const handleDownload = async (type) => {
    try {
      setDownloading(type);
      const token = await AsyncStorage.getItem("token");
      const { config } = await import("../../utils/config");

      const url = `${config.API_BASE_URL}/documents/download/${type}`;
      const fileName = `${type}-${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
        showToast.success("Document downloaded successfully");
      } else {
        await Linking.openURL(downloadResult.uri);
        showToast.info("Opening document");
      }
    } catch (error) {
      showToast.error(error.message || "Failed to download document");
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (type) => {
    try {
      setDownloading(type);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        showToast.error("Authentication required. Please log in again.");
        return;
      }

      // For web, use the API method which opens in new tab
      if (Platform.OS === "web") {
        await api.viewDocument(type);
        showToast.success("Opening document");
        return;
      }

      // For native, download first then open
      const { config } = await import("../../utils/config");
      const url = `${config.API_BASE_URL}/documents/download/${type}`;
      const fileName = `${type}-${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the file with auth headers
      const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Open the downloaded file
      await Linking.openURL(downloadResult.uri);
      showToast.success("Opening document");
    } catch (error) {
      console.error("View document error:", error);
      showToast.error(error.message || "Failed to view document");
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateDocuments = async () => {
    try {
      setGenerating(true);
      setShowGenerateModal(false);
      const result = await api.generateDocuments();
      showToast.success(result.message || "Documents generated successfully!");

      if (result.emailStatus) {
        if (result.emailStatus.sent) {
          showToast.success(
            "Documents sent via email to you and your PG owner"
          );
        } else if (result.emailStatus.configured) {
          showToast.info(
            `Documents generated but email sending had issues: ${
              result.emailStatus.error || "Unknown error"
            }`
          );
        } else {
          showToast.info(
            "Documents generated but email is not configured. You can download them below."
          );
        }
      }

      await fetchDocuments();
    } catch (error) {
      showToast.error(error.message || "Failed to generate documents");
    } finally {
      setGenerating(false);
    }
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
          <Text style={styles.title}>My Documents</Text>
          <Text style={styles.subtitle}>
            View and download your eKYC and PG Agreement documents
          </Text>
        </View>

        {documents.length === 0 ? (
          <Card style={styles.card} padding="md">
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No documents available yet.</Text>
              {userInfo?.onboardingStatus === "completed" ? (
                <View style={styles.emptyActions}>
                  <Text style={styles.emptySubtext}>
                    You have completed onboarding. Generate your documents now
                    to receive your eKYC and PG Agreement PDFs via email.
                  </Text>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={generating}
                    onPress={() => setShowGenerateModal(true)}
                    style={styles.generateButton}
                  >
                    {generating
                      ? "Generating Documents..."
                      : "Generate Documents"}
                  </Button>
                </View>
              ) : (
                <Text style={styles.emptySubtext}>
                  Documents will be available after completing the onboarding
                  process.
                </Text>
              )}
            </View>
          </Card>
        ) : documents.some((doc) => !doc.available) &&
          userInfo?.onboardingStatus === "completed" ? (
          <View>
            <View style={styles.documentsGrid}>
              {documents.map((doc) => (
                <Card key={doc.type} style={styles.docCard} padding="md">
                  <View style={styles.docHeader}>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      {doc.generatedAt && (
                        <Text style={styles.docDate}>
                          Generated:{" "}
                          {new Date(doc.generatedAt).toLocaleDateString(
                            "en-IN",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        doc.available
                          ? styles.statusAvailable
                          : styles.statusUnavailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          doc.available
                            ? styles.statusTextAvailable
                            : styles.statusTextUnavailable,
                        ]}
                      >
                        {doc.available ? "Available" : "Not Generated"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.docActions}>
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={!doc.available}
                      loading={downloading === doc.type}
                      onPress={() => handleView(doc.type)}
                      style={styles.docButton}
                    >
                      {doc.available ? "View PDF" : "Not Available"}
                    </Button>
                    <Button
                      variant={doc.available ? "primary" : "secondary"}
                      fullWidth
                      disabled={!doc.available}
                      loading={downloading === doc.type}
                      onPress={() => handleDownload(doc.type)}
                      style={styles.docButton}
                    >
                      {doc.available ? "Download" : "Not Available"}
                    </Button>
                  </View>
                </Card>
              ))}
            </View>
            <Card style={styles.card} padding="md">
              <View style={styles.generateContainer}>
                <Text style={styles.generateText}>
                  Some documents are not yet generated. Generate them now to
                  receive your eKYC and PG Agreement PDFs via email.
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  loading={generating}
                  onPress={() => setShowGenerateModal(true)}
                  style={styles.generateButton}
                >
                  {generating
                    ? "Generating Documents..."
                    : "Generate Documents"}
                </Button>
              </View>
            </Card>
          </View>
        ) : (
          <View style={styles.documentsGrid}>
            {documents.map((doc) => (
              <Card key={doc.type} style={styles.docCard} padding="md">
                <View style={styles.docHeader}>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    {doc.generatedAt && (
                      <Text style={styles.docDate}>
                        Generated:{" "}
                        {new Date(doc.generatedAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, styles.statusAvailable]}>
                    <Text
                      style={[styles.statusText, styles.statusTextAvailable]}
                    >
                      {doc.available ? "Available" : "Not Available"}
                    </Text>
                  </View>
                </View>

                <View style={styles.docActions}>
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={!doc.available}
                    loading={downloading === doc.type}
                    onPress={() => handleView(doc.type)}
                    style={styles.docButton}
                  >
                    {doc.available ? "View PDF" : "Not Available"}
                  </Button>
                  <Button
                    variant={doc.available ? "primary" : "secondary"}
                    fullWidth
                    disabled={!doc.available}
                    loading={downloading === doc.type}
                    onPress={() => handleDownload(doc.type)}
                    style={styles.docButton}
                  >
                    {doc.available ? "Download" : "Not Available"}
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Generate Documents Confirmation Modal */}
        <Modal
          visible={showGenerateModal}
          onClose={() => !generating && setShowGenerateModal(false)}
          title="Generate Documents"
          confirmText="Generate & Send"
          cancelText="Cancel"
          onConfirm={handleGenerateDocuments}
          onCancel={() => setShowGenerateModal(false)}
          loading={generating}
          variant="primary"
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              This will generate your eKYC and PG Agreement PDFs using your
              existing onboarding data.
            </Text>
            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoTitle}>What will happen:</Text>
              <View style={styles.modalList}>
                <Text style={styles.modalListItem}>
                  • Generate eKYC Verification Document PDF
                </Text>
                <Text style={styles.modalListItem}>
                  • Generate PG Rental Agreement PDF
                </Text>
                <Text style={styles.modalListItem}>
                  • Email both documents to you
                </Text>
                <Text style={styles.modalListItem}>
                  • Email both documents to your PG owner
                </Text>
              </View>
            </View>
            <Text style={styles.modalFooter}>
              Documents will be stored securely and available for download after
              generation.
            </Text>
          </View>
        </Modal>
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyActions: {
    width: "100%",
    alignItems: "center",
  },
  generateButton: {
    marginTop: 8,
  },
  documentsGrid: {
    gap: 16,
    marginBottom: 16,
  },
  docCard: {
    marginBottom: 0,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  docDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: "#D1FAE5",
  },
  statusUnavailable: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextAvailable: {
    color: "#065F46",
  },
  statusTextUnavailable: {
    color: "#92400E",
  },
  docActions: {
    flexDirection: "row",
    gap: 12,
  },
  docButton: {
    flex: 1,
  },
  generateContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  generateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modalContent: {
    gap: 12,
  },
  modalText: {
    fontSize: 14,
    color: "#1F2937",
  },
  modalInfoBox: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  modalInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalList: {
    gap: 4,
  },
  modalListItem: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalFooter: {
    fontSize: 12,
    color: "#6B7280",
  },
});
