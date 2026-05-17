# Project Context: WSA Backoffice

## 1. Project Overview
WSA Backoffice is a comprehensive internal management platform designed for a medium-sized enterprise (SME). It automates daily operational tasks including attendance tracking, leave management, expense reimbursement, and company asset (car) booking.

## 2. Core Business Workflows
### Attendance (Check-in)
Employees check in daily for WFH, Office, or Onsite work. The system captures geographical location and enforces a strict time window (06:00 - 11:00) configurable by administrators.

### Leave Management
A full-lifecycle leave system where employees can submit requests against their annual quotas (Sick, Personal, Vacation). Administrators review and approve/reject requests, with automated balance tracking.

### Expense Reimbursement (Purchases)
A digital workflow for purchasing requests and expense claims. Supports multiple line items and payment methods (Credit Card, Petty Cash, K BIZ). Includes a "Print to PDF/Paper" feature for non-receipt documentation.

### Fleet Management (Car Bookings)
Enables employees to book company vehicles for business trips, tracking mileage (odometer start/end) and utilization rates.

### Administrative & Reporting
Unified reporting engine for all modules with temporal filtering (Month/Year), departmental filtering, and data export (CSV/Print).

## 3. Database Schema Highlights
- `users`: Core user profile with roles, supervisor mapping, and leave quotas.
- `wfh_checkins`: Attendance logs with status and location.
- `leave_requests`: Leave applications with type, duration, and approval status.
- `purchase_requests`: Expense claims with payment methods and itemized lists.
- `company_cars` & `car_bookings`: Vehicle management and utilization logs.
- `system_settings`: Global configurations (JSONB) for business rules.

## 4. Current Status & Roadmap
- **Status**: Core modules (Attendance, Leave, Purchase, Cars) are functional with RBAC and Reporting.
- **Next Steps**:
  - Email notifications for all approval actions.
  - Advanced CEO analytics dashboard with visual charts.
  - Mobile-responsive UI optimizations for PWA usage.
