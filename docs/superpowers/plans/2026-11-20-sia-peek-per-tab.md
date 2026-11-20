# Sia Peek Per Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sia pops up in a different place on each tab. On History she peeks over the day card, on
Water over the ring card, and on Me she perches on the tab bar above Me. This replaces the in-screen
Sias from the previous plan.

**Architecture:**
- **History and Water:** reuse `SiaPeek` with its `reaction` prop. Each screen derives a
  `SiaReaction` from the existing mood functions plus two new spot helpers. Water's timing lives in a
  small tested hook.
- **Me:** restore the perch from commit `6332093` and scope it to the Me route, with `meLine` in its
  bubble.

**Tech Stack:** Expo SDK 58, RN 0.88, Reanimated 4, Zustand, Jest + RNTL 14.

**Spec:** `docs/superpowers/specs/2026-11-20-sia-peek-per-tab-design.md`

## Global Constraints
- **Pressables:** every pressable is `Tap`, or a `Pressable` with no function-style `style`. No
  conditional `active:` or `focus:` classes; the guard tests enforce both.
- **Theme:** use theme tokens. Animate only transform and opacity, and respect reduced motion.
  `SiaPeek` already does both.
- **One Sia per screen:** "Show Sia" off hides her and leaves no gap. Tapping her opens the coach.
- **Testing:** RNTL 14 `render`, `rerender` and `fireEvent` must be awaited. Mock
  `../../lib/supabase` in component tests.
- **Never commit:** `src/app/sia-preview.tsx` and `.playwright-mcp/`.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Water's clock refresh doesn't re-trigger the duck.** A new reaction object is created only when
   the expression or spot changes. The test is in Task 2.
2. **Picking the same mood on another day still replays.** History's reaction is keyed by the
   selected date. This is covered in Task 3 by the memo dependencies.
3. **The perch shows only on Me.** It must not appear on History, Water, Today or the camera. The
   test is in Task 4.
4. **"Show Sia" off:** no peek spacing on History or Water, and no perch. The tests are in Tasks 3
   and 4.
5. **Two adds within 1.5 s:** she stays pleased until 1.5 s after the last add, then returns to her
   mood. The test is in Task 2.

---

### Task 1: Spot helpers
**Files:** modify `src/features/sia/tabMoods.ts` and `src/features/sia/__tests__/tabMoods.test.ts`.
**Produces:**
- `daySpot(index: number): SiaSpot`: 0–1 is `left`, 2–4 is `center`, 5–6 is `right`.
- `nextSpot(prev: SiaSpot): SiaSpot`: cycles `left`, `center`, `right`, then back to `left`.

- [ ] **Tests:** `daySpot` returns `[left, left, center, center, center, right, right]` for 0..6, and
  `center` for -1. `nextSpot('left')` is `'center'`, `('center')` is `'right'`, `('right')` is
  `'left'`. Run them and confirm they fail.
- [ ] **Implement,** run the tests and confirm they pass, then commit:
  `feat(sia): spot helpers for History and Water`.

### Task 2: `useWaterReaction` hook
**Files:** create `src/features/water/useWaterReaction.ts` and
`src/features/water/__tests__/useWaterReaction.test.ts`.
**Produces:** `useWaterReaction(ml: number, goal: number, addedAt: number): SiaReaction`.
- **Mood:** `waterMood(ml, goal, now)`, with `now` refreshed every 60 s, on `AppState` `active`,
  and on each add.
- **After an add:** with `addedAt` non-zero, `{ expression: 'loves', spot: nextSpot(prev) }` for
  1500 ms, then back to the mood at that spot.
- **Goal:** `ml >= goal` gives `celebrating` at `center` immediately, with no pleased step.
- **One object per state:** the returned object is memoised on `[expression, spot]`.

