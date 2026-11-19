# Sia + Colorpoint redesign — design

Date: 2026-11-18 · Branch: `upgrade/anna-readiness` · Status: approved by the user 2026-11-18

Approved mockups (kept locally in `.superpowers/brainstorm/922-1794988104/content/`):
`visual-direction-v2.html` (Colorpoint), `expressions-v10.html` (face + expressions + whiskers),
`docking-v6.html` (perch + scan flow).

## 1. Intent and why

SiaMeal Snap is for **people who seriously track calories and love cats**. The reason someone picks
this tracker over the one they already use, and comes back tomorrow, is **Sia**. That matters
commercially: the app is aiming at the Anna Founding Builder Program, which pays on real usage, so
retention is the goal.

Today Sia undermines that. Her full-body Lottie animations are broken and heavy (~2 MB in the JS
bundle), a roaming copy of her hops around every screen covering buttons, her moods mostly look
identical, and the app around her is a dark neon "athlete/hunter" dashboard that clashes with a
warm, cute Siamese cat.

This project takes Sia back to her origin — the head-only logo — gives her a real expression system,
and redesigns the whole app around her in a calm, minimal "Colorpoint" style.

## 2. Goals, non-goals, anti-goals

**Goals**
- Sia is a single, lightweight, head-only character with 8 expressions tied to real app events.
- She lives in one predictable docked spot that never covers content or controls.
- The whole app uses one Colorpoint visual system built from her colours, with plain-word copy.
- Logging stays as fast and readable as any serious tracker; numbers are never decorated.
- Identical Sia on iOS, Android and web; WCAG 2.2 AA; respects reduced motion.

**Non-goals (this project)**
- Cocoa dark mode (tokens are structured so it can be added later; see §11).
- New product features, new data, or changes to AI behaviour beyond the lines Sia says.
- A Sia body of any kind.

**Anti-goals (failure even if it "works")**
- Sia covers or crowds anything the user needs to tap or read.
- Sia moves or talks when nothing happened (decoration without purpose).
- Cat puns slow down reading the log, or appear in error messages.
- Sia shows a happy face for a bad outcome, or "progress" that isn't real.

## 3. Constraints

- Expo SDK 58, React Native 0.88, NativeWind 4, Reanimated 4, react-native-svg 15 (all present).
- No Lottie. `lottie-react-native` and `@lottiefiles/dotlottie-react` are removed.
- At most **one animated Sia per screen** (static Sia avatars elsewhere, e.g. chat history).
- Motion: only transform/opacity/SVG animated props; micro 120–200 ms, component 200–300 ms;
  everything static under reduced motion (system setting).
- Contrast verified for the palette (§7.1); touch targets ≥ 44×44.
- Existing app behaviour (logging, sync, coach streaming, account deletion, etc.) must not regress.

## 4. Approaches considered

**How Sia is built** (chosen: **A**)
- **A · Live vector component** — react-native-svg + Reanimated; expressions are props; parts
  interpolate between moods (pupil dilation, aperture, ears, sprout). A few KB, identical on all
  platforms, deletes the Lottie pipeline. Trade-off: art changes are code changes. *Chosen: the only
  option that delivers continuous cat-like eye behaviour and removes the biggest perf cost.*
- B · Extend the Lottie generator per expression — designer-tool friendly, but moods jump between
  files, pupil states multiply files, keeps the heavy pipeline and the second web drawing.
- C · Static image per expression — simplest, but no blink/focus/dilation; she'd feel like stickers.

**Visual direction** (chosen: **Colorpoint**) — vs Cream (all light) and Cocoa (warm dark).
Colorpoint = cream body with cocoa "points" (hero card, tab bar), like a Siamese coat.

**Where Sia lives** (chosen: **B · perched on the tab bar**) — vs A · in the header next to the
greeting (most minimal but less alive). B is more charming and fits why people pick the app; it
costs ~64 px of reserved height.

**Wording** (chosen: **plain words**) — vs light themed subtitles, vs keeping current names.
All cat personality comes from Sia's expressions and lines.

## 5. Sia — character specification

### 5.1 Geometry (source of truth)
Built from `assets/images/logo.svg` (viewBox `0 0 240 240`). Render viewBox `30 20 180 192`
(crop to the head). Parts, back to front: left ear, right ear, sprout, head (silhouette + chin
shading + cocoa mask), eyes, whiskers, nose, mouth, extras (blush, heart, stars, `?`, `z`).

