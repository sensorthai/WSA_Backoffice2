# WSA_Backoffice - VS Code Project Notes

## Overview
- Project: `sme-backoffice`
- Framework: Next.js 14 (App Router)
- Language: TypeScript + React
- Styling: Tailwind CSS with `darkMode: ["class"]`
- Backend/Services: Supabase, Next Auth, Nodemailer, custom cron API routes
- Deployment: Vercel config present (`vercel.json`)

## Key dependencies
- `next` 14.2.18
- `react` 18 / `react-dom` 18
- `typescript` 5
- `tailwindcss` 3.x, `@tailwindcss/forms`, `tailwindcss-animate`
- `@supabase/auth-helpers-nextjs`, `@supabase/supabase-js`
- `next-auth` v5 beta
- `@tanstack/react-query`
- `react-hook-form`, `zod`
- `lucide-react`, `radix-ui`, `sonner`, `class-variance-authority`
- `html2pdf.js`, `xlsx`

## Important scripts
- `npm run dev` → starts Next.js dev server on port `3001`
- `npm run build` → builds the app
- `npm run start` → starts production server on port `3001`
- `npm run lint` → runs Next.js ESLint
- `npm run flowaccount:sync` → custom script in `scripts/flowaccount-sync.mjs`
- `npm run flowaccount:commit` → same script with `--commit`

## TypeScript + ESLint
- `tsconfig.json` enabled with `strict: true`, but `strictNullChecks: false`
- Path alias: `@/*` resolves to the repository root
- ESLint extends `next/core-web-vitals` and `next/typescript`
- Custom ESLint rules allow `any`, disable some unused/expression warnings, and allow unescaped entities in React

## Project structure
- `app/` - primary App Router pages and layouts
- `components/` - shared UI components, admin/dashboard/forms/layout/ui components
- `lib/` - business logic utilities: auth, email, supabase, approval engine/rules, utils
- `hooks/` - custom React hooks (`useLeaveRequests`, `usePurchaseRequests`, `useRole`, `useUser`)
- `contexts/` - I18n context
- `locales/` - translations for `en` and `th`
- `pages/` - likely legacy Next.js pages or compatibility routes
- `scripts/` - automation and sync scripts
- `supabase/` - seed SQL and migrations
- `scratch/` - investigative scripts, data checks, migrations, tests

## Special config notes
- `next.config.mjs` defines a redirect from `/finance` to `/purchases?tab=finance`
- `vercel.json` includes cron definitions for API endpoints such as `checkin-reminder`, `daily-summary`, `car-expirations`, `doctor-appointments`, and `work-done-request`
- Tailwind config uses CSS custom properties for theme colors

## VS Code recommendations
- Recommended extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - Prettier
  - GitLens (optional)
  - Next.js snippets
- Use the root folder `c:\Antigravity\WSA_Backoffice`
- Run the dev server with `npm run dev`
- Preview at `http://localhost:3001`
- Ensure `.env.local` is present for local environment variables

## Notes for contributors
- This repo is a production-ish backoffice app with auth, dashboards, approvals, purchase workflows, and scheduling
- There is a strong Supabase integration and custom email/approval logic in `lib/`
- `scratch/` contains utility scripts and migration helpers not part of the main web app
- The workspace has existing `.next/` and `node_modules/` directories, so most dependencies are already installed

## Helpful file pointers
- `app/layout.tsx` and `app/page.tsx` are the main entry files for the app shell
- `components/providers.tsx` likely wraps app providers and theme support
- `lib/supabase.ts` is the likely Supabase client config
- `lib/auth.ts` and `lib/email.ts` are key auth/email flows
- `hooks/useUser.ts` and `hooks/useRole.ts` are central auth state hooks
