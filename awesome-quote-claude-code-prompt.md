# Claude Code Bootstrap Prompt — Awesome Quote

Copy everything below the line into your terminal as the Claude Code prompt.

---

```
claude --dangerously-skip-permissions
```

Then paste this as your first prompt:

---

## Prompt

```
Read every file in this project directory before doing anything: CLAUDE.md, SKILL.md, awesome-quote-brand-guide.md, awesome-quote-tokens.css, and all docs (01 through 06). These are your source of truth. Do not deviate from them.

You are scaffolding and building "Awesome Quote" — a mobile-first PWA for a NZ joinery repair sole operator. Full context is in the docs. Here is your build plan.

## Phase 1: Scaffold (do this now)

1. Initialise a git repo in the project root. Make an initial commit with the docs as-is: `git init && git add -A && git commit -m "v0.0.0: project docs and brand assets"`

2. Scaffold a Next.js 14 App Router project (JavaScript, not TypeScript) with Tailwind CSS v3. Use `npx create-next-app@latest . --js --app --tailwind --eslint --no-src-dir --import-alias "@/*"` — accept defaults, install in the current directory.

3. Install dependencies: `npm install @supabase/supabase-js uuid`

4. Set up Tailwind config using the exact Awesome Quote design tokens from `awesome-quote-tokens.css`. Copy the Tailwind extend block from that file into `tailwind.config.js`. Add the CSS custom properties from `awesome-quote-tokens.css` into `app/globals.css`. Import Inter from Google Fonts in the layout.

5. Create the project structure:
   - `app/` — pages (home, jobs/new, jobs/[id], jobs/[id]/items, jobs/[id]/quote, catalogue, settings)
   - `components/` — shared UI (Button, Badge, Card, Modal, Stepper, StatusBadge)
   - `lib/` — utilities (pricing.js, diagnosis.js, constants.js, supabase.js)
   - `public/` — PWA manifest, icons

6. Build the shared component library first, using the brand guide exactly:
   - `Button` — primary (green), secondary (outlined), destructive (red outlined), gold. All 48px min height, 10px radius, 17px/500 text.
   - `StatusBadge` — solid fills per the status colour table. 14px/500, 6px 14px padding, 8px radius.
   - `Card` — white bg, 0.5px border #E4EAE8, 12px radius, 16px padding.
   - `ConfirmModal` — centred overlay, ink at 50% opacity backdrop, white card, stacked full-width buttons (48px), no close X. Plain language question + "Not yet" (secondary) / "Yes, send" (primary).
   - `Stepper` — big +/- buttons (48px tap targets) for quantities and hours.
   - `DurationPresets` — 30m, 1hr, 1.5hr, 2hr+ as tappable pill buttons.

7. Create `lib/constants.js` with all domain constants:
   - Joinery types and their fault options (from the diagnosis matrix in 02-ux-spec.md)
   - `fits` values, `fixes` values, `category` values
   - Default callout zones
   - Status enum values

8. Create `lib/pricing.js` with the canonical pricing logic from the data model doc. All currency rounded with toFixed(2).

9. Create `lib/diagnosis.js` with the suggestion query: filter parts where `active && fits.includes(joineryType) && fixes.includes(fault)`.

10. Set up PWA: create `public/manifest.json` with the Awesome Quote branding (name, short_name, theme_color #22A67A, background_color #F6F8F7). Generate the AQ monogram as an SVG favicon.

11. Build the Home screen (app/page.js) per UX spec 4.1:
    - AQ monogram + "Awesome Quote" header
    - Four large action buttons: New job, Open quotes, Jobs today, Parts catalogue
    - Recent jobs list (empty state for now with placeholder text)
    - Status badges on each job row

12. Commit after each major piece: `git add -A && git commit -m "v0.1.x: [description]"`. Use semantic versioning. Log every commit.

## Build rules (non-negotiable)

- Follow CLAUDE.md golden rules exactly. 48px tap targets, 16px+ fonts, no swipe gestures, confirm modals on financial actions.
- Use the Awesome Quote colour palette and tokens exactly as specified. Go green #22A67A is the primary. Gold #F0B542 for celebrations only. Ink #1F2D37 for text.
- Inter font, weights 400 and 500 only. Never bold/600/700.
- Sentence case on all labels. No em-dashes. No exclamation marks.
- Mobile-first. Max content width 480px. Page bg #F6F8F7, cards white.
- All money in NZD, GST at 15%, toFixed(2) for display.
- Cost price never shown to customers. sell_price on quotes/invoices, cost_price on POs.
- A job is a container with multiple items. Never assume 1 job = 1 item.
- No swipe gestures anywhere. Explicit buttons for everything.

## Commit discipline

Every commit message follows: `v{major}.{minor}.{patch}: {what changed}`
- v0.0.0 = docs only
- v0.1.0 = scaffold + tailwind + tokens
- v0.2.0 = component library
- v0.3.0 = home screen
- v0.4.0 = new job + customer details
- v0.5.0 = add item + diagnosis flow
- etc.

After each commit, run `git log --oneline` and print the output so I can see the trail.

## What to skip for now

- Supabase connection (use local state / mock data for now — we will wire up Supabase after the UI is solid)
- Xero integration (v1 feature but wired up after core UI)
- Route optimisation, week view, reporting (v2)
- Do not build a scraper for the supplier portal

## Start now

Begin with Phase 1. Scaffold, configure Tailwind with the exact brand tokens, build the component library, then the Home screen. Commit after each step. Show me the git log when done.
```
