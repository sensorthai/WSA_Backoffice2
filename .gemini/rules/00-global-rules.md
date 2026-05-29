# Global Development Rules: WSA Backoffice

## 1. UI & Design
- **Premium Aesthetics**: Never create basic or plain UIs. Always use gradients, subtle shadows, glassmorphism, and modern typography.
- **Responsive**: Ensure all views are usable on mobile and desktop.
- **Animations**: Use `tw-animate-css` for entry transitions (`animate-in`, `fade-in`, `slide-in-from-bottom`).
- **Page Headers**: Use gradient banner pattern with icon, title, and subtitle description.
- **Status Indicators**: Color-coded Badge components with semantic backgrounds (emerald=active, rose=alert, amber=warning, blue=info).
- **Tactile Active States**: All clickable elements (buttons, links, clickable table rows or divs) must feature instant tactile compression scaling (`active:scale-[0.97] active:brightness-95 active:duration-75`) and `-webkit-tap-highlight-color: transparent` to eliminate tap latency on mobile devices.
- **Feedback & Notifications**: Avoid using legacy browser `alert()` popups for async operations or db modifications. Always integrate rich Sonner toast alerts (`toast.success`, `toast.error`, `toast.warning`).
- **Layout Resilience**: Never use flex properties (like `justify-between` combined with `shrink-0` on sibling tags) that can compress important name text columns to zero width on narrow screen sizes. Text containers must be given `flex-1 overflow-hidden min-w-0` to truncate cleanly.
- **Approver Visibility**: All final approval history grids (like under history / 'ประวัติ') must load the full name of the actual approver (supervisor and/or CEO) and render them in a dedicated 'ผู้อนุมัติ' column.

## 2. Technology & Code
- **Framework**: Next.js 14 App Router patterns. All dashboard pages are `"use client"` with `export const dynamic = 'force-dynamic'`.
- **Database**: All data interactions through Supabase server client (`createSupabaseServerClient()`). Never expose service keys to client.
- **Auth**: Verify `session.user.role` at both middleware and API levels before sensitive operations.
- **State**: Use URL search params for filtering and tab switching. Never use React state for URL-representable data.
- **Forms**: React Hook Form + Zod. Always use `zodResolver(schema) as any` to avoid the known Zod v4 type mismatch.
- **Data Fetching**: TanStack React Query with `useQuery`/`useMutation`. Invalidate caches on mutation success.
- **Vercel Cron Scheduling**: Define all automated cron tasks inside `vercel.json`. Because Vercel Crons run in UTC, always convert Thailand Time (ICT, UTC+7) to UTC by subtracting 7 hours (e.g. 17:00 ICT = 10:00 UTC).

## 3. Build Stability (CRITICAL)
- **Build must always pass** (`npm run build` → exit 0). Never merge code that breaks the build.
- **Known type patterns**:
  - `zodResolver() as any` — required for all Zod + react-hook-form integrations
  - `searchParams?.get()` — optional chaining for `useSearchParams()` results
  - `Array.from(new Set(...))` or use spread with `downlevelIteration: true`
  - Zod schemas: use `.optional()` instead of `.default()` for array/boolean fields in forms
- **TSConfig**: `strictNullChecks: false`, `downlevelIteration: true`
- **Next.js Config**: `missingSuspenseWithCSRBailout: false` (experimental)
- **ESLint**: `no-explicit-any` off, `no-unused-vars` warn-only. Ensure all unused imports and variables in core application files are completely cleaned up before checking in to guarantee a pristine, warning-free build.

## 4. Database & Migrations
- **Schema**: Any schema change requires a new migration file in `supabase/migrations/`.
- **Naming**: Use chronological prefixes (e.g., `009_add_teaching_fees.sql`).
- **Comments**: Add comments to SQL migrations explaining the "Why" and "What."
- **Fullbackup**: On every migration database it must full database backup to local folder `supabase/backups/` before run migration and push back to git


## 5. Documentation & Communication
- **Agent Context**: Refer to `.gemini/AGENTS.md` and `DESIGN.md` for context before major tasks.
- **Feedback**: Proactively suggest improvements if a user's request could be implemented in a more "premium" or efficient way.
- **Thai Strings**: All user-facing text in Thai. All code logic, variables, and comments in English.
