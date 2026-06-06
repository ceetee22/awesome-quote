# Phase 1 — Desktop week planner (skeleton)

Build task for Claude Code. Read `CLAUDE.md` and the joinery skill first. This is
the first build of the scheduling feature described in `docs/07-scheduling-and-calendar.md`.
The data layer (migration `07_scheduling.sql`) and the cascade engine
(`lib/cascade.js`) are already in place.

## Definition of done

On a computer, the operator can open the planner, see his accepted-but-unplaced
jobs in a backlog, drag one onto a day, set a rough slot and a duration, and have
it persist and appear in that day with a computed start time and finish readout.
The phone experience is untouched.

## Do NOT build in this phase

- Real travel times / Distance Matrix (Phase 2). Use a flat placeholder for now.
- Weather chips or the exposed-job hint (Phase 3).
- Customer confirmation emails and the object link (Phase 4).
- The mobile Today rework and the on-my-way / done actuals (Phase 5).
- The priority pin (later).

Keep this phase to the planner skeleton only.

## Preconditions to verify first

1. Confirm the `07_scheduling.sql` columns exist on `jobs` and `settings`.
2. FIFO and the aging label both need an "accepted at" timestamp. Check whether
   `jobs` already has one (e.g. `accepted_at`). If not, add `accepted_at timestamptz`,
   set it whenever a job's `status` becomes `accepted`, and backfill existing
   accepted jobs from `created_at` as a fallback.
3. Install drag-and-drop: `@dnd-kit/core` and `@dnd-kit/sortable`.

## Route and gating

- New App Router route `/planner`.
- Desktop only. Render the planner at viewport width >= 1024px. Below that, show a
  centered message: "Open the planner on a computer to plan your week." Do not try
  to make the planner responsive down to mobile, it is a deliberate large-screen layout.

## Data

- Backlog: `jobs` where `status = 'accepted'` and `schedule_state in ('unassigned','needs_rebooking')`,
  ordered by `accepted_at` asc (FIFO). Jobs in `needs_rebooking` carry old accepted
  dates so they float to the top naturally, but flag them clearly regardless.
- Week grid: `jobs` where `scheduled_date` falls in the visible week (Mon to Sat),
  ordered by `scheduled_date`, then `sequence_index`.
- Settings: read `day_start_minute`, `day_end_target_minute`, `default_buffer_minutes`.

## Components

- `app/planner/page.jsx` — two-pane layout: backlog column on the left (~240px), a
  0.5px divider, then the week grid filling the rest.
- `BacklogColumn` — header with a count; a sort toggle "Oldest first" (default) /
  "By area"; the cards. Each card shows customer name, an area pill (rough suburb
  derived from the address is fine for now), the job summary, an aging line
  ("Accepted N days ago", muted normally, amber once past ~10 days), the value, and
  a status badge (Accepted = green, Rebook = amber for `needs_rebooking`). Cards are draggable.
- `WeekGrid` / `DayColumn` — one column per working day. Render each day's jobs
  through `computeDay` from `@/lib/cascade` to get start times and the finish
  readout. Finish readout is neutral, turning amber when `longDay` is true. An empty
  day shows a drop target ("Drop a job here").
- `DropModal` — opens on drop. One question that matters: a duration preset
  (30 min / 1 hr / 1.5 hr / 2 hr+), plus a morning/afternoon slot. Show the
  `computeDay` start-time preview. Confirm writes the job; cancel discards.
- `MonthHeatmap` — a Day / Week / Month toggle on the grid; the month view is
  read-only and shades each day by how many jobs it holds. No dragging on the month.

## Cascade usage (Phase 1 travel placeholder)

- Order each day's jobs by `sequence_index` and map them to `computeDay` input:
  `durationMin = estimated_duration * 60`, `bufferMin = settings.default_buffer_minutes`.
- For travel, pass `travelMinFromPrev = 0` this phase and leave a clear `TODO(Phase 2)`
  noting it will come from `travel_cache` / Distance Matrix. Because there is no real
  travel yet, hide the "total drive" readout for now and show only the finish line.
- Persist the resulting `start_minute` for each job in the day.

## Interactions and writes

- Backlog onto a day: set `schedule_state = 'assigned'`, `scheduled_date`, `slot`,
  `estimated_duration`, append `sequence_index` to the end of that day, then recompute
  and save `start_minute` for that day. Optimistic UI.
- Reorder within a day: update `sequence_index` on the affected jobs and recompute.
- Move a job day to day: update `scheduled_date` and `sequence_index`, recompute both days.
- Drag a day job back to the backlog (unassign): `schedule_state = 'unassigned'`,
  clear `scheduled_date`, `slot`, `sequence_index`, `start_minute`.

## UX rules (per CLAUDE.md and the brand guide)

Use the existing brand tokens, Inter, sentence case, no em-dashes, no exclamation
marks. Desktop mouse drag is fine here, the no-swipe rule is a mobile rule. The drop
modal is the lightweight confirm pattern.

## Verify and deploy

Build clean, then `npx vercel --prod` and confirm it actually reached production. Any
CI lint or typecheck steps must use `continue-on-error` so they never block the deploy.
