import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import { config } from "../../utils/config";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function OwnerDocumentsScreen() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await api.getTenantDocuments();
      setTenants(data.tenants || []);
    } catch (error) {
      showToast.error(error.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTenants();
    setRefreshing(false);
  };

  const fetchTenantDocuments = async (tenantId) => {
    try {
      setLoadingTenant(true);
      const data = await api.getTenantDocuments(tenantId);
      setDocuments(data.documents || []);
      setSelectedTenant(data.tenant);
    } catch (error) {
      showToast.error(error.message || "Failed to load tenant documents");
    } finally {
      setLoadingTenant(false);
    }
  };

  const handleDownload = async (type) => {
    if (!selectedTenant) return;

    try {
      setDownloading(type);
      const token = await AsyncStorage.getItem("token");
      const url = `${config.API_BASE_URL}/documents/tenant-download/${selectedTenant.id}/${type}`;
      const fileName = `${type}-${selectedTenant.id}-${Date.now()}.pdf`;
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
    if (!selectedTenant) return;

    try {
      setDownloading(type);
      const token = await AsyncStorage.getItem("token");
      const url = `${config.API_BASE_URL}/documents/tenant-download/${selectedTenant.id}/${type}`;
      await Linking.openURL(url);
    } catch (error) {
      showToast.error(error.message || "Failed to view document");
    } finally {
      setDownloading(null);
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
          <Text style={styles.title}>Tenant Documents</Text>
          <Text style={styles.subtitle}>
            View and download documents for your PG tenants
          </Text>
        </View>

        <View style={styles.layout}>
          <Card style={styles.tenantsCard} padding="md">
            <Text style={styles.cardTitle}>Select Tenant</Text>
            {tenants.length === 0 ? (
              <Text style={styles.emptyText}>No tenants found.</Text>
            ) : (
              <View style={styles.tenantsList}>
                {tenants.map((tenant) => (
                  <TouchableOpacity
                    key={tenant.id}
                    style={[
                      styles.tenantCard,
                      selectedTenant?.id === tenant.id &&
                        styles.tenantCardSelected,
                    ]}
                    onPress={() => fetchTenantDocuments(tenant.id)}
                  >
                    <Text style={styles.tenantName}>{tenant.name}</Text>
                    <Text style={styles.tenantEmail}>{tenant.email}</Text>
                    {tenant.property && (
                      <Text style={styles.tenantProperty}>
                        {tenant.property.name}
                      </Text>
                    )}
                    <View style={styles.tenantBadge}>
                      <View
                        style={[
                          styles.badge,
                          tenant.hasDocuments
                            ? styles.badgeAvailable
                            : styles.badgeUnavailable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            tenant.hasDocuments
                              ? styles.badgeTextAvailable
                              : styles.badgeTextUnavailable,
                          ]}
                        >
                          {tenant.hasDocuments
                            ? "Documents Available"
                            : "No Documents"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.documentsCard} padding="md">
            {!selectedTenant ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Select a tenant to view their documents
                </Text>
              </View>
            ) : loadingTenant ? (
              <Loader />
            ) : (
              <View>
                <View style={styles.tenantHeader}>
                  <Text style={styles.tenantHeaderTitle}>
                    Documents for {selectedTenant.name}
                  </Text>
                  <Text style={styles.tenantHeaderEmail}>
                    {selectedTenant.email}
                  </Text>
                </View>

                {documents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No documents available for this tenant.
                    </Text>
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
              </View>
            )}
          </Card>
        </View>
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
  layout: {
    gap: 16,
  },
  tenantsCard: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  tenantsList: {
    gap: 12,
  },
  tenantCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  tenantCardSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#EEF2FF",
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  tenantEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  tenantProperty: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  tenantBadge: {
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeAvailable: {
    backgroundColor: "#D1FAE5",
  },
  badgeUnavailable: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  badgeTextAvailable: {
    color: "#065F46",
  },
  badgeTextUnavailable: {
    color: "#991B1B",
  },
  documentsCard: {
    marginBottom: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  tenantHeader: {
    marginBottom: 24,
  },
  tenantHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  tenantHeaderEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  documentsGrid: {
    gap: 16,
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
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
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
});
