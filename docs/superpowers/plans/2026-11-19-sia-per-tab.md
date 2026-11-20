# Sia Per Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed tab-bar Sia with a per-tab role. On History she is the reviewer (she hops
along the week strip), on Water the drinker (beside the ring, reacting to your pace), and on Me the
companion (a portrait with one progress line).

**Architecture:** Three pure functions in `src/features/sia/tabMoods.ts` decide her face and words
from each screen's own numbers. Three small presentational components display them, one per screen.
The global `SiaPerchOverlay` is unmounted and deleted, so only one Sia is ever on screen.

**Tech Stack:** Expo SDK 58, React Native 0.88, Reanimated 4, Zustand, Jest + React Native Testing
Library 14.

**Spec:** `docs/superpowers/specs/2026-11-19-sia-per-tab-design.md`

## Global Constraints

- Read the Expo v58 docs (AGENTS.md) before touching anything not covered here.
- Every pressable is `Tap` (`src/components/Tap.tsx`), never `Pressable` with a function `style`.
  No conditional `active:/focus:/hover:` classes. Both are enforced by
  `src/__tests__/nativewindClassNames.test.ts`.
- Colours, spacing, radii and durations come from `src/theme` (`palette`, `space`, `radius`,
  `motion`).
- Animate only `transform` and `opacity`. Reserve Sia's height in the layout so nothing shifts.
- Respect reduced motion via Reanimated's `useReducedMotion()`: no hop or slide, she jumps.
- "Show Sia" off (`useSiaStore((s) => s.hidden)`) hides her on all three tabs and leaves no gap.
- Tapping her opens the coach: `useCoachStore((s) => s.openCoach)()`.
- Jest with RNTL 14: `render` and `fireEvent` are async and must be awaited. Mock
  `../../lib/supabase` in component tests. Wrap in `SafeAreaProvider initialMetrics` if insets
  are used.
- Never commit `src/app/sia-preview.tsx` or `.playwright-mcp/`.
- Each commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A future day is selected in the current week:** she rests ("Not here yet"), not sleepy. The
   test is in Task 1.
2. **The calorie or water target is 0 or missing (a fresh profile):** no NaN or Infinity, she rests.
   The test is in Task 1.
3. **Rapid taps on several days:** she ends above the last day tapped, never stuck mid-hop. Each
   tap cancels the running animation. The test is in Task 3, asserting the final target x.
4. **The strip's width changes (rotation, larger font):** her x is recomputed from the latest
   `onLayout` width. The test is in Task 1 (`stripSiaX` with two widths).
5. **Water near the pace window's edges (before 07:00, after 22:00) and after a goal change:** the
   pace is clamped to 0…target. The test is in Task 1.

---

### Task 1: Mood logic

**Files:**
- Create: `src/features/sia/tabMoods.ts`
- Test: `src/features/sia/__tests__/tabMoods.test.ts`

**Interfaces:**
- Produces:
  - `type TabMood = { expression: SiaExpression; label: string }`
  - `dayMood(calories: number, target: number, when: 'past' | 'today' | 'future'): TabMood`
  - `waterMood(ml: number, target: number, now: Date): TabMood`
  - `meLine(input: { weightKg?: number | null; targetWeightKg?: number | null; streak?: number | null }): string`
  - `stripSiaX(index: number, stripWidth: number, siaSize: number, count?: number /*7*/, gap?: number /*space[1]*/): number`

