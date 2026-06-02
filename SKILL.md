---
name: joinery-app
description: Use when building or modifying the Joinery Repair Quoting App — a mobile-first PWA for a NZ joinery repair sole operator to diagnose faults, quote jobs, push invoices to Xero, and order parts. Trigger for any work on diagnosis flows, the parts catalogue, quote building, Xero integration, purchase orders, callout pricing, or the job calendar. Covers domain rules, data model, pricing logic, and UX conventions specific to this app.
---

# Joinery Repair Quoting App

## Domain in one paragraph

The user is a NZ joinery REPAIR specialist, not a fabricator. He fixes hardware on existing doors and windows: rollers, window stays, friction stays, hinges, locks, latches, handles, weatherseals, and alignment. He never makes or installs new frames. Jobs cover sliding doors, bifold doors, hinged doors, aluminium windows, and timber windows. He is 60, on Android, already on Xero, and orders from one main supplier (Joinery Hardware NZ).

## The five things that define this app

1. **Diagnosis engine** — 3 taps (joinery type → fault → suggested parts). Suggestions are driven by `fits` and `fixes` tags on catalogue parts. This is the smart layer and the competitive moat.
2. **Job as container** — one job holds many items; each item is diagnosed or custom. Property-manager jobs are just many items in one job.
3. **Quote → accept → branch** — on acceptance, three confirm-gated actions: push to Xero, order parts (approval gate), schedule return.
4. **Order approval gate** — parts are NEVER ordered automatically. The operator reviews, toggles off stock-on-hand, then explicitly confirms.
5. **Cost vs sell** — quotes/invoices use sell price; POs use cost price + supplier codes. Never leak cost price to the customer.

## Data model essentials

`Part` is the central entity. Key fields: `sku`, `name`, `supplier`, `supplier_code`, `cost_price`, `sell_price`, `category`, `fits[]`, `fixes[]`, `default_qty`, `photo_url`, `unit`.

`fits` values: `sliding_door`, `bifold_door`, `hinged_door`, `window_ali`, `window_timber`
`fixes` values: `stiff`, `wont_lock`, `broken_hardware`, `misaligned`, `drafty`
`category` values: `rollers`, `stays`, `hinges`, `locks`, `handles`, `seals`, `other`

Full model in `docs/03-data-model.md`.

## Pricing logic (canonical)

```
sell_price   = cost_price * (1 + markup_pct / 100)
item_total   = sum(part.sell_price * qty) + (labour_hours * hourly_rate)
job_subtotal = sum(item_total) + callout_fee
gst          = job_subtotal * 0.15        // NZ GST, configurable
job_total    = job_subtotal + gst         // shown to customer, GST-inclusive
```

Always round currency for display with `toFixed(2)`. NZD throughout.

## Diagnosis suggestion query

When the operator picks a joinery type and fault, suggest parts where:
```
part.active === true
  && part.fits.includes(selectedJoineryType)
  && part.fixes.includes(selectedFault)
```
Order by most-used / category relevance. Always offer "Browse full catalogue" as an escape hatch. Always allow manual/custom parts for anything not in the catalogue.

## Callout fee

Tiered zones by distance from a base point (home base default; can switch to previous job or current GPS). Match distance to a `CalloutZone`, auto-fill the fee, always allow manual override. Default zones: Local 0–15km $50, Mid 15–30km $75, Far 30+km $100.

## UX rules (hard requirements)

- Minimum 48px tap targets
- 16px base font, high contrast
- No swipe gestures — explicit buttons only
- Lightweight confirm modal on every financial/irreversible action
- Big +/- steppers for quantities and labour hours (no raw number inputs)
- Duration presets (30m, 1hr, 1.5hr, 2hr+) not time pickers
- Tappable address → Google Maps; tappable phone → dialler
- Camera via `<input type="file" accept="image/*" capture="environment">`

## Copy rules

- No em-dashes in user-facing copy
- No exclamation marks in UI
- Sentence case everywhere
- Plain language, no jargon

## Xero

- OAuth 2.0, standard dev account, tokens stored server-side only
- Push DRAFT invoice on quote acceptance; APPROVED invoice on job completion
- Free Starter tier covers launch (write-heavy, low egress)
- Never use Xero API data for AI/ML training (terms prohibit)

## Purchase orders

- Generated from accepted quote's parts, grouped by supplier
- Use `cost_price` and `supplier_code`, branded with the client's business
- Only sent after the operator confirms on the approval-gate review screen
- Emailed as a branded PDF to the supplier

## What NOT to do

- Do not assume one job = one item
- Do not auto-order parts without the approval gate
- Do not show cost price to customers
- Do not build a recurring scraper for the supplier portal (one-time seed only)
- Do not build v2 features (routing, reporting, week view) before v1 ships
- Do not use swipe gestures or tiny touch targets
- Do not add em-dashes or exclamation marks to UI copy
