# Review plate breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review shows each food Sia found (labels on the photo + list), per-item portion fixes, and Sia's one-line take.

**Architecture:** Edge function returns sanitised `items`; client carries them in `draftMeal.items`; pure maths (`itemsMeal`, `siaTake`) drive a new `PlateBreakdown` card on Review, with the ring card as fallback.

**Tech Stack:** Supabase Edge Functions (Deno 2), Expo SDK 58, Jest + RNTL 14.

**Spec:** `docs/superpowers/specs/2026-11-19-review-plate-breakdown-design.md`

## Global Constraints
- Use `<Tap>` (never a function style on `<Pressable>`); no raw colours outside `src/theme`.
- Text ≥ 12 pt, targets ≥ 44 × 44; plain words; Sia's line ≤ 60 chars, ≤ 1 pun.
- Server output is sanitised (types, ranges, lengths) — never trust the model.
- Every task: `npx tsc --noEmit`, `npx jest` (and `npx deno test` for Task 1) green; Co-Authored-By trailer.

## Review Focus
- Model returns items whose kcal don't add up to the total → totals still come from the AI total (Task 2).
- Every item removed → meal is 0 kcal and Save still works / or is blocked? → Save blocked with "Add at least one item" (Task 3).
- Positions missing or out of range → no photo labels, list still shows (Tasks 1, 3).
- Very long item names → truncated to 40 chars server-side, one line in the UI (Tasks 1, 3).
- Barcode / typed meal without items → ring-card fallback (Task 3).

---

### Task 1: Server items
**Files:** Create `supabase/functions/analyze-meal/items.ts`, `supabase/functions/analyze-meal/items_test.ts`; Modify `supabase/functions/analyze-meal/index.ts` (prompt schema + `items: sanitizeItems(parsedData.items)`).
**Produces:** `sanitizeItems(raw: unknown): MealItem[]`, `MealItem = { name: string; amount: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; x?: number; y?: number }`.
- [ ] Tests: drops non-objects/empty names; rounds and clamps numbers ≥ 0; caps at 8; trims name to 40 / amount to 24; keeps x/y only when both in [0,1]; non-array → [].
- [ ] FAIL → implement → PASS (`npx deno test supabase/functions/analyze-meal/items_test.ts`); `npx deno check supabase/functions/analyze-meal/index.ts`. Commit `feat(ai): return each food item Sia found`.

### Task 2: Client data + maths
**Files:** Modify `src/types/index.ts`, `src/stores/mealStore.ts` (draftMeal.items), `src/app/(tabs)/camera.tsx`, `src/components/TextLogModal.tsx`, `src/utils/reviewMath.ts`; Test `src/utils/__tests__/reviewMath.test.ts`.
**Produces:** `itemsMeal(base: Macros, items: MealItem[], multipliers: number[]): Macros`; `siaTake(fit: MealFit, meal: Macros): string`.
- [ ] Tests: all ×1 → base; rice ×0.5 scales by kcal share; all removed (×0) → zeros; items summing to 0 kcal → base; siaTake cases (over, protein goal, high-protein, default) all ≤ 60 chars.
- [ ] FAIL → implement → PASS. Commit `feat: per-item maths and Sia's take for review`.

### Task 3: Plate breakdown on Review
**Files:** Create `src/features/review/PlateBreakdown.tsx`, `src/features/review/PhotoLabels.tsx`; Modify `src/app/review.tsx`; Test `src/app/__tests__/review.test.tsx`.
- [ ] Tests: with items → "Chicken · 320" label, list rows, Sia's take text; tapping "White rice" then "Half" → total shows 550 kcal; removing every item → Save shows "Add at least one item"; without items → ring card ("+680").
- [ ] Implement; web screenshots 375; commit `feat: review shows what's on your plate`.
