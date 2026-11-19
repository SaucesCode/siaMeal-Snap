const PORK = 'pork|bacon|\\bham\\b|lechon|chicharon|longganisa|sisig|tocino|liempo';
const BEEF = 'beef|sirloin|steak|tapa\\b|bulalo|brisket';
const POULTRY = 'chicken|turkey|duck';
const SEAFOOD = 'salmon|tuna|\\bcod\\b|fish|shrimp|prawn|crab|squid|sardine|anchov|tilapia|bangus|seafood';
const DAIRY = 'yog(h)?urt|cheese|milk|whey|casein|cottage|feta|tzatziki|butter|cream|dairy';
const EGG = '\\begg';

/** For each "foods you avoid" choice, the words that give a dish away (English and Filipino). */
const RULES: Record<string, RegExp> = {
  'No pork': new RegExp(PORK, 'i'),
  'No beef': new RegExp(BEEF, 'i'),
  Vegetarian: new RegExp([PORK, BEEF, POULTRY, SEAFOOD, 'meat|bolognese'].join('|'), 'i'),
  Vegan: new RegExp([PORK, BEEF, POULTRY, SEAFOOD, DAIRY, EGG, 'meat|bolognese|honey'].join('|'), 'i'),
  'No seafood': new RegExp(SEAFOOD, 'i'),
  'No dairy': new RegExp(DAIRY, 'i'),
  'Gluten-free': /bread|sourdough|pasta|rigatoni|spaghetti|noodle|tortilla|wrap\b|burrito|wheat|pandesal/i,
  'Nut allergy': /almond|peanut|cashew|walnut|pistachio|hazelnut|\bnuts?\b/i,
};

/** True when a dish (name and ingredients) contains anything the person avoids. */
export function avoidsFood(text: string, foodsAvoided: readonly string[]): boolean {
  return foodsAvoided.some((choice) => RULES[choice]?.test(text) ?? false);
}
