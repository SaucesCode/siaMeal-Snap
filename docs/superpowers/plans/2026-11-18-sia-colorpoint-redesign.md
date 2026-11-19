# Sia + Colorpoint Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken full-body mascot with a head-only, event-driven Sia vector component perched on the tab bar, and restyle every screen in the Colorpoint system with plain-word copy and real streaks.

**Architecture:** Sia is one react-native-svg component whose look is a pure function of an expression (`siaPose`), animated with Reanimated animated props. A small zustand store turns app events into reactions (expression + line) shown by a `SiaPerch` on the tab screens. Colours/space/motion come from one token module shared by Tailwind (NativeWind) and TS. Streaks come from a new Postgres function.

**Tech Stack:** Expo SDK 58, React Native 0.88, expo-router, NativeWind 4, Reanimated 4, react-native-svg 15, zustand 5, Supabase; Jest via `jest-expo@~58` + `@testing-library/react-native@14`; `@resvg/resvg-js` + `tsx` for icon rendering; `@electric-sql/pglite` for SQL tests.

**Spec:** `docs/superpowers/specs/2026-11-18-sia-colorpoint-redesign-design.md` (approved). Visual references: `.superpowers/brainstorm/922-1794988104/content/{visual-direction-v2,expressions-v10,docking-v6}.html` (local, not committed — open in a browser; path data for every Sia part and expression is in `expressions-v10.html`).

## Global Constraints

- No Lottie anywhere after Task 16; at most **one animated Sia per screen**; simplified Sia (< 48 px) is always static.
- Animate only transforms, opacity, and SVG animated props on the UI thread; durations: micro 150 ms, component 250 ms, large 400 ms; ease-out `cubic-bezier(0.2, 0.8, 0.2, 1)`; everything static under system reduced motion.
- No raw hex colours in `src/app/**` or `src/components/**` outside `src/theme/**` and `src/components/sia/siaArt.ts` once a screen is restyled.
- Text ≥ 12 pt; touch targets ≥ 44×44; contrast per spec §7.1 (text 4.5:1, UI 3:1).
- Plain words: Breakfast, Lunch, Dinner, Snack, "Log again", the user's name (never "Athlete"), "N-day streak". Cat puns only in Sia's lines, ≤ 1 per line, never in errors, legal or health text.
- Sia appears on Today, History, Water, Me (perch) only — never on Camera, Review, auth/onboarding; coach has its own header Sia.
- Android is the launch platform (user has no iPhone); every task must still build for iOS and web.
- `app.json` `userInterfaceStyle: "light"`; splash/adaptive-icon background = cream `#FBF6EE`.
- Every task ends with `npx tsc --noEmit` clean and `npx jest` green; commit messages end with the repo's Co-Authored-By trailer.

## Review Focus

- **Midnight rollover with the app open:** once-per-day reactions must fire again the next local day (test in Task 7).
- **Meals logged offline:** today must count toward the streak and still trigger Sia even though the server hasn't seen the meal (test in Task 6).
- **Time-zone day boundary:** a meal at 00:30 Manila time is "today" in Manila even though it is "yesterday" in UTC (SQL test in Task 6).
- **One log triggers several reactions** (e.g. hits protein goal *and* goes over calories): show both in priority order, one after another, never drop the celebration silently (test in Task 7).
- **Very long meal names:** Sia's line stays ≤ 60 characters (test in Task 7).

---

## File map

