# 10 — Home Screen

The home screen is a dashboard, not a menu. The operator opens it and instantly
knows what needs attention and what to do next.

## Core principle

The screen adapts to what matters right now. Morning: where to be. Evening: money
to collect. Always: new job one tap away. No private financial info visible on
screen (customers may be looking over his shoulder on site).

## Smart prompt (top card, contextual)

One card at the top of the screen that changes based on priority. Simple rules,
checked in order:

1. Job starting within the next hour: dark card (#1F2D37), shows customer name,
   job summary, address. "Navigate" button (green) opens Google Maps.
2. Quote just accepted: shows customer name, accepted amount, "View" and
   "Schedule" actions.
3. Uninvoiced completed jobs exist: gold card (#FEF7E6), "Money on the table,
   X jobs ready to invoice, $X unbilled." "Invoice now" button (amber) opens the
   ready-to-invoice list. Only shows in the evening or when no jobs are active
   today, never on site in front of a customer.
4. Nothing urgent: card is not shown. "New job" leads the screen.

## Day progress

"X of Y done" with a simple progress bar. Green fill. Shows momentum. Taps through
to the Today view.

## New job button

Full-width green button (#22A67A), always visible, always in the same position. This
is a quoting app first. The button never moves, never hides behind a contextual card.

## Stat cards (2 cards, side by side)

- Quotes out: count (blue), "Waiting on customer." Taps to quotes list filtered
  to sent/awaiting.
- To schedule: count (ink), "Accepted, unplanned." Taps to the backlog list on
  phone, or the planner on desktop.

Only two cards, not four. Jobs today and ready-to-invoice are handled by the smart
prompt and day progress, so they do not need separate cards.

## Recent activity

Compact list showing what changed. Each row: customer name, action taken (quote
accepted, invoice paid, quote sent), status badge, time. Tapping a row opens that
job.

Morning: shows recent quote activity (accepted, sent, declined).
Evening: shows today's completed jobs with paid/unbilled status.

## Bottom navigation (5 items)

- Home (active)
- Quotes
- Today
- Catalogue
- Settings

## Greeting

Time-based: "Good morning" / "Good afternoon" / "Good evening." Below it, the
operator's business name (his business, not Jotey) in 22px/600.

## No earnings or financial totals on the home screen

The operator opens this app on site in front of customers. Weekly earnings, profit
margins, or revenue numbers must never be visible on the home screen. Those belong
in a reporting screen behind a deliberate tap, not on the landing page.

## Tap targets

Every element is tappable:

| Element | Taps to |
|---------|---------|
| Smart prompt action button | Google Maps (navigate) or Ready to invoice list |
| Day progress bar | Today view |
| Quotes out card | Quotes list, filtered to awaiting |
| To schedule card | Backlog list (phone) or planner (desktop) |
| New job button | New job flow (customer details) |
| Recent activity row | That specific job |
| Bottom nav items | Respective screens |

## UX rules

- 48px minimum tap targets.
- Sentence case everywhere.
- No em-dashes, no exclamation marks.
- No emojis.
- Plain language.
- The operator's business name, not Jotey, in the greeting.
