# 01 — Product Brief

## Target user

- Sole operator, 60 years old, Android user
- Joinery repair specialist — not fabrication, not new installs
- Fixes hinges, window stays, misalignments, rollers, locks, handles, weatherseals
- Works across sliding doors, bifold doors, hinged doors, aluminium windows, timber windows
- Some jobs are bespoke and do not fit standard categories
- Jobs range from quick 30-minute fixes to multi-item property management lists
- Currently quoting via pen and paper, texts, and mental arithmetic
- Already on Xero for accounting
- One main supplier: Joinery Hardware NZ (`portal.joineryhardware.co.nz`)
- Wants to scale (sole operator today, but building for growth)

## Pain points (ranked by the client)

1. Takes too long to price up a job
2. Looks unprofessional (texts and scribbled notes)
3. Chasing payment after the fact
4. Forgetting to include items

## Market gap

No app exists for joinery repair quoting in NZ. The market splits into tiers that all miss this use case:

- **Enterprise fenestration ERP** (Soft Tech V6, FeneVision, WindowMaker): factory-scale manufacturing, desktop-first, expensive, weeks of setup.
- **Generic trade apps** (Tradify, Fergus, ServiceM8, Jobber): mobile and Xero-connected, but zero joinery-specific intelligence — just generic line-item quoters.
- **Niche window/door quoting** (Tommy Trinder, WindowQuoteHub, WinDoor Quote): product-aware but built for new installations and focused on UK/US markets, no Xero.

The NZ joinery repair market is real and fragmented: the Exceed franchise network (63 operators nationwide), ADWS (Auckland), GC Trades, Pinnacle, Waimak, and dozens of independents — all quoting manually.

## Competitive advantage (the moat)

- Parts catalogue with NZ supplier data, photos, and auto-pricing with markup
- Diagnosis engine that suggests parts based on joinery type and fault (the smart layer)
- One-tap purchase order generation grouped by supplier
- Native Xero integration for quotes and invoices
- Distance-based callout zone pricing
- Built for a 60-year-old on Android — big tap targets, simple flows, no swipe gestures

The defensible part is the parts database plus diagnosis logic. A generic quoting app is trivially copyable; an app that knows every NZ joinery part, which parts fit which door/window types, and can guide a fault diagnosis to the right parts list is not.

## The three job shapes

The app handles three workflows through one flexible architecture. A **job is a container** that holds multiple line items.

### 1. Quick fix
Arrives, diagnoses, has the part in the van, fixes on the spot, invoices immediately. Single visit, paid same day.

### 2. Quote first, return to fit
Visits to assess, builds quote, sends to customer, waits for acceptance, orders parts, schedules return.

### 3. Property manager multi-item list
A property manager sends a list of issues across multiple units. One job, multiple items (mix of diagnosed and custom), one combined quote, parts grouped by supplier on order.

## UX principles for the user

- Minimum 48px tap targets on all interactive elements
- 16px base font, high contrast
- No swipe gestures — explicit buttons for every action
- Lightweight confirmation modals on all financial or destructive actions
- Big +/- stepper buttons instead of number inputs
- Duration presets (30m, 1hr, 1.5hr, 2hr+) instead of fiddly time pickers
- Status badges and colour coding for job states
- Tappable address opens Google Maps; tappable phone opens dialler
- Plain language everywhere — no jargon, no abbreviations
