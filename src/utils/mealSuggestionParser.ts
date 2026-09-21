/**
 * Utility to parse suggested meal items and macro estimates from Sia AI Coach responses.
 */

export interface ParsedSuggestedMeal {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  food_items: string[];
}

const FORBIDDEN_WORDS = new Set([
  'kcal',
  'cal',
  'calories',
  'calorie',
  'protein',
  'proteins',
  'carbs',
  'carb',
  'carbohydrate',
  'fat',
  'fats',
  'g',
  'mg',
  'kg',
  'oz',
  'lbs',
  'p',
  'c',
  'f',
  'remaining',
  'left',
  'target',
  'targets',
  'status',
  'goal',
  'goals',
  'total',
  'totals',
  'consumed',
  'logged',
  'today',
  'daily',
  'note',
  'tip',
  'tips',
  'options',
  'option',
  'choice',
  'choices',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'snacks',
  'meal',
  'meals',
  'macro',
  'macros',
  'split',
  'deficit',
  'surplus',
  'pace',
  'sia',
  'coach',
  'athlete',
  'warning',
  'important',
  'summary',
  'telemetry',
  'context',
]);

/**
 * Validates that an extracted string is an actual dish/food name,
 * and not a telemetry stat (like "450 kcal", "120g protein", "Live Status").
 */
export function isValidDishName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;

  // Reject if it is purely numbers, symbols, and macro units (e.g. "450 kcal", "120g", "25g protein")
  const stripped = trimmed.toLowerCase().replace(/[\d\s~,.\-+:()]/g, '');
  if (!stripped || stripped.length < 2) return false;
  if (FORBIDDEN_WORDS.has(stripped)) return false;

  // Reject unit prefixes/suffixes like "gprotein", "kcal", "calories"
  if (/^(?:g|mg|kg)?(?:protein|carbs?|fats?|kcal|calories?|cal)$/i.test(stripped)) return false;
  if (/^(?:protein|carbs?|fats?|kcal|calories?|cal)(?:g|mg|kg)?$/i.test(stripped)) return false;

  // Must contain at least one real word that is NOT a forbidden macro keyword
  const words = trimmed.split(/[\s,&/+\-():]+/).map((w) => w.toLowerCase()).filter(Boolean);
  const realWords = words.filter((w) => !FORBIDDEN_WORDS.has(w) && !/^\d+/.test(w));
  if (realWords.length === 0) return false;

  return true;
}

/**
 * Extracts genuine meal suggestions from Sia's conversational markdown output.
 * Looks for meal recommendations formatted with dish names and macro estimates.
 */
export function parseMealSuggestions(text: string): ParsedSuggestedMeal[] {
  if (!text) return [];

  const lines = text.split('\n');
  const suggestions: ParsedSuggestedMeal[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Skip status / telemetry summary lines entirely
    if (
      /(?:remaining|consumed|live status|daily target|current status|exceeded|balance after|deficit locked|macro split|today's status)/i.test(
        trimmed
      )
    ) {
      continue;
    }

    // 2. Extract dish name from bold markdown or list item
    let dishName = '';
    const boldMatch = trimmed.match(/\*\*(.*?)\*\*/);

    if (boldMatch) {
      dishName = boldMatch[1].trim();
    } else {
      // Check for numbered/bullet item without bold: "1. Grilled Chicken Bowl: 450 kcal..."
      const listMatch = trimmed.match(
        /^(?:[-*•]|\d+\.)\s+([A-Za-z][A-Za-z0-9\s,&/'-]{3,40})\s*[:\-(]/
      );
      if (listMatch) {
        dishName = listMatch[1].trim();
      }
    }

    // 3. Strict validation of dish name
    if (!isValidDishName(dishName)) {
      continue;
    }

    // 4. Extract macros from the line (focusing on text outside the dish name)
    const lineWithoutDish = trimmed.replace(`**${dishName}**`, '').replace(dishName, '');

    let calories = 0;
    const calMatch = lineWithoutDish.match(/(?:~?\s*(\d+)\s*(?:kcal|calories|cal)\b)/i);
    if (calMatch) {
      calories = parseInt(calMatch[1], 10);
    }

    let protein = 0;
    const protMatch = lineWithoutDish.match(
      /(?:(?:protein|prot|p)\s*[:~]?\s*(\d+(?:\.\d+)?)\s*g?\b|(\d+(?:\.\d+)?)\s*g\s*(?:protein|prot|p)\b)/i
    );
    if (protMatch) {
      protein = Math.round(parseFloat(protMatch[1] || protMatch[2]));
    }

    let carbs = 0;
    const carbMatch = lineWithoutDish.match(
      /(?:(?:carbs?|carb|c)\s*[:~]?\s*(\d+(?:\.\d+)?)\s*g?\b|(\d+(?:\.\d+)?)\s*g\s*(?:carbs?|carb|c)\b)/i
    );
    if (carbMatch) {
      carbs = Math.round(parseFloat(carbMatch[1] || carbMatch[2]));
    }

    let fat = 0;
    const fatMatch = lineWithoutDish.match(
      /(?:(?:fats?|fat|f)\s*[:~]?\s*(\d+(?:\.\d+)?)\s*g?\b|(\d+(?:\.\d+)?)\s*g\s*(?:fats?|fat|f)\b)/i
    );
    if (fatMatch) {
      fat = Math.round(parseFloat(fatMatch[1] || fatMatch[2]));
    }

    // Must have realistic calories or protein to be considered a meal suggestion
    if (calories >= 50 || protein >= 8) {
      // Approximate calories if missing
      if (calories === 0) {
        calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
      }

      // Approximate macros if only calories and protein provided
      if (carbs === 0 && fat === 0 && calories > protein * 4) {
        const remCal = calories - protein * 4;
        carbs = Math.round((remCal * 0.6) / 4);
        fat = Math.round((remCal * 0.4) / 9);
      }

      // Extract individual food items
      const items = dishName
        .split(/(?:\s+with\s+|\s+and\s+|\s+&\s+|\s*\+\s*)/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      suggestions.push({
        name: dishName,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        food_items: items.length > 0 ? items : [dishName],
      });
    }
  }

  // Deduplicate suggestions by dish name
  const uniqueMap = new Map<string, ParsedSuggestedMeal>();
  for (const s of suggestions) {
    const key = s.name.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, s);
    }
  }

  return Array.from(uniqueMap.values());
}
