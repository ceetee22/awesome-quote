# 07 — Scheduling & Calendar (Job Assignment)

Design brief for the job assignment / scheduling feature in Jotey (the joinery repair quoting app). This is the next major build after the core quote → email → accept → order → PO loop. Captures the agreed model and the decisions still to lock before building.

## The problem

A sole operator accepts many jobs in a week (e.g. 15), all of whom said yes to the quote, none of which are booked into a day yet. His real weekly task is not "schedule one job" — it is **batch planning**: look at the whole backlog of accepted work, fit it across the days he has, and confirm each slot works for the customer.

The current implementation is wrong for this. Scheduling is a per-job inline date/time picker buried as a "Schedule return visit" secondary button on the accepted-job detail page. It uses fiddly native pickers (which the brand guide explicitly says to avoid), has no overview of the week, no concept of a backlog, and no customer-confirmation step (it just sets a date the customer never agreed to).

## The core insight: split by device and mode of work

The tradie works in two distinct modes, on two devices, and the feature should match each:

- **On site, phone — capture & execute.** Quote fast (already built) and "where do I need to be today / next." Glanceable, big tap targets, one-handed.
- **At the desk, computer — plan.** Sit down once (evening / Monday morning), see the backlog of accepted jobs and the week, and drag jobs onto days. Deliberate, two-handed, mouse-driven. A big screen and a mouse are the right tools for drag-and-drop; a phone is the wrong tool for it.

This matches how tradies already behave ("they sit at the computer to plan anyway") and follows how good field-service tools split: **planning is desktop, execution is mobile.**

## Proposed architecture

### Desktop planner (drag-and-drop, desktop-only view)
- **Backlog column** — all accepted-but-unassigned jobs, the pile to place.
- **Week grid** — days as columns. Drag a job from the backlog onto a day (and a rough slot). Reassign by dragging between days. Unassign by dragging back to the backlog.
- At-a-glance capacity — he sees which days are heavy/empty and drags accordingly.
- This is where the "assigned" state gets set.
- This is a NEW desktop-only layout (wide, multi-column, mouse-driven), not a widened mobile screen. It only appears on large screens. It is additive — the phone experience does not change.

### Mobile "Today" (phone — execute)
- The existing Today tab becomes genuinely useful: **where you need to be today**, in order.
- Each entry: address (tap to navigate), customer, what the job is, the time/slot.
- Glanceable — he checks it over coffee, taps the first address, drives.
- He is *consuming* the plan he made at the desk, not making it on the phone.

## New job states

The current model jumps straight from "accepted" to "scheduled" with no customer agreement and no backlog concept. The real flow has three distinct states the model must support:

1. **Accepted** — customer said yes to the quote (the price). Already handled.
2. **Assigned** — *he* has penciled it into a day/slot (done on the desktop planner). NEW.
3. **Confirmed** — the *customer* has agreed they are available that day. NEW.

A job can be: accepted-but-unassigned (in the backlog), assigned-but-unconfirmed (penciled, waiting on customer), or confirmed (locked in). Status must be clear everywhere (home screen, job cards, Today view) so he knows at a glance who needs booking, who is penciled but unconfirmed, and who is locked.

## Decisions still to lock before building

1. **Customer confirmation loop — how heavy?**
   - **Heavy:** customer gets an email/link, confirms or proposes another time (a mini booking system). Most coordination, most build.
   - **Light (recommended):** he assigns a day, the customer is *notified* ("Awesome Joinery booked you for Thursday morning, reply if that does not work"), assumed-confirmed unless they object. Far simpler; matches how many tradies work. Reuses the existing Resend email plumbing.
   - **Manual:** he assigns, then marks it confirmed himself after phoning/texting the customer his own way. App is a planner/tracker only. Simplest.
   - In the desktop-plan model, the natural trigger is: drag job onto Thursday → fires the customer notification/confirmation → job shows "assigned, awaiting confirmation" until customer agrees → "confirmed."

2. **Rough slot vs precise time?**
   - **Recommended: day + rough slot (morning/afternoon, or a few coarse slots).** "Thursday morning" is how repair work is actually booked, keeps the grid clean and the Today list readable, and is far less fiddly. Precise times (9:47) are overkill.

3. **Week-grid vs simpler day-list?**
   - A true drag-onto-a-time-grid calendar is the richest but biggest build. A "Monday: [2 jobs] / Tuesday: [empty] / Wednesday: [1 job]" day-list may deliver everything needed with less complexity. Decide how much grid is genuinely required. (Desktop drag-and-drop is pleasant; keep it desktop-only regardless.)

## Recommended starting position (Claude's lean)

- **Light confirmation** — assigning proposes the day, customer notified with an objection link, confirmed unless they push back. Reuses existing email plumbing.
- **Day + morning/afternoon slot** — not precise times.
- **Desktop drag-and-drop planner** (backlog column + week) that only shows on large screens; **mobile Today** as the glanceable execution view.

## Scope note (read before committing)

This is the point where the app crosses from "fast quoting tool" into "field-service management." That is a good expansion — more valuable, stickier, and it helps justify a subscription when sold to other operators. But it IS scope: the MVP scope doc explicitly deferred the calendar and routing to v2. Pulling it forward is a legitimate, conscious decision driven by real use (an unscheduled pile of 15 accepted jobs is a genuine pain), not scope creep.

**Strong alternative worth weighing:** ship the current core loop (quote → email → accept → order → PO → complete → photos, all working), get the client using it on real jobs for a week or two FIRST, then build the planner. Real use will reveal exactly how he wants to plan — and whether light confirmation is enough — better than guessing now. This is the biggest single remaining build, so there is a real case for validating the core before taking it on.

## Build surface (when it goes ahead)

- New desktop-only planner view (backlog + week grid, drag-and-drop).
- Reworked mobile Today view (glanceable, ordered, tap-to-navigate).
- New job states: assigned, confirmed (plus the unassigned backlog concept). Data model changes — likely new columns for assigned slot, confirmation state, and a migration.
- Possibly a second customer-facing confirmation page/flow (if light or heavy confirmation), mirroring the existing accept page.
- Status label/badge updates across home, job cards, quotes, Today.
- Keep all existing copy/UX rules: sentence case, no em-dashes, no exclamation marks, 48px tap targets on mobile, big tappable controls (not native pickers), customer never sees cost/profit/Jotey branding.

## Context the new session needs

- App: Jotey (product brand, user-facing app chrome). The tradie's own business brand (e.g. "Awesome Joinery") is what THEIR customer sees on quotes/POs/confirmations. Jotey is invisible to the end customer.
- Stack: Next.js (App Router), JavaScript, Tailwind v3, Supabase (Postgres + storage + auth), Vercel. Resend for email (verified domain jotey.co.nz, sends from hello@jotey.co.nz, display name = tradie business, replyTo = tradie email — the "Xero model").
- Mobile-first, 480px column. A desktop planner is a deliberate exception to mobile-first and should be a separate large-screen layout.
- Brand tokens: go green #22A67A primary, gold #F0B542 accent/celebration, ink #1F2D37, surface #F6F8F7, border #E4EAE8. Inter font, weights 400/500 only. Status badges are solid bold colours.
- Existing status flow: draft → quoted → accepted → ordered → scheduled → completed → invoiced, plus declined and payment_status (unpaid/paid). The new assigned/confirmed states slot between accepted and the work being done.
