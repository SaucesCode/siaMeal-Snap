# Sia pops up in a different place on each tab — design

Supersedes `2026-11-20-sia-tab-bar-poses-design.md`. The user dropped the full body: getting a body
to match the head took too many rounds. Sia stays head-and-paws, the look already approved on Today.
The mood rules in `src/features/sia/tabMoods.ts` (`dayMood`, `waterMood`, `meLine`) carry over.

## Why
On the other tabs she should feel like she does on Today: tucked behind something, popping up with
a face that reacts to what's on screen. Each tab gets its own place, so she isn't the same figure in
the same spot everywhere.

## Where she appears
- **Today:** no change. She peeks over the calories card (`SiaPeek`).
- **History:** she peeks over the day card, the dark calories summary below the week strip.
  - **On a day change:** when you pick a day she ducks and rises again.
  - **Spot:** follows where that day sits in the strip above. Mon–Tue is left, Wed–Fri is centre,
    Sat–Sun is right.
  - **Face:** `dayMood`.
- **Water:** she peeks over the water-ring card.
  - **Face:** `waterMood`, refreshed every minute and when the app comes back to the foreground.
  - **Adding water:** she pops up at a new spot with `loves` for about 1.5 s, then returns to her
    mood.
  - **Goal:** reaching it is `celebrating`, at the centre.
- **Me:** she perches on the tab bar above the Me tab: the old perch, head and paws on the bar's
  edge. Now and then a bubble shows `meLine`. Tapping her opens the coach. She doesn't sit over the
  Me icon or label.
- **Everywhere:**
  - Tapping her opens the coach.
  - She is hidden on the camera, while the keyboard is up, and when "Show Sia" is off.
  - She leaves no gap when hidden. Only one Sia shows on a screen.

## How it's built
- **History and Water:** reuse `SiaPeek` with its `reaction` prop. Each screen builds a `SiaReaction`
  `{ expression, line: null, spot }` from its mood function and wraps its card the way Today wraps
  its hero. Today uses the `heroWithSia` spacing.
- **Me:**
  - Restore the perch (`SiaPerch.tsx`, `SiaTabBar.tsx`) from commit `6332093` and mount it only
    when the route is Me. Its bubble shows `meLine` instead of the shared reaction line.
  - Remove the in-card companion row.
- **Removed (with their tests):**
  - The previous design's in-screen Sias: `StripSia` and `WaterSia`.
  - The Me card's `SiaCompanionRow`, along with the `profileCard` wrapper it needed.
  - `hop.ts`, if nothing still uses it.
- **Kept:** `tabMoods.ts` and its tests, and History's single-Sia fix.

## Calls made (the user can override)
- **History's spot** follows the selected day's position in the strip, so her move ties to the tap.
- **Water's spot** changes on each add, cycling left, centre, right, so the add feels answered.
- **Me** uses the perch exactly as it was before it was removed: same size and paws, the right side
  of the bar.