| File | Responsibility |
|---|---|
| `src/theme/palette.js` | CommonJS colour tokens (single source; required by `tailwind.config.js`) |
| `src/theme/index.ts` | Typed re-export of palette + `space`, `radius`, `motion`, `type`; `contrastRatio()` |
| `src/components/sia/siaPose.ts` | Types + pure `siaPose(expression)` and pupil table |
| `src/components/sia/siaArt.ts` | All Sia SVG path data/colours (from `logo.svg` + mockups) |
| `src/components/sia/Sia.tsx` | The component (full + simplified, static or animated) |
| `src/components/sia/useSiaMotion.ts` | Reanimated motion per expression |
| `src/components/sia/SiaPaws.tsx` | Ear-coloured paws for the perch |
| `src/components/sia/LaunchWink.tsx` | Splash hand-off overlay |
| `src/features/sia/siaLines.ts` | Line builders from real numbers |
| `src/features/sia/siaReactions.ts` | Pure event → ordered reactions |
| `src/features/sia/siaStore.ts` | Reaction queue, once-per-day memory, "Show Sia" pref |
| `src/features/sia/SiaPerch.tsx` | Perch UI + `PERCH_RESERVED_HEIGHT` |
| `src/features/sia/useSiaEvents.ts` | Watches stores and emits events |
| `src/services/streakService.ts` | `fetchLoggingStreak`, `mergeLocalStreak`, `crossedStreakMilestone` |
| `src/constants/mealTypes.ts` | Plain meal-type labels/icons/colours (replaces 6 copies) |
| `scripts/render-sia-assets.ts` | Renders icon/splash/favicon PNGs from `siaArt` |
| `scripts/test-sql.mjs` | PGlite tests for `consume_ai_quota` + `get_logging_streak` |

---

### Task 1: Test runner + Colorpoint tokens

**Files:**
- Modify: `package.json` (devDeps, `"test": "jest"`, `"jest": {"preset":"jest-expo","setupFiles":["./jest.setup.ts"]}`), `tailwind.config.js`
- Create: `jest.setup.ts`, `src/theme/palette.js`, `src/theme/index.ts`, `src/theme/__tests__/contrast.test.ts`

**Interfaces:**
- Produces: `palette` (keys: `bg surface line text textMuted point pointText pointMuted pointTrack pointDeep leaf leafOnLight leafText shutter shutterGlyph protein carbs fat proteinOnLight carbsOnLight fatOnLight over`), `space` (`1:4 2:8 3:12 4:16 6:24 8:32 12:48`), `radius` (`control:12 card:16 hero:22 full:999`), `motion` (`fast:150 base:250 slow:400`, `easeOut:[0.2,0.8,0.2,1]`), `contrastRatio(a: string, b: string): number`. Tailwind colour names = palette keys (e.g. `bg-point`, `text-textMuted`).

- [ ] **Step 1:** `npx expo install -- --save-dev jest-expo jest @types/jest @testing-library/react-native`; `jest.setup.ts` calls Reanimated's `setUpTests()`.
- [ ] **Step 2: Write the failing test** `contrast.test.ts`:
```ts
it.each([
  ['text', 'bg', 4.5], ['textMuted', 'bg', 4.5], ['textMuted', 'surface', 4.5],
  ['pointText', 'point', 4.5], ['pointMuted', 'point', 4.5], ['leafText', 'bg', 4.5],
  ['over', 'bg', 4.5], ['shutterGlyph', 'shutter', 4.5], ['leaf', 'pointTrack', 3],
])('%s on %s ≥ %d:1', (fg, bg, min) => {
  expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
});
```
- [ ] **Step 3:** Run `npx jest src/theme` → FAIL (module missing).
- [ ] **Step 4:** Create `palette.js` with the spec §7.1 values (`over`: pick a warm red ≥ 4.5:1 on `#FBF6EE`, e.g. `#B42318`), `index.ts` with WCAG relative-luminance `contrastRatio`, and `tailwind.config.js` `theme.extend.colors = require('./src/theme/palette')` (keep existing keys until Task 16).
- [ ] **Step 5:** `npx jest src/theme` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 6:** Commit `feat: add Colorpoint tokens and Jest setup`.

### Task 2: Sia pose model

**Files:** Create `src/components/sia/siaPose.ts`, `src/components/sia/__tests__/siaPose.test.ts`

