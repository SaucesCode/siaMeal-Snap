import { Meal, MealType } from '../types';

export interface MealForecastCandidate {
  id: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  tag: string;
  felineNote: string;
}

export interface MealForecastResult {
  slotLabel: string;
  statusBadge: string;
  statusIcon: string;
  statusColor: string;
  isGoalMet: boolean;
  goalMetMessage?: string;
  catch: MealForecastCandidate;
  alternatives: MealForecastCandidate[];
}

const FORECAST_DATABASE: MealForecastCandidate[] = [
  // --- Breakfast (Morning Pounce) ---
  {
    id: 'brk-1',
    name: 'Loaded Egg White & Avocado Sourdough',
    mealType: 'breakfast',
    calories: 380,
    protein_g: 32,
    carbs_g: 30,
    fat_g: 14,
    ingredients: ['3 Egg whites', '1 Whole egg', '1 Sourdough slice', '40g Avocado', 'Microgreens'],
    tag: 'High Protein',
    felineNote: 'Crispy sourdough and fluffy eggs — Sia approved morning fuel!',
  },
  {
    id: 'brk-2',
    name: 'Greek Yogurt Parfait & Whey Boost',
    mealType: 'breakfast',
    calories: 340,
    protein_g: 38,
    carbs_g: 32,
    fat_g: 5,
    ingredients: ['200g Greek Yogurt 0%', '25g Whey isolate', '60g Blueberries', '15g Chia seeds'],
    tag: 'Lean Muscle',
    felineNote: 'Smooth creamy protein with antioxidants to sharpen those hunting reflexes.',
  },
  {
    id: 'brk-3',
    name: 'Overnight Protein Oats with Chia',
    mealType: 'breakfast',
    calories: 420,
    protein_g: 28,
    carbs_g: 54,
    fat_g: 11,
    ingredients: ['50g Rolled oats', '1 Scoop protein powder', '150ml Almond milk', '10g Almond butter'],
    tag: 'Sustained Energy',
    felineNote: 'Slow-burning complex carbs so your engine purrs steadily all morning.',
  },
  {
    id: 'brk-4',
    name: 'Smoked Salmon & Poached Eggs',
    mealType: 'breakfast',
    calories: 410,
    protein_g: 34,
    carbs_g: 26,
    fat_g: 18,
    ingredients: ['80g Smoked salmon', '2 Poached eggs', '1 Slice rye toast', 'Dill sprigs'],
    tag: 'Omega-3 Catch',
    felineNote: 'Real wild-caught salmon — Sia’s ultimate favorite breakfast treat!',
  },
  {
    id: 'brk-5',
    name: 'Spinach, Mushroom & Feta Omelette',
    mealType: 'breakfast',
    calories: 310,
    protein_g: 26,
    carbs_g: 8,
    fat_g: 19,
    ingredients: ['3 Whole eggs', '50g Baby spinach', '40g Mushrooms', '25g Feta cheese'],
    tag: 'Low Carb Keto',
    felineNote: 'Rich, savory greens folded in velvety eggs with minimal carbs.',
  },

  // --- Lunch (Midday Catch) ---
  {
    id: 'lun-1',
    name: 'Grilled Chicken & Quinoa Harvest Bowl',
    mealType: 'lunch',
    calories: 520,
    protein_g: 48,
    carbs_g: 44,
    fat_g: 14,
    ingredients: ['180g Chicken breast', '120g Cooked quinoa', 'Steamed broccoli', '10ml Olive oil'],
    tag: 'Lean Mass',
    felineNote: 'Golden grilled chicken breast with fluffy quinoa. High octane midday power!',
  },
  {
    id: 'lun-2',
    name: 'Seared Ahi Tuna Bowl with Jasmine Rice',
    mealType: 'lunch',
    calories: 490,
    protein_g: 46,
    carbs_g: 42,
    fat_g: 12,
    ingredients: ['170g Yellowfin tuna', '130g Jasmine rice', 'Cucumber ribbons', 'Sesame soy glaze'],
    tag: 'Fresh Catch',
    felineNote: 'Sia’s personal midday catch! Tender seared tuna packed with clean amino acids.',
  },
  {
    id: 'lun-3',
    name: 'Lean Beef Sirloin & Roasted Sweet Potato',
    mealType: 'lunch',
    calories: 560,
    protein_g: 46,
    carbs_g: 48,
    fat_g: 18,
    ingredients: ['160g Lean beef (93/7)', '180g Roasted sweet potato cubes', 'Asparagus spears'],
    tag: 'Strength & Iron',
    felineNote: 'Dense micronutrients and bioavailable iron to keep you energized until twilight.',
  },
  {
    id: 'lun-4',
    name: 'Chipotle Turkey Burrito Bowl',
    mealType: 'lunch',
    calories: 510,
    protein_g: 42,
    carbs_g: 50,
    fat_g: 14,
    ingredients: ['160g Lean ground turkey', '80g Black beans', '100g Brown rice', 'Pico de gallo'],
    tag: 'High Fiber',
    felineNote: 'Zesty Mexican-style turkey bowl that satisfies hunger without the carb crash.',
  },
  {
    id: 'lun-5',
    name: 'Mediterranean Salmon Salad & Tzatziki',
    mealType: 'lunch',
    calories: 460,
    protein_g: 38,
    carbs_g: 22,
    fat_g: 24,
    ingredients: ['150g Atlantic salmon', 'Mixed greens', 'Cucumber & tomatoes', '30g Tzatziki dip'],
    tag: 'Keto Clean',
    felineNote: 'Crispy skin salmon over refreshing garden greens. Light on digestion, heavy on results.',
  },

  // --- Afternoon Snack (Afternoon Pounce) ---
  {
    id: 'snk-1',
    name: 'Whipped Cottage Cheese & Almond Crunch',
    mealType: 'snack',
    calories: 240,
    protein_g: 28,
    carbs_g: 14,
    fat_g: 8,
    ingredients: ['200g Low-fat cottage cheese', '15g Crushed almonds', '1 Tsp honey', 'Cinnamon'],
    tag: 'Slow Digesting',
    felineNote: 'Creamy slow-release casein protein to crush afternoon cravings in their tracks.',
  },
  {
    id: 'snk-2',
    name: 'Whey Protein Shake & Crisp Banana',
    mealType: 'snack',
    calories: 280,
    protein_g: 32,
    carbs_g: 32,
    fat_g: 3,
    ingredients: ['30g Whey isolate', '1 Medium banana', '300ml Cold water', 'Ice'],
    tag: 'Pre-Workout',
    felineNote: 'Fast glycogen replenishment and instant amino rush for your next workout.',
  },
  {
    id: 'snk-3',
    name: 'Tuna Salad Crisp Lettuce Wraps',
    mealType: 'snack',
    calories: 210,
    protein_g: 30,
    carbs_g: 4,
    fat_g: 8,
    ingredients: ['1 Can chunk light tuna in water', '1 Tbsp Light mayo', 'Romaine lettuce leaves', 'Lemon pepper'],
    tag: 'Ultra-Lean',
    felineNote: 'Zero bloat, 30g pure protein crunch. Sia watches with envious green eyes!',
  },
  {
    id: 'snk-4',
    name: 'Boiled Free-Range Eggs & Edamame',
    mealType: 'snack',
    calories: 250,
    protein_g: 22,
    carbs_g: 10,
    fat_g: 13,
    ingredients: ['2 Large hard-boiled eggs', '75g Steamed edamame pods', 'Sea salt flake'],
    tag: 'Portable Bento',
    felineNote: 'Clean portable athletic fuel with complete amino profile.',
  },
  {
    id: 'snk-5',
    name: 'Crisp Honeycrisp Apple & Protein Dip',
    mealType: 'snack',
    calories: 190,
    protein_g: 16,
    carbs_g: 28,
    fat_g: 2,
    ingredients: ['1 Medium apple sliced', '100g Non-fat Greek yogurt with cinnamon'],
    tag: 'Sweet Tooth Fix',
    felineNote: 'Satisfies sweet cravings naturally with fiber and gut-friendly probiotics.',
  },

  // --- Dinner (Night Prowl) ---
  {
    id: 'din-1',
    name: 'Pan-Seared Salmon & Garlic Asparagus',
    mealType: 'dinner',
    calories: 540,
    protein_g: 44,
    carbs_g: 26,
    fat_g: 28,
    ingredients: ['180g Salmon fillet', '120g Roasted baby potatoes', '100g Grilled asparagus', 'Lemon butter'],
    tag: 'Recovery Catch',
    felineNote: 'The nocturnal prowler’s feast! Rich healthy fats that prime your body for overnight repair.',
  },
  {
    id: 'din-2',
    name: 'Teriyaki Glazed Chicken & Steamed Greens',
    mealType: 'dinner',
    calories: 510,
    protein_g: 48,
    carbs_g: 46,
    fat_g: 13,
    ingredients: ['180g Chicken breast', '120g Steamed white rice', 'Steamed broccoli', 'Low-sugar teriyaki'],
    tag: 'High Protein',
    felineNote: 'Clean, dependable macronutrient perfection. Keeps you lean, agile, and satisfied.',
  },
  {
    id: 'din-3',
    name: 'Lean Sirloin Steak & Roasted Herb Potatoes',
    mealType: 'dinner',
    calories: 580,
    protein_g: 50,
    carbs_g: 36,
    fat_g: 24,
    ingredients: ['170g Grass-fed top sirloin', '140g Herb roasted baby red potatoes', 'Green beans'],
    tag: 'Muscle Rebuild',
    felineNote: 'Natural zinc and creatine power to recharge worn-out muscle tissue while you snooze.',
  },
  {
    id: 'din-4',
    name: 'Baked Atlantic Cod with Lemon & Greens',
    mealType: 'dinner',
    calories: 380,
    protein_g: 42,
    carbs_g: 16,
    fat_g: 14,
    ingredients: ['200g Cod fillet', '150g Sauteed garlic spinach', '100g Roasted cauliflower'],
    tag: 'Light & Lean',
    felineNote: 'Super light on the stomach, massive on protein. Perfect when calories are almost capped!',
  },
  {
    id: 'din-5',
    name: 'Turkey Bolognese over Protein Rigatoni',
    mealType: 'dinner',
    calories: 520,
    protein_g: 46,
    carbs_g: 52,
    fat_g: 14,
    ingredients: ['160g Ground turkey breast (99%)', '75g Barilla Protein+ pasta', 'Marinara sauce', 'Basil'],
    tag: 'Comfort Fuel',
    felineNote: 'Hearty, warm comfort food engineered with athlete-grade macro precision.',
  },

  // --- Late Evening (Midnight Recovery) ---
  {
    id: 'rec-1',
    name: 'Silky Casein Cocoa Pudding',
    mealType: 'snack',
    calories: 190,
    protein_g: 26,
    carbs_g: 8,
    fat_g: 4,
    ingredients: ['30g Micellar casein powder', '150ml Cold almond milk', 'Cacao nibs', 'Stevia'],
    tag: 'Night Recovery',
    felineNote: 'Anticatabolic nighttime formula. Feeds your muscles while you curl up in dreamland.',
  },
  {
    id: 'rec-2',
    name: 'Warm Cinnamon Vanilla Protein Milk',
    mealType: 'snack',
    calories: 170,
    protein_g: 22,
    carbs_g: 12,
    fat_g: 3,
    ingredients: ['250ml Fairlife ultra-filtered skim milk', '15g Whey/Casein', 'Dash of cinnamon'],
    tag: 'Sleep Primer',
    felineNote: 'Warm, soothing comfort that calms the central nervous system for deep sleep.',
  },
];

