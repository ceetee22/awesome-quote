# 06 — MVP Scope

Build priorities. Ship v1, get the client using it on real jobs, then layer in v1.1 and v2.

## v1 — Must have

The smallest thing that lets him quote a real job faster than pen and paper and get paid through Xero.

- [ ] New job with customer details (name, address, phone, source)
- [ ] Add item screen (joinery type selector + custom item entry)
- [ ] Diagnosis flow — 3 taps to suggested parts
- [ ] Custom item builder for bespoke jobs
- [ ] Multi-item jobs (job as container)
- [ ] Quote builder (parts, labour, callout fee, GST, total)
- [ ] Send quote to customer (email PDF)
- [ ] Customer acceptance (email link)
- [ ] Push invoice to Xero (with lightweight confirm)
- [ ] Parts catalogue with search, photos, add/edit
- [ ] One-time catalogue seed from supplier portal
- [ ] Tappable address opens Google Maps
- [ ] Settings: labour rate, markup, callout zones, business details, Xero connection

## v1.1 — Should have

The differentiators that make it more than a quoting tool.

- [ ] Purchase order generation with approval gate
- [ ] Branded PO PDF emailed to supplier
- [ ] Job scheduling (date, time, duration presets)
- [ ] Jobs calendar (day view)
- [ ] Photo documentation (before/after/other)
- [ ] Customer signature on screen
- [ ] Callout zone auto-calculation via Distance Matrix API

## v2 — Nice to have

Scale and polish.

- [ ] Route optimisation for multi-job days (Routes API)
- [ ] Week view calendar
- [ ] Desktop companion view
- [ ] Xero contact sync (avoid duplicate customer entry)
- [ ] Repeat job templates
- [ ] Job history per customer
- [ ] Revenue reporting dashboard
- [ ] Offline mode (service worker catalogue cache + queued sync)
- [ ] Multi-operator support (for when he scales / hires)

## Definition of done for v1

The client can, in under 10 minutes on site: create a job, diagnose a fault, build an accurate priced quote, send it to the customer, and on acceptance push a clean invoice to his Xero — all from his Android phone, without calling the office or scribbling anything on paper.