**Interfaces:**
- Produces:
  - `type SiaExpression = 'resting'|'happy'|'loves'|'celebrating'|'thinking'|'concerned'|'puzzled'|'sleepy'`
  - `type Pupil = 'wide'|'medium'|'slit'`; `PUPILS: Record<Pupil, {kind:'circle'|'ellipse', rx:number, ry:number, apertureScale:number}>` = wide `{circle, 11.5, 11.5, 1.4}`, medium `{ellipse, 6.5, 10.5, 1}`, slit `{ellipse, 2.6, 11, 0.7}`
  - `interface SiaPose { eye: 'open'|'wink'|'closed'; pupil: Pupil|null; gaze: {dx:number, dy:number}; lids: 'none'|'worried'; mouth: 'w'|'wOpen'|'wSmall'|'wDown'|'o'; earTilt: number; sproutTilt: number; sproutLift: number; headTilt: number; extras: Array<'blush'|'heart'|'stars'|'question'|'zz'>; motion: 'blink'|'hop'|'heartbeat'|'twinkle'|'focus'|'sway'|'none'|'drift' }`
  - `siaPose(e: SiaExpression): SiaPose`

- [ ] **Step 1: Write the failing test** — one `it` per spec §5.3 row, e.g.:
```ts
expect(siaPose('loves')).toMatchObject({ eye:'open', pupil:'wide', mouth:'w', extras:['blush','heart'], motion:'heartbeat' });
expect(siaPose('concerned')).toMatchObject({ pupil:'slit', lids:'worried', mouth:'wDown', earTilt:14, sproutTilt:30, motion:'sway' });
expect(siaPose('sleepy')).toMatchObject({ eye:'closed', pupil:null, mouth:'wSmall', earTilt:8, sproutTilt:14, extras:['zz'] });
expect(siaPose('puzzled')).toMatchObject({ pupil:'slit', mouth:'o', headTilt:-9, sproutTilt:-24, extras:['question'] });
expect(siaPose('thinking')).toMatchObject({ pupil:'slit', gaze:{dx:-3,dy:-4}, mouth:'wSmall', motion:'focus' });
expect(siaPose('celebrating')).toMatchObject({ pupil:'wide', mouth:'wOpen', earTilt:6, sproutLift:4, extras:['stars'] });
expect(siaPose('happy')).toMatchObject({ eye:'wink', mouth:'w', motion:'hop' });
expect(siaPose('resting')).toMatchObject({ eye:'open', pupil:'medium', mouth:'w', motion:'blink' });
```
plus `PUPILS` values above.
- [ ] **Step 2:** `npx jest src/components/sia` → FAIL.
- [ ] **Step 3:** Implement as a `const` table keyed by expression.
- [ ] **Step 4:** → PASS. **Step 5:** Commit `feat: add Sia pose model`.

### Task 3: Sia art + static component

**Files:** Create `src/components/sia/siaArt.ts`, `src/components/sia/Sia.tsx`, `src/components/sia/index.ts`, `src/components/sia/__tests__/Sia.test.tsx`

**Interfaces:**
- Consumes: `siaPose`, `PUPILS` (Task 2).
- Produces: `SIA_VIEWBOX = '30 20 180 192'`, `SIA_DETAIL_THRESHOLD = 48`; `<Sia expression: SiaExpression, size: number, animated?: boolean (default true) />` — decorative (`accessible={false}`, `importantForAccessibility="no-hide-descendants"`); parts carry `testID`s: `sia-eye-open`, `sia-eye-wink`, `sia-eye-closed`, `sia-pupil`, `sia-shutter`, `sia-whiskers`, `sia-mouth-<variant>`, `sia-extra-<name>`, `sia-simplified`.
- `siaArt.ts` exports path strings/colours exactly as spec §5.1 (eyes mirrored at (89,134)/(151,134), blades clipped r 16, dark closed-eye lines, light whiskers) and the simplified head from the `mini` symbol (dark wink 13 px).

