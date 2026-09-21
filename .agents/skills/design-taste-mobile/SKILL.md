---
name: design-taste-mobile
description: Elite mobile app UI/UX design and architecture skill for iOS and Android (React Native, Expo, NativeWind, SwiftUI). Enforces anti-slop mobile aesthetics, thumb-zone ergonomics, tactile multi-sensory feedback (haptics), dark-tech and premium surfaces, mobile typography, and hardware-safe layout patterns. Use whenever designing, architecting, reviewing, or styling mobile screens, components, gestures, or design systems.
---

# design-taste-mobile: Elite Mobile UI/UX Design System Skill

> Production mobile design is not shrunk desktop web. Mobile devices are handheld, thumb-driven, haptic, multi-sensor instruments viewed in varying ambient lighting. Every pixel, touch target, gesture, and transition must feel deliberate, fluid, and native.

---

## 0. THE CORE DIRECTIVE: ANTI-SLOP MOBILE AESTHETICS

Standard AI mobile code collapses into repetitive, cheap defaults:
- **Web-in-a-box:** Web-style top-heavy layouts, tiny desktop-sized link text, and centered buttons floating uselessly mid-screen.
- **Card Inception:** Nested cards inside cards inside cards with redundant borders and padding.
- **Sterile & Dead:** Zero press feedback, dead static buttons, and no haptic integration.
- **Ergonomic Blindness:** Primary actions stranded in unreachable top corners (the "thumb stretch of death").
- **Hardware Agnostic:** Text clipping under the Dynamic Island / camera notch, or buttons stuck behind the iOS home indicator bar.
- **Generic Slop:** Clichéd purple-blue gradients, unstyled system `Alert.alert` popups, and fake dashboard clutter.

**This skill enforces uncompromising native mobile craftsmanship.**

---

## 1. THE MOBILE THUMB ZONE & ERGONOMIC ARCHITECTURE

Mobile screens are operated primarily with one hand. All navigation, primary inputs, and affirmative actions must respect the **Reachability Heatmap**:

```
┌─────────────────────────┐
│     IMPOSSIBLE ZONE     │  <-- 0-25% from top: Status badges, profile avatars, 
│    (Read-Only Data)     │      read-only metrics, subtle search icon.
├─────────────────────────┤
│       STRETCH ZONE      │  <-- 25-60%: Content feed, list items, charts,
│    (Secondary Access)   │      interactive cards, carousels.
├─────────────────────────┤
│        EASY ZONE        │  <-- 60-100% (Bottom): PRIMARY CTAs, sticky action bars,
│      (Natural Thumb)    │      tab bars, bottom sheets, tactile steppers, FABs.
└─────────────────────────┘
```

### Strict Ergonomic Rules:
1. **Never place the primary affirmative action at the top:** 
   - ❌ Avoid "Save", "Submit", or "Confirm" in the top-right navigation bar header.
   - ✅ Place affirmative CTAs in the bottom **Easy Zone** — either sticky above the bottom inset or anchored within a gesture-driven bottom sheet.
2. **Interactive Touch Targets:**
   - Minimum bounding box: **44 × 44 pt** (Apple HIG) / **48 × 48 dp** (Material Design).
   - For compact icon buttons (e.g. 24px icon), ALWAYS expand the hit area:
     ```tsx
     <Pressable hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} ...>
     ```
   - Maintain at least **8–12 pt** separation between adjacent interactive elements to prevent accidental miss-taps.
3. **Bottom Sheets Over Full-Screen Modals for Quick Tasks:**
   - For rapid micro-interactions (portion adjusting, category picking, quantity entering), use gesture-dismissible bottom sheets with an audible drag handle. Reserve full-screen modals only for deep multi-step flows.

---

## 2. SURFACE ELEVATION & DARK-TECH OBSIDIAN PALETTE

Depth on mobile should be created through **calibrated surface luminance**, not harsh drop shadows or jarring borders.

### Surface Elevation Hierarchy (Dark Mode Baseline)
* **`surface-0` (Base Canvas):** Deep Obsidian (`#09090B` or OLED `#000000`). Zero distraction, maximum contrast for battery and OLED clarity.
* **`surface-1` (Primary Containers / Feed Cards):** Dark Zinc (`#121215` / `#18181B`). Provides gentle separation from the canvas.
* **`surface-2` (Elevated Cards / Floating Sheets / Inputs):** Elevated Zinc (`#202024` / `#27272A`).
* **`surface-accent` (Laser Highlights):** Laser Emerald (`#10B981`), Cyber Cyan (`#06B6D4`), Warm Peach (`#FDBA74`). Used intentionally for primary progress, streak flame, or high-value data.

### Border & Corner Radii Discipline:
* **Hairline Borders:** Use `border border-white/5` or `border-white/10`. Never use opaque gray borders (`border-gray-500`) or 2px thick outlines in dark mode.
* **Continuous Squircle Curves:**
  * Containers & large cards: `rounded-2xl` (16–20pt) or `rounded-3xl` (24pt).
  * Interactive action pills / tags: `rounded-full` (capsule).
  * Inputs and compact cards: `rounded-xl` (12–14pt).
