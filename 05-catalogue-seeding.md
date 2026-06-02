# 05 — Catalogue Seeding

The parts catalogue is the backbone of the app. It must be populated before the app is useful. Strategy: **developer seeds it once, client maintains it going forward.**

## Source: supplier portal

`portal.joineryhardware.co.nz/Catalogue` (login: client's account, "Awesome Building Services").

The portal is a structured HTML table with columns:
- **Code** (SKU, e.g. B2525, H160, L3630)
- **Description** (e.g. "Bifold Window Set Type D - BLK", "NL Sliding Window Latch - BLK")
- **Category** (e.g. Window Timber, Window Aluminium, Door Aluminium, Keyless Mechanical, Sliding & Folding Other, Commercial Locks & Accessories, General Miscellaneous)
- **Unit** (EACH, ea, Set, Kit)
- **Your Price** (his cost price, NZD)
- **Available** (stock status)
- **Quantity** (order input)

Individual product pages have product images. The catalogue is paginated / scrolls beyond the visible rows (hundreds of parts).

## One-time extraction (developer task)

The client cannot easily produce a CSV. Scrape **once** to seed; the client adds new items later himself.

1. Log into the portal with client credentials
2. Open browser dev tools → Network tab, reload the catalogue page
3. Look for the XHR/fetch call that returns the table data — it is almost certainly a JSON or HTML endpoint returning every row. Grab that response.
4. Parse into a CSV: `sku, name, category, cost_price, unit, availability`
5. Batch-download product images by hitting each product page (store to Supabase storage, save `photo_url`)
6. This is a one-time job — no ongoing scraper to maintain

> Note: only a one-time extraction is needed. Do not build or schedule a recurring scraper against the supplier portal.

## Import into the app

Build a simple admin import tool that:
1. Takes the CSV
2. Maps columns to the `Part` data model
3. Auto-tags `fits` from the category field (Window Aluminium → window_ali; Door Aluminium → sliding/bifold/hinged as appropriate; Window Timber → window_timber)
4. Auto-suggests `fixes` tags from description keywords (roller/track → stiff; stay → broken_stay; lock/latch → wont_lock; hinge → broken_hardware)
5. Bulk-applies the client's markup % to derive `sell_price`
6. Lets the developer review/correct tags before committing

Target: seed the ~50–80 most-used parts, fully tagged. Tagging accuracy improves diagnosis suggestions.

## Category → fits mapping reference

| Portal category | Likely fits tag(s) |
|-----------------|-------------------|
| Window Aluminium | window_ali |
| Window Timber | window_timber |
| Door Aluminium | sliding_door, bifold_door, hinged_door (refine per part) |
| Sliding & Folding Other | sliding_door, bifold_door |
| Keyless Mechanical | (locks — tag by description) |
| Commercial Locks & Accessories | (tag by description) |
| General Miscellaneous | (tag manually) |

## Ongoing maintenance (client task)

- New parts added on the fly during jobs via the custom item builder
- "Save to catalogue" toggle (on by default) auto-saves for reuse
- Quick-tag pills optional at entry time, editable later
- Parts catalogue management screen for bulk edits
- CSV import remains available as a back door for future bulk additions