- [ ] **Tests** (`renderHook`, fake timers, system time 2026-11-20 14:30). Run them and confirm they
  fail.
  1. `(300, 2500, 0)` gives `concerned` at `center`.
  2. Advancing 60 s with the same inputs returns the *same object* (`toBe`).
  3. Re-rendering with `addedAt=Date.now()` and `ml=550` gives `loves` with `spot` not equal to
     `center`. After 1500 ms it gives `resting` at that same spot.
  4. Two adds 1 s apart are still `loves` 1 s after the second, and back 1.5 s after it.
  5. `(2200→2700)` with an add gives `celebrating` at `center`.
  6. At 08:30 with 0 ml it is `sleepy`. Setting the time to 16:00 and advancing 60 s gives
     `concerned`.
- [ ] **Implement,** run the tests and confirm they pass, then commit:
  `feat(water): Sia's reaction for the water card`.

### Task 3: History and Water peek over their cards; remove the in-screen Sias
**Files:**
- **Modify:** `src/app/(tabs)/history.tsx`, `src/app/(tabs)/water.tsx` and
  `src/app/__tests__/history.test.tsx`.
- **Delete:** `src/features/history/StripSia.tsx`, `src/features/water/WaterSia.tsx`, their
  `__tests__`, and `src/features/sia/hop.ts` if unused.

- [ ] **History.** Remove `StripSia`. Wrap `DailyMacroSummary` the way Today does: a `View` with
  `heroWithSia` spacing (`marginTop: PEEK_SIZE - PEEK_SHOWN_Y + space[1]`) unless hidden, containing
  `<SiaPeek reaction={dayReaction} />`.
  - `dayReaction` is `useMemo` over `[selectedDate, mood.expression, index]`, returning
    `{ expression: dayMood(cal, target, when).expression, line: null, spot: daySpot(index) }`.
  - `when` comes from `selectedDate` versus `getTodayString()`.
- [ ] **Water.** Remove `WaterSia` and `heroWrap`. Wrap the hero the same way with
  `<SiaPeek reaction={useWaterReaction(todayMl, goal, addedAt)} />`.
- [ ] **History test:** an empty day still shows exactly one `sia` (now the peek), and none with
  "Show Sia" off. Run `npx jest src/app/__tests__/history src/features` and `npx tsc --noEmit`.
- [ ] **Commit:** `feat(history, water): Sia peeks over the day card and the water card`.

### Task 4: Me — the perch, only on Me
**Files:**
- **Restore from `6332093`:** `src/features/sia/SiaPerch.tsx` and `src/features/sia/SiaTabBar.tsx`.
- **Modify:** `src/app/(tabs)/_layout.tsx` (the `tabBar` prop and mount) and
  `src/app/(tabs)/profile.tsx`.
- **Delete:** `src/features/me/SiaCompanionRow.tsx` and its test.
- **Test:** `src/features/sia/__tests__/SiaPerch.test.tsx`.

- [ ] **Tests** (mock `expo-router`'s `useSegments`). Run them and confirm they fail.
  - It renders "Chat with Sia" for `['(tabs)','profile']`, and nothing for `['(tabs)','history']`,
    `['(tabs)','water']`, `['(tabs)']` or `['(tabs)','camera']`.
  - It shows the `meLine` bubble, e.g. "12 days in a row" with streak 12.
  - It renders nothing when hidden.
- [ ] **Perch.** Show it only when `segments.includes('profile')`. The bubble text is
  `meLine({ weightKg, targetWeightKg, streak })` from the auth, weight and streak stores. It shows
  for 5 s on mount and whenever the line changes. The face is `current?.expression ?? 'resting'`.
- [ ] **Me screen.** Remove `SiaCompanionRow` and the `profileCard` wrapper, and restore the
  original `person` card style from `6332093`.
- [ ] **Verify:** run `npx tsc --noEmit` and `npx jest` (all), then commit:
  `feat(me): Sia perches on the tab bar above Me`.

### Task 5: Check
- [ ] Web preview screenshots of History, Water and Me at 375 and 768. Verify the spots, the
  "Show Sia" toggle, and that no Sia covers a tab icon.
- [ ] Ask the user for an Android phone check.
- [ ] Final whole-branch review (executing-plans) and fix pass.