* **Glass & Frosted Translucency:**
  * Fixed bottom tab bars and floating headers must use blur materials (`expo-blur` with `tint="dark"` and `border-t border-white/10`) to allow content to gracefully glide beneath them without harsh cutoffs.

---

## 3. MOBILE TYPOGRAPHY & TABULAR NUMERICAL PRECISION

Mobile typography must be legible at arm’s length under daylight and motion.

### Type Scale & Leading:
* **Hero Numbers / Display:** `32–40 pt` (`font-bold`, `tracking-tight`). 
* **Screen Titles (Large Title):** `24–28 pt` (`font-bold` or `font-semibold`).
* **Card Titles / Group Headers:** `16–18 pt` (`font-semibold`).
* **Eyebrows / Overline Labels:** `11–12 pt` (`font-semibold`, uppercase, `tracking-wider text-zinc-400`).
* **Body Copy:** `15–16 pt` (`leading-snug`, never smaller than 14pt for essential reading).
* **Secondary / Timestamps / Metadata:** `12–13 pt` (`text-zinc-500`).

### The Tabular Numeral Rule (Zero-Jitter):
* Any rapidly updating metric, countdown timer, calorie count, or progress metric **MUST** enable tabular figures to prevent horizontal character width jitter:
  ```tsx
  style={{ fontVariant: ['tabular-nums'] }} // Or className="tabular-nums"
  ```

---

## 4. TACTILE MULTI-SENSORY CHOREOGRAPHY (HAPTICS & PRESS PHYSICS)

A mobile app without haptics and responsive press states feels like a unresponsive website.

### 1. The Haptic Matrix (`expo-haptics`):
| User Action | Haptic Feedback Call |
| :--- | :--- |
| **Light Tap / Tab Switch / Filter Selection** | `Haptics.selectionAsync()` or `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` |
| **Stepper Increment (+ / -) / Toggle Flip** | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` |
| **Affirmative Save / Goal Completed / Meal Logged** | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` |
| **Destructive Action / Deletion Confirm** | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` |
| **Validation Failure / Limit Exceeded** | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` |

### 2. Press State Micro-Physics:
Every interactive element must respond instantly to touch. Never use dead static `View` wrappers with `onPress`.
```tsx
<Pressable
  onPress={handleAction}
  style={({ pressed }) => [
    { transform: [{ scale: pressed ? 0.97 : 1 }] },
    pressed && { opacity: 0.9 }
  ]}
  className="bg-emerald-500 rounded-2xl py-4 items-center justify-center"
>
  <Text className="text-black font-bold text-base">Log Meal</Text>
</Pressable>
```

---

## 5. HARDWARE INTEGRATION & SAFE-AREA MASTERY

Mobile UIs exist on hardware with notches, camera punch-holes, rounded display corners, virtual keyboards, and system home bars.

1. **Safe Area Insets (`react-native-safe-area-context`):**
   * ALWAYS import `useSafeAreaInsets()`.
   * Floating bottom buttons must be padded by `insets.bottom + 12` pt.
   * Custom headers must account for `insets.top`.
   * Never hardcode `paddingBottom: 34` or assume iPhone dimensions.
2. **Keyboard Pinning Ergonomics:**
   * Dynamic chat inputs or text logging sheets must listen to keyboard events or utilize `KeyboardAvoidingView` with `Platform.OS === 'ios' ? 'padding' : undefined`.
   * Inputs must pin cleanly above the keyboard without obscuring the content or jarring the screen.
3. **Empty States with Mascot & Soul:**
   * Empty lists and first-run screens must never be blank voids.
   * Include the brand mascot (e.g. **SiaMeal Cat**), an encouraging and concise 2-line prompt, and an immediate 1-tap call to action.

---

## 6. THE ANTI-SLOP MOBILE REVIEW CHECKLIST

Before finalizing any mobile component or screen, verify against this 10-point gate:

- [ ] **Thumb Reach:** Is the primary action reachable with a single thumb in the bottom 40%?
- [ ] **Touch Target:** Does every tappable item meet the 44×44pt minimum target or have adequate `hitSlop`?
- [ ] **Tactile Press:** Does every button compress subtly (`scale: 0.97`) on touch?
- [ ] **Haptics:** Is tactile sensory feedback triggered on taps, toggles, and confirmations?
- [ ] **Safe Areas:** Is the layout protected against the Dynamic Island, camera punch-hole, and home indicator bar?
- [ ] **Tabular Figures:** Do numbers, calories, and timestamps use `tabular-nums`?
- [ ] **Elevation:** Are cards styled with subtle surface contrast (`surface-1`) and hairline borders (`border-white/10`) rather than harsh flat lines?
- [ ] **No Card Inception:** Are cards structured cleanly without redundant nested borders?
- [ ] **Keyboard Safe:** Does the keyboard gracefully push up interactive fields without clipping?
- [ ] **Mascot / Brand Touch:** Does the screen reflect the app's unique identity (e.g. SiaMeal Siamese cat accents) rather than feeling like a generic clone?
