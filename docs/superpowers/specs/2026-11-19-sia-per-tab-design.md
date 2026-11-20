# Sia per tab — design

## Why
On History, Water and Me, Sia is a fixed figure perched on the tab bar above the Me tab. She changes
face on app events but otherwise just sits there, so on those tabs she reads as decoration. On Today
she already peeks over the calories card and reacts to your numbers. The user wants her to **behave
differently and appear differently on each tab**. For the Anna usage grant, a mascot that reacts to
*your own* data gives people a reason to come back.

## Goals
- Each of History, Water and Me gives Sia a role tied to what that screen shows.
- Her face on each tab comes from that screen's real numbers, never decoration.
- Tapping her still opens the coach on every tab.

## Non-goals
- No change to Today (SiaPeek) or the camera (she stays off it).
- No new art: use the existing expressions — resting, happy, loves, celebrating, thinking,
  concerned, puzzled, sleepy.
- No new reaction events or server work.

## Anti-goals (a failure even if it works)
- Two Sias on screen at once.
- Motion that blocks taps, shifts layout, or ignores reduced motion.
- Covering the tab bar or any button (the current perch sits over the Me tab).

## Approaches considered
- **A. The same peek-over-the-card on every tab:** the least new code (it reuses SiaPeek), but every
  tab would feel like Today.
- **B. Keep the tab-bar perch, with a different spot and pose per tab:** the smallest change, but she
  stays decoration on the bar, which is the complaint.
- **C. A different role per tab: History is the reviewer, Water the drinker, Me the companion.**
  **Chosen by the user.** It is the most work, mainly History's hop, but each tab gets a reason for
  her to be there.

## Design

### The tab-bar perch goes away
`SiaPerchOverlay` is no longer mounted in `(tabs)/_layout.tsx`, so no tab shows two Sias. Tab
screens drop the extra bottom scroll padding they kept for her (`PERCH_SCROLL_INSET`). The perch
file, and the paws if nothing else uses them, are deleted.

### History: the reviewer
- **Where:** she sits on the week strip and moves above whichever day is selected (≈56 px Sia).
- **Moving:** when you tap a day, she hops to it, sliding sideways with a small arc.
  - It takes about 300 ms with the app's standard ease, and she always lands in the same spot.
  - She moves only with transform; the strip reserves her height, so nothing else shifts.
  - With reduced motion she jumps straight there.
- **Mood:** her face shows how the selected day went (`dayMood`):
  - **Nothing logged on a past day:** `sleepy`.
  - **Today, still in progress:** `resting`.
  - **Within ±10 % of the calorie target:** `happy`.
  - **More than 10 % under:** `resting`.
  - **More than 10 % over:** `concerned`.
- **Tap:** opens the coach. Screen readers hear her as "Sia: {how the day went}".

### Water: the drinker
- **Where:** she sits inside the water-ring card beside the ring (≈64 px), never over the numbers.
- **Mood:** `waterMood(ml, target, now)` compares what you've drunk with the pace you should be at
  by now. That pace spreads the target evenly from 07:00 to 22:00.
  - **Goal reached:** `celebrating`.
  - **At least 80 % of the pace:** `happy`.
  - **40–80 % of the pace:** `resting`.
  - **Under 40 % of the pace, after 10:00:** `concerned` (thirsty).
  - **Before 09:00 with nothing logged:** `sleepy`.
- **Adding water:** she shows `loves` for about 1.5 s with a hop, then returns to her mood. With
  reduced motion she skips the hop.
- **Tap:** opens the coach.

### Me: the companion
- **Where:** a calm portrait (≈56 px) in the profile card, beside your initials, with no movement
  beyond her blink.
- **One line** under your name (`meLine`), the first that applies:
  1. A goal weight and current weight are both set and differ by 0.1 kg or more: "2.1 kg to your
     goal weight", or "You've reached your goal weight" when the gap is gone.
  2. A streak of 2 or more days: "12 days in a row".
  3. Otherwise: "Snap a meal and I'll start counting."
- **Tap:** opens the coach.

### Everywhere
- **Show Sia:** when it's off, she is hidden on all three tabs and the layout closes the gap.
- **Pure logic:** `dayMood`, `waterMood` and `meLine` are pure functions in
  `src/features/sia/tabMoods.ts` with unit tests. The components only display what they return.

## Constraints
- NativeWind on Android: use `Tap` (not function-style `Pressable`) and no conditional
  `active:/focus:` classes. Existing guard tests enforce this.
- Colours, spacing and motion come from `src/theme` tokens.
- The user tests on an Android phone in Expo Go, so a phone check is required before calling it
  done.

## Left to the builder
- Exact pixel sizes and offsets within the stated ranges.
- Whether History's hop uses one Reanimated `withTiming` on x plus a `withSequence` on y, or a
  single keyframe.