| Part | Spec |
|---|---|
| Colours | cream `#F5E8D0`, chin `#E6D2B5`, mask/ears `#4B3329`, inner ear `#5E4136`, outline `#2A1810`, nose `#F77E8B`, leaf gradient `#68D458→#43AA38` stroke `#1E6F35`, stem `#25853E` |
| Natural eye (viewer's left) | **Siamese blue** `#5FB4E8`, centre (89,134), r 17.5, 3 px `#2A1810` outline; pupil `#1A0F0A`; shine `#fff` r 4 at (94,127.5) + r 1.8 at (84.5,140) 80 % |
| Shutter eye (viewer's right) | **Always** the camera shutter, centre (151,134): iris r 17.5 `#22E592` with 3 px `#2A1810` outline, highlight r 10 `#38F8A6` 45 %; hex aperture + 6 blade lines `#141F1A` **clipped to r 16**. No dark ring (avoid a "black eye"). |
| Closed eyes | Dark lines `#2A1810`, 6.5 px, round caps (wink: `M71 141 C78 120 100 120 107 141`; sleepy: `M71 134 C78 145 100 145 107 134`). Sleepy shutter = green lid line `#22E592` 4.5 px over a 10 px dark under-stroke, no disc. |
| Mouth | Always the cat "w" anchored at the nose bottom (120,158), 5.5 px `#2A1810`, round caps/joins. Variants in §5.3. Open mouths fill `#7A2E2E`, tongue `#F77E8B`. |
| Whiskers (full art only) | Light on the mask, like real Siamese: `#F5E8D0` 2.6 px, 95 % opacity, two per side (`M100 162 C88 159 76 158 63 159`, `M100 168 C89 169 77 172 66 177`, mirrored about x=120). |

### 5.2 Pupils behave like a cat's
One `pupil` value drives both eyes: the blue eye's pupil **and** the shutter's aperture scale.

| Pupil | Blue-eye pupil | Aperture scale | Meaning |
|---|---|---|---|
| `wide` | circle r 11.5 | 1.4 | loves / excited |
| `medium` | ellipse rx 6.5 ry 10.5 | 1.0 | calm |
| `slit` | ellipse rx 2.6 ry 11 | 0.7 | focused / wary |

Transitions between pupil states animate (≈200 ms, ease-out), which is the "dilation".

### 5.3 Expressions

| Expression | Trigger (§6.3) | Eyes / pupil | Mouth | Ears / sprout | Extras | Motion |
|---|---|---|---|---|---|---|
| `resting` | default | open / medium | "w" | neutral | — | blink every 4–7 s (random) |
| `happy` | meal logged, greeting | **wink** (blue eye closed) / — | "w" | neutral | — | one hop (≈450 ms) on enter |
| `loves` | food recognised in a photo, long-press (pet) | open / wide | "w" | neutral | blush both cheeks, small heart | heart beat while shown |
| `celebrating` | daily protein goal hit, streak milestone | open / wide | open "w" + tongue | ears out 6°, sprout up 4 px | 2 twinkling stars | stars twinkle |
| `thinking` | AI scan running, coach waiting for first words | open, gaze up-left / slit | small relaxed "w" | neutral | — | aperture "focus" loop (rotate + narrow) |
| `concerned` | over today's calorie target (once per day) | open + both upper lids lowered, inner corners raised / slit | "w" corners down | ears back 14°, sprout droops 30° | — | gentle sprout sway |
| `puzzled` | photo not food, barcode unreadable | open / slit | short stem + small open "o" | head tilt −9°, sprout −24° | `?` | none |
| `sleepy` | late night (22:00–05:00) or nothing logged by 10:00 | both closed (dark lid + green shutter lid) | small relaxed "w" | ears back 8°, sprout 14° | drifting `z z` | z drift |

Exact path data for every variant lives in `expressions-v10.html` / `docking-v6.html` and is the
reference for the builder.

### 5.4 Two detail levels
- **Full** (size ≥ 48 px): everything above, including whiskers and inner-ear shading.
- **Simplified** (size < 48 px — chat avatars, badges): no whiskers, no inner-ear shading, no eye
  shine; 10 px outlines, single-shape sprout, wink 13 px. Static (no animation) — this is also the
  "at most one animated Sia per screen" rule in practice.
  Reference: `mini` symbol in `expressions-v10.html`.

### 5.5 Component API (builder may refine names)
```tsx
<Sia expression="happy" size={78} animated />   // animated defaults true; false = static frame
```
- `expression`: one of the 8 above. Changing it animates parts between states.
- `size` picks the detail level automatically (§5.4).
- Decorative by default (`accessible={false}`, hidden from screen readers).
- Pure function `siaPose(expression) → { eye, pupil, mouth, ears, sprout, extras }` holds the
  table in §5.3 so it can be unit-tested without rendering.

## 6. Sia in the app

### 6.1 The perch (docking B)
- On the four tab screens (**Today, History, Water, Me**) Sia peeks over the tab bar's top edge,
  bottom-right: her chin is tucked behind the bar (≈15 % of her head hidden), her two paws grip the
  bar's edge on either side of her face. Paws = ear colour (`#4B3329`, `#2A1810` outline, two toe
  lines). Sia ≈ 78 px.
- **Reserved space:** each tab screen's scroll content gets bottom padding equal to the perch strip
  (≈64 px) so lists end above her. She never overlaps content or a control.
- **Not shown** on Camera, Review, auth/onboarding, or inside the coach (the coach header has its own
  Sia; message avatars are simplified + static).
- Tablets/web: perch stays bottom-right of the content column.

### 6.2 Speaking
- She speaks **only on events** (§6.3), never on a timer. One short line in a bubble to her left,
  max ~60 characters, auto-hides after 4 s; a newer event replaces the current line.
- Lines are built **on device from real numbers** (today's totals and targets from
  `buildCoachContext`), not AI-generated, so they're instant and honest. ≤ 1 cat pun per line; no
  puns in errors.
- Tap Sia or her bubble → opens the coach (signed-in screens only, so never before sign-in).
  Long-press → `loves` + purr haptic ("petting"). Me → "Show Sia" toggle hides the perch entirely
  (persisted per device); when hidden, the reserved strip goes too.
- Accessibility: the perch is one button, "Chat with Sia". Her line is announced politely
  (live region) when it appears. Under reduced motion she changes expression without motion.

### 6.3 Events → reactions

| Event (source) | Expression | Example line |
|---|---|---|
| Meal logged (`mealStore.logMeal`) | happy | "Adobo logged. 62 g protein to go." |
| Protein target reached today (first time) | celebrating | "150 g protein! Purr-fect day." |
| Calories over target (first time today) | concerned | "A bit over today. Tomorrow's a fresh start." |
| Streak milestone (7, 14, 30, 60, 100 days) | celebrating | "7 days in a row!" |
| App opened, first time today, before 10:00, nothing logged | sleepy → resting | "Morning! Breakfast first?" |
| Late night (22:00–05:00) app open | sleepy | — (no line) |
| Water goal reached | happy | "Water goal done." |

Camera flow (Sia appears in the scan UI, not on the perch): **thinking** while the AI analyses
("Looking at your plate…") → **loves** when food is recognised ("Ooh, chicken adobo!") then the
result → or **puzzled** if not food ("Hmm, that's not on the menu. Try your plate?"). Coach: header
Sia is **thinking** until the first streamed words arrive, then **resting**.

A small event bus (e.g. `siaStore` with `react(event, data)`) decouples stores from the perch.

## 7. Colorpoint visual system

### 7.1 Colour tokens (light)
| Token | Value | Use | Contrast check |
|---|---|---|---|
| `bg` | `#FBF6EE` cream | screen background | — |
| `surface` | `#FFFFFF` | cards, sheets, bubbles | — |
| `line` | `#EADFCF` | hairlines, card borders (decorative) | — |
| `text` | `#2A1810` | primary text | 15.8:1 on bg |
| `textMuted` | `#7A6457` | secondary text | 5.2:1 on bg, 5.5:1 on surface |
| `point` | `#3A2720` | hero card ("cocoa point") | — |
| `pointText` / `pointMuted` | `#F7EBD6` / `#CBB6A2` | text on point | 11.9:1 / 7.2:1 |
| `pointTrack` | `#55403A` | progress track on point | — |
| `pointDeep` | `#241813` | tab bar (deeper so paws read) | labels `#B9A595` 7.3:1, active `#F7EBD6` 14.7:1 |
| `leaf` | `#7DDB6A` on point / `#3E9B4F` on light | calorie progress, success fills | 5.6:1 on track |
| `leafText` | `#2F7A3D` | success text on light | 4.9:1 (the lighter leaf fails as text: 3.25:1) |
| `shutter` | `#10B981` | **only** the camera / AI action (Snap button) | dark glyph `#05241A` 6.5:1 |
| `protein` / `carbs` / `fat` | on point: `#8FB0F5` / `#F2C063` / `#F59AAC`; on light: `#5B7FD1` / `#E0A23B` / `#D9738A` | macro bars | 6.5 / 8.4 / 6.8 on point |
| `over` | builder to pick a warm red meeting 4.5:1 on bg | over-target text | — |

Known risk: paws vs tab bar are 1.49:1 (decorative). Check on a real phone; adjust tab bar shade
if they vanish.

### 7.2 Type, space, shape, motion
- **Type:** Outfit (display + all numbers, `tabular-nums`) and Plus Jakarta Sans (body) — already
  loaded; drop unused weights. Scale (pt): 40 hero number / 22 screen title / 17 section / 15 body /
  13 secondary / 12 caption minimum (no text below 12).
- **Spacing:** 4-pt scale (4, 8, 12, 16, 24, 32, 48). **Radius:** 12 (controls), 16 (cards),
  22 (hero), full (pills/round buttons). **Shadows:** at most one soft elevation for sheets/bubbles.
- **Motion tokens:** `fast` 150 ms, `base` 250 ms, `slow` 400 ms; `easeOut`
  `cubic-bezier(0.2, 0.8, 0.2, 1)`, ease-in for exits.
- Tokens live in one place (`tailwind.config.js` theme + a `src/theme` TS export for SVG/Reanimated
  values). No raw hex in screens/components after the migration.

## 8. Screens

All screens: Colorpoint tokens, plain words, one clear focal point, primary action obvious,
skeleton loading where data loads, real empty/error states (with the right Sia expression where it
helps, static).

- **Today:** greeting (date + "Hi {name}") → **hero point card** (calories eaten big, "of X kcal ·
  Y left", progress bar, 3 macro bars) → meals grouped Breakfast/Lunch/Dinner/Snack with "Log again"
  → perch. Remove the rank badge, "Next Catch" theming, and decorative clutter; keep features that
  carry weight (log again, quick water).
- **Camera / Review:** full-bleed viewfinder, no perch; Snap button = shutter green. Scan flow per
  §6.3 with honest status text (no fake rotating "telemetry"). Review: photo, name, macros editable,
  estimate disclaimer (exists), one primary "Save".
- **History:** week strip, day totals in a small point card, meal list, perch.
- **Water:** progress ring (existing `AnimatedProgressRing`) in point colours, quick-add buttons, perch.
- **Me (Profile):** profile, targets, weight, settings incl. "Show Sia", Privacy Policy, Sign out,
  Delete account (all exist). Remove avatar-cat picker grid (one Sia; profile avatar = initials or
  photo) — builder may keep a single static Sia avatar if simpler.
- **Coach:** header with animated Sia (thinking/resting), messages with simplified static Sia
  avatar, existing streaming + disclaimer.
- **Auth / Onboarding:** one large static-or-resting Sia + wordmark; no roaming companion; plain copy.
- **Tab bar:** Today · History · (Snap) · Water · Me on `pointDeep`; Snap is the raised shutter-green
  button with a cream ring.
- **Launch:** the native splash is the new Sia head (resting) centred on cream `bg` with a small
  "SiaMeal Snap" wordmark below her (Outfit, `text` colour), no box or dark square (today's
  `splash-icon.png` is the old head on a black square over near-black). The splash appears instantly
  on tap, before any JS runs, so there is always a logo screen while the app loads. The splash
  stays up until fonts and session are ready (as now — no artificial delay, no walking intro). On
  hand-off a JS overlay matching the splash exactly shows Sia **winking once** while it fades into
  the first screen (~300 ms, runs during the fade, adds no wait). Reduced motion: fade only.
- **App icon + platform assets:** regenerated from Sia's vector art on cream: iOS icon, Android
  adaptive icon (foreground, background, monochrome), splash image, web favicon. `app.json` splash
  and adaptive-icon background colours change from `#09090b` to the cream `bg`.

## 9. Copy rules
- Plain labels everywhere: Breakfast, Lunch, Dinner, Snack, "Log again", the user's name (no
  "Athlete"), "12-day streak".
- Personality lives in Sia's lines only; ≤ 1 pun per line; never in errors or legal/health text.
- Errors follow what happened → why → what to do, in plain words.

## 10. Removals (all superseded)
`SiaVectorCat`, `SiaCatMascot`, `SiaMascotHero`, `SiaRoamingCompanion`, `SiaWalkingLoader`,
`SiaContextualLoader` (fake telemetry), `FelineHunterRankBadge` + rank tiers in
`felineGamification.ts`, `FelineMilestoneCelebrationModal` (replaced by Sia `celebrating` on the
perch), `BrandLogo`'s mascot usage, `assets/lottie/*`, `scripts/generate-sia-lottie.js`, unused
mascot PNG/JPG/SVG files, `lottie-react-native`, `@lottiefiles/dotlottie-react`. Cat-pun labels in
stores/utils/screens. Builder confirms each is unreferenced before deleting.

## 11. Future (not this project)
Cocoa dark mode: same tokens with dark values (`bg #1C1411`, `surface #2A1E1A`, text `#F7EBD6`…),
following the system setting.

## 12. Verification
- Unit tests: `siaPose` mapping for all 8 expressions; reaction rules (event → expression/line,
  once-per-day rules, streak milestones); line builder uses real numbers.
- Visual: screenshots of every screen at 375 / 768 / 1280 on web, plus Sia at 20/28/48/78/120 px,
  compared against the approved mockups.
- Perf: iOS export bundle size before/after (expect the ~2 MB Lottie JSON gone); one animated Sia
  per screen; no JS-thread animations.
- A11y: contrast table above; screen reader pass (perch = one button, decorative Sias hidden);
  reduced-motion pass.
- Regression: logging, scan, coach streaming, account deletion still work.

## 13. Calls made during the builder check (correct any of these)
- **Streak is currently capped at 7 and resets weekly**: `fetchWeeklyStats` counts consecutive
  logged days only inside the current week's 7-day window, so the old ranks above 7 days were never
  reachable. How streaks work in this project is decided in §13a.
- Once-per-day reactions (over target, protein goal, morning greeting) are remembered on the device,
  keyed by the local date.
- `app.json` `userInterfaceStyle` becomes `"light"` until Cocoa dark mode exists, so system dark
  mode doesn't produce mismatched status bars or keyboards.
- The AI coach's persona prompt stays as is: the coach *is* Sia talking, which is where personality
  belongs. Local notification copy follows the plain-word rules.
- Existing profiles with a `cat_*` avatar fall back to initials when the avatar picker is removed.
- Onboarding steps map their old moods to the new expressions (e.g. scanning → thinking).

## 13a. Streaks (decided: real streaks)
- A streak = consecutive **local** calendar days with at least one logged meal, ending today (or
  yesterday, if nothing is logged yet today — the streak isn't broken until the day is over).
- Computed server-side by a new Postgres function (e.g. `get_logging_streak(p_tz text)`, security
  invoker, scoped to `auth.uid()`), which groups `meals.logged_at` by local date in the device's IANA
  time zone and walks back from today. Added to `supabase/schema.sql` (idempotent) and tested like
  the quota function. Cost: one indexed query on the existing `(user_id, logged_at)` index.
- The app merges in local truth: if today has meals in `todayMeals` that haven't synced yet, today
  counts.
- Shown on Today as "12-day streak" (plain words). Sia celebrates at **7, 14, 30, 60, 100** days,
  once per milestone (remembered on device).
- Replaces the 7-day-window `streakDays` from `fetchWeeklyStats` everywhere it is displayed.

## 14. Left to the builder
Exact component/file names and folder layout; part-interpolation details; bubble placement fine-
tuning; the `over` red; skeleton designs; how History's week strip is restyled; whether Me keeps a
static Sia avatar; implementation order (suggested: tokens → `Sia` component + tests → perch +
reactions → screens one at a time → removals).
