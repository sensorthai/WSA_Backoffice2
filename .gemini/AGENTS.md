# Agent Roles & Guidelines: WSA Backoffice

## 1. Primary Objective
You are the developer agent for the WSA Backoffice platform — a production-grade Thai SME management system handling HR operations and outsourced teaching workforce management. Your goal is to maintain a high-performance, premium-grade system that is always buildable and deployable.

## 2. Core Responsibilities

### Frontend Excellence
- Implement UI that is "stunning" and "premium" — never create basic/plain interfaces
- Use modern typography, gradient headers, glassmorphism, smooth animations
- Follow established patterns: gradient page banners, Shadcn tables, color-coded badges
- All admin table components live in `components/admin/`
- Use `lucide-react` for all iconography

### Backend Integrity
- All data flows through Supabase client (`lib/supabase.ts`)
- New schema changes require migration files in `supabase/migrations/` with chronological naming
- API routes must verify authentication (`auth()`) and role (`session.user.role`) before operations
- Use `createSupabaseServerClient()` in API routes, never expose service keys to client

### Build Stability
- The build MUST pass (`npm run build` → exit 0) at all times
- Known patterns to maintain:
  - `zodResolver() as any` for all Zod + react-hook-form integrations
  - `searchParams?.get()` optional chaining for `useSearchParams()` results
  - `Array.from(new Set(...))` or enable `downlevelIteration` for Set spreads
  - `export const dynamic = 'force-dynamic'` on all `"use client"` dashboard pages

### Reporting & Export
- Reports must support temporal filtering (month/year)
- PDF export via `html2pdf.js`, Excel via `xlsx`
- Email reports via Nodemailer + Gmail SMTP (`lib/gmail.ts`)
- Print-optimized layouts using `@media print` and `.no-print` utility classes

## 3. Business Rules

### Attendance & Check-in
- Check-in window: configurable via `system_settings` (default 06:00–11:00)
- Location types: `office`, `home`, `onsite`, `absent`
- GPS coordinates captured for onsite verification
- Team check-in view available for managers

### Leave Management
- Annual quotas: **Sick 30** | **Personal 6** | **Vacation 6** days
- Reports must show "Used/Total" ratios and remaining balances
- Multi-tier approval: Employee → Supervisor → Admin → CEO

### Purchase Requests
- Payment methods: `petty_cash`, `credit_card`, `k_biz`
- Transactions >2,000 THB should suggest `k_biz`
- Items stored as JSONB array: `{ name, quantity, unit_price }`
- Category field is required in form state

### Teaching Management
- Outsource teachers assigned to client schools via `teaching_assignments`
- Schedule via `schedule_dates` (specific dates array) or `schedule_days` (recurring weekday codes)
- Teaching fee tracked per-period per assignment
- Teaching logs include: teach_date, check_in_time, topics, student_behavior
- Student attendance tracked per teaching log
- Materials linked to subjects via `material_code`

### Vehicle Management
- Document expiry alerts at 7-day and 14-day thresholds (via cron)
- Caretaker assignment per vehicle
- Booking flow: Request → Admin Approve → Use → Return (with odometer)

## 4. Role-Based Access Control (RBAC)

| Role | Dashboard | Teaching | Admin | CEO | Approval Tier |
|------|-----------|----------|-------|-----|---------------|
| `employee` | ✅ | ❌ | ❌ | ❌ | — (submitter) |
| `supervisor` | ✅ | ❌ | ❌ | ❌ | 1st tier |
| `outsource` | ❌ → `/teaching` | ✅ | ❌ | ❌ | — |
| `admin` | ✅ | ✅ (mgmt) | ✅ | ❌ | 2nd tier |
| `ceo` | ✅ | ❌ | ❌ | ✅ | 3rd (final) tier |

- RBAC enforced at both **Middleware** (`middleware.ts`) and **API** level
- New users auto-register with `is_active: false` — requires admin activation

## 5. Coding Standards

### Routing & State
- URL search parameters (`?tab=...`) for tabbed interfaces — ensures state persistence and direct linkability
- Dynamic route params for detail pages (`/leaves/[id]`, `/teaching/assignment/[id]`)

### Components
- Shadcn UI for all standard primitives (Button, Input, Dialog, Table, Select, Badge, etc.)
- `lucide-react` icons — never use other icon libraries
- Component naming: PascalCase, descriptive (`SchoolsTable`, `ReportsMonthly`)

### Data Fetching
- `useQuery` for reads with descriptive `queryKey` arrays
- `useMutation` with `onSuccess` → `queryClient.invalidateQueries()` for cache busting
- API responses: `NextResponse.json()` with proper status codes

### Thai Localization
- All user-facing strings in Thai
- Internal logic, variable names, comments in English
- Date formatting with Thai locale (`th`) where appropriate

### File Organization
- Pages: `app/(dashboard)/[module]/page.tsx`
- APIs: `app/api/[module]/route.ts`
- Admin components: `components/admin/[Feature]Table.tsx` or `Reports[Type].tsx`
- Utilities: `lib/[purpose].ts`
- Migrations: `supabase/migrations/[NNN]_[description].sql`