- [ ] **Step 1: Write the failing tests:** renders `sia-eye-wink` for `happy`; `sia-pupil` present for `resting`, absent for `sleepy`; `sia-whiskers` at size 78 and absent (with `sia-simplified`) at size 28; `sia-extra-question` for `puzzled`; `sia-mouth-wOpen` for `celebrating`; root is hidden from accessibility.
- [ ] **Step 2:** `npx jest src/components/sia/__tests__/Sia.test.tsx` → FAIL.
- [ ] **Step 3:** Implement static render (`animated={false}` path); part transforms (ear/sprout/head tilt, aperture scale) applied from the pose.
- [ ] **Step 4:** → PASS; `tsc` clean.
- [ ] **Step 5: Visual check:** temporary route or web screen rendering all 8 expressions at 140 px and sizes 20/28/48/78; compare against `expressions-v10.html` (with whiskers). Remove the temporary screen before committing.
- [ ] **Step 6:** Commit `feat: add head-only Sia vector component`.

### Task 4: Sia motion

**Files:** Create `src/components/sia/useSiaMotion.ts`, `src/components/sia/__tests__/useSiaMotion.test.ts`; Modify `Sia.tsx`

**Interfaces:**
- Produces: `useSiaMotion(pose: SiaPose, enabled: boolean)` returning Reanimated animated props/styles used by `Sia` (pupil rx/ry + aperture scale interpolate over `motion.base` on expression change; `blink` every random 4000–7000 ms; `hop` once on enter, ≈450 ms; `focus` aperture loop 1400 ms; `heartbeat` 1100 ms; `twinkle` 1200 ms; `sway` 2400 ms; `drift` 2600 ms). `enabled = animated && size >= SIA_DETAIL_THRESHOLD && !reducedMotion`.

- [ ] **Step 1: Failing test:** with `useReducedMotion` mocked `true`, `useSiaMotion(siaPose('thinking'), true)` starts no repeating animation (assert via the returned `isAnimating === false`); with `enabled=false` same.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Visual check** on web: blink, hop, focus, heartbeat, twinkle, sway, z drift look like the mockups; toggle OS reduced motion → static.
- [ ] **Step 6:** Commit `feat: animate Sia expressions on the UI thread`.

### Task 5: Launch splash, app icon, light mode

**Files:** Create `scripts/render-sia-assets.ts`, `src/components/sia/LaunchWink.tsx`; Modify `app.json`, `src/app/_layout.tsx`, `package.json` (devDeps `@resvg/resvg-js`, `tsx`; script `"assets:sia": "tsx scripts/render-sia-assets.ts"`); regenerate `assets/images/{icon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome,favicon}.png`

**Interfaces:**
- Consumes: `siaArt`, `siaPose('resting')`.
- Produces: `<LaunchWink onDone: () => void />` — full-screen cream overlay matching the native splash (Sia + "SiaMeal Snap" wordmark), plays one wink while fading out over ~300 ms; reduced motion → fade only.

- [ ] **Step 1:** Script builds the resting-Sia SVG string from `siaArt` (no separate SVG copy) and renders: icon 1024² (Sia on cream, full bleed safe area), splash 1024² transparent Sia + wordmark, Android foreground/monochrome 1024² (monochrome = single-colour silhouette), background 1024² cream, favicon 48². Run `npm run assets:sia`; open each PNG and confirm.
- [ ] **Step 2:** `app.json`: `userInterfaceStyle: "light"`, splash `backgroundColor` and adaptive icon `backgroundColor` `#FBF6EE`, splash `imageWidth` sized so Sia + wordmark match the overlay.
- [ ] **Step 3:** `_layout.tsx`: keep the native splash until `appReady` (existing), then render `LaunchWink` over the app and hide the native splash under it; unmount on `onDone`. `StatusBar style="dark"`.
- [ ] **Step 4:** Verify: `npx expo export --platform android` (primary) and `--platform ios` (stays buildable) succeed; web: load the app, screenshot mid-fade (no layout jump between splash and overlay).
- [ ] **Step 5: Real-device checkpoint (user, Android phone or Android emulator):** cold-start; splash → wink → Today feels seamless; new icon on home screen.
- [ ] **Step 6:** Commit `feat: Sia launch splash, app icon and light mode`.