- [ ] **Step 1: Write the failing tests**, with these exact cases:
  - **`dayMood`:**
    - `(0, 2000, 'past')` → `{ expression: 'sleepy', label: 'Nothing logged this day' }`
    - `(500, 2000, 'today')` → `{ expression: 'resting', label: 'Today is still going' }`
    - `(0, 2000, 'future')` → `{ expression: 'resting', label: 'Not here yet' }`
    - `(1900, 2000, 'past')` → `happy`, `'Right on target'`. Also `(2200, 2000, 'past')`, since
      the band is inclusive.
    - `(1500, 2000, 'past')` → `resting`, `'A light day'`
    - `(2300, 2000, 'past')` → `concerned`, `'Over target'`
    - `(1200, 0, 'past')` → `resting`, `'1200 kcal logged'`
  - **`waterMood`**, with `const at = (h, m = 0) => new Date(2026, 10, 20, h, m)`:
    - `(2500, 2500, at(15))` → `celebrating`, `'Water goal reached'`
    - `(0, 2500, at(8))` → `sleepy`, `'Morning, nothing yet'`
    - `(0, 2500, at(6))` → `resting`, `'Ready when you are'`. The pace is 0 before 07:00.
    - `(1300, 2500, at(14, 30))` → `happy`, `'On pace'`. The pace is 1250, so this is ≥ 0.8.
    - `(700, 2500, at(14, 30))` → `resting`, `'A little behind'`. This is between 0.4 and 0.8.
    - `(300, 2500, at(14, 30))` → `concerned`, `'Thirsty — a glass would help'`. This is under
      0.4, at or after 10:00.
    - `(200, 2500, at(9, 30))` → `resting`, `'A little behind'`. This is under 0.4, but before
      10:00.
    - `(2000, 2500, at(23))` → `resting`, `'A little behind'`. The pace is clamped to the target.
    - `(500, 0, at(12))` → `resting`, `'Ready when you are'`
  - **`meLine`:**
    - `{ weightKg: 77.1, targetWeightKg: 75 }` → `'2.1 kg to your goal weight'`
    - `{ weightKg: 75.04, targetWeightKg: 75 }` → `"You've reached your goal weight"`
    - `{ streak: 12 }` → `'12 days in a row'`
    - `{ streak: 1 }` → `"Snap a meal and I'll start counting."`
    - `{ weightKg: 77, targetWeightKg: 75, streak: 12 }` → `'2.0 kg to your goal weight'`. Goal
      weight comes first.
  - **`stripSiaX`:**
    - `(0, 343, 56)` → `0`. It is clamped at the left edge.
    - `(6, 343, 56)` → `343 - 56`. It is clamped at the right edge.
    - `(3, 343, 56)` → `Math.round(3 * (cell + 4) + cell / 2 - 28)`, where `cell = (343 - 24) / 7`.
    - `(3, 600, 56)` → a different, larger value. It is recomputed for a new width.
    - `(2, 0, 56)` → `0`, because the strip is not measured yet.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `npx jest src/features/sia/__tests__/tabMoods`.
  Expected: FAIL, "Cannot find module '../tabMoods'".
- [ ] **Step 3: Implement `tabMoods.ts`.**
  - **`dayMood`:** the band is `0.9 ≤ calories / target ≤ 1.1`.
  - **`waterMood`:** the pace is
    `target * clamp((minutesSince07:00) / (15 * 60), 0, 1)`. Check the cases in this order:
    1. The goal is reached.
    2. Before 09:00 with 0 ml.
    3. The pace is 0 or less.
    4. The ratio bands.
  - **`meLine`:** the gap is `Math.abs(w - t)`, shown with `toFixed(1)`. A gap under 0.1 counts as
    "reached".
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `npx jest src/features/sia/__tests__/tabMoods`.
  Expected: all pass.
- [ ] **Step 5: Commit.** `feat(sia): mood rules for History, Water and Me`

