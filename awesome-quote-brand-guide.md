# Awesome Quote -- Brand Style Guide

Version 1.1 -- June 2026

---

## 1. Brand overview

**Name:** Awesome Quote
**Mark:** AQ lettermark monogram
**Personality:** Hopeful, confident, ready to win work
**Feel:** Trade-tough and practical, but optimistic -- not dark or industrial

The brand should make the operator feel like every quote is a job about to be secured. Green means go. Gold means getting paid.

---

## 2. Logo and monogram

The primary mark is a two-letter **AQ monogram** set in the brand sans-serif (Inter or system-ui) at weight 500 (medium). The letters are tracked tight (letter-spacing: -2px at display size).

### Usage

| Context | Size | Format |
|---------|------|--------|
| App icon (Android home screen) | 80x80px container, 48px type | White AQ on go green (#22A67A), 18px corner radius |
| Navigation bar | 48x48px container, 30px type | White AQ on go green, 10px radius |
| Favicon | 32x32px container, 20px type | White AQ on go green, 6px radius |
| Full lockup | Monogram + "Awesome Quote" wordmark | 36px monogram container + 20px/500 wordmark |
| On dark surfaces | Same monogram, paired with white wordmark | Green container, white type |

### Rules

- The monogram container is always go green (#22A67A) with white type
- Never place the monogram on a busy or photographic background without the container
- Never stretch, rotate, or alter the letterforms
- Minimum clear space around the monogram: half the container width on all sides
- The wordmark "Awesome Quote" is always sentence case (capital A, capital Q)

---

## 3. Colour system

### 3.1 Primary brand

| Name | Hex | Usage |
|------|-----|-------|
| Go green | #22A67A | Primary buttons, monogram, positive states, CTAs |
| Green hover | #1B8F6A | Button hover state |
| Green pressed | #147A5A | Button active/pressed state |
| Green tint | #E6F7F0 | Light green surfaces when needed |
| Green tint border | #C5E8D5 | Border on green tint surfaces |

### 3.2 Accent (celebrations and money moments)

| Name | Hex | Usage |
|------|-----|-------|
| Gold | #F0B542 | Quote accepted celebrations, totals, premium moments |
| Gold hover | #D9A03A | Gold button hover |
| Gold tint | #FEF7E6 | Light gold surfaces when needed |
| Gold tint border | #F5E2B0 | Border on gold tint surfaces |

### 3.3 Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Ink | #1F2D37 | Primary text, headings, high-contrast elements |
| Muted | #4A5B68 | Secondary text, descriptions, addresses |
| Subtle | #8CA3A0 | Tertiary text, placeholders, disabled states |
| Border | #E4EAE8 | Dividers, card borders, input borders |
| Surface | #F6F8F7 | Page background |
| White | #FFFFFF | Card surfaces, input backgrounds |

### 3.4 Status colours (job states) -- solid, bold, instant read

Every status badge uses a solid coloured background with white text (except Draft and Custom which use grey). Each colour is distinct enough to identify at a glance without reading the label.

| Status | Background | Text | Reasoning |
|--------|-----------|------|-----------|
| Draft | #E4EAE8 | #4A5B68 | Grey. Not started, no urgency |
| Awaiting | #E8940D | #FFFFFF | Amber. Ball is with the customer |
| Accepted | #22A67A | #FFFFFF | Green. Job secured, time to act |
| Scheduled | #3B82D6 | #FFFFFF | Blue. Calendar, date locked in |
| Ordered | #7B5CC3 | #FFFFFF | Purple. Distinct from accepted/scheduled |
| Completed | #22A67A | #FFFFFF | Green + tick icon. Same as accepted but with checkmark |
| Invoiced | #1F2D37 | #FFFFFF | Ink/dark. Done, closed out, final |
| Custom | #E4EAE8 | #1F2D37 | Grey with dark text. Item type indicator |

Badge sizing: 14px font, 500 weight, 6px 14px padding, 8px border radius.

### 3.5 Semantic

| Name | Hex | Usage |
|------|-----|-------|
| Info blue | #3B82D6 | Scheduled states, informational callouts |
| Error red | #D94444 | Delete confirms, validation errors only |
| Error tint | #FEF0F0 | Error message backgrounds |
| Error tint border | #F5C5C5 | Border on error surfaces |

### 3.6 Colour usage rules

- Go green is the dominant action colour. Every primary CTA is green.
- Gold is reserved for celebration and money moments: quote accepted, invoice paid, totals. Do not use gold for generic actions.
- Error red appears only on destructive actions and validation. It is never used for status badges.
- Never use colour alone to convey meaning. Always pair with text or icons.
- Status badges must be solid fills with high contrast. No pastel/tinted badge backgrounds -- tradies need to tell status at a glance.
- Customer-facing documents (quotes, invoices) use ink for text, go green for headers and the monogram, and border colour for table lines.

---

## 4. Typography

### Font stack

```
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

Inter is the primary typeface. If unavailable, system-ui provides a clean fallback on Android (Roboto) and iOS (SF Pro).

### Weights

Only two weights are used across the entire product:

- **400 (regular):** Body text, labels, descriptions
- **500 (medium):** Headings, buttons, monogram, emphasis

Never use 600, 700, or bold. The medium weight provides enough contrast without heaviness.

### Type scale (sized for tradies 40+)

The minimum text size anywhere in the app is 14px. Body text is 18px. Everything is readable at arm's length on a phone in full sun.

| Role | Size | Weight | Colour | Line height |
|------|------|--------|--------|-------------|
| Display total | 34px | 500 | Ink | 1.1 |
| Page title | 28px | 500 | Ink | 1.2 |
| Section heading | 22px | 500 | Ink | 1.3 |
| Body text and labels | 18px | 400 | Ink | 1.5 |
| Button label | 17px | 500 | Varies | 1.0 |
| Secondary text / descriptions | 16px | 400 | Muted | 1.5 |
| Caption / badge / smallest | 14px | 500 | Varies | 1.0 |

### Type rules

- Minimum text anywhere: 14px (hard floor)
- Body text: 18px (the workhorse size)
- Sentence case everywhere. Never Title Case. Never ALL CAPS.
- No em-dashes in any user-facing copy (use "to" or commas)
- No exclamation marks in UI copy
- Plain, direct language throughout

---

## 5. Buttons

All buttons have a minimum height of 48px and 10px border radius.

### Primary (go green)

- Background: #22A67A
- Text: #FFFFFF, 17px/500
- Hover: #1B8F6A
- Pressed: #147A5A
- Use for: Send quote, Add to job, Start adding items, Confirm and send order

### Secondary (outlined)

- Background: #FFFFFF
- Text: Ink #1F2D37, 17px/500
- Border: 1px solid #E4EAE8
- Hover: background #F6F8F7
- Use for: Save draft, Cancel, Browse catalogue

### Destructive (red outlined)

- Background: #FFFFFF
- Text: #D94444, 17px/500
- Border: 1px solid #F5C5C5
- Hover: background #FEF0F0
- Use for: Delete job, Remove item

### Celebration (gold)

- Background: #F0B542
- Text: Ink #1F2D37, 17px/500
- Hover: #D9A03A
- Use for: Quote accepted confirmation, payment received

### Button rules

- Minimum 48px tap target on all interactive elements
- Horizontal padding: 24px minimum
- Always use explicit buttons, never swipe gestures
- Confirm modals on all financial or irreversible actions use big buttons with plain language
- Modal confirm buttons: "Not yet" (secondary) / "Yes, send" (primary)

---

## 6. Job card layout

Job cards on the home screen and job lists follow this hierarchy:

1. **Client name** (18px, medium, primary colour) -- top left, the primary identifier
2. **Status badge** (14px, medium, solid colour) -- top right
3. **Address** (16px, regular, muted colour) -- below client name
4. **Job summary** (16px, regular, muted colour) -- below address
5. **Total value** (18px, medium, primary colour) -- bottom

This reflects how tradies think about jobs: by who the customer is and where the job is. The status badge at a glance tells them what needs action.

---

## 7. Spacing and layout

### Spacing scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps (badge padding, icon margins) |
| sm | 8px | Compact spacing (between related elements) |
| md | 12px | Default gap in grids and flex layouts |
| lg | 16px | Section padding, card internal padding |
| xl | 24px | Between sections, card external margins |
| 2xl | 32px | Page-level spacing |

### Layout rules

- Mobile-first. Max content width: 480px on mobile.
- Card padding: 16px
- Card border-radius: 12px
- Card border: 0.5px solid #E4EAE8
- Page background: #F6F8F7
- Card background: #FFFFFF
- Card gap: 10px
- No horizontal scrolling on any screen
- All content reachable with one-handed use

---

## 8. Confirm modals

Every financial or irreversible action gets a lightweight confirm modal.

- Centred overlay with white card
- Clear, plain-language question (e.g. "Send invoice to Xero? This creates a draft invoice for $X.")
- Two buttons: secondary ("Not yet") and primary ("Yes, send")
- Both buttons full-width, stacked vertically on mobile, 48px height
- No close X button (force a deliberate choice)
- Background overlay: rgba(31, 45, 55, 0.5) -- ink at 50% opacity

---

## 9. Copy and tone

### Voice

Awesome Quote speaks like a reliable mate who knows the trade. Direct, practical, no fluff. The app should feel like it was built by someone who understands the work.

### Rules

- Sentence case on all labels and buttons
- No em-dashes (use "to" for ranges, commas for asides)
- No exclamation marks
- No jargon or abbreviations (write "aluminium" not "ali" in UI)
- Plain language throughout ("Send quote" not "Dispatch quotation")
- Error messages are helpful, not blaming ("Could not connect to Xero. Check your internet and try again." not "Connection failed.")

### Examples

| Instead of | Use |
|-----------|-----|
| Dispatch quotation to client | Send quote |
| Quotation accepted! | Quote accepted |
| Error: API failure | Could not connect. Try again. |
| Est. duration (hrs) | Estimated time |
| Are you sure you want to delete? | Delete this job? This cannot be undone. |

---

## 10. Customer-facing documents

Quotes and invoices sent to customers carry the Awesome Quote brand.

- Monogram (AQ in green container) top-left
- Business name and contact details in ink below
- Go green (#22A67A) for the header bar and total highlight
- Body text in ink (#1F2D37)
- Table borders in border colour (#E4EAE8)
- Total row highlighted with green tint background (#E6F7F0) and ink text
- GST line and total (incl. GST) in 22px/500
- Footer: "Powered by Awesome Quote" in subtle (#8CA3A0), 14px -- optional, for when selling to other operators

---

## 11. App icon specification

- Shape: Rounded square (Android adaptive icon safe zone)
- Background: Go green (#22A67A)
- Foreground: White AQ monogram, centred
- Corner radius: 18px at 80px (22.5%)
- The icon should read clearly at 48x48px (notification tray) and 192x192px (launcher)
