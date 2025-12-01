import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import Button from "./Button";

export default function Modal({
  visible,
  onClose,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  variant = "primary",
}) {
  const handleCancel = () => {
    if (!loading && onCancel) {
      onCancel();
    } else if (!loading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!loading && onConfirm) {
      onConfirm();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modal}>
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                </View>
              )}
              <View style={styles.content}>{children}</View>
              {(onConfirm || onCancel) && (
                <View style={styles.footer}>
                  {onCancel && (
                    <Button
                      variant="secondary"
                      onPress={handleCancel}
                      disabled={loading}
                      style={styles.footerButton}
                    >
                      {cancelText}
                    </Button>
                  )}
                  {onConfirm && (
                    <Button
                      variant={variant}
                      onPress={handleConfirm}
                      loading={loading}
                      disabled={loading}
                      style={styles.footerButton}
                    >
                      {confirmText}
                    </Button>
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    padding: 20,
    maxHeight: "60%",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerButton: {
    minWidth: 100,
  },
});
