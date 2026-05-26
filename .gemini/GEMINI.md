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
5. All API routes must verify user roles before sensitive operations
6. Use `zodResolver() as any` when combining Zod schemas with react-hook-form (known type mismatch)
7. All dashboard pages are `"use client"` with `export const dynamic = 'force-dynamic'`

## Known Build Configuration
- `strictNullChecks: false` in tsconfig (codebase uses nullable patterns extensively)
- `downlevelIteration: true` for `[...new Set()]` spread patterns
- `missingSuspenseWithCSRBailout: false` in next.config.mjs (client-side pages use useSearchParams without Suspense)
- ESLint: `no-explicit-any` off, `no-unused-vars` warn-only
