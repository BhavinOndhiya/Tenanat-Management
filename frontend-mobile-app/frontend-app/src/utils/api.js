import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.append(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      // Navigation will be handled by AuthContext
    }
    throw error.response?.data || error.message || "Request failed";
  }
);

export const api = {
  // Auth endpoints
  async register(name, email, password) {
    const response = await apiClient.post("/auth/register", {
      name,
      email,
      password,
    });
    return response;
  },

  async login(email, password) {
    const response = await apiClient.post("/auth/login", { email, password });
    return response;
  },

  async getMe() {
    return apiClient.get("/me");
  },

  // Complaint endpoints
  async createComplaint(title, description, category, flatId) {
    return apiClient.post("/complaints", {
      title,
      description,
      category,
      ...(flatId ? { flatId } : {}),
    });
  },

  async getMyComplaints() {
    return apiClient.get("/complaints/my");
  },

  async getComplaint(id) {
    return apiClient.get(`/complaints/${id}`);
  },

  // Officer endpoints
  async getOfficerComplaints() {
    return apiClient.get("/officer/complaints");
  },

  async updateComplaintStatus(complaintId, status) {
    return apiClient.patch(`/officer/complaints/${complaintId}/status`, {
      status,
    });
  },

  async assignComplaintToMe(complaintId) {
    return apiClient.patch(`/officer/complaints/${complaintId}/assign`);
  },

  async getOfficerSummary() {
    return apiClient.get("/officer/summary");
  },

  async getOwnerDashboardSummary() {
    return apiClient.get("/dashboard/owner-summary");
  },

  // Profile endpoints
  async getProfile() {
    return apiClient.get("/profile");
  },

  async updateProfile(profileData) {
    return apiClient.patch("/profile", profileData);
  },

  // Flats & assignments
  async getMyFlats() {
    return apiClient.get("/flats/my");
  },

  // Announcements
  async getAnnouncements() {
    return apiClient.get("/announcements");
  },

  async getAdminAnnouncements(params) {
    return apiClient.get(`/admin/announcements${buildQuery(params)}`);
  },

  async createAnnouncement(payload) {
    return apiClient.post("/admin/announcements", payload);
  },

  async updateAnnouncement(id, payload) {
    return apiClient.patch(`/admin/announcements/${id}`, payload);
  },

  async deleteAnnouncement(id) {
    return apiClient.delete(`/admin/announcements/${id}`);
  },

  // Events
  async getEvents() {
    return apiClient.get("/events");
  },

  async createEvent(payload) {
    return apiClient.post("/events", payload);
  },

  async updateEvent(id, payload) {
    return apiClient.patch(`/events/${id}`, payload);
  },

  async deleteEvent(id) {
    return apiClient.delete(`/events/${id}`);
  },

  async setEventParticipation(eventId, status) {
    return apiClient.post(`/events/${eventId}/participation`, { status });
  },

  async getEventParticipants(eventId) {
    return apiClient.get(`/events/${eventId}/participants`);
  },

  // Admin users
  async getAdminUsers(params) {
    return apiClient.get(`/admin/users${buildQuery(params)}`);
  },

  async createAdminUser(payload) {
    return apiClient.post("/admin/users", payload);
  },

  async updateUserRole(userId, role) {
    return apiClient.patch(`/admin/users/${userId}/role`, { role });
  },

  async updateUserStatus(userId, isActive) {
    return apiClient.patch(`/admin/users/${userId}/status`, { isActive });
  },

  // Admin flats
  async getAdminFlats(params) {
    return apiClient.get(`/admin/flats${buildQuery(params)}`);
  },

  async createFlat(payload) {
    return apiClient.post("/admin/flats", payload);
  },

  async updateFlat(id, payload) {
    return apiClient.patch(`/admin/flats/${id}`, payload);
  },

  async deleteFlat(id) {
    return apiClient.delete(`/admin/flats/${id}`);
  },

  // Flat assignments
  async getFlatAssignments() {
    return apiClient.get("/admin/flat-assignments");
  },

  async createFlatAssignment(payload) {
    return apiClient.post("/admin/flat-assignments", payload);
  },

  async deleteFlatAssignment(id) {
    return apiClient.delete(`/admin/flat-assignments/${id}`);
  },

  // Admin events
  async getAdminEvents() {
    return apiClient.get("/admin/events");
  },

  async createAdminEvent(payload) {
    return apiClient.post("/admin/events", payload);
  },

  async updateAdminEvent(id, payload) {
    return apiClient.patch(`/admin/events/${id}`, payload);
  },

  async deleteAdminEvent(id) {
    return apiClient.delete(`/admin/events/${id}`);
  },

  async getAdminDashboardSummary() {
    return apiClient.get("/admin/dashboard/summary");
  },

  async getAdminComplaints(view = "all", params = {}) {
    return apiClient.get(`/admin/complaints/${view}${buildQuery(params)}`);
  },

  async getAdminAnnouncementsList(params = {}) {
    return apiClient.get(`/admin/announcements/all${buildQuery(params)}`);
  },

  async getAdminEventsList(params = {}) {
    return apiClient.get(`/admin/events/all${buildQuery(params)}`);
  },

  async getAdminFlatsDetailed() {
    return apiClient.get("/admin/flats/detailed");
  },

  async getAdminBillingSummary(params = {}) {
    return apiClient.get(`/admin/billing/summary${buildQuery(params)}`);
  },

  async getAdminBillingInvoices(params = {}) {
    return apiClient.get(`/admin/billing/invoices${buildQuery(params)}`);
  },

  async getAdminBillingInvoice(id) {
    return apiClient.get(`/admin/billing/invoices/${id}`);
  },

  async getMyBillingInvoices(params = {}) {
    return apiClient.get(`/billing/my-invoices${buildQuery(params)}`);
  },

  async getMyBillingInvoice(id) {
    return apiClient.get(`/billing/my-invoices/${id}`);
  },

  async createInvoicePaymentOrder(id, payload = {}) {
    return apiClient.post(`/billing/my-invoices/${id}/create-order`, payload);
  },

  async verifyInvoicePayment(payload) {
    return apiClient.post(`/billing/verify-payment`, payload);
  },

  // Tenant Management
  async getTenantUsers() {
    return apiClient.get("/tenants/users");
  },

  async getMyOwnedFlats() {
    return apiClient.get("/tenants/my-flats");
  },

  async getTenantForFlat(flatId, filters = {}) {
    return apiClient.get(`/tenants/flat/${flatId}${buildQuery(filters)}`);
  },

  async createTenant(payload) {
    return apiClient.post("/tenants", payload);
  },

  async updateTenant(tenantId, payload) {
    return apiClient.patch(`/tenants/${tenantId}`, payload);
  },

  async removeTenant(tenantId) {
    return apiClient.delete(`/tenants/${tenantId}`);
  },

  async sendRentReminder(tenantId) {
    return apiClient.post(`/tenants/${tenantId}/send-reminder`);
  },
};
