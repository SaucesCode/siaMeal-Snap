# Welcome + onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cream welcome + sign-in and a one-question-per-screen onboarding that also learns name, goal weight, foods to avoid and meal times.

**Architecture:** Pure onboarding logic in `src/features/onboarding/flow.ts` (which steps show, weeks to goal, validation); screens rebuilt on the Colorpoint tokens; new profile columns in `supabase/schema.sql`; reminders scheduled from meal times; coach context carries foods to avoid.

**Tech Stack:** Expo SDK 58, expo-router, Supabase (Postgres + Edge Functions/Deno), expo-notifications, Jest + RNTL 14, PGlite SQL tests.

**Spec:** `docs/superpowers/specs/2026-11-19-welcome-onboarding-design.md`

## Global Constraints
- `<Tap>` only (no function style on `<Pressable>`); tokens only; text ≥ 12 pt; targets ≥ 44 pt; plain words.
- Inline validation next to fields; never lose typed input; no Alert for validation.
- New columns are optional for the app (older databases keep working).
- Every task: `npx tsc --noEmit`, `npx jest` green (plus `npm run test:sql` / `npx deno test` where touched).

## Review Focus
- Google sign-up already has a name → name step skipped; email sign-up → shown (Task 2).
- "Maintain" goal → goal-weight step skipped; goal weight on the wrong side of current weight → inline error (Task 2).
- Back from step N keeps every answer (Task 4).
- Notification permission denied → onboarding still finishes, times saved (Task 4).
- No meal times chosen → default reminder times are not forced; reminders off (Task 3).

---

### Task 1: Database + types
**Files:** `supabase/schema.sql`, `scripts/test-sql.mjs`, `src/types/index.ts`
- [ ] SQL tests: new columns exist; `target_weight_kg` outside 30–300 rejected; more than 6 meal times rejected; more than 20 foods rejected.
- [ ] Add `ADD COLUMN IF NOT EXISTS target_water_ml INTEGER, target_weight_kg NUMERIC(5,2), foods_avoided TEXT[] DEFAULT '{}', meal_times TEXT[] DEFAULT '{}'` + CHECKs; Profile type fields. Commit `feat(db): profile goal weight, foods avoided, meal times, water target`.

### Task 2: Onboarding logic
**Files:** `src/features/onboarding/flow.ts` + test
**Produces:** `onboardingSteps(p: { hasName: boolean; goal: FitnessGoal }): StepId[]`; `weeksToGoal(currentKg, goalKg, kcalPerDayAdjustment): number | null`; `validateGoalWeight(currentKg, goalKg, goal): string | null`; `FOODS_TO_AVOID`.
- [ ] Tests: steps with/without name and for maintain; weeks (75→70 kg at −500 kcal/day ≈ 11 weeks); goal weight errors ("Pick a weight below 75 kg to lose").
- [ ] Commit `feat: onboarding steps and goal-weight maths`.

### Task 3: Reminders at meal times + coach respects foods
**Files:** `src/services/notificationService.ts` (`scheduleMealReminders(times: string[])`), `src/utils/coachContext.ts`, `src/services/aiService.ts` (`foodsAvoided`), `supabase/functions/analyze-meal/index.ts` (sanitise + prompt), tests.
- [ ] Tests: `reminderSchedule(['08:00','12:30'])` → [{hour 8, minute 0, title 'Breakfast time'}…]; coach context includes foodsAvoided.
- [ ] Commit `feat: meal-time reminders and foods-to-avoid in Sia's advice`.

### Task 4: Welcome + email sign-in + onboarding screens
**Files:** `src/app/(auth)/login.tsx` (welcome), `src/app/(auth)/email.tsx` (sign in / create), `src/app/(auth)/register.tsx` (redirect to email create), `src/app/(auth)/onboarding.tsx`, `src/app/(auth)/_layout.tsx`, tests.
- [ ] Tests: welcome shows both buttons; email form inline errors; onboarding walks steps, back keeps answers, finish saves profile with new fields.
- [ ] Web screenshots; commit `feat: welcome, sign-in and onboarding in Colorpoint`.

### Task 5: Me shows goal weight / foods / meal times
**Files:** `src/app/(tabs)/profile.tsx`.
- [ ] Rows: Goal weight, Foods you avoid, Meal times (reuse onboarding pickers in sheets). Commit `feat: edit goal weight, foods and meal times in Me`.
