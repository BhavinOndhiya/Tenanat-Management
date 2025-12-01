import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

/**
 * Loading Spinner Component for React Native
 */
export default function Loader({ size = "md", style }) {
  const sizeMap = {
    sm: "small",
    md: "large",
    lg: "large",
  };

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={sizeMap[size]} color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

