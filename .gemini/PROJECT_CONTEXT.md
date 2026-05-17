# Project Context: WSA Backoffice

## 1. Project Overview
WSA Backoffice is a comprehensive internal management platform for a Thai SME education company ("WSA"). It automates daily operational tasks (attendance, leaves, expenses) **and** manages an outsourced teaching workforce deployed to client schools. The platform serves three distinct user groups: internal employees, outsource teachers, and executives.

## 2. Core Business Modules

### A. Attendance & Check-in (`/checkin`)
- Employees check in daily for WFH, Office, or Onsite work
- GPS location capture (latitude/longitude) for onsite verification
- Configurable time windows via `system_settings` (default 06:00–11:00)
- Team view for managers to see daily check-in status

### B. Leave Management (`/leaves`)
- Full-lifecycle leave requests against annual quotas:
  - **Sick**: 30 days | **Personal**: 6 days | **Vacation**: 6 days
- Multi-tier approval: Employee → Supervisor → Admin → CEO
- Balance tracking with Used/Remaining ratios
- Individual leave detail pages (`/leaves/[id]`)

### C. Expense Reimbursement (`/purchases`)
- Digital purchasing request workflow with itemized line items
- Payment methods: `petty_cash`, `credit_card`, `k_biz` (KBiz for >2,000 THB)
- Receipt upload to Supabase Storage
- Print-optimized views for physical filing

### D. Fleet Management (`/cars`)
- Company vehicle booking with availability tracking
- Document expiry alerts (Tax, Insurance, CTP) at 7-day and 14-day intervals
- Caretaker assignment per vehicle
- Automated email/in-app notifications for expiring documents

### E. Approval Workflow (`/approvals`, `/approve`)
- Unified approval engine (`lib/approval-engine.ts`) supporting leaves, purchases, car bookings
- Role-cascading: `supervisor` → `admin` → `ceo`
- Approval history and pending queue views

### F. Teaching Management (`/teaching-mgmt` — Admin)
- **Schools**: Client school CRUD with holiday calendars and finance contacts
- **Subjects**: Subject catalog with material code linking
- **Assignments**: Teacher ↔ School ↔ Subject assignment with schedule dates, time slots, per-period fees
- **Students**: Student roster by school, class level, academic year (bulk CSV upload)
- **Teaching Logs Review**: Admin view of teacher-submitted daily reports
- **Reports Suite**: Overview, School Reports, Teacher Performance, Income Summary, Monthly Analytics

### G. Teacher Portal (`/teaching` — Outsource role)
- **Dashboard**: Active assignments overview with upcoming schedules
- **Check-in**: GPS-verified teaching check-in at school sites
- **Logbook**: Daily teaching log submission (topics, attendance, student behavior)
- **Materials**: Teaching resources (manuals, slides, YouTube, documents) linked via material codes
- **Timetable**: Calendar view of assigned teaching dates

### H. CEO Dashboard (`/ceo`)
- High-level operational metrics and financial summaries
- Cross-module analytics (attendance, teaching, expenses)

### I. Reports (`/reports`)
- WFH attendance reports with department/employee filtering
- Leave summary reports with quota breakdowns
- Purchase expense analysis
- Temporal filtering by month/year with CSV/PDF export

## 3. Database Schema (Supabase PostgreSQL)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Profiles with roles, supervisor mapping, leave quotas, avatar |
| `departments` | Organizational departments |
| `positions` | Job positions with approval limits |
| `wfh_checkins` | Daily attendance logs with GPS and status |
| `leave_requests` | Leave applications with type, dates, approval chain |
| `purchase_requests` | Expense claims with payment method and items (JSONB) |
| `company_cars` | Vehicle registry with document expiry tracking |
| `car_bookings` | Vehicle reservation with odometer tracking |
| `system_settings` | Global config (JSONB) — check-in windows, quotas |
| `notifications` | In-app notification queue |

### Teaching Domain Tables
| Table | Purpose |
|-------|---------|
| `schools` | Client schools with contacts and holiday calendars |
| `subjects` | Subject catalog with material code linking |
| `teaching_assignments` | Teacher-School-Subject mapping with schedules and fees |
| `teaching_logs` | Daily teaching reports with check-in times |
| `students` | Student roster per school/class/year |
| `teaching_materials` | Resource library (manuals, slides, videos) per material code |
| `attendance_records` | Student attendance per teaching log |

## 4. Authentication & Authorization

### Auth Stack
- **NextAuth v5** (beta) with Google OAuth provider
- User auto-registration on first Google sign-in (`is_active: false` — needs admin approval)
- JWT-based sessions with custom claims: `role`, `db_id`, `is_active`

### Roles (RBAC)
| Role | Access |
|------|--------|
| `employee` | Check-in, Leaves, Purchases, Cars |
| `supervisor` | Employee access + team management + first-tier approval |
| `outsource` | Teaching portal only (`/teaching/*`, `/checkin`) |
| `admin` | Full system management, teaching management, all approvals |
| `ceo` | Executive dashboard, final approval tier, all reports |

### Middleware Guards
- Unauthenticated → `/login`
- Inactive users → `/pending-approval`
- Role-restricted routes: `/admin` (admin only), `/ceo` (ceo only)
- Outsource users blocked from internal dashboard; redirected to `/teaching`

## 5. Cron Jobs
| Endpoint | Purpose |
|----------|---------|
| `/api/cron/car-expirations` | Sends document expiry alerts at 7-day and 14-day thresholds |
| `/api/cron/checkin-reminder` | Morning check-in reminders |
| `/api/cron/daily-summary` | Daily operational summary notifications |
