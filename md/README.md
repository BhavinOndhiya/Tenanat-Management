# Society & Complaint Management Portal – Milestone 3 ✅

Milestone 3 upgrades the original complaint system into a complete society-management portal with role-based experiences for citizens, officers, and admins.

## 🧱 Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT auth
- **Frontend**: React 18, Vite, React Router, Framer Motion

## 🚀 Features Overview

| Module | Highlights |
| --- | --- |
| **Auth & Roles** | CITIZEN, OFFICER, ADMIN roles with role-aware routing and JWT sessions. |
| **Citizen Portal** | Flat-aware complaint creation, announcements feed, upcoming events, personal flat info. |
| **Officer Module** | Drag-and-drop Kanban, assignment to self, summary cards (New/In-progress/Resolved). |
| **Admin Panel** | Users, flats, assignments, announcements, events, analytics dashboard & charts. |
| **Billing & Maintenance** | Generate invoices per flat, record payments, admin/citizen billing dashboards. |
| **Admin Insights** | Clickable dashboard cards, drill-down pages with filters, CSV exports. |
| **Flats Management** | Flats + user-flat relations (owner/tenant/family) with primary flat support. |
| **Announcements** | Building/flat targeting, urgency flags, start/end windows, citizen feed. |
| **Events & Participation** | Create/manage events, interest/going tracking, participant lists. |
| **Analytics** | Dashboard cards + chart (complaints by status/category). |

## 📦 Prerequisites

- Node.js ≥ 18
- MongoDB ≥ 6 (running locally at `mongodb://localhost:27017/complaint_db` by default)
- npm (v9+) or yarn

## ⚙️ Setup Instructions

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=3000
DATABASE_URL="mongodb://localhost:27017/complaint_db"
JWT_SECRET=super-secret-change-me
```

Seed sample data (admins, officers, citizens, flats, assignments, complaints, announcements, events, billing invoices/payments):

```bash
npm run db:seed
```

Start the API:

```bash
npm run dev
```

### 2. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:5173`.

## 👤 Demo Accounts (from `npm run db:seed`)

| Role | Email | Password | Flat(s) |
| --- | --- | --- | --- |
| Admin | `admin@example.com` | `AdminPass123!` | — |
| Officer | `officer@example.com` | `OfficerPass123!` | Lakeview Towers • B-204 |
| Citizen #1 | `citizen@example.com` | `CitizenPass123!` | Skyline Residency • A-101 |
| Citizen #2 | `rohan@example.com` | `CitizenPass123!` | Skyline Residency • A-502 |

Admins land at `/admin/dashboard`, officers at `/officer/dashboard`, citizens at `/dashboard`.