### Task 6: Real streaks

**Files:** Modify `supabase/schema.sql`; Create `scripts/test-sql.mjs` (devDep `@electric-sql/pglite`, script `"test:sql": "node scripts/test-sql.mjs"`), `src/services/streakService.ts`, `src/services/__tests__/streakService.test.ts`

**Interfaces:**
- Produces (SQL): `public.get_logging_streak(p_tz text) returns table(streak int, includes_today boolean)` — `SECURITY INVOKER`, uses `auth.uid()`, local date = `(logged_at at time zone p_tz)::date`, walks back from today (or yesterday if today has no meals); `GRANT EXECUTE ... TO authenticated`.
- Produces (TS): `fetchLoggingStreak(): Promise<{streak:number, includesToday:boolean}>` (passes `Intl.DateTimeFormat().resolvedOptions().timeZone`); `mergeLocalStreak(server:{streak:number,includesToday:boolean}, hasLocalMealsToday:boolean): number`; `crossedStreakMilestone(prev:number, next:number): 7|14|30|60|100|null`; `STREAK_MILESTONES = [7,14,30,60,100]`.

- [ ] **Step 1: Failing SQL tests** (`test-sql.mjs`, stub `auth` schema as in the quota test; move the existing quota test here too): 3 consecutive local days → 3; gap breaks; nothing today but yesterday+day before → 2 with `includes_today=false`; **meal at 00:30 Asia/Manila (16:30Z previous day) counts as today in `Asia/Manila`**; other users' meals ignored.
- [ ] **Step 2: Failing TS tests:** `mergeLocalStreak({streak:4,includesToday:false}, true) === 5`; `({4,true}, true) === 4`; `({4,false}, false) === 4`; `({0,false}, true) === 1`; `crossedStreakMilestone(6,7) === 7`, `(7,8) === null`, `(13,15) === 14`.
- [ ] **Step 3:** Run both → FAIL. **Step 4:** Implement. **Step 5:** `npm run test:sql` and `npx jest src/services` → PASS.
- [ ] **Step 6:** Commit `feat: count real logging streaks`. Note in the summary: user must re-run `supabase/schema.sql`.

### Task 7: Sia reactions (pure)

**Files:** Create `src/features/sia/siaLines.ts`, `src/features/sia/siaReactions.ts`, `src/features/sia/__tests__/siaReactions.test.ts`

**Interfaces:**
- Consumes: `buildCoachContext` output (`src/utils/coachContext.ts`), `crossedStreakMilestone`.
- Produces:
  - `type SiaEvent = {type:'mealLogged', mealName:string, ctx:UserNutritionContext} | {type:'waterGoalReached'} | {type:'streakChanged', prev:number, next:number} | {type:'appOpened', now:Date, hasMealsToday:boolean}`
  - `interface SiaReaction { expression: SiaExpression; line: string|null; onceKey?: string }` (onceKey = `'<rule>:<YYYY-MM-DD>'` or `'streak:<n>'`)
  - `reactionsFor(event: SiaEvent, done: ReadonlySet<string>, today: string): SiaReaction[]` — ordered, highest priority first: `concerned` (over target) → `celebrating` (protein goal / streak) → `happy` (meal logged). Max 2 per event.
  - `MAX_LINE = 60`; lines truncate meal names with "…" to fit.

