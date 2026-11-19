# Today: camera-eye ring + Sia peek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Today read as Sia's app: the calorie ring drawn as her shutter eye, and Sia peeking over the hero card, ducking and rising at the spot where the news is.

**Architecture:** Reactions gain a `spot`; a new `SiaPeek` (features/sia) listens to `useSiaStore.current` and runs a JS-sequenced Reanimated duck → swap → rise; the perch hides on Today. The hero card is rebuilt around a new `CalorieEyeRing`; Sia's line moves under the greeting (`SiaSays`).

**Tech Stack:** Expo SDK 58, React Native 0.88, Reanimated 4, react-native-svg 15, zustand 5, Jest + RNTL 14.

**Spec:** `docs/superpowers/specs/2026-11-19-today-sia-peek-design.md` (amends `2026-11-18-sia-colorpoint-redesign-design.md`)

## Global Constraints

- One animated Sia per screen; on Today she is in `SiaPeek`, never also on the perch.
- Animate only transform, opacity and SVG animated props; ease-out `[0.2, 0.8, 0.2, 1]` to enter, ease-in to exit.
- Reduced motion: no movement, fades only; no breath, no hops.
- No raw hex in `src/app/**` or `src/components/**` (tokens in `src/theme/palette.js`).
- Text ≥ 12 pt, touch targets ≥ 44 × 44, text contrast 4.5:1, UI 3:1.
- Every task ends with `npx tsc --noEmit` clean and `npx jest` green; commits end with the Co-Authored-By trailer.

## Review Focus

- Two reactions in a row (meal over budget + protein goal) must each duck/rise in order, never interleave (Task 3: busy guard + queued target).
- A reaction arriving before the card has been measured (width 0) must not place Sia off-card (Task 3: `peekX` clamps).
- Sia hidden via "Show Sia" off: no peek, line still shows the status (Task 3/4).
- Reaction with `spot` undefined (pet) keeps her current spot (Task 1 test + Task 3).
- Over target: ring amber and "N over today" (Task 2 test).

---

### Task 1: Reaction spots + hide perch on Today

**Files:** Modify `src/features/sia/siaReactions.ts`, `src/features/sia/SiaPerch.tsx`; Test `src/features/sia/__tests__/siaReactions.test.ts`, `src/features/sia/__tests__/siaRoutes.test.ts`; Create `src/features/sia/siaRoutes.ts`

**Interfaces:** Produces `type SiaSpot = 'left' | 'center' | 'right'`; `SiaReaction.spot?: SiaSpot`; `isTodayRoute(segments: string[]): boolean`.

- [ ] Tests: mealLogged happy → `spot: 'left'`; overBudget concerned → `'left'`; proteinGoal celebrating → `'right'`; streak, water, appOpened → `'center'`; `isTodayRoute(['(tabs)'])` and `(['(tabs)','index'])` true, `(['(tabs)','history'])` false.
- [ ] Run → FAIL. Implement. Perch returns null when `isTodayRoute(segments)`. Run → PASS. Commit `feat: give Sia's reactions a spot and keep the perch off Today`.

### Task 2: Camera-eye ring hero card

**Files:** Create `src/components/CalorieEyeRing.tsx`, `src/hooks/useCountUp.ts`; Modify `src/components/MacroCard.tsx`, `src/theme/palette.js`, `src/theme/index.ts`, `src/theme/__tests__/contrast.test.ts`; Test `src/components/__tests__/MacroCard.test.tsx`

**Interfaces:** `CalorieEyeRing({ eaten: number; target: number; fraction: number; over: boolean; size?: number })` (default 120); `useCountUp(value: number, durationMs: number): number`; palette `eye: '#22E592'` (contrast vs `pointTrack` ≥ 3).

- [ ] Tests: `DailyMacroSummary` with 1240/2000 shows "1,240", "of 2,000", "760 left" and "Protein · 75 / 150 g"; with 2350/2000 shows "350 over"; contrast pair `eye` on `pointTrack` ≥ 3.
- [ ] Run → FAIL. Implement: ring = track circle r 50 stroke 12 + `AnimatedCircle` `strokeDashoffset` (C·(1−fraction), 650 ms ease-out, 0 under reduced motion), arc `eye` or `carbs` when over, six blade ticks in `point` at 0/60/…/300°. Card: row(ring | macros column), then "{N} left today"/"{N} over today". `useCountUp` rAF ease-out cubic, instant under reduced motion. Run → PASS. Commit `feat: draw the calorie ring as Sia's camera eye`.

### Task 3: SiaPeek

**Files:** Create `src/features/sia/SiaPeek.tsx`, `src/features/sia/peekMotion.ts`; Test `src/features/sia/__tests__/peekMotion.test.ts`, `src/features/sia/__tests__/SiaPeek.test.tsx`

**Interfaces:** Consumes `SiaSpot`, `useSiaStore`. Produces `PEEK_SIZE = 84`, `PEEK_STRIP = 90`, `peekX(spot: SiaSpot, width: number): number` (left 8, centre (w−84)/2, right w−92, clamped ≥ 0), `PEEK_LEAN = { left: 4, center: 0, right: -4 }`, `<SiaPeek />` (absolute, sits above its parent's top edge; parent is the card wrapper).

- [ ] Tests: `peekX('left',320)=8`, `('center',320)=118`, `('right',320)=228`, `('right',0)=0`; render `SiaPeek` → `getByLabelText('Chat with Sia')`, press → `openCoach` called; `hidden: true` → renders nothing.
- [ ] Run → FAIL. Implement: strip `overflow:hidden`, height 90, `bottom: '100%'`; Sia 84 px, `ty` shown 14 / hidden 96; on `current` change (object identity) with `spot` defined and different-or-same: duck 280 ms ease-in (paws fade/drop 200 ms after 60 ms), then set displayed expression + x (immediately), wait 90 ms, rise 460 ms ease-out with keyframes (−7 px, lean) → rest; paws back after 170 ms; celebrating adds hops (−12, 0, −5, 0 over 760 ms); appOpened (`spot:'center'` + sleepy/happy on first open) rises over 900 ms. `spot` undefined → expression only + 4 px nod. Busy → remember latest target and run it after. Breath: inner scaleY 1→1.015, 1800 ms alternate, off under reduced motion. Reduced motion: opacity out 200 → swap → in 200. Tap → `openCoach`; long-press → purr + `pet()`. Run → PASS. Commit `feat: Sia peeks over the Today card and pops up where the news is`.

### Task 4: Wire Today

**Files:** Modify `src/app/(tabs)/index.tsx`, `src/components/MealItemCard.tsx`, `src/utils/todaySummary.ts`, `src/utils/__tests__/todaySummary.test.ts`; Create `src/features/sia/SiaSays.tsx`

**Interfaces:** `siaStatusLine(s: CalorieSummary): string` → "760 left — plenty of room." / "350 over today. That's okay." / "2,000 to go — let's start." when eaten 0; `<SiaSays summary={CalorieSummary} />` (line = current line else status, "Sia:" prefix, cross-fade 160/220 ms, `accessibilityLiveRegion="polite"`).

- [ ] Tests for `siaStatusLine` (three cases above).
- [ ] Run → FAIL. Implement; Today renders `SiaSays` under the greeting, wraps the hero in a `View` with `marginTop: 74` containing `<SiaPeek />`; `MealItemCard` without photo shows `<Sia expression="resting" size={36} />`. Run tsc + jest → PASS; web screenshots 375/1280 with sample data; commit `feat: Sia's line under the greeting and peeking on Today`.
