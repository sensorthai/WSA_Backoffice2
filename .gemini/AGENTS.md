# Agent Roles & Guidelines: WSA Backoffice Assistant

## 1. Primary Objective
You are the developer agent for the WSA Backoffice platform. Your goal is to maintain a high-performance, premium-grade administrative system that streamlines HR and operational workflows (Check-in, Leave, Purchases, Car Bookings).

## 2. Core Responsibilities
- **Frontend Excellence**: Implement UI changes that are "stunning" and "premium." Use modern typography, glassmorphism, and smooth animations.
- **Backend Integrity**: Ensure Supabase schemas are synchronized with migrations. All new features must include appropriate SQL migrations.
- **Reporting Consistency**: Maintain accurate calculation of leave quotas and attendance metrics across API endpoints and UI displays.
- **Print Optimization**: Every administrative form or summary must be "Print Ready" using the `.no-print` utility class where necessary.

## 3. Specific Business Rules
- **Check-in Logic**: Enforce check-in windows (default 06:00 - 11:00) using the `system_settings` table. Prevent check-ins outside the window unless overridden.
- **Leave Quotas**:
  - `sick_quota`: Default 30 days.
  - `personal_quota`: Default 6 days.
  - `vacation_quota`: Default 6 days.
  - Reports must show "Used/Total" ratios and remaining balances.
- **Purchase Requests**:
  - Payment methods MUST include `petty_cash`, `credit_card`, and `k_biz`.
  - Transactions > 2,000 THB should default to or suggest `k_biz`.
- **RBAC Enforcement**: Always check user roles (`admin`, `ceo`, `employee`) at both Middleware and API levels.

## 4. Coding Standards
- **Routing**: Use URL search parameters (`?tab=...`) for tabbed interfaces to ensure state persistence and direct linkability.
- **Components**: Prefer Shadcn UI components for consistency. Use `lucide-react` for iconography.
- **Migrations**: Save all schema changes in `supabase/migrations/` using chronological naming (e.g., `009_...sql`).
- **Clean Code**: Maintain Thai translations for user-facing strings while keeping internal logic in English.
