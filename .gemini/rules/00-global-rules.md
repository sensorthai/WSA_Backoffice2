# Global Development Rules: WSA Backoffice

## 1. UI & Design
- **Premium Aesthetics**: Never create basic or plain UIs. Always use gradients, subtle shadows, glassmorphism, and modern typography (Inter/Outfit).
- **Responsive**: Ensure all views are usable on mobile and desktop.
- **Animations**: Use `tailwindcss-animate` and `tw-animate-css` for entry transitions and micro-interactions.

## 2. Technology & Code
- **Framework**: Use Next.js 14 App Router patterns.
- **Database**: All data interactions must go through Supabase. Avoid raw SQL in the application; use the Supabase client.
- **Roles**: Always verify user roles (`profile.role`) before performing sensitive actions.
- **State**: Use URL search params for filtering and tab switching in administrative views.

## 3. Database & Migrations
- **Schema**: Any schema change requires a new migration file in `supabase/migrations/`.
- **Naming**: Use chronological prefixes (e.g., `009_...sql`).
- **Comments**: Add comments to SQL migrations explaining the "Why" and "What."

## 4. Documentation & Communication
- **Agent Context**: Refer to `.gemini/AGENTS.md` and `DESIGN.md` for context before starting new major tasks.
- **Feedback**: Proactively suggest improvements if a user's request could be implemented in a more "premium" or efficient way.