interface MacroSnapshot {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface ForecastOptions {
  targets: MacroSnapshot;
  consumed: MacroSnapshot;
  loggedMeals: Meal[];
  cycleIndex?: number;
}

export function getSiaForecastRecommendation({
  targets,
  consumed,
  loggedMeals,
  cycleIndex = 0,
}: ForecastOptions): MealForecastResult {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Determine current meal time slot
  let targetSlot: MealType = 'snack';
  let slotLabel = 'MIDDAY CATCH';
  let statusBadge = '🐾 PROWLING FOR LUNCH';
  let statusIcon = 'restaurant-outline';
  let statusColor = '#10b981';

  if (currentHour >= 5 && currentHour < 10.5) {
    targetSlot = 'breakfast';
    slotLabel = 'MORNING POUNCE';
    statusBadge = '☀️ SUNRISE HUNT';
    statusIcon = 'sunny-outline';
    statusColor = '#f59e0b';
  } else if (currentHour >= 10.5 && currentHour < 14.5) {
    targetSlot = 'lunch';
    slotLabel = 'MIDDAY CATCH';
    statusBadge = '🐾 PROWLING FOR LUNCH';
    statusIcon = 'restaurant-outline';
    statusColor = '#10b981';
  } else if (currentHour >= 14.5 && currentHour < 17.5) {
    targetSlot = 'snack';
    slotLabel = 'AFTERNOON POUNCE';
    statusBadge = '⚡ MIDDAY POUNCE';
    statusIcon = 'nutrition-outline';
    statusColor = '#06b6d4';
  } else if (currentHour >= 17.5 && currentHour < 21.5) {
    targetSlot = 'dinner';
    slotLabel = 'NIGHT PROWL';
    statusBadge = '🌙 EVENING FEAST';
    statusIcon = 'moon-outline';
    statusColor = '#818cf8';
  } else {
    // 21.5 to 5.0
    targetSlot = 'snack';
    slotLabel = 'MIDNIGHT REST';
    statusBadge = '💤 RECOVERY FUEL';
    statusIcon = 'bed-outline';
    statusColor = '#a78bfa';
  }

  const remainingCalories = Math.max(0, targets.calories - consumed.calories);
  const remainingProtein = Math.max(0, targets.protein_g - consumed.protein_g);

  // Check if daily goals are already hit (>= 96% calories or target exceeded with protein met)
  const isGoalMet =
    (targets.calories > 0 && consumed.calories >= targets.calories * 0.96) ||
    (targets.protein_g > 0 &&
      consumed.protein_g >= targets.protein_g &&
      remainingCalories <= 150);

  if (isGoalMet) {
    return {
      slotLabel,
      statusBadge: '🏆 GOALS CRUSHED',
      statusIcon: 'checkmark-circle-outline',
      statusColor: '#10b981',
      isGoalMet: true,
      goalMetMessage:
        "Purrfection achieved! You've met today's energy & macro targets. Rest those paws and stay hydrated with clean water.",
      catch: {
        id: 'goal-met-rest',
        name: 'Daily Target Complete — Pure Hydration',
        mealType: 'snack',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        ingredients: ['500ml Filtered electrolyte water', 'Lemon wedge', 'Mint leaves'],
        tag: 'Rest & Recover',
        felineNote: 'No more calories needed today! You did great. Sip some water and chill with Sia.',
      },
      alternatives: [],
    };
  }

  // Filter candidates matching current slot or late recovery if midnight
  const candidatePool = FORECAST_DATABASE.filter((c) => {
    if (currentHour >= 21.5 || currentHour < 5) {
      return c.id.startsWith('rec-') || c.mealType === 'snack';
    }
    return c.mealType === targetSlot;
  });

  // Exclude meals already logged today by approximate name match
  const loggedNames = loggedMeals.map((m) => (m.name || '').toLowerCase().trim());
  const freshCandidates = candidatePool.filter((c) => {
    const cName = c.name.toLowerCase();
    return !loggedNames.some(
      (logged) => logged.length > 3 && (cName.includes(logged) || logged.includes(cName))
    );
  });

  const poolToScore = freshCandidates.length > 0 ? freshCandidates : candidatePool;

  // Score candidates according to remaining macro needs
  const scored = poolToScore.map((candidate) => {
    let score = 100;

    // High protein priority if protein deficit is substantial
    if (remainingProtein > 30) {
      score += candidate.protein_g * 1.5;
    }

    // Calorie constraint handling
    if (remainingCalories < 400) {
      // Reward lower calorie options
      score += Math.max(0, 400 - candidate.calories);
      if (candidate.calories > remainingCalories + 100) {
        score -= 50; // Penalty for overshooting low remaining budget
      }
    } else {
      // Reward meals closer to remaining budget / meals expected
      const distance = Math.abs(candidate.calories - Math.min(600, remainingCalories));
      score -= distance * 0.1;
    }

    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const availableCandidates = scored.map((s) => s.candidate);
  const normalizedIndex =
    availableCandidates.length > 0
      ? Math.abs(cycleIndex) % availableCandidates.length
      : 0;

  const chosenCatch = availableCandidates[normalizedIndex] || FORECAST_DATABASE[0];
  const alternatives = availableCandidates.filter((c) => c.id !== chosenCatch.id);

  // Generate dynamic contextual Sia coach tip
  let dynamicNote = chosenCatch.felineNote;
  if (remainingProtein > 35) {
    dynamicNote = `Sia snuck in ${chosenCatch.protein_g}g of protein to conquer your remaining ${Math.round(
      remainingProtein
    )}g deficit!`;
  } else if (remainingCalories < 380 && remainingCalories > 0) {
    dynamicNote = `Budget is getting tight (${Math.round(
      remainingCalories
    )} kcal left). This ${chosenCatch.calories} kcal catch keeps your deficit safe!`;
  }

  return {
    slotLabel,
    statusBadge,
    statusIcon,
    statusColor,
    isGoalMet: false,
    catch: {
      ...chosenCatch,
      felineNote: dynamicNote,
    },
    alternatives,
  };
}
