/** One food Sia found on the plate. Calories of all items add up to the meal's total. */
export interface MealItem {
  name: string;
  /** Plain portion, e.g. "1 cup", "2 pcs". */
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Centre of the item in the photo, 0–1 from the left/top. Photos only. */
  x?: number;
  y?: number;
}

const MAX_ITEMS = 8;
const MAX_NAME = 40;
const MAX_AMOUNT = 24;

const amount = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
const unit = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** The model's `items`, cleaned: valid entries only, sane numbers, short text, positions only when valid. */
export function sanitizeItems(raw: unknown): MealItem[] {
  if (!Array.isArray(raw)) return [];
  const items: MealItem[] = [];
  for (const entry of raw) {
    if (items.length === MAX_ITEMS) break;
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = String(e.name ?? "").trim().slice(0, MAX_NAME);
    if (!name) continue;
    const item: MealItem = {
      name,
      amount: String(e.amount ?? "").trim().slice(0, MAX_AMOUNT),
      calories: amount(e.calories),
      protein_g: amount(e.protein_g),
      carbs_g: amount(e.carbs_g),
      fat_g: amount(e.fat_g),
    };
    if (unit(e.x) && unit(e.y)) {
      item.x = e.x as number;
      item.y = e.y as number;
    }
    items.push(item);
  }
  return items;
}
