export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL?.replace(/\/$/, "") || "/api";

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
    const token = localStorage.getItem("token");

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`[API] Making request to: ${url}`, {
        method: config.method || "GET",
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
        });

        const errorMessage =
          data.error || `Request failed with status ${response.status}`;

        // Handle auth errors - always redirect on 401/403
        if (response.status === 401 || response.status === 403) {
          // Clear invalid session
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Redirect to login if not already there
          if (!window.location.pathname.includes("/auth/login")) {
            window.location.href = "/auth/login";
          }
        }

        throw new Error(errorMessage);
      }

      console.log(`[API] Request successful: ${url}`, data);
      return data;
    } catch (error) {
      // Log detailed error (always, not just in dev)
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
    const token = localStorage.getItem("token");
    const formDataToSend = new FormData();

    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        if (key === "idFront" || key === "idBack" || key === "selfie") {
          // File uploads
          if (formData[key] instanceof File) {
            formDataToSend.append(key, formData[key]);
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
    const response = await fetch(`${API_BASE_URL}/tenant/agreement/preview`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  // Admin users
  async getAdminUsers(params) {
    return this.request(`/admin/users${buildQuery(params)}`);
  },

  async createAdminUser(payload) {
    return this.request("/admin/users", {
      method: "POST",
      body: payload,
    });
  },

  async updateUserRole(userId, role) {
    return this.request(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
  },

  async updateUserStatus(userId, isActive) {
    return this.request(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  async getAdminUser(userId) {
    return this.request(`/admin/users/${userId}`);
  },

  async updateAdminUserPassword(userId, password) {
    return this.request(`/admin/users/${userId}/password`, {
      method: "PATCH",
      body: { password },
    });
  },

  async updateAdminUser(userId, userData) {
    return this.request(`/admin/users/${userId}`, {
      method: "PUT",
      body: userData,
    });
  },

  async patchAdminUser(userId, userData) {
    return this.request(`/admin/users/${userId}`, {
      method: "PATCH",
      body: userData,
    });
  },

  async deleteAdminUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  // Documents
  async getMyDocuments() {
    return this.request("/documents/my-documents");
  },

  async downloadDocument(type) {
    // type: 'ekyc' or 'agreement'
    const response = await fetch(`${API_BASE_URL}/documents/download/${type}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to download document");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "ekyc" ? "eKYC-Document.pdf" : "PG-Agreement.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getTenantDocuments(tenantId) {
    return this.request(
      `/documents/tenant-documents${tenantId ? `?tenantId=${tenantId}` : ""}`
    );
  },

  async downloadTenantDocument(tenantId, type) {
    // type: 'ekyc' or 'agreement'
    const response = await fetch(
      `${API_BASE_URL}/documents/tenant/${tenantId}/download/${type}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to download document");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "ekyc" ? "eKYC-Document.pdf" : "PG-Agreement.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Admin flats
  async getAdminFlats(params) {
    return this.request(`/admin/flats${buildQuery(params)}`);
  },

  async createFlat(payload) {
    return this.request("/admin/flats", {
      method: "POST",
      body: payload,
    });
  },

  async updateFlat(id, payload) {
    return this.request(`/admin/flats/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deleteFlat(id) {
    return this.request(`/admin/flats/${id}`, { method: "DELETE" });
  },

  // Flat assignments
  async getFlatAssignments() {
    return this.request("/admin/flat-assignments");
  },

  async createFlatAssignment(payload) {
    return this.request("/admin/flat-assignments", {
      method: "POST",
      body: payload,
    });
  },

  async deleteFlatAssignment(id) {
    return this.request(`/admin/flat-assignments/${id}`, {
      method: "DELETE",
    });
  },

  // Admin events
  async getAdminEvents() {
    return this.request("/admin/events");
  },

  async createAdminEvent(payload) {
    return this.request("/admin/events", {
      method: "POST",
      body: payload,
    });
  },

  async updateAdminEvent(id, payload) {
    return this.request(`/admin/events/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async deleteAdminEvent(id) {
    return this.request(`/admin/events/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminDashboardSummary() {
    return this.request("/admin/dashboard/summary");
  },

  async getOfficerSummary() {
    return this.request("/officer/summary");
  },

  async getAdminComplaints(view = "all", params = {}) {
    return this.request(`/admin/complaints/${view}${buildQuery(params)}`);
  },

  async getAdminAnnouncementsList(params = {}) {
    return this.request(`/admin/announcements/all${buildQuery(params)}`);
  },

  async getAdminEventsList(params = {}) {
    return this.request(`/admin/events/all${buildQuery(params)}`);
  },

  async getAdminFlatsDetailed() {
    return this.request("/admin/flats/detailed");
  },

  async exportAdminCsv(type, params = {}) {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `/api/admin/export/${type}${buildQuery(params)}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to export CSV");
    }

    const blob = await response.blob();
    return blob;
  },

  async getAdminBillingSummary(params = {}) {
    return this.request(`/admin/billing/summary${buildQuery(params)}`);
  },

  async getAdminBillingInvoices(params = {}) {
    return this.request(`/admin/billing/invoices${buildQuery(params)}`);
  },

  async getAdminBillingInvoice(id) {
    return this.request(`/admin/billing/invoices/${id}`);
  },

  async getMyBillingInvoices(params = {}) {
    return this.request(`/billing/my-invoices${buildQuery(params)}`);
  },

  async getMyBillingInvoice(id) {
    return this.request(`/billing/my-invoices/${id}`);
  },

  async createInvoicePaymentOrder(id, payload = {}) {
    return this.request(`/billing/my-invoices/${id}/create-order`, {
      method: "POST",
      body: payload,
    });
  },

  async verifyInvoicePayment(payload) {
    return this.request(`/billing/verify-payment`, {
      method: "POST",
      body: payload,
    });
  },

  // Tenant Management (for flat owners)
  async getTenantUsers() {
    return this.request("/tenants/users");
  },

  async createTenantUser(payload) {
    return this.request("/tenants/users", {
      method: "POST",
      body: payload,
    });
  },

  async getMyOwnedFlats() {
    return this.request("/tenants/my-flats");
  },

  async getTenantForFlat(flatId, filters = {}) {
    return this.request(`/tenants/flat/${flatId}${buildQuery(filters)}`);
  },

  async createTenant(payload) {
    return this.request("/tenants", {
      method: "POST",
      body: payload,
    });
  },

  async updateTenant(tenantId, payload) {
    return this.request(`/tenants/${tenantId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  async removeTenant(tenantId) {
    return this.request(`/tenants/${tenantId}`, {
      method: "DELETE",
    });
  },

  async sendRentReminder(tenantId) {
    return this.request(`/tenants/${tenantId}/send-reminder`, {
      method: "POST",
    });
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

  // Admin role access
  async getRoleAccess() {
    return this.request("/admin/role-access");
  },

  async updateRoleAccess(role, navItems) {
    return this.request(`/admin/role-access/${role}`, {
      method: "PATCH",
      body: { navItems },
    });
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

  // Documents
  async generateDocuments() {
    return this.request("/documents/generate", {
      method: "POST",
    });
  },
};
