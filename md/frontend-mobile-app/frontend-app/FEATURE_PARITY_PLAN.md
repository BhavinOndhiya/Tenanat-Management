## Mobile Parity Plan

This document tracks how the React Native app maps to the web experience and
identifies the gaps that must be closed to reach feature parity.

### 1. Screen / Flow Mapping

| Web screen / flow | Key APIs | Mobile screen | Status | Notes |
| --- | --- | --- | --- | --- |
| `pages/auth/Login`, `Register` | `/auth/login`, `/auth/register` | `screens/auth/LoginScreen`, `RegisterScreen` | ✅ | Auth + token storage already aligned. |
| `pages/Dashboard` (citizen) | `/complaints/my`, `/flats/my`, `/announcements`, `/events` | `screens/citizen/DashboardScreen` | ⚠️ Partial | Needs complaint stats, CTA deep links, and refresh parity with the web dashboard. |
| `components/ComplaintsList`, `pages/ComplaintDetails` | `/complaints/my`, `/complaints/:id` | `ComplaintsListScreen`, `ComplaintDetailsScreen` | ⚠️ Partial | List filters match web, but detail view misses history/comments/actions. |
| `components/ComplaintForm` | `/complaints` | `ComplaintFormScreen` | ✅ | Same payload + validation. |
| `pages/Events` | `/events`, `/events/:id/participation` | `EventsScreen` | ⚠️ Partial | RSVP hooks exist but list metadata is trimmed compared to web. |
| `pages/BillingList`, `BillingDetail` | `/billing/my-invoices`, `/billing/my-invoices/:id`, `/billing/.../create-order`, `/billing/verify-payment` | `BillingListScreen`, `BillingDetailScreen` | ⚠️ Partial | Listing filters match, but mobile lacks Razorpay checkout + success handling. |
| `pages/Profile` | `/profile`, `/complaints/my`, `/officer/complaints` | `ProfileScreen` | ⚠️ Partial | Read-only view; missing edit/profile photo/stats, change password, etc. |
| `pages/TenantManagement` | `/tenants/*` | `TenantManagementScreen` | ⚠️ Partial | Basic fetches wired; creation/update/removal flows still pending. |
| `pages/admin/AdminDashboard` | `/admin/dashboard/summary` | `screens/admin/AdminDashboard` | ❌ Wrong data | Cards display zeros because mobile expects nonexistent fields. Needs stats + charts parity. |
| `pages/admin/AdminComplaints*` | `/admin/complaints/:view` | `AdminComplaintsScreen` | ⚠️ Partial | Missing filters/search/date range navigation + CSV export. |
| `pages/admin/AdminUsers`, `AdminFlats`, `AdminAssignFlats`, `AdminAnnouncements`, `AdminEvents`, `AdminBilling*` | `/admin/users`, `/admin/flats`, `/admin/flat-assignments`, `/admin/announcements*`, `/admin/events*`, `/admin/billing/*` | Corresponding mobile screens | ⚠️ Partial | CRUD lists exist but lack creation/editing modals, filters, and parity actions. |
| `pages/OfficerDashboard` | `/officer/summary`, `/officer/complaints`, `/officer/complaints/:id/*` | `screens/officer/OfficerDashboard` | ⚠️ Partial | Basic list works but kanban-style workflow, drag/drop and accurate stats missing. |
| Owner dashboards (`/dashboard/owner-summary`, tenants, flats) | `/dashboard/owner-summary`, `/tenants/*` | `screens/owner/*` | ⚠️ Partial | Summary hook exists, but actions (add property, collections, income/expense) are placeholders. |

Legend: ✅ complete, ⚠️ partial, ❌ incorrect/missing.

### 2. API Coverage Checklist

- Auth / session: `login`, `register`, `getMe` – **used**.
- Citizen flows: `getMyComplaints`, `createComplaint`, `getMyFlats`, `getAnnouncements`, `getEvents` – **used**.
- Complaint drill-down: `getComplaint`, `updateComplaintStatus`, `assignComplaintToMe` – **partially used** (citizen detail read-only, officer actions wired).
- Admin analytics + management: `/admin/dashboard/summary`, `/admin/complaints/:view`, `/admin/users`, `/admin/flats`, `/admin/announcements`, `/admin/events`, `/admin/billing/*` – **calls exist but UI only surfaces small subset**.
- Billing & payments: `/billing/my-invoices`, `/billing/my-invoices/:id`, `/billing/my-invoices/:id/create-order`, `/billing/verify-payment` – **need full Razorpay checkout + verification on mobile**.
- Profile: `/profile` (GET/PATCH) – **update flow missing**.
- Tenant / owner management: `/dashboard/owner-summary`, `/tenants/*` – **owner dashboards show placeholder quick actions.**

### 3. Immediate Gap Backlog

1. **Dashboard parity**
   - Fix admin/officer stat cards to use the `stats` object returned by `/admin/dashboard/summary` and `/officer/summary`.
   - Add complaint status/category charts and clickable cards that deep link to filtered lists.
   - Surface citizen complaint counts on the home dashboard (compute from `/complaints/my`).

2. **Complaints workflow**
   - Extend mobile `AdminComplaintsScreen` with search, status/date filters, and pagination to match the web filter bar.
   - Expand `ComplaintDetailsScreen` with timeline/history/comments mirroring the web detail view.

3. **Profile + settings**
   - Add edit mode (name, phone, address, avatar), reuse payload from the web profile page, and expose change password hook if available.

4. **Payments**
   - Embed Razorpay checkout inside the React Native app using the existing `/billing/my-invoices/:id/create-order` + `/billing/verify-payment` APIs.
   - Refresh billing data after verification, surface success/failure states, and ensure outstanding amounts refresh everywhere.

5. **Owner flows**
   - Replace placeholder screens (e.g., `AddPropertyScreen`) with working forms that call flat/tenant endpoints or hide them until supported.

6. **Old UI cleanup**
   - Remove or hide dead buttons/modals. Every CTA must either navigate or trigger a real mutation.

### 4. Technical Guardrails

- Use the shared axios client in `src/utils/api.js` (already injects bearer tokens).
- Keep query construction identical to the web (`buildQuery` helper).
- After every mutation, invalidate/reload the relevant lists, similar to how the web app calls `fetch*` after actions.
- Any payment or sensitive flow must handle loading + error states and guide the user back to the appropriate screen.

This plan will be kept up to date as we wire additional screens to the backend until the mobile experience reaches full parity with the web app.


