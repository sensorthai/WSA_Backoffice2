# WSA Backoffice — Agent Knowledge Base

## Core Context Files
- @PROJECT_CONTEXT.md — Business domain, modules, database schema
- @DESIGN.md — Architecture, tech stack, UI system, build config
- @AGENTS.md — Agent responsibilities, business rules, coding standards

## Quick Reference
- **Project Name**: WSA Backoffice (sme-backoffice)
- **Domain**: internal.wsa.co.th
- **Stack**: Next.js 14.2.18 (App Router), Supabase, NextAuth v5 (Google), Tailwind CSS, Shadcn UI
- **Dev Server**: `npm run dev` → port 3001
- **Build**: `npm run build` → production build passes cleanly (exit 0)
- **Language**: Thai user-facing strings, English internal logic

## Development Guidelines
1. Always maintain **Premium UI Aesthetics** — gradients, glassmorphism, animations
2. All schema changes → `supabase/migrations/` with chronological naming
3. Ensure **Print-Friendly** versions for forms and reports (`.no-print` utility)
4. All API routes must verify user roles before sensitive operations
5. Use `zodResolver() as any` when combining Zod schemas with react-hook-form (known type mismatch)
6. All dashboard pages are `"use client"` with `export const dynamic = 'force-dynamic'`
7. **Tactile Responsiveness**: Interactive elements (buttons, links, clickable items) must feature immediate active compression states (`active:scale-[0.97] active:brightness-95 active:duration-75`) and `-webkit-tap-highlight-color: transparent` to eliminate click latency.
8. **Feedback Notifications**: Never use native browser `alert()` popups for async/database mutations. Integrate rich Sonner `toast.success`, `toast.error`, and `toast.warning` notifications.
9. **Layout Resilience**: Ensure crucial text elements (like employee names/departments) are never compressed to zero width in narrow grids or lists. Use proper flex hierarchies (e.g. `flex-1 overflow-hidden min-w-0` on text containers) to allow clean truncation.
10. **Time-Zoned Cron Jobs**: Configure Vercel Cron jobs in `vercel.json` using exact UTC time matching Thailand Time Zone (ICT, UTC+7) (e.g., Daily work reminder runs at 17:00 ICT / 10:00 UTC).
11. **Approval Tracking**: Display the full name of the actual approver (supervisor and/or CEO) in a dedicated "ผู้อนุมัติ" column within all approval history grids.

## Known Build Configuration
- `strictNullChecks: false` in tsconfig (codebase uses nullable patterns extensively)
- `downlevelIteration: true` for `[...new Set()]` spread patterns
- `missingSuspenseWithCSRBailout: false` in next.config.mjs (client-side pages use useSearchParams without Suspense)
- ESLint: `no-explicit-any` off, `no-unused-vars` warn-only (ensure unused imports/variables are regularly cleaned up to keep the build fully warning-free)

