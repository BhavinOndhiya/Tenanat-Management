import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { api } from "../utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function TenantManagementScreen() {
  const [tenants, setTenants] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [tenantsData, flatsData] = await Promise.all([
        api.getTenantUsers().catch(() => []),
        api.getMyOwnedFlats().catch(() => []),
      ]);
      setTenants(tenantsData);
      setFlats(flatsData);
    } catch (error) {
      console.error("Error loading tenant data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderTenant = ({ item }) => (
    <View style={styles.tenantCard}>
      <View style={styles.tenantInfo}>
        <Text style={styles.tenantName}>{item.name}</Text>
        <Text style={styles.tenantEmail}>{item.email}</Text>
        <Text style={styles.tenantPhone}>{item.phone || "No phone"}</Text>
      </View>
      {item.flat && (
        <View style={styles.flatInfo}>
          <Text style={styles.flatText}>
            {item.flat.buildingName} · {item.flat.flatNumber}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>My Flats</Text>
        {flats.length === 0 ? (
          <Text style={styles.emptyText}>No flats owned</Text>
        ) : (
          flats.map((flat) => (
            <View key={flat.id} style={styles.flatCard}>
              <Text style={styles.flatTitle}>
                {flat.buildingName} · {flat.flatNumber}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenants</Text>
        <FlatList
          data={tenants}
          renderItem={renderTenant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tenants found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  flatCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  flatTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e40af",
  },
  list: {
    padding: 16,
  },
  tenantCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tenantInfo: {
    marginBottom: 8,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  tenantEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  tenantPhone: {
    fontSize: 14,
    color: "#6b7280",
  },
  flatInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  flatText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
