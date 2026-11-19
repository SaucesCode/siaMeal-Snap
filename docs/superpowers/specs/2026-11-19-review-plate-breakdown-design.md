# Review: what's on your plate + Sia's take — design

Status: approved by the user 2026-11-19 ("let's do that") for option A + C's one-line Sia take
(`.superpowers/brainstorm/1726-1795051038/content/review-ideas.html`). Replaces the review card from
`2026-11-19-snap-flow-design.md`; the camera is unchanged.

## Why
The ring-card review still "feels lacking". Showing exactly what Sia found on *this* plate, item by item,
is both the most delightful and the most useful (the common fix is "I only had half the rice").

## Decided
- **AI:** `analyze-meal` also returns `items`: up to 8 `{ name, amount, calories, protein_g, carbs_g, fat_g,
  x?, y? }` whose calories add up to the total; `x`/`y` (0–1) are the item's centre in the photo (photos only).
  Sanitised server-side; old clients ignore it.
- **Review (when items exist):** photo at the top with a small label on each item ("Chicken · 320");
  the name; **Sia's one-line take** ("Great protein pick! 760 left after this."); a card listing each item
  (colour dot, name, amount, kcal) with a dark total row ("680 kcal · P 42 · C 72 · F 22" | "760 left");
  Sia peeks over the card. Tapping an item opens ½ · 1× · 1½ · 2× and Remove for that item; totals follow.
  The AI's totals stay authoritative: items only set the proportion (meal = AI totals × Σ item kcal ×
  multiplier / Σ item kcal). Fiber/sugar/sodium chips, "Edit details", one Save stay.
- **Fallback (no items: barcode, older server, typed meals without items):** the current ring card.
- **Sia's take** (≤ 60 chars, local): over → gentle; reaches protein goal → celebrate; protein ≥ 30 % of
  the meal's kcal → "Great protein pick!"; else "N left after this.".
- Saved meal: food_items = item names with amounts.

## Left to the builder
Label collision handling, item colours (from the palette), exact copy within the rules above.
