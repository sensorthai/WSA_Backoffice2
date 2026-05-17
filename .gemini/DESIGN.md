# Design System & Architecture: WSA Backoffice

## 1. Technical Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 14.2.18 |
| **Runtime** | React | 18.x |
| **Auth** | NextAuth.js v5 (Google OAuth) | 5.0.0-beta.31 |
| **Database** | Supabase (PostgreSQL, Realtime, Storage) | 2.105.4 |
| **Styling** | Tailwind CSS + Vanilla CSS | 3.4.1 |
| **Components** | Shadcn UI / Radix UI | 1.4.3 |
| **Forms** | React Hook Form + Zod + @hookform/resolvers | 7.x + 4.x |
| **Data Fetching** | TanStack React Query | 5.x |
| **Icons** | Lucide React | 1.16.0 |
| **Date Utils** | date-fns + date-fns-tz | 4.x |
| **Email** | Nodemailer (Gmail SMTP) | 7.x |
| **PDF Export** | html2pdf.js | 0.14.0 |
| **Excel** | xlsx (SheetJS) | 0.18.5 |
| **Toast** | Sonner | 2.x |
| **Calendar** | React Day Picker | 10.x |
| **TypeScript** | TypeScript | 5.x |

## 2. Architecture Principles

### Routing & State Management
- **App Router**: All routes under `app/` using Next.js 14 conventions
- **Route Groups**: `(auth)` for login/pending, `(dashboard)` for all authenticated pages
- **URL State**: Tab switching and filters use `useSearchParams` for persistence and deep-linking
- **Dynamic Rendering**: All dashboard pages use `export const dynamic = 'force-dynamic'` (client components with session-dependent data)

### Data Architecture
- **Server**: API routes in `app/api/` interact with Supabase server client
- **Client**: React Query (`useQuery`/`useMutation`) for client-side data fetching with automatic caching and invalidation
- **Forms**: React Hook Form with Zod validation schemas; `zodResolver() as any` cast required due to type mismatch between `@hookform/resolvers` and Zod v4

### Component Organization
```
components/
├── admin/          # Admin-only CRUD tables and reports (16 components)
│   ├── AssignmentsTable, CarsTable, DepartmentsTable, ...
│   ├── ReportsSchool, ReportsTeacher, ReportsIncome, ReportsMonthly, ReportsOverview
│   ├── SchoolsTable, StudentsTable, SubjectsTable, MaterialsTable
│   ├── TeachingLogsReview, SystemSettings, UsersTable, PositionsTable
├── dashboard/      # Dashboard-specific widgets
├── forms/          # Reusable form components
├── layout/         # Sidebar, Header, NotificationBell
├── providers.tsx   # SessionProvider + QueryClientProvider wrapper
└── ui/             # Shadcn UI primitives (Button, Input, Dialog, Table, ...)
```

### Utility Libraries
```
lib/
├── auth.ts             # NextAuth config (Google provider, Supabase sync, JWT callbacks)
├── supabase.ts         # Supabase server client factory
├── approval-engine.ts  # Multi-tier approval workflow engine
├── approval-rules.ts   # Approval routing rules per request type
├── email.ts            # Email sending utility
├── gmail.ts            # Gmail SMTP transport configuration
└── utils.ts            # cn() utility (clsx + tailwind-merge)
```

## 3. Build Configuration

### TypeScript (`tsconfig.json`)
- `strict: true` with `strictNullChecks: false` — codebase uses nullable patterns extensively (Supabase responses, useSearchParams, useParams)
- `downlevelIteration: true` — enables `[...new Set()]` spread patterns
- `module: esnext` with `moduleResolution: bundler`

### ESLint (`.eslintrc.json`)
- Extends `next/core-web-vitals` + `next/typescript`
- `no-explicit-any`: off (rapid development, Supabase responses typed as any)
- `no-unused-vars`: warn (tech debt, not blocking)
- `no-unused-expressions`: off
- `no-unescaped-entities`: off (Thai text)

### Next.js (`next.config.mjs`)
- `missingSuspenseWithCSRBailout: false` — all dashboard pages are client components using `useSearchParams` without Suspense boundaries

## 4. API Route Structure
```
app/api/
├── admin/              # Admin CRUD endpoints
│   ├── assignments/    # Teaching assignment CRUD
│   ├── cars/           # Vehicle management
│   ├── departments/    # Department CRUD
│   ├── materials/      # Teaching material CRUD
│   ├── positions/      # Position CRUD
│   ├── schools/        # School CRUD
│   ├── send-report/    # Email school reports
│   ├── settings/       # System settings
│   ├── students/       # Student CRUD + bulk upload
│   ├── subjects/       # Subject CRUD
│   └── users/          # User management
├── approvals/          # Approval history + pending
├── attendance/         # Student attendance records
├── auth/[...nextauth]  # NextAuth route handler
├── cars/bookings/      # Car booking workflow
├── ceo/overview/       # CEO dashboard aggregation
├── checkin/            # Employee check-in + team view
├── cron/               # Scheduled jobs (car-expirations, reminders, summaries)
├── leaves/             # Leave request CRUD + approval + stats
├── notifications/      # In-app notification CRUD
├── purchases/          # Purchase request CRUD + approval + receipt upload
├── reports/            # Report aggregation (monthly, overview, school, teacher-*, income)
├── teaching/           # Teaching assignment detail
└── teaching-logs/      # Teaching log CRUD
```

## 5. UI/UX Aesthetics

### Design Philosophy
- **Premium Feel**: Vibrant gradient headers (indigo/violet/purple), rounded corners (`rounded-[3rem]`), glassmorphism overlays
- **Typography**: System font stack + Thai-optimized rendering, 10px uppercase tracking badges, bold hierarchy
- **Color System**: Indigo/Violet primary, Emerald for success, Rose for alerts, Amber for warnings
- **Animations**: `animate-in`, `fade-in`, `slide-in-from-bottom` entry transitions via `tw-animate-css`

### Component Patterns
- **Page Headers**: Full-width gradient banners with icon + title + subtitle
- **Data Tables**: Shadcn Table with hover states, inline status badges, action buttons
- **Status Badges**: Color-coded with semantic backgrounds (`bg-emerald-50 text-emerald-700 border-emerald-200`)
- **Forms**: Dialog-based modals with Zod validation, Select dropdowns, date/time pickers
- **Empty States**: Dashed border containers with emoji icons and descriptive text

### Responsive Design
- Mobile-first approach with `sm:`, `md:` breakpoints
- Collapsible sidebar navigation
- Stacked layouts on mobile, grid layouts on desktop
