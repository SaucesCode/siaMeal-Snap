# Snap flow: camera through Sia's eye + review that fills today's ring — design

Status: approved by the user 2026-11-19 ("let's do B+2") after mockups
(`.superpowers/brainstorm/1726-1795051038/content/snap-options-v2.html`, camera B + review 2).
Amends §8 "Camera / Review" of `2026-11-18-sia-colorpoint-redesign-design.md`.

## Why
Snapping a meal is the habit the app (and the usage-based grant) lives on. The old camera was busy (laser,
pulses, tags) and the old review was a wall of ~12 sections; the user wants it "easy to read, not too much text".

## Approaches considered
Camera: A calm dark camera / **B look through Sia's eye (picked)** / C Sia in the corner.
Review: 1 four big tiles / **2 the meal fills today's eye ring (picked)** / 3 photo with a sheet.
B + 2 ties camera → review → Today with one motif: Sia's green shutter-eye ring.

## Decided
**Camera**
- Full-bleed camera, dark outside a circular window ringed by Sia's green shutter ring with six blade ticks;
  hint "Fit your plate in the circle". Barcode mode: a wide rounded window, hint "Line up the barcode",
  "Type the number" button. No laser, pulses or tags.
- Top: close, Photo | Barcode switch, flash. Under the switch: a meal chip ("Lunch ▾") that cycles
  Breakfast → Lunch → Dinner → Snack; it starts from Today's "+" choice or the time of day.
- Bottom: gallery, the green shutter with a cream ring (same as the tab button), flip.
- After a snap: the photo freezes in the window, the ring's blades turn and the window narrows slightly
  (focusing), Sia rises from behind the bottom controls with her thinking face, status
  "Looking at your plate…" / "Usually takes a few seconds."
- Not food: a cream sheet with puzzled Sia peeking over its edge, "That doesn't look like food", Sia's
  reason, buttons **Try again** and **Type it instead** (opens the type-a-meal sheet).
- Permission and barcode-entry screens use the cream style and plain words.

**Review** (minimum text)
- Top: "✕ Retake" and the meal chip. Photo (if any), the meal name (tap to edit).
- Cocoa card with Sia peeking over it: today's eye ring where what you'd already eaten is a muted arc and this
  meal is the green slice; centre "+680 kcal"; beside it "+42 g protein / +72 g carbs / +22 g fat" and
  "760 left after" (or "120 over after", arc amber). Sia's face follows the fit: happy; celebrating if this
  meal reaches the protein goal; concerned if it goes over — she ducks and pops up again when it changes.
- Portion: ½ · 1× · 1½ · 2× (scales from the AI's numbers).
- One "Edit details" row folds out: exact numbers, ingredients (add/remove), Sia's notes, "Ask Sia".
- Bottom: one caption "Estimated from your photo." and one **Save** button. Removed: the ISO/"macro
  integrity" badge, confidence badge, diet tags, the long fit message.
- "After" uses today's meals (the old screen read the selected-date list, so it was often empty).

## Left to the builder
Exact ring geometry/scale, how the meal chip cycles vs. menus, sheet/overlay mechanics, which existing
helpers to reuse.
