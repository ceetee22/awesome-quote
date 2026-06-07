# 11 — Open Quotes Page

The open quotes page is the operator's sales pipeline. It tells him what's
waiting, what's going cold, and what needs action.

## Pipeline total

Dark bar at the top (#1F2D37). Shows:
- Total value of all open quotes (22px/600, white)
- "in open quotes" label (13px, muted)
- Quote count on the right (13px, muted)

This is motivating and actionable. He sees how much revenue is sitting there.

## Filter pills

Horizontal row below the pipeline bar. Pills: All, Awaiting, Drafts, Declined.
Each shows a count. Active pill is green (#22A67A) with white text. Tapping
filters the list below.

## Grouped sections

Quotes are split into two sections with labelled headers:

### "Finish these" (drafts)
Quotes the operator started but hasn't sent. His action needed. These appear
first because they're blocking revenue. Cards have a grey left border (#8CA3A0).

### "Waiting on customer" (awaiting response)
Quotes sent, ball is with the customer. Sorted by age, newest first. Cards have
coloured left borders based on age (see aging rules below).

## Quote card design

Each card shows:

1. **Customer name** (16px/600) top left
2. **Status badge** (11px/600) top right: Draft (grey), Awaiting (amber)
3. **Job description** (14px, muted) below name. This is the diagnosis summary:
   "Sliding door, stiff" or "2 items: roller pair, weatherseal" or
   "Rubber and weatherseal, 6 windows." Never just "1 item."
4. **Time context** (13px) bottom left: "Sent today", "Sent 3 days ago",
   "Started yesterday" (for drafts)
5. **Price** (16px/600) bottom right

## Aging signals

Left border colour and time text colour shift together based on days since sent:

| Age | Left border | Time colour | Signal |
|-----|-------------|-------------|--------|
| 0-3 days | Green #22A67A | Muted #8CA3A0 | Fresh, no action |
| 4-7 days | Amber #E8940D | Amber #E8940D | Getting old |
| 8+ days | Red #D94444 | Red #D94444 | Going cold |

## Follow-up nudge

Quotes over 7 days old get a gold bar (#FEF7E6, #F5E2B0 border) below the card
content with:
- Status text: "Going cold" (7-13 days) or "No response in X weeks" (14+ days)
- Two action buttons on the right:
  - "Call" (green, opens dialler with customer phone)
  - "Resend" (outlined, resends the quote email)

This nudge appears inside the card, not as a separate element. It prompts action
without requiring the operator to open the job detail screen.

## Declined section

"Show declined (X)" toggle at the bottom. Collapsed by default. Tapping shows
declined quotes with a muted treatment.

## Job description logic

The card description is built from the job items:
- Single diagnosed item: "[Joinery type], [fault]" e.g. "Sliding door, stiff"
- Single custom item: the custom description text, truncated
- Single rubber estimate: "Rubber and weatherseal, X windows"
- Multiple items: "X items: [first part name], [second part name]" truncated
- No items yet (draft): "No items added"

## Card tap target

Tapping anywhere on the card (except Call/Resend buttons) opens the job detail
screen where the operator can view the full quote, edit it, or take action.

## UX rules

- 48px minimum tap targets on all buttons
- Sentence case everywhere
- No em-dashes, no exclamation marks
- Cards have 12px border radius, 14px padding
- Left border is 3px solid, coloured by aging state
- Follow-up nudge buttons have the tangible 3px bottom border treatment
