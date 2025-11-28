import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useOwnerDashboardSummary } from "../../hooks/useOwnerDashboardSummary";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (value = 0) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const OwnerDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { summary, loading, error, refetch } = useOwnerDashboardSummary();

  const displayName = summary.ownerName || user?.name || "Owner";
  const now = new Date();
  const monthLabel =
    summary.month || now.toLocaleString("en-US", { month: "short" });
  const yearLabel = summary.year || now.getFullYear();
  const totalBeds = summary.totalBeds ?? 0;
  const occupiedBeds = summary.occupiedBeds ?? 0;
  const vacantBeds =
    summary.vacantBeds ?? Math.max(totalBeds - occupiedBeds, 0);
  const totalTenants = summary.totalTenants ?? 0;
  const newTenants = summary.newTenants ?? 0;

  const quickActions = useMemo(
    () => [
      {
        key: "inventory",
        label: "Manage Inventory",
        icon: "cube-outline",
        bg: "#E0F2FE",
      },
      {
        key: "manageTenants",
        label: "Manage Tenants",
        icon: "people-circle-outline",
        route: "TenantManagement",
        bg: "#E0E7FF",
      },
      {
        key: "tenantDues",
        label: "Tenant Dues",
        icon: "cash-outline",
        bg: "#FEF3C7",
      },
      {
        key: "addTenant",
        label: "Add Tenant",
        icon: "person-add-outline",
        route: "TenantManagement",
        bg: "#F3E8FF",
      },
      { key: "leads", label: "Leads", icon: "podium-outline", bg: "#DBEAFE" },
      {
        key: "staff",
        label: "Manage Staff",
        icon: "briefcase-outline",
        bg: "#E5E7EB",
      },
      {
        key: "complaints",
        label: "Complaints",
        icon: "alert-circle-outline",
        bg: "#FEE2E2",
      },
      {
        key: "extraCharges",
        label: "Extra Charges",
        icon: "receipt-outline",
        bg: "#F3F4F6",
      },
      {
        key: "expenses",
        label: "Expenses",
        icon: "wallet-outline",
        bg: "#E0F2FE",
      },
      {
        key: "notice",
        label: "Send Notice",
        icon: "mail-outline",
        bg: "#EDE9FE",
      },
      {
        key: "parcels",
        label: "Parcels",
        icon: "cube",
        bg: "#FCE7F3",
      },
      {
        key: "requests",
        label: "Requests",
        icon: "chatbubbles-outline",
        bg: "#DCFCE7",
      },
    ],
    []
  );

  const handleQuickActionPress = (action) => {
    if (action.route) {
      navigation.navigate(action.route, action.params);
    } else {
      navigation.navigate("ComingSoon", { title: action.label });
    }
  };

  const rentImpactCards = [
    {
      title: "Next Month",
      data: summary.nextMonthRentImpact || {},
    },
    {
      title: "Following Month",
      data: summary.followingMonthRentImpact || {},
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcomeText}>Welcome 👋</Text>
          <Text style={styles.ownerName}>{displayName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="analytics-outline" size={20} color="#1D4ED8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={20} color="#1D4ED8" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1D4ED8" />
          <Text style={styles.loadingText}>Fetching latest summary...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate("AddProperty")}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.primaryCardTitle}>Add your first property</Text>
          <Text style={styles.primaryCardSubtitle}>
            Bring your entire portfolio online
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text
            style={styles.cardTitle}
          >{`${monthLabel} ${yearLabel} Summary`}</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("OwnerIncomeExpenseSummary", {
                month: monthLabel,
                year: yearLabel,
              })
            }
            style={styles.cardLink}
          >
            <Text style={styles.cardLinkText}>Income & Expense Summary</Text>
            <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
          </TouchableOpacity>
        </View>

        <View style={styles.highlightBox}>
          <View style={styles.highlightColumn}>
            <Text style={styles.highlightLabel}>Total Collection</Text>
            <Text style={styles.highlightValue}>
              {formatCurrency(summary.totalCollection ?? 0)}
            </Text>
          </View>
          <View style={styles.highlightColumn}>
            <Text style={styles.highlightLabel}>Total Expenses</Text>
            <Text style={styles.highlightValue}>
              {formatCurrency(summary.totalExpenses ?? 0)}
            </Text>
          </View>
          <View style={styles.highlightColumn}>
            <Text style={styles.highlightLabel}>Profit / Loss</Text>
            <Text style={styles.highlightValue}>
              {formatCurrency(summary.profitLoss ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Portfolio Snapshot</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryIconCircle}>
              <MaterialCommunityIcons
                name="bed-outline"
                size={22}
                color="#1D4ED8"
              />
            </View>
            <Text style={styles.summaryLabel}>Total Beds</Text>
            <Text style={styles.summaryValue}>
              {`${occupiedBeds}/${totalBeds}`}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <View
              style={[styles.summaryIconCircle, styles.iconCircleSecondary]}
            >
              <MaterialCommunityIcons
                name="bed-empty"
                size={22}
                color="#059669"
              />
            </View>
            <Text style={styles.summaryLabel}>Vacant Beds</Text>
            <Text style={styles.summaryValue}>{vacantBeds}</Text>
          </View>
          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconCircle, styles.iconCircleAccent]}>
              <Ionicons name="people" size={22} color="#DC2626" />
            </View>
            <Text style={styles.summaryLabel}>Total Tenants</Text>
            <Text style={styles.summaryValue}>{totalTenants}</Text>
          </View>
          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconCircle, styles.iconCircleMuted]}>
              <Ionicons name="person-add" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.summaryLabel}>New Tenants</Text>
            <Text style={styles.summaryValue}>{newTenants}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.cardSubtitle}>Stay on top of daily ops</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[styles.quickActionItem, { backgroundColor: action.bg }]}
              activeOpacity={0.85}
              onPress={() => handleQuickActionPress(action)}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={22} color="#1F2937" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Rent Impact Summary</Text>
          <Text style={styles.cardSubtitle}>Projected cash flow changes</Text>
        </View>
        <View style={styles.rentImpactRow}>
          {rentImpactCards.map((card) => (
            <View key={card.title} style={styles.rentImpactCard}>
              <Text style={styles.rentImpactTitle}>{card.title}</Text>
              <Text style={styles.rentImpactAmount}>
                {formatCurrency(card.data.amount ?? 0)}
              </Text>
              <View style={styles.rentImpactMetaRow}>
                <View style={styles.rentImpactMeta}>
                  <Ionicons
                    name="arrow-down-circle"
                    size={16}
                    color="#DC2626"
                  />
                  <Text style={styles.rentImpactMetaLabel}>
                    Move Out {card.data.moveOut ?? 0}
                  </Text>
                </View>
                <View style={styles.rentImpactMeta}>
                  <Ionicons name="arrow-up-circle" size={16} color="#059669" />
                  <Text style={styles.rentImpactMetaLabel}>
                    Move In {card.data.moveIn ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: "#4338CA",
    fontWeight: "600",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "600",
    marginBottom: 4,
  },
  retryText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  primaryCard: {
    backgroundColor: "#1D4ED8",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  primaryCardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  primaryCardSubtitle: {
    color: "#E0E7FF",
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  cardLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardLinkText: {
    color: "#1D4ED8",
    fontWeight: "600",
    fontSize: 13,
  },
  highlightBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  highlightColumn: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 13,
    color: "#065F46",
    marginBottom: 6,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#064E3B",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryBox: {
    flexBasis: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconCircleSecondary: {
    backgroundColor: "#D1FAE5",
  },
  iconCircleAccent: {
    backgroundColor: "#FEE2E2",
  },
  iconCircleMuted: {
    backgroundColor: "#EDE9FE",
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionItem: {
    width: "30%",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    textAlign: "center",
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "600",
  },
  rentImpactRow: {
    flexDirection: "row",
    gap: 12,
  },
  rentImpactCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
  },
  rentImpactTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  rentImpactAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  rentImpactMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rentImpactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rentImpactMetaLabel: {
    fontSize: 12,
    color: "#4B5563",
  },
});

export default OwnerDashboardScreen;