- [ ] **Step 1: Failing tests** (spec §6.3 rows):
  - mealLogged under target → `[{happy, "Adobo logged. 62 g protein to go."}]` (protein remaining from ctx).
  - mealLogged that crosses protein target first time today → `[celebrating "150 g protein! Purr-fect day.", happy …]`; second time (key in `done`) → only `happy`.
  - mealLogged over calories → first `concerned "A bit over today. Tomorrow's a fresh start."`; also hits protein → `[concerned, celebrating]` (both, ordered).
  - streakChanged 6→7 → `celebrating "7 days in a row!"` with onceKey `streak:7`.
  - appOpened 08:30, no meals, key unseen → `[sleepy "Morning! Breakfast first?"]`; 23:15 → `[{sleepy, line:null}]`; 14:00 → `[]`.
  - **Midnight rollover:** `done` contains `overBudget:2026-11-18`, `today='2026-11-19'` → concerned fires again.
  - **Long names:** meal name of 120 chars → every `line.length <= 60`.
  - waterGoalReached → `[happy "Water goal done."]`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: map app events to Sia reactions`.

### Task 8: Sia store, perch, and event wiring

**Files:** Create `src/features/sia/siaStore.ts`, `src/features/sia/SiaPerch.tsx`, `src/features/sia/useSiaEvents.ts`, `src/components/sia/SiaPaws.tsx`, `src/features/sia/__tests__/siaStore.test.ts`; Modify `src/app/(tabs)/_layout.tsx` (mount perch), `src/stores/authStore.ts` (`deleteAccount`/`signOut` reset Sia store)

**Interfaces:**
- Consumes: `reactionsFor`, `<Sia/>`, `useCoachStore().openCoach`, `fetchLoggingStreak`/`mergeLocalStreak`, `selectTodayMeals`, `buildCoachContext`.
- Produces: `useSiaStore` with `{ current: SiaReaction|null, hidden: boolean, emit(e: SiaEvent): void, setHidden(h: boolean): Promise<void>, pet(): void, reset(): void }` — queue shows each reaction for 4000 ms then returns to `resting` with `line:null`; persists `hidden` and `done` keys (pruned to today + streak keys) in AsyncStorage under `@siameal_sia_v1`. `PERCH_RESERVED_HEIGHT = 64`. `<SiaPerch />`: Sia 78 px peeking (≈15 % of head behind the tab bar), `SiaPaws` (ear colour `#4B3329`, outline `#2A1810`) over the bar edge, bubble left of Sia; one `Pressable` "Chat with Sia" (tap → `openCoach()`, long-press → `pet()` + purr haptic); bubble in a polite live region; renders nothing when `hidden`.
- `useSiaEvents()` (mounted once in tabs layout) emits: `mealLogged` after `logMeal`, `waterGoalReached` when water crosses goal, `streakChanged` after streak refresh, `appOpened` on first focus each day.

- [ ] **Step 1: Failing store tests (fake timers):** emitting two reactions shows the first, then the second after 4000 ms, then `resting`; a reaction with an `onceKey` already done is not shown; `setHidden(true)` → `current` stays null on emit and value persists; `reset()` clears `done` and `current`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement store, perch, paws, events; tabs layout adds `PERCH_RESERVED_HEIGHT` to each tab screen's scroll `contentContainerStyle.paddingBottom` (when not hidden).
- [ ] **Step 4:** PASS; `tsc` clean.
- [ ] **Step 5: Visual check (web, 375/768/1280):** perch matches `docking-v6.html` close-up; lists end above the strip; nothing overlaps.
- [ ] **Step 6: Real-device checkpoint (user, Android phone or Android emulator):** paws visible against the tab bar? If not, darken `pointDeep` until they read (record the value in `palette.js`).
- [ ] **Step 7:** Commit `feat: perch Sia on the tab bar with event reactions`.

### Task 9: Tab bar + shared meal types

**Files:** Create `src/constants/mealTypes.ts`; Modify `src/app/(tabs)/_layout.tsx`, and replace the 6 duplicated configs in `src/app/(tabs)/{index,history,camera}.tsx`, `src/app/review.tsx`, `src/components/{MealDetailModal,MealItemCard}.tsx`

**Interfaces:**
- Produces: `MEAL_TYPES: ReadonlyArray<{ type: MealType; label: 'Breakfast'|'Lunch'|'Dinner'|'Snack'; icon: keyof typeof Ionicons.glyphMap }>` and `mealTypeLabel(type: MealType): string`.

