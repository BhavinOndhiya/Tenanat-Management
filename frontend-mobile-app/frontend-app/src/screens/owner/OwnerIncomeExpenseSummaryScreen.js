import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const OwnerIncomeExpenseSummaryScreen = ({ route }) => {
  const { month, year } = route.params || {};
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {month} {year} Income & Expense Summary
        </Text>
        <Text style={styles.subtitle}>
          Detailed reporting is coming soon. Hook this screen to the finance
          module once the API is ready.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 22,
  },
});

export default OwnerIncomeExpenseSummaryScreen;
