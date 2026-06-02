# Joinery Repair Quoting App

A mobile-first progressive web app (PWA) for a New Zealand joinery repair business. Lets a sole operator diagnose faults, build accurate quotes from a parts catalogue, present quotes to customers, push invoices to Xero, and send branded purchase orders to suppliers — all from an Android phone on site.

## The one-line pitch

The first quoting tool built specifically for NZ joinery repair (not fabrication, not new installs) that combines a smart parts catalogue, fault-based diagnosis, native Xero integration, and one-tap supplier ordering.

## Who it's for

A 60-year-old sole operator on Android who fixes hinges, window stays, rollers, locks, handles, weatherseals, and misalignments across sliding doors, bifold doors, hinged doors, and aluminium/timber windows. He is already on Xero and orders parts from one main supplier (Joinery Hardware NZ).

## Why it exists

No app serves this niche. Enterprise fenestration ERP (Soft Tech V6, FeneVision) targets factories. Generic trade apps (Tradify, Fergus, ServiceM8) have Xero but no joinery intelligence. Niche window quoting tools (Tommy Trinder, WindowQuoteHub) target new installs in the UK/US. The NZ joinery repair market — the Exceed franchise network, ADWS, GC Trades, Pinnacle, and dozens of independents — has nothing purpose-built.

## Document map

| File | What's in it |
|------|--------------|
| `README.md` | This file — project overview |
| `docs/01-product-brief.md` | Full product brief, target user, market gap, competitive advantage |
| `docs/02-ux-spec.md` | Screen-by-screen UX specification (all 14 screens) |
| `docs/03-data-model.md` | Parts catalogue data model and entities |
| `docs/04-technical-architecture.md` | Stack, APIs, Xero integration, costs |
| `docs/05-catalogue-seeding.md` | How to seed the parts catalogue from the supplier portal |
| `docs/06-mvp-scope.md` | Build priorities: v1, v1.1, v2 |
| `.claude/CLAUDE.md` | Project instructions and conventions for Claude Code |
| `.claude/skills/joinery-app/SKILL.md` | Skill file with build conventions and patterns |

## Quick status

This is a greenfield project at the end of the UX workshop phase. The full UX has been mapped and validated with the client. Next step is to scaffold the app and begin building the v1 must-have features.