- [ ] **Step 1: Failing test:** labels are exactly `Breakfast, Lunch, Dinner, Snack` in that order; `mealTypeLabel('snack') === 'Snack'`.
- [ ] **Step 2–4:** FAIL → implement → replace all 6 configs → PASS; `grep -rn "Pounce\|Prowl\|Hunt\|Paws & Treats" src` returns nothing outside Sia lines.
- [ ] **Step 5:** Tab bar: order Today · History · Snap · Water · Me (`index, history, camera, water, profile`), background `pointDeep`, labels `pointMuted`/`pointText`, Snap = raised 56 px `shutter` circle with cream ring and `shutterGlyph` icon; remove the hand-drawn "telemetry" tab icons in favour of Ionicons.
- [ ] **Step 6:** Visual check (web 375); commit `feat: Colorpoint tab bar and plain meal labels`.

### Task 10: Today screen

**Files:** Modify `src/app/(tabs)/index.tsx`, `src/components/MacroCard.tsx`, `src/components/MealItemCard.tsx`

- [ ] **Step 1:** Restyle to spec §8 Today: date + "Hi {name}" (name from `buildCoachContext().displayName`), hero `point` card (eaten big in Outfit tabular, "of X kcal · Y left", leaf bar, three macro bars with on-point colours), meals grouped by `MEAL_TYPES` with "Log again", "N-day streak" (from Task 6), quick water kept.
- [ ] **Step 2:** Remove `FelineHunterRankBadge`, `FelineMilestoneCelebrationModal`, `SiaNextCatchCard` theming (keep the suggestion feature with plain copy), any Sia instance (perch covers it); skeletons for initial load; empty state with a static `<Sia expression="sleepy" size={96}/>` and "Nothing logged yet."
- [ ] **Step 3:** Verify: `tsc`, `jest`, web screenshots 375/768/1280 vs `docking-v6.html` option B; logging a meal still updates totals and Sia says the line.
- [ ] **Step 4:** Commit `feat: restyle Today in Colorpoint`.

### Task 11: Camera + Review

**Files:** Modify `src/app/(tabs)/camera.tsx`, `src/app/review.tsx`, `src/components/TextLogModal.tsx`

- [ ] **Step 1:** Scan flow per spec §6.3: while analysing show `<Sia expression="thinking" size={96}/>` + "Looking at your plate…"; on success show `loves` + "Ooh, {meal name}!" (≤ 60 chars) for ~800 ms then open Review; not-food error shows `puzzled` + "Hmm, that's not on the menu. Try your plate?"; barcode unreadable → `puzzled`. Replace `SiaContextualLoader`/`SiaMascotHero`; no perch on Camera; Snap button `shutter`.
- [ ] **Step 2:** Review + TextLogModal restyle (photo, name, editable macros, existing estimate disclaimer, one primary Save); plain labels via `MEAL_TYPES`.
- [ ] **Step 3:** Verify on web: text log → thinking → review; a non-food error path; `tsc`/`jest`. Commit `feat: honest Sia scan flow and restyled review`.

### Task 12: History + Water

**Files:** Modify `src/app/(tabs)/history.tsx`, `src/app/(tabs)/water.tsx`, `src/components/WeeklyAdherenceChart.tsx`

- [ ] **Step 1:** History: week strip, day totals in a small `point` card, meal list, empty state ("Nothing logged on {day}."), bottom padding for the perch.
- [ ] **Step 2:** Water: `AnimatedProgressRing` in point colours, quick-add buttons, plain copy; water goal crossing emits `waterGoalReached`.
- [ ] **Step 3:** Verify (web 375/768/1280, `tsc`, `jest`); commit `feat: restyle History and Water`.

### Task 13: Me (profile)

**Files:** Modify `src/app/(tabs)/profile.tsx`, `src/utils/felineGamification.ts` (delete tier data)