## 🗂 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── db/ (Mongo connection + seed)
│   │   ├── middleware/ (auth + role guards)
│   │   ├── models/ (User, Complaint, Flat, UserFlat, Announcement, Event, EventParticipant)
│   │   └── routes/
│   │       ├── auth, complaints, officer, profile
│   │       ├── admin (users, flats, assignments, announcements, events, analytics)
│   │       ├── announcements (citizen feed)
│   │       ├── events (public CRUD + participation)
│   │       └── flats (citizen assignments)
├── frontend/
│   ├── src/
│   │   ├── pages/ (Dashboard, Events, Officer, Profile, Auth, Admin/*)
│   │   ├── components/ (forms, cards, nav, UI kit)
│   │   └── utils/api.js (all API helpers)
└── README.md
```

## 🧭 Role Flows

### Citizen
- Login/register
- Dashboard shows flat info, notices, upcoming events
- Create complaints (auto-linked to primary flat; manual selection if multiple)
- View complaint list/detail with flat context
- RSVP to events, propose new events

### Officer
- Kanban board (NEW → IN_PROGRESS → RESOLVED) with drag-and-drop
- Self-assign complaints, view citizen + flat info
- Summary cards for queue health

### Admin
- **Dashboard**: stats + complaints charts
- **Insights**: card drill-downs for complaints, announcements, events, flats
- **Users**: filter, role change, activate/deactivate, create accounts
- **Flats**: CRUD + soft guards when linked
- **Assignments**: map residents to flats, mark primary
- **Announcements**: targeted notices with urgency + schedule windows
- **Events**: create/manage, approve/publish/cancel, participant lists

### Admin Insights & Drill-downs
- **Billing & Maintenance**: View overview cards at `/admin/billing`, drill into `/admin/billing/invoices`, inspect invoice history and payments per flat.
- Dashboard cards navigate to:
  - `/admin/complaints/all`
  - `/admin/complaints/open`
  - `/admin/complaints/resolved`
  - `/admin/announcements/list`
  - `/admin/events/list`
  - `/admin/flats/list`
- Each page ships with search, status filters, date ranges (where applicable), and CSV export buttons (complaints, announcements, events).
- Backend CSV endpoint: `GET /api/admin/export/:type?from=&to=` supporting `complaints_all`, `complaints_open`, `complaints_resolved`, `announcements`, `events`.

## 💰 Billing & Maintenance

The billing module tracks monthly maintenance invoices per flat, records manual payments, and lets both admins and residents review dues and payment history out of the box.

### Seeded billing data

Running `npm run db:seed` now creates:
- Sample flats with linked citizens
- Maintenance invoices that cover Pending, Partially Paid, Paid, and Overdue states
- Matching `MaintenancePayment` entries so you can demo payment history immediately

### Demo walkthrough

**Admin flow**
1. Log in as `admin@example.com / AdminPass123!`
2. Open **Billing & Maintenance** (`/admin/billing`) to see totals (billed, paid, outstanding, overdue)
3. Click “View all invoices” → `/admin/billing/invoices`
4. Open any seeded invoice (e.g. Skyline Residency • A-101) to see flat info + payment logs

**Citizen flow**
1. Log in as `citizen@example.com / CitizenPass123!`
2. Open **My Maintenance** (`/billing`) to view monthly invoices for their flat
3. Select an invoice to read amount, due date, outstanding amount, and payment history (`/billing/:id`)

### UI locations
- Admin: `/admin/billing`, `/admin/billing/invoices`, `/admin/billing/invoices/:id`
- Citizen: `/billing`, `/billing/:id`

## 🔌 Key API Surface

- `POST /api/auth/login|register`, `GET /api/me`
- Citizen: `/api/complaints`, `/api/complaints/my`, `/api/flats/my`, `/api/announcements`, `/api/events`
- Officer: `/api/officer/complaints`, `/api/officer/complaints/:id/status`, `/api/officer/complaints/:id/assign`, `/api/officer/summary`
- Admin: `/api/admin/users|flats|flat-assignments|announcements|events|dashboard/summary`
- Admin drill-down data: `/api/admin/complaints/all|open|resolved`, `/api/admin/announcements/all`, `/api/admin/events/all`, `/api/admin/flats/detailed`
- Admin CSV export: `GET /api/admin/export/:type`
- Admin billing: `/api/admin/billing/summary`, `/api/admin/billing/invoices`, `/api/admin/billing/invoices/:id`, `/api/admin/billing/invoices/:id/payments`, `/api/admin/billing/invoices/:id` (PATCH), `/api/admin/billing/generate`
- Citizen billing: `/api/billing/my-invoices`, `/api/billing/my-invoices/:id`
- Events: `/api/events/:id`, `/api/events/:id/participation`, `/api/events/:id/participants`

_All new routes are protected with `authenticateToken` plus role guards (`requireRole`, `requireAdmin`)._

## ✅ Verification Checklist

- [x] Login redirects by role (citizen/officer/admin)
- [x] `/admin/*` routes guarded (UI + API)
- [x] Citizens see flats, notices, events on dashboard
- [x] Complaints carry `flatId` through citizen/officer views
- [x] Officer Kanban shows summary counters
- [x] Admin panel pages: dashboard, users, flats, assignments, announcements, events
- [x] Admin insights drill-down pages + CSV export
- [x] Admin & citizen billing flows seeded + demo-ready
- [x] Seed data exercises entire workflow

Enjoy managing your society portal! 🎉
