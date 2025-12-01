import React from "react";
import { View, StyleSheet } from "react-native";

/**
 * Modern Card Component for React Native
 */
export default function Card({ children, style, padding = "lg", ...props }) {
  const paddingStyles = {
    sm: { padding: 16 },
    md: { padding: 24 },
    lg: { padding: 32 },
  };

  return (
    <View style={[styles.card, paddingStyles[padding], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

