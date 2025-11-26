import { toast } from "react-toastify";

/**
 * Toast notification utilities
 */
export const showToast = {
  success: (message) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      closeButton: true, // Built-in close button
    });
  },
  error: (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      closeButton: true, // Built-in close button
    });
  },
  info: (message) => {
    toast.info(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      closeButton: true, // Built-in close button
    });
  },
  loading: (message) => {
    // react-toastify doesn't have toast.loading, use toast() with isLoading
    return toast(message, {
      type: "info",
      position: "top-right",
      autoClose: false, // Loading toasts don't auto-dismiss
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      closeButton: true, // Built-in close button
      isLoading: true,
    });
  },
  promise: (promise, messages) => {
    // react-toastify doesn't have toast.promise, manually handle promise states
    const toastId = toast(messages.pending || "Loading...", {
      type: "info",
      position: "top-right",
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      closeButton: true,
      isLoading: true,
    });

    promise
      .then((result) => {
        toast.update(toastId, {
          render: messages.success || "Success!",
          type: "success",
          autoClose: 5000,
          isLoading: false,
        });
        return result;
      })
      .catch((error) => {
        toast.update(toastId, {
          render: messages.error || error.message || "An error occurred",
          type: "error",
          autoClose: 5000,
          isLoading: false,
        });
        throw error;
      });

    return promise;
  },
};

export default showToast;
