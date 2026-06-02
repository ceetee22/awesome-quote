# 02 — UX Specification

Mobile-first. Every screen designed for one-handed use on Android by a 60-year-old. All 14 screens below were workshopped and validated.

## Architecture overview

Three job entry shapes (quick fix, quote first, multi-item) feed one shared core engine (diagnose → select parts → price → document → generate quote). On customer acceptance, three confirm-gated actions branch out: push to Xero, order parts (via approval gate), schedule return.

---

## 4.1 Home screen

- Business name and greeting
- Four primary action buttons (large tap targets): **New job**, **Open quotes**, **Jobs today**, **Parts catalogue**
- Recent jobs list with status badges (Awaiting, Accepted, Invoiced)
- Each recent job row: address, summary, status

## 4.2 New job — customer details

- Customer name, address, phone
- Job source selector: Direct / Property manager / Builder
- Address feeds callout zone calculation and Google Maps navigation
- "Start adding items" proceeds to item entry

## 4.3 Add item screen

- Joinery type buttons: Sliding door, Bifold door, Hinged door, Window (aluminium), Window (timber)
- Below a divider: **Custom item** (bespoke work that bypasses diagnosis)
- Joinery type → fault selection (diagnosis step 2)
- Custom item → freeform builder (4.5)

## 4.4 Diagnosis flow (3 taps)

**Step 1 — What is it?** (joinery type, selected on add item screen)

**Step 2 — What's wrong?** Fault options contextual to type:

| Joinery type | Fault options |
|--------------|---------------|
| Sliding door | Stiff/hard to slide, Won't lock/latch, Off track/jumping, Broken handle, Drafty/leaking, Other |
| Bifold door | Stiff/dragging, Misaligned panels, Broken hinge, Won't fold/unfold, Lock fault, Other |
| Hinged door | Stiff/sagging, Won't close properly, Broken hinge, Lock/latch fault, Drafty/leaking, Other |
| Window (ali) | Won't open/close, Broken stay, Broken handle, Lock fault, Drafty/leaking, Other |
| Window (timber) | Won't open/close, Broken stay, Broken handle, Lock fault, Swollen/stuck, Other |

**Step 3 — Suggested parts.** App filters the catalogue by `fits` and `fixes` tags. Each suggestion shows photo, name, SKU, supplier, default quantity, sell price. Tap "Add". "Browse full catalogue" for manual search.

## 4.5 Custom item builder

- Freeform description field
- Internal notes field (NOT shown on customer quote)
- Optional parts: search catalogue OR add manual part (name + price)
- Labour hours via +/- stepper
- Photo capture: Before, After, Other
- "Save to catalogue" toggle (on by default) with quick-tag pills for fits/fixes
- "Add to job" button

## 4.6 Job items screen (the hub)

- Lists all items in the job with summary, price, edit/delete controls
- Custom items show a "Custom" badge
- Running total: parts + labour + callout
- "Add another item" returns to add item screen
- "Build quote" proceeds to quote builder

## 4.7 Quote builder

- Customer summary at top
- All parts with quantities and prices, removable via X
- "Add more parts" button
- Labour section: +/- stepper for hours, rate from settings
- Callout fee auto-calculated from zone settings (4.12)
- Subtotal, GST (15%), total (incl. GST)
- Actions: **Save draft** / **Send quote**
- Photo attachment option

## 4.8 Post-acceptance screen

When a customer accepts, three buttons appear. Each fires a lightweight confirm modal (big buttons, plain language):

- **Send to Xero** — modal: "Send invoice to Xero? This creates a draft invoice for $X." → "Not yet" / "Yes, send"
- **Order parts** — opens order review (4.9)
- **Schedule return visit** — date/time picker
- Status tracker at bottom: Quoted → Accepted → Ordered → Done

## 4.9 Order review screen (APPROVAL GATE — critical)

No parts are ordered without explicit confirmation. This prevents accidental orders when stock is already on hand.

- Full parts list from the quote, each with a toggle switch
- Operator switches OFF items already in the van
- Quantity adjustable per item
- Shows **cost price** (his cost, not sell price) and supplier SKU
- Total order cost displayed
- Auto-grouped by supplier if multiple
- "Confirm and send order" — the ONLY action that fires the PO (branded PDF emailed to supplier)
- "Cancel" returns without ordering

## 4.10 Jobs calendar

- Day view / week view toggle
- Time-block layout, colour-coded by status
- Each block: address, item summary, estimated duration, quote value
- Tap a block → job detail
- Route optimiser panel (day view): suggested order, total drive time, "Start route in Google Maps"
- Works on mobile and desktop

## 4.11 Job detail screen

- Customer name; tappable address (opens Google Maps); tappable phone (opens dialler)
- "Navigate" button
- Schedule: date picker, time picker, duration presets (30m, 1hr, 1.5hr, 2hr+)
- Duration feeds back into labour calculation
- Job items summary with total value

## 4.12 Callout zone settings

Configured in settings, applied automatically on quote build.

- Home base address (default distance origin)
- Configurable zones with distance thresholds and prices (default: Local 0–15km $50, Mid 15–30km $75, Far 30+km $100)
- Add/edit/delete zones
- On quote build: calculate distance from base to job address, match zone, auto-fill fee
- "Calculate from" options: Home base (default) / Previous job address / Current GPS location
- Result shown clearly ("Local zone — $50.00")
- Manual override field always available

## 4.13 Settings screen

- Home base address
- Callout zones (4.12)
- Hourly labour rate
- Default parts markup %
- GST rate (default 15%)
- Business name, logo, contact details (for branded quotes/POs)
- Xero connection (OAuth)
- Supplier details (name, email for PO delivery)

## 4.14 Parts catalogue management

- Browse all parts with search and category filter
- Each part: photo, name, SKU, supplier, cost price, sell price, category, fits tags, fixes tags
- Edit any part inline
- Add new part manually (name, price, phone photo, tags)
- CSV import (admin/onboarding)
- Parts auto-saved from jobs when "Save to catalogue" is on
