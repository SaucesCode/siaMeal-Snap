# Sia on the tab bar, a pose per tab — design

Supersedes the placement in `2026-11-19-sia-per-tab-design.md`, where she sat inside each screen. The
mood rules from that design (`src/features/sia/tabMoods.ts`) carry over unchanged.

## Why
The user wants Sia back on the tab bar, but doing something different on each tab, the way she
peeks and pops up on Today. She should not be "just a head": she gets a body. Once it's in the app,
the body has to look like the same drawing as her head.

## Locked decisions (from the user)
- **Body:** the Round sitting Siamese. The reference art is
  `docs/superpowers/specs/assets/sia-body-round.html`; open it in a browser. Her head is unchanged.
- **Walking or side-on poses: none.** Her head only exists front-facing, and a side body under a
  front head never matched. Every pose is front-facing, built from the sitting body.
- **Today:** no change. She keeps the head-and-paws peek over the calories card. Camera: no Sia.

## Art rules (so the body always matches the head)
- **Flat colours only, no gradients:**
  - Fur is cream `#F5E8D0`, with flat shade `#E6D2B5` under the chin and on the outer haunches.
  - Points (socks, paws, tail) are `#4B3329`, with hard, clean edges like the face mask.
  - The outline is `#2A1810`.
- **Line weights:**
  - The head keeps its own: 6 for outer edges, about 5.5 for inner lines.
  - The body uses 7.5 for outer edges and 6.5 for inner lines. At the same weight as the head, the
    large light body read thinner, and the user confirmed the heavier body lines look equal.
- **Anatomy:**
  - The front legs come straight down from the chest, and the back legs fold into rounded haunches.
  - The back paws peek out at the sides, and every paw has cream toe lines like her whiskers.
  - The tail is long and tapered. When sitting, it comes from behind her right haunch and curls up
    at her side like a question mark, never under or in front of her paws.
- **Motion** (transform and opacity only; a plain fade under reduced motion):
  - a tail-tip twitch;
  - a slow blink, which comes from her expressions;
  - small, purposeful actions per tab.

## Per tab (proposed — to confirm with mockups before building)
- **Me:** she sits on the bar above Me, tail curled at her side. Now and then a bubble shows
  `meLine` ("12 days in a row", "2.1 kg to your goal weight"). Tapping her opens the coach.
- **Water:** she sits above Water with a small glass beside her paws.
  - **Glass:** it fills with today's progress.
  - **Adding water:** she leans down to sip, and the glass rises.
  - **Face:** `waterMood` sets it; concerned when behind, celebrating at the goal.
- **History:** she sits above History holding up a little calendar page in one raised front paw.
  This is a new paw pose on the same front-facing body.
  - **Page:** it shows the selected day and flips when the day changes.
  - **Face:** `dayMood` sets it.
- **Everywhere:**
  - She is hidden while the keyboard is up, when "Show Sia" is off, and on the camera.
  - She never covers a tab's icon or label.

## What changes in the code
- **Removed:**
  - The in-screen Sias from the previous design: `StripSia` (History), `WaterSia` (Water) and
    `SiaCompanionRow` (Me).
  - History's restored empty state stays without a Sia.
- **Kept:** `tabMoods.ts` and its tests, and the hop helper if a pose uses it.
- **New:**
  - A tab-bar overlay that picks the pose for the current tab.
  - The body drawn as React Native SVG from the reference art, in the same component family as
    `src/components/sia/Sia.tsx`, with the head reused as it is.

## Open
- A final-quality mockup of the three tab poses (Me, Water with glass, History with page), for the
  user to confirm before the build plan.
