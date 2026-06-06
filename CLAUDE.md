# CLAUDE.md — Project Instructions

Instructions for working on the Joinery Repair Quoting App. Read this and the `docs/` folder before starting any work.

## What this is

A mobile-first PWA for a NZ joinery repair sole operator. He fixes hardware (hinges, stays, rollers, locks) on doors and windows — he does NOT fabricate or install new frames. The app lets him diagnose, quote, get paid via Xero, and order parts. Full context in `docs/01-product-brief.md` through `docs/06-mvp-scope.md`.

## Golden rules

1. **Build for a 60-year-old on Android.** Minimum 48px tap targets, 16px base font, high contrast, no swipe gestures, plain language. Every action is an explicit button.
2. **Confirm before anything financial or irreversible.** Pushing to Xero, sending a purchase order, and sending a quote all get a lightweight confirm modal (big buttons, plain words). The "Order parts" approval gate is non-negotiable — he may already have stock, so nothing is ordered until he reviews and explicitly confirms.
3. **A job is a container.** It holds multiple items. Each item is either diagnosed (joinery type + fault) or custom (freeform). Never assume one job = one item.
4. **Cost price vs sell price.** Customer-facing outputs (quote, Xero invoice) use sell price. Purchase orders use cost price and supplier codes. Never show cost price to the customer.
5. **The catalogue is the brain.** Diagnosis suggestions come from `fits` and `fixes` tags on parts. Keep that tagging logic central and well-tested.

## Multi-tenancy rules

This is a multi-tenant SaaS. Multiple businesses share the same database. Data isolation is non-negotiable. Every line of code that touches the database must follow these rules.

1. **Never use the service role key for user-facing queries.** The service role key bypasses RLS entirely. It is ONLY for the admin panel (/admin) and system-level operations that genuinely need cross-business access. Every user-facing query must use the authenticated user's Supabase client so RLS is enforced.

2. **Always scope by business_id explicitly.** Do not rely on RLS alone. Every SELECT, UPDATE, INSERT, and DELETE on a business-scoped table (jobs, parts, callout_zones, suppliers, job_items, job_item_parts) must include an explicit business_id filter or use get_my_business_id(). Belt and braces — RLS is the safety net, explicit filtering is the primary guard.

3. **Never write unscoped updates.** Never use patterns like .not('id', 'is', null) or .update() without a WHERE clause that targets a specific row owned by the current user. Every update must filter by both the row ID and business ownership.

4. **New user = empty data.** A new signup must see zero jobs, zero parts, zero quotes, zero stats. If a new user sees any data they did not create, there is a scoping bug. Test this after every auth or data change.

5. **get_my_business_id() can return NULL.** For users who just signed up and have no business yet, this function returns NULL. Handle the NULL case gracefully — show empty states, redirect to setup, never fall back to another user's business.

6. **Server components and API routes default to the user's session.** When creating a Supabase client in server components or API routes, always use createServerClient with the request cookies (the user's JWT). Never import or create a service role client unless the route is explicitly admin-only.

7. **Test with two users after every data change.** After any migration, RLS policy change, or query change: log in as user A, verify their data. Log in as user B, verify their data. Confirm zero cross-contamination.

8. **Tables that are business-scoped:** businesses, jobs, job_items, job_item_parts, parts, callout_zones, suppliers, travel_cache, weather_cache. Every query on these tables must be scoped.

9. **Tables that are NOT business-scoped:** auth.users (managed by Supabase Auth). Never query auth.users directly from client code.

10. **The admin panel is the only exception.** /admin routes use the service role key to read across all businesses. These routes are gated by ADMIN_USER_ID and must never be accessible to normal users.

## Tech conventions

- PWA, mobile-first, responsive for desktop calendar
- Suggested stack: Next.js (App Router) + Tailwind v3 + Supabase + Vercel — confirm with team before locking
- JavaScript unless the team explicitly wants TypeScript
- Camera via `<input type="file" accept="image/*" capture="environment">`
- Store Xero tokens server-side only, never in the client
- All money math rounds for display (`toFixed(2)` for currency)
- GST is 15% (NZ), configurable in settings
- NZD throughout, GST-inclusive totals shown to customers

## Copy and tone conventions

- No em-dashes in any user-facing copy
- No exclamation marks in UI copy
- Sentence case for all labels and buttons
- Plain, direct language — this user is not technical

## Xero

- Standard developer account, OAuth 2.0 — no Developer Partner agreement needed to build
- Write-heavy, low egress — free Starter tier covers launch (≤5 connections)
- Push draft invoice on quote acceptance, approved invoice on job completion
- Do not use Xero API data to train any AI/ML model (terms prohibit it)

## Build order

Follow `docs/06-mvp-scope.md`. Ship v1 must-haves first. Do not build route optimisation, week view, or reporting until v1 is in the client's hands and being used on real jobs.

## Catalogue seeding

One-time only. See `docs/05-catalogue-seeding.md`. Do not build a recurring scraper against the supplier portal — extract once, then the client maintains the catalogue in-app.

## Deployment

- Deploy via `npx vercel --prod`
- Always verify the deploy actually reached production after pushing
- If CI lint/typecheck steps exist, they must use `continue-on-error` so they never block deploys

## When in doubt

Re-read the relevant `docs/` file. The UX was workshopped screen by screen with the client — `docs/02-ux-spec.md` is the source of truth for screen behaviour. If a requirement seems to conflict with the golden rules above, flag it rather than guessing.
