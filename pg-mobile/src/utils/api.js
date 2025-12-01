import AsyncStorage from "@react-native-async-storage/async-storage";
import { config } from "./config";

// API Base URL - should be set via environment variable or config
export const API_BASE_URL = config.API_BASE_URL;

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const api = {
  async request(endpoint, options = {}) {
    const token = await AsyncStorage.getItem("token");

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (
      options.body &&
      typeof options.body === "object" &&
      !(options.body instanceof FormData)
    ) {
      config.body = JSON.stringify(options.body);
    } else if (options.body instanceof FormData) {
      // For FormData, don't set Content-Type - let fetch set it with boundary
      delete config.headers["Content-Type"];
      config.body = options.body;
    }

    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`[API] Making request to: ${url}`, {
        method: config.method || "GET",
        headers: config.headers,
      });

      const response = await fetch(url, config);

      // Handle non-JSON responses
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { error: (await response.text()) || "Request failed" };
      }

      if (!response.ok) {
        console.error(`[API] Request failed: ${response.status}`, {
          url,
          status: response.status,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        });

        const errorMessage =
          data.error || `Request failed with status ${response.status}`;

        // Handle auth errors - clear storage on 401/403
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          // Navigation will be handled by auth context
        }

        throw new Error(errorMessage);
      }

      console.log(`[API] Request successful: ${url}`, data);
      return data;
    } catch (error) {
      // Check for CORS or network errors
      const isNetworkError =
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("Network request failed") ||
        error.message?.includes("NetworkError") ||
        error.name === "TypeError" ||
        error.name === "NetworkError";

      if (isNetworkError) {
        console.error("[API] Network/CORS Error:", {
          endpoint,
          url: `${API_BASE_URL}${endpoint}`,
          error: error.message,
          name: error.name,
          stack: error.stack,
        });
        // Provide a more helpful error message
        const corsError = new Error(
          `Network error: Unable to connect to ${API_BASE_URL}. Please check your API configuration and ensure CORS is properly configured on the server.`
        );
        corsError.name = "NetworkError";
        throw corsError;
      }

      console.error("[API] Error:", {
        endpoint,
        url: `${API_BASE_URL}${endpoint}`,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  // Auth endpoints
  async register(name, email, password) {
    return this.request("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
  },

  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  // OAuth endpoints
  async loginWithGoogle(idToken) {
    return this.request("/auth/google", {
      method: "POST",
      body: { idToken },
    });
  },

  async loginWithFacebook(accessToken) {
    return this.request("/auth/facebook", {
      method: "POST",
      body: { accessToken },
    });
  },

  async verifySetupToken(token) {
    return this.request(
      `/auth/verify-setup-token?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
      }
    );
  },

  async setupPassword(token, password) {
    return this.request("/auth/setup-password", {
      method: "POST",
      body: { token, password },
    });
  },

  // Tenant onboarding endpoints
  async getTenantOnboarding() {
    return this.request("/tenant/onboarding");
  },

  async submitTenantKyc(formData) {
    // FormData for file uploads
    const token = await AsyncStorage.getItem("token");
    const formDataToSend = new FormData();

    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        if (key === "idFront" || key === "idBack" || key === "selfie") {
          // File uploads - formData[key] should be a file URI or object with uri, type, name
          if (formData[key]) {
            const file = formData[key];
            if (file.uri) {
              formDataToSend.append(key, {
                uri: file.uri,
                type: file.type || "image/jpeg",
                name: file.name || `${key}.jpg`,
              });
            }
          }
        } else {
          // Regular fields
          formDataToSend.append(key, formData[key]);
        }
      }
    });

    const response = await fetch(`${API_BASE_URL}/tenant/ekyc`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formDataToSend,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "KYC submission failed");
    }

    return response.json();
  },

  async getAgreementPreview() {
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/tenant/agreement/preview`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to fetch agreement");
    }

    return response.text(); // Return HTML as text
  },

  async acceptAgreement(otp, consentFlags) {
    return this.request("/tenant/agreement/accept", {
      method: "POST",
      body: { otp, consentFlags },
    });
  },

  async forgotPassword(email) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  },

  async resetPassword(token, password) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
  },

  async updatePassword(token, password) {
    return this.request("/auth/update-password", {
      method: "POST",
      body: { token, password },
    });
  },

  async getMe() {
    return this.request("/me");
  },

  // Complaint endpoints
  async createComplaint(title, description, category, flatId) {
    return this.request("/complaints", {
      method: "POST",
      body: {
        title,
        description,
        category,
        ...(flatId ? { flatId } : {}),
      },
    });
  },

  async getMyComplaints() {
    return this.request("/complaints/my");
  },

  // Officer endpoints
  async getOfficerComplaints() {
    return this.request("/officer/complaints");
  },

  async updateComplaintStatus(complaintId, status) {
    return this.request(`/officer/complaints/${complaintId}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  async assignComplaintToMe(complaintId) {
    return this.request(`/officer/complaints/${complaintId}/assign`, {
      method: "PATCH",
    });
  },

  // Profile endpoints
  async getProfile() {
    return this.request("/profile");
  },

  async updateProfile(profileData) {
    return this.request("/profile", {
      method: "PATCH",
      body: profileData,
    });
  },

  // Flats & assignments
  async getMyFlats() {
    return this.request("/flats/my");
  },

  // Announcements
  async getAnnouncements() {
    return this.request("/announcements");
  },

  async getAdminAnnouncements(params) {
    return this.request(`/admin/announcements${buildQuery(params)}`);
  },

  async createAnnouncement(payload) {
    return this.request("/admin/announcements", {
      method: "POST",
      body: payload,
    });
  },

  async updateAnnouncement(id, payload) {
    return this.request(`/admin/announcements/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deleteAnnouncement(id) {
    return this.request(`/admin/announcements/${id}`, {
      method: "DELETE",
    });
  },

  // Events
  async getEvents() {
    return this.request("/events");
  },

  async createEvent(payload) {
    return this.request("/events", {
      method: "POST",
      body: payload,
    });
  },

  async updateEvent(id, payload) {
    return this.request(`/events/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deleteEvent(id) {
    return this.request(`/events/${id}`, { method: "DELETE" });
  },

  async setEventParticipation(eventId, status) {
    return this.request(`/events/${eventId}/participation`, {
      method: "POST",
      body: { status },
    });
  },

  async getEventParticipants(eventId) {
    return this.request(`/events/${eventId}/participants`);
  },

  // Documents
  async getMyDocuments() {
    return this.request("/documents/my-documents");
  },

  async downloadDocument(type) {
    // type: 'ekyc' or 'agreement'
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/documents/download/${type}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to download document");
    }

    // For mobile, return blob URL or file path
    const blob = await response.blob();
    return blob;
  },

  async viewDocument(type) {
    // type: 'ekyc', 'agreement', or 'reference'
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication required. Please log in again.");
    }

    const response = await fetch(`${API_BASE_URL}/documents/download/${type}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Failed to view document" }));
      throw new Error(error.error || "Failed to view document");
    }

    // For web platform, create blob URL and open in new tab
    if (typeof window !== "undefined" && window.URL) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      return;
    }

    // For native platforms, return blob for further processing
    const blob = await response.blob();
    return blob;
  },

  async getTenantDocuments(tenantId) {
    return this.request(
      `/documents/tenant-documents${tenantId ? `?tenantId=${tenantId}` : ""}`
    );
  },

  async downloadTenantDocument(tenantId, type) {
    // type: 'ekyc' or 'agreement'
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(
      `${API_BASE_URL}/documents/tenant/${tenantId}/download/${type}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to download document");
    }

    const blob = await response.blob();
    return blob;
  },

  async viewTenantDocument(tenantId, type) {
    // type: 'ekyc' or 'agreement'
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(
      `${API_BASE_URL}/documents/tenant/${tenantId}/download/${type}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to view document");
    }

    const blob = await response.blob();
    return blob;
  },

  // PG Tenant Rent Payments
  async getNextRentDue() {
    return this.request("/pg-tenant/payments/next-due");
  },

  async createRentPaymentOrder(paymentId) {
    return this.request(`/pg-tenant/payments/${paymentId}/create-order`, {
      method: "POST",
    });
  },

  async getRentPaymentHistory(params = {}) {
    return this.request(`/pg-tenant/payments/history${buildQuery(params)}`);
  },

  async getRentPaymentStatistics() {
    return this.request("/pg-tenant/payments/statistics");
  },

  async verifyRentPayment(paymentId) {
    return this.request(`/pg-tenant/payments/${paymentId}/verify`, {
      method: "POST",
    });
  },

  async generateRentInvoice(paymentId) {
    return this.request(`/pg-tenant/payments/${paymentId}/generate-invoice`, {
      method: "POST",
    });
  },

  // PG Owner Rent Payments
  async getOwnerRentPayments(params = {}) {
    return this.request(`/owner/pg/payments/history${buildQuery(params)}`);
  },

  async getOwnerRentPaymentsSummary(params = {}) {
    return this.request(`/owner/pg/payments/summary${buildQuery(params)}`);
  },

  // PG Tenant Profile
  async getPgTenantProfile() {
    return this.request(`/pg-tenant/profile`);
  },

  // Owner dashboards & complaints
  async getOwnerDashboard(params = {}) {
    return this.request(`/owner/dashboard${buildQuery(params)}`);
  },

  async getOwnerProperties() {
    return this.request("/owner/properties");
  },

  async getOwnerPgProperties() {
    return this.request("/owner/pg/properties");
  },

  async createOwnerPgProperty(payload) {
    return this.request("/owner/pg/properties", {
      method: "POST",
      body: payload,
    });
  },

  async updateOwnerPgProperty(id, payload) {
    return this.request(`/owner/pg/properties/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deleteOwnerPgProperty(id) {
    return this.request(`/owner/pg/properties/${id}`, {
      method: "DELETE",
    });
  },

  async getOwnerComplaints(params = {}) {
    return this.request(`/owner/complaints${buildQuery(params)}`);
  },

  async getOwnerComplaint(id) {
    return this.request(`/owner/complaints/${id}`);
  },

  async updateOwnerComplaintStatus(id, status) {
    return this.request(`/owner/complaints/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  async addOwnerComplaintComment(id, message) {
    return this.request(`/owner/complaints/${id}/comments`, {
      method: "POST",
      body: { message },
    });
  },

  async getPgTenants() {
    return this.request("/owner/pg/tenants");
  },

  async getAvailablePgTenants() {
    return this.request("/owner/pg/tenants/available");
  },

  async createPgTenant(payload) {
    return this.request("/owner/pg/tenants", {
      method: "POST",
      body: payload,
    });
  },

  async updatePgTenant(id, payload) {
    return this.request(`/owner/pg/tenants/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deletePgTenant(id) {
    return this.request(`/owner/pg/tenants/${id}`, {
      method: "DELETE",
    });
  },

  // Documents
  async generateDocuments() {
    return this.request("/documents/generate", {
      method: "POST",
    });
  },
};
