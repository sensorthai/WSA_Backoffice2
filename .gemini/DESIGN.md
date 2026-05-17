# Design System & Architecture: WSA Backoffice

## 1. Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth.js (Google Provider) with Role-Based Access Control (RBAC).
- **Database & Backend**: Supabase (PostgreSQL, Realtime, Storage).
- **Styling**: Tailwind CSS with Vanilla CSS for custom premium aesthetics.
- **Components**: Shadcn UI (Radix UI) for accessible, standard primitives.
- **State Management**: URL-based routing (Search Params) for administrative views to maintain state across refreshes.

## 2. Architecture Principles
- **Modular Routing**: Features are divided into dashboard sub-routes: `/checkin`, `/leaves`, `/purchases`, `/cars`, `/reports`.
- **Hybrid Data Fetching**: Combined Server Components for initial load and Client Components for interactive forms and real-time updates.
- **Atomic Components**: Reusable UI elements in `@/components/ui` and layout-specific components in `@/components/layout`.
- **Role-Based Access Control (RBAC)**:
  - `employee`: Standard access (Check-in, Leave requests, Purchases).
  - `admin`: Full system management (Settings, User approvals, Reports).
  - `ceo`: High-level insights and all report access.

## 3. Core Modules Design
### A. Attendance & Check-in
- **Dynamic Window**: Check-in times (Start, End, Edit-End) are configurable via system settings.
- **Location Tracking**: Captures Latitude/Longitude for "Onsite" and "Office" check-ins.
- **Status Types**: `office`, `home`, `onsite`, `absent`.

### B. Leave Management System
- **Annual Quotas**: Pre-defined quotas for Sick, Personal, and Vacation leave.
- **Balance Tracking**: Real-time calculation of Used vs. Remaining leave days.
- **Request Workflow**: Standard submission with status tracking (Pending, Approved, Rejected).

### C. Purchase Request System
- **Expense Categorization**: Flexible item list per request.
- **Payment Methods**: Explicit tracking for `credit_card`, `petty_cash`, and `k_biz` (KBiz for > 2,000 THB).
- **Print Optimization**: Dedicated `@media print` styling for generating non-receipt expense documentation.

### D. Reporting & Analytics
- **Multi-Dimensional Reports**: Attendance, Leave, Purchase, and Car utilization.
- **Export Capabilities**: Clean printable views and CSV export.
- **Temporal Filtering**: Year/Month based aggregation for yearly leave summaries.

## 4. UI/UX & Aesthetics
- **Design Philosophy**: Premium, "State of the Art" look with vibrant accents and glassmorphism.
- **Typography**: Modern sans-serif (Inter/Outfit) with high-contrast font weights for hierarchy.
- **Interactions**: Smooth micro-animations (Animate.css integration) and responsive hover states.
- **Visual Feedback**: Colorful badge status indicators for quick scanning.