### Task 2: Remove the tab-bar perch

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx` (lines 9 and 104)
- Delete: `src/features/sia/SiaPerch.tsx`
- Modify, only if no other reader remains: `src/features/sia/SiaTabBar.tsx` (`useTabBarHeight`)

**Interfaces:**
- Consumes: none.
- Produces: no global Sia on the tabs. `SiaPaws` stays, because `SiaPeek` uses it.

- [ ] **Step 1: Remove the import and `<SiaPerchOverlay />`** from `(tabs)/_layout.tsx`, then delete
  `SiaPerch.tsx`.
- [ ] **Step 2: Check `useTabBarHeight`.**
  Run: `grep -rn "useTabBarHeight\|PERCH_" src --include=*.ts --include=*.tsx`.
  If only `SiaTabBar.tsx` (the setter) is left, remove the store and its setter call.
- [ ] **Step 3: Verify.**
  Run: `npx tsc --noEmit && npx jest`.
  Expected: exit 0 and all tests pass.
- [ ] **Step 4: Commit.** `refactor(sia): retire the tab-bar perch`

### Task 3: History — StripSia

**Files:**
- Create: `src/features/history/StripSia.tsx`
- Modify: `src/app/(tabs)/history.tsx` (around line 181, above `<WeekStrip …>`)
- Test: `src/features/history/__tests__/StripSia.test.tsx`

**Interfaces:**
- Consumes: `dayMood` and `stripSiaX` (Task 1), and `StripDay` (`WeekStrip.tsx`).
- Produces:
  `StripSia({ days: StripDay[]; selected: string; target: number; today: string }): JSX.Element | null`.
  `today` is a `YYYY-MM-DD` string from `getTodayString()`.

- [ ] **Step 1: Write the failing tests.**
  - It renders a button labelled `Sia: Over target` for a selected past day of 2300 kcal against
    a 2000 target. `when` is computed by comparing `selected` with `today`.
  - It renders nothing when `useSiaStore.setState({ hidden: true })`.
  - Pressing it calls `openCoach`. Spy on `useCoachStore.getState().openCoach`, or set a jest.fn
    in state.
  - After `onLayout` (width 343), re-rendering with three different `selected` values in a row
    puts `testID="strip-sia"`'s target at `stripSiaX(lastIndex, 343, 56)`. Expose the target via
    `accessibilityValue={{ now: x }}`, or a `testID` prop the test can read.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `npx jest src/features/history/__tests__/StripSia`.
  Expected: FAIL, module not found.
- [ ] **Step 3: Implement.**
  - **Layout:** a wrapper `View` with `height: 56` and `onLayout` that stores the width. Sia
    (`size={56}`) sits inside an `Animated.View`.
  - **Moving:** `translateX` uses `withTiming(x, { duration: motion.base, easing: Easing.bezier(...motion.easeOut) })`.
    `translateY` hops with `withSequence(withTiming(-10, { duration: motion.base / 2 }), withTiming(0, { duration: motion.base / 2 }))`.
    Calling `.set` cancels the running animation.
  - **Reduced motion:** with `useReducedMotion()` true, set x directly and skip the hop.
  - **Tap:** wrap her in `Tap` with `accessibilityRole="button"` and
    `accessibilityLabel={\`Sia: ${mood.label}\`}`. Tapping calls `openCoach`.
  - **History screen:** render `<StripSia days={stripDays} selected={selectedDate} target={targetCalories} today={getTodayString()} />`
    directly above `<WeekStrip …>`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `npx jest src/features/history && npx tsc --noEmit`.
  Expected: pass, exit 0.
- [ ] **Step 5: Commit.** `feat(history): Sia hops to the day you pick and shows how it went`

### Task 4: Water — WaterSia

**Files:**
- Create: `src/features/water/WaterSia.tsx`
- Modify: `src/app/(tabs)/water.tsx` (the `add` function at line 54, and inside `styles.hero` at
  line 130)
- Test: `src/features/water/__tests__/WaterSia.test.tsx`

**Interfaces:**
- Consumes: `waterMood` (Task 1).
- Produces: `WaterSia({ ml: number; goal: number; addedAt: number }): JSX.Element | null`.
  `addedAt` is a `Date.now()` value; it is 0 until the first add.

- [ ] **Step 1: Write the failing tests.** Use `jest.useFakeTimers()` with the system time set to
  2026-11-20 14:30.
  - With `ml=300, goal=2500`, the label is `Sia: Thirsty — a glass would help`.
  - After re-rendering with a new `addedAt`, the label is `Sia: Nice, keep going`, which is the
    `loves` state.
  - After `jest.advanceTimersByTime(1500)`, the label goes back to the mood label.
  - It renders nothing when Sia is hidden.
  - Pressing it calls `openCoach`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `npx jest src/features/water/__tests__/WaterSia`.
  Expected: FAIL, module not found.
- [ ] **Step 3: Implement.**
  - **Mood:** `waterMood(ml, goal, new Date())` at render.
  - **After an add:** when `addedAt` changes and is not 0, show `loves` for 1500 ms with the
    Task 3 hop (the hop is skipped under reduced motion), then return to the mood.
  - **Placement:** size 64, absolutely positioned at the top-right of `styles.hero` (inset
    `space[3]`) so it never covers the ring's centre. The hero already has room for it; add
    `paddingRight` only if a 375 px screenshot shows overlap.
  - **Water screen:** add `const [addedAt, setAddedAt] = useState(0)`, call `setAddedAt(Date.now())`
    at the end of `add`, then render
    `<WaterSia ml={todayMl} goal={goal} addedAt={addedAt} />` inside the hero.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `npx jest src/features/water && npx tsc --noEmit`.
  Expected: pass, exit 0.
- [ ] **Step 5: Commit.** `feat(water): Sia drinks along with you`

### Task 5: Me — SiaCompanionRow

**Files:**
- Create: `src/features/me/SiaCompanionRow.tsx`
- Modify: `src/app/(tabs)/profile.tsx` (inside the profile card, directly under the `person`
  `Tap` that ends near line 299)
- Test: `src/features/me/__tests__/SiaCompanionRow.test.tsx`

**Interfaces:**
- Consumes: `meLine` (Task 1).
- Produces:
  `SiaCompanionRow({ weightKg?: number | null; targetWeightKg?: number | null; streak?: number | null }): JSX.Element | null`.

**Ruling (deviation from the spec's "beside your initials, line under your name"):** the
name row is already a `Tap` that opens the name sheet, and nesting a second tap target inside
it breaks accessibility and touch handling. So she gets her own full-width `Tap` row directly
beneath it, inside the same card. It costs if wrong: one extra row of height on Me.

- [ ] **Step 1: Write the failing tests.**
  - It shows `2.1 kg to your goal weight` for `weightKg 77.1, targetWeightKg 75`.
  - Its button label is `Sia: 2.1 kg to your goal weight. Opens the coach`. Pressing it calls
    `openCoach`.
  - It renders nothing when Sia is hidden.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `npx jest src/features/me/__tests__/SiaCompanionRow`.
  Expected: FAIL, module not found.
- [ ] **Step 3: Implement.**
  - **Row:** a `Tap` row with `minHeight: 64`, `gap: space[3]`, and a hairline `palette.line` top
    border. It contains `<Sia expression="resting" size={56} />` and the line in `type.bodySemibold`
    / `type.size.secondary` / `palette.text`.
  - **Me screen:** pass `weightKg={latestWeight}` (defined at line 269),
    `targetWeightKg={profile?.target_weight_kg}` and
    `streak={useStreakStore((s) => s.streak)}`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `npx jest src/features/me && npx tsc --noEmit`.
  Expected: pass, exit 0.
- [ ] **Step 5: Commit.** `feat(me): Sia as a companion with one progress line`

### Task 6: Visual check and phone check

**Files:**
- Modify, untracked and never committed: `src/app/sia-preview.tsx`. Remove the perch harness lines
  that were added on 2026-11-19.

- [ ] **Step 1: Run the full suite.**
  Run: `npx tsc --noEmit && npx jest`.
  Expected: exit 0 and every suite passes.
- [ ] **Step 2: Take web screenshots.** Use the preview route `?screen=history|water|me` at 375 px
  and 768 px.
  - **History:** select a goal day, an over day and an empty day.
  - **Water:** check at least two moods.
  - Read every screenshot and fix any overlap with the ring, strip or card before going on.
- [ ] **Step 3: Ask the user to check on their Android phone (Expo Go).**
  - On History, tap days quickly: she should land on the last one.
  - On Water, add water: she should hop.
  - On Me, check the line.
  - Turn Show Sia off and on.
  - Check that nothing sits over the tab bar.
- [ ] **Step 4: Run the final whole-branch review** (the executing-plans "Final Review" section),
  then report.
