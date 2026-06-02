# 03 — Data Model

## Core entities

`Business` (1) → `Job` (many) → `JobItem` (many) → `Part` (many, via catalogue reference or custom)

## Part (catalogue record)

The central entity. One part record feeds four outputs: diagnosis suggestions, quote line items, purchase order line items, Xero invoice line items.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `sku` | String | Supplier part code (e.g. DR-220) |
| `name` | String | Display name (e.g. Roller pair) |
| `supplier` | String | Supplier name (e.g. Joinery Hardware NZ) |
| `supplier_code` | String | Supplier's internal reference |
| `cost_price` | Decimal | What he pays (ex GST) — used on PO |
| `sell_price` | Decimal | What customer pays (cost + markup) — used on quote/invoice |
| `category` | String | rollers, stays, hinges, locks, handles, seals, other |
| `fits` | Array | sliding_door, bifold_door, hinged_door, window_ali, window_timber |
| `fixes` | Array | stiff, wont_lock, broken_hardware, misaligned, drafty |
| `default_qty` | Integer | Default quantity per job (e.g. rollers always 2) |
| `photo_url` | String | Product image |
| `unit` | String | each, pair, set, metre |
| `active` | Boolean | Soft delete / hide discontinued parts |

## Job

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `customer_name` | String | |
| `customer_address` | String | Geocoded for distance + maps |
| `customer_phone` | String | Tappable to dial |
| `source` | Enum | direct, property_manager, builder |
| `status` | Enum | draft, quoted, accepted, ordered, scheduled, completed, invoiced |
| `scheduled_date` | Date | |
| `scheduled_time` | Time | |
| `estimated_duration` | Decimal | Hours (0.5, 1, 1.5, 2+) |
| `callout_zone` | String | Resolved zone name |
| `callout_fee` | Decimal | Resolved or overridden |
| `created_at` | Timestamp | |

## JobItem

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `job_id` | UUID | FK → Job |
| `type` | Enum | diagnosed, custom |
| `joinery_type` | String | For diagnosed items |
| `fault` | String | For diagnosed items |
| `description` | String | For custom items (shown on quote) |
| `internal_notes` | String | NOT shown on quote |
| `labour_hours` | Decimal | |
| `parts` | Array | List of {part_id or manual, qty, sell_price} |
| `photos` | Array | {type: before/after/other, url} |

## CalloutZone

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `name` | String | e.g. Local, Mid-range, Far |
| `min_km` | Decimal | Lower distance bound |
| `max_km` | Decimal | Upper bound (null = no cap) |
| `fee` | Decimal | Flat fee for the zone |

## Settings (per business)

- `home_base_address`
- `hourly_labour_rate`
- `default_markup_pct`
- `gst_rate` (default 15)
- `business_name`, `logo_url`, `contact_details`
- `xero_tenant_id`, `xero_tokens`
- `supplier_email` (for PO delivery)

## Pricing logic

```
sell_price = cost_price * (1 + markup_pct / 100)
item_total = sum(part.sell_price * qty) + (labour_hours * hourly_rate)
job_subtotal = sum(item_total) + callout_fee
gst = job_subtotal * (gst_rate / 100)
job_total = job_subtotal + gst
```

## Quote vs PO field usage

| Output | Price used | Codes shown | Branding |
|--------|-----------|-------------|----------|
| Customer quote | sell_price | — | Client business |
| Customer invoice (Xero) | sell_price | — | Client business |
| Purchase order | cost_price | supplier_code | Client business → supplier |
