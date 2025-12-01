import Toast from "react-native-toast-message";

/**
 * Toast notification utilities for mobile
 */
export const showToast = {
  success: (message) => {
    Toast.show({
      type: "success",
      text1: "Success",
      text2: message,
      position: "top",
      visibilityTime: 4000,
    });
  },
  error: (message) => {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: message,
      position: "top",
      visibilityTime: 4000,
    });
  },
  info: (message) => {
    Toast.show({
      type: "info",
      text1: "Info",
      text2: message,
      position: "top",
      visibilityTime: 4000,
    });
  },
};