- [ ] **Step 1:** Remove the 5-cat avatar picker and `FelineHunterRankBadge`; avatar = initials (existing `cat_*` values fall back to initials). Sections: profile, targets, weight, "Show Sia" switch (`useSiaStore().setHidden`), Privacy Policy, Sign out, Delete account — all existing behaviour kept.
- [ ] **Step 2:** Verify: toggling "Show Sia" hides the perch and its reserved space on all tabs and survives an app reload; `tsc`/`jest`. Commit `feat: restyle Me with a Show Sia setting`.

### Task 14: Coach modal

**Files:** Modify `src/components/AiNutritionCoachModal.tsx`

- [ ] **Step 1:** Header: animated `<Sia size={48}>` = `thinking` from send until the first streamed words, then `resting`. Message avatars: `<Sia expression="happy" size={28}/>` (simplified, static). Remove "Sia is thinking" dots row (header Sia carries it) — keep the streaming bubble. Restyle in tokens; keep disclaimer and streaming behaviour.
- [ ] **Step 2:** Verify: a long chat renders only one animated Sia (header); `tsc`/`jest`. Commit `feat: restyle the coach around Sia`.

### Task 15: Auth + onboarding

**Files:** Modify `src/app/(auth)/{login,register,onboarding}.tsx`; delete `src/components/BrandLogo.tsx` usage of the mascot (wordmark only)

- [ ] **Step 1:** Login/register: one `<Sia expression="happy" size={96}/>` + "SiaMeal Snap" wordmark, plain copy, token styling; no other Sia. Onboarding: one Sia per step mapped `scanning→thinking`, `walking→resting`, `celebrating→celebrating`, others → `resting`; summary step keeps the health disclaimer.
- [ ] **Step 2:** Verify on web at 375: register → onboarding → Today; `tsc`/`jest`. Commit `feat: restyle sign-in and onboarding`.

### Task 16: Copy sweep, removals, final verification

**Files:** Delete `src/components/feline/**`, `src/components/{SiaCatMascot,FelineEmptyState,FelineHunterRankBadge,FelineMilestoneCelebrationModal}.tsx`, `assets/lottie/**`, `scripts/generate-sia-lottie.js`, unused `assets/images/mascot-*`, `logo-glow.png`, `logo.jpg`; Modify `package.json` (remove `lottie-react-native`, `@lottiefiles/dotlottie-react`), `src/services/notificationService.ts`, toasts/errors with puns, `tailwind.config.js` (drop old keys).

- [ ] **Step 1:** Before deleting each file, `grep` confirms no imports remain; delete; `npx expo install --fix`. In `src/app/_layout.tsx`, load only the Outfit / Plus Jakarta Sans weights still referenced (`grep -rhoE "Outfit_[0-9]+\w+|PlusJakartaSans_[0-9]+\w+" src | sort -u`).
- [ ] **Step 2:** Copy sweep: `grep -rniE "athlete|pounce|prowl|hunter|pride|catch" src` → only Sia lines/coach persona remain; notifications and errors follow plain-word rules.
- [ ] **Step 3:** Raw-colour check: `grep -rnE "#[0-9a-fA-F]{6}" src/app src/components | grep -v "src/components/sia/siaArt.ts"` → none.
- [ ] **Step 4: Measure:** `npx expo export --platform android` and `--platform ios`; record Hermes bundle + assets (iOS baseline 5.88 MB / 3.56 MB; expect ~2 MB JS drop).
- [ ] **Step 5: Full verification:** `npx tsc --noEmit`, `npx jest`, `npm run test:sql`, `npx expo-doctor`; web screenshots of every screen at 375/768/1280; screen-reader pass (perch = one button, decorative Sias silent); reduced-motion pass; regression: log a meal, scan, coach streaming, account deletion.
- [ ] **Step 6:** Commit `chore: remove the old mascot system and Lottie`; summarise results, remaining risks, and the user's to-dos (re-run `schema.sql`, redeploy nothing else, real-device check).
