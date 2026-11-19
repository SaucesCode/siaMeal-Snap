# Today: camera-eye ring + Sia peeking over the card — design

Status: approved by the user 2026-11-19 after the animated preview
(`.superpowers/brainstorm/1726-1795051038/content/sia-peek-preview-v3.html`).
Amends §6.1 (perch) and §8 (Today) of `2026-11-18-sia-colorpoint-redesign-design.md`.

## Why
The first Colorpoint Today looked clean but generic: "looks basic and looks like doesn't have a brand or
mascot". The screen people open most must read as Sia's app at a glance, for cat-loving calorie trackers,
without making the numbers harder to read.

## Approaches considered
- A. Ears on the calories card, Sia stays on the tab bar — quiet; user preferred more.
- B. Static Sia beside the greeting with a speech bubble — crowded the top.
- C. Calorie ring drawn as Sia's green shutter eye — **picked** (brand in the data).
- 1. C + card ears / 2. card as Sia's whole face / 3. Sia peeks over the card holding it — **picked 3 (+ C's ring)**.
  Card ears dropped: Sia's own head is the "ears", never a fake pair beside the real one.

## Decided
- **Hero card:** cocoa `point` card; left, a 120 px ring drawn like Sia's shutter eye (green arc on the
  `pointTrack` track, six blade ticks) with calories eaten inside and "of 2,000"; right, Protein / Carbs / Fat
  as "Protein · 75 / 150 g" + bar; below, "760 left today" or "350 over today" (arc turns amber when over).
- **Sia peeks over the card's top edge**, paws on the edge, chin hidden behind it. On Today she replaces the
  tab-bar perch (one Sia per screen); History, Water and Me keep the perch.
- **She stays still until something happens.** On an event she ducks behind the card (≈280 ms ease-in, paws
  let go ~60 ms later), the numbers start filling while she is hidden, and she rises at the spot where the news
  is (≈460 ms ease-out with a ~7 px settle, leaning ~4° toward the middle; paws grab the edge after her chin
  clears it). Spots: **left** over the ring for calorie news (meal logged, over budget); **right** over the
  macros for macro news (protein goal); **centre** for hello / streak / water. Celebrating adds two soft hops.
  App-open greeting rises slowly (~900 ms). Tapping her: nod + "loves", opens the coach (as the perch does).
- **Resting:** a 1.5 % breath every ~3.6 s plus her existing blink.
- **Her line** sits under "Hi {name}" (no floating bubble), prefixed "Sia:", cross-fading on change; when she
  has nothing to say it shows the status ("760 left — plenty of room." / "350 over today. That's okay.").
- **Reduced motion:** no movement; fade out → change → fade in at the new spot; no breath, no hops.
- **Meals without a photo** show the small static Sia head instead of a meal-type icon.

## Left to the builder
Exact spot x-positions from the measured card width; reaction → spot mapping lives with the reaction rules;
count-up implementation; how the perch is hidden on Today.
