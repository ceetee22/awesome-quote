# 04 — Technical Architecture

## Platform decision: PWA first

Build as a **progressive web app**, mobile-first, responsive for desktop calendar view.

Rationale:
- Ship and iterate fast — the client is the test user, feedback loop must be tight
- Camera, offline (service workers), push notifications, and home-screen install all work on Android Chrome in 2026
- New users can open a link and start — no Play Store download friction
- Can wrap in a Trusted Web Activity (TWA) or Capacitor shell later for Play Store presence with minimal changes

Camera capture uses native Android camera via:
```html
<input type="file" accept="image/*" capture="environment">
```

## Suggested stack

This mirrors a proven, fast-to-ship stack. Adjust to team preference.

- **Frontend**: Next.js (App Router) or Vite + React, JavaScript (not TypeScript unless team prefers)
- **Styling**: Tailwind CSS v3
- **Backend / DB**: Supabase (Postgres + auth + storage for part photos)
- **Hosting**: Vercel (CLI deploy: `npx vercel --prod`)
- **PWA**: service worker for offline catalogue caching + installability

## External APIs and costs

| API | Purpose | Cost |
|-----|---------|------|
| Xero API | Push quotes and invoices | Free (Starter, ≤5 connections) → $35 AUD/mo (Core, ≤50) |
| Google Maps (geo: link) | Tap address → open navigation | Free |
| Google Distance Matrix | Callout zone calc from base | ~$5 USD / 1,000 requests |
| Google Routes API | Multi-stop route optimisation | ~$10 USD / 1,000 requests |

Realistic monthly running cost at sole-operator scale: effectively the Xero free tier plus a few dollars of Maps usage.

## Xero integration

- OAuth 2.0 flow, standard developer account (no Developer Partner agreement needed to build/ship)
- **Write-heavy** use case — pushing invoices/quotes, not pulling bulk data. Minimal egress, stays well within free Starter tier.
- App Certification only required to list on the Xero App Store (growth-stage, not build-stage)
- Xero Developer Terms (effective Mar 2026) prohibit using API data to train AI/ML models — not relevant here, but noted

### Tiers

| Tier | Connections | Monthly fee | Egress |
|------|-------------|-------------|--------|
| Starter (launch) | ≤5 | Free | n/a |
| Core (growth) | ≤50 | $35 AUD | 10 GB |
| Plus (scale) | ≤1,000 | $245 AUD | 50 GB |

### Sync points

- Quote accepted → push as **draft** invoice to Xero (with confirm)
- Job completed → push as **approved** invoice to Xero (with confirm)
- Optional: pull existing Xero contacts to avoid duplicate customer entry

## Offline considerations

- Cache the parts catalogue locally (service worker / IndexedDB) so diagnosis and quoting work in basements and dead zones
- Queue Xero pushes and PO sends; sync when back online

## Security

- SSL on all pages (Xero requirement)
- Do not use shared hosting for Xero API credentials
- Store Xero tokens server-side, never in the client
- Privacy policy required for Xero add-on partners
