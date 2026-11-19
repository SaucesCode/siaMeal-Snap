# Welcome, sign-in and onboarding — design

Status: approved by the user 2026-11-19 (login B "welcome first", the one-question onboarding, plus all four
extra questions: name, goal weight, foods you avoid, meal times + reminders). Mockups:
`.superpowers/brainstorm/4974-1795070268/content/auth-onboarding-v2.html`. Amends §8 "Auth / Onboarding" of
`2026-11-18-sia-colorpoint-redesign-design.md`.

## Why
The first screens a new person sees were still the old dark style with "Athlete / Hunter / Prowl" copy. They
should explain the app before asking for anything, and onboarding should learn enough to help with the journey
(goal weight, foods to avoid, when to remind), because daily use is what matters.

## Decided
- **Welcome (login B):** cocoa top with the wordmark, "Your cat-shaped calorie buddy." and three one-line
  benefits; Sia peeks over a cream panel with **Continue with Google**, **Continue with email**, and
  "Already have an account? Sign in". Email opens a cream form (sign in, or create account with confirm),
  inline field errors, no alerts for validation.
- **Onboarding:** one question per screen, back arrow + progress bar ("2 of 8"), Sia's face changes per step,
  big choices, one Continue. Steps: **name** (only if missing) → **body** (sex, age, height, weight) →
  **activity** → **goal** → **goal weight** (only when losing or gaining; shows "about N weeks") →
  **eating style** → **foods you avoid** (multi-select, skippable) → **meal times** (pick breakfast/lunch/
  dinner times, asks notification permission, skippable) → **your plan** (Sia celebrates over the eye ring
  with kcal, macros, water and the weekly pace) with **Snap my first meal** (opens the camera).
- **Data:** profiles gains `target_water_ml`, `target_weight_kg`, `foods_avoided text[]`, `meal_times text[]`
  (HH:MM) with range/size checks; the app keeps working on an older database (existing core-schema fallback).
- **Uses:** reminders fire at the chosen meal times (plain copy); the coach's context includes foods to avoid
  so suggestions respect them (edge function prompt); Me shows the goal weight.

## Left to the builder
Exact food-avoid list (keep it short and local: no pork, no beef, vegetarian, vegan, no seafood, no dairy,
gluten-free, nut allergy), time picker form, weeks-to-goal maths details.
