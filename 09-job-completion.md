# 09 — Job Completion Workflow

The flow from "repair finished" to "invoice in Xero." This runs on the operator's
phone on site, or later at home for batch invoicing.

## Two completion paths

### Path 1: complete and invoice on the spot
He finishes the job, taps "Done" on the Today view, and runs through the completion
flow immediately. The invoice hits Xero before he leaves the driveway.

### Path 2: mark done, invoice later
He finishes the job, taps "Done" then "Mark done" to close the work without invoicing.
The job moves to a "Ready to invoice" list. He invoices later from home, in a batch,
when he sits down to do paperwork. The completion flow picks up from the invoice step.

## The "Done" trigger

Lives on the Today view (mobile). When the operator taps "Done" on a job, two options:

- "Complete and invoice" — opens the full completion flow below.
- "Mark done" — marks the job completed without invoicing. Job appears in the
  "Ready to invoice" list accessible from the home screen.

## Completion flow

### Step 1 — After photos (optional, skippable)

"Add photo" button to attach photos already taken during the job. These are
proof-of-work for the operator's own records and for property manager disputes.
Photos are NOT pushed to Xero. They stay in Supabase storage attached to the job.

- Tap "Add photo" to attach, or "Skip photos" to move on.
- Multiple photos allowed.
- Photos stored against the job, paired with any before photos.

### Step 2 — Review invoice

The invoice pre-fills from the accepted quote. Shows job descriptions (what was done)
and the total. No individual cost breakdown on this screen, the operator just sees
the items and the bottom line.

If nothing changed: tap "Send invoice." One tap, fast path.

If something changed: tap "Adjust before sending."

### Adjust screen

- Labour hours: +/- stepper. Shows "was X hr" for reference against the quote.
- Parts: add, remove, or swap. Search catalogue or add manual.
- Callout fee: editable (rarely changes).
- Total updates live.
- Adjustment note (optional): free text explaining why the price changed,
  e.g. "additional roller needed, track damage found on site." Appears on invoice
  if the total differs from the quote.

Over-quote warning: if the adjusted total is higher than the accepted quote, a gentle
non-blocking note: "This is $85 more than the accepted quote. The adjustment note
will show on the invoice."

### Step 3 — Send invoice (payment fork)

Confirm modal: "Send invoice to Xero for $X?" with "Not yet" / "Yes, send."

On confirm, the app pushes an approved invoice to Xero. What happens next depends
on the customer type, smart-defaulted from the job's source field.

#### Direct customer (source = direct)

After the Xero push: "Paid now?"
- "Paid by transfer" — marks the Xero invoice as paid.
- "Paid by cash or card" — marks as paid.
- "Send and wait" — invoice emailed via Xero, payment tracked by Xero aging.

#### Property manager or builder (source = property_manager or builder)

After the Xero push: confirmation screen showing invoice sent with payment terms.
No "paid now" prompt. PMs never pay on the spot. Xero handles aging and follow-up.

## "Ready to invoice" list

Accessible from the home screen. Shows all jobs in "completed but not invoiced" state.
Badge count on the home screen: "3 jobs ready to invoice."

Tapping a job opens the completion flow from the invoice step (photos already
attached if taken on site). This is the batch invoicing path for end-of-day paperwork.

## Status chain

```
draft > quoted > accepted > assigned > confirmed > completed > invoiced
```

"Completed" splits visually:
- Completed, not yet invoiced (in the "ready to invoice" pile)
- Completed and invoiced (done, in Xero)

## What the app pushes to Xero

Line items (parts, labour, callout), GST, total, customer details, adjustment note
if applicable. That is all. No photos, no internal notes, no cost prices.

## What the app does NOT handle (Xero does)

- Deposits and partial payments
- Payment reminders and overdue chasing
- Bank reconciliation
- Payment terms and aging
- Credit notes

The app's only payment-related action is the on-the-spot "paid now" fork, which
marks the Xero invoice as paid immediately. Everything else is Xero's job.

## Photos

After photos are proof-of-work stored in Supabase, attached to the job record.
They do not get pushed to Xero. They are for the operator's own records and for
property manager disputes. Before and after photos are paired per job item.

## UX rules

- All on the phone, one-handed, 48px tap targets.
- Confirm modal on the Xero push (financial action).
- +/- steppers for labour hours and quantities.
- Plain language, sentence case, no em-dashes, no exclamation marks.
- Customer never sees cost price or the app's branding.
