export interface BodyInput {
  age: string;
  height: string;
  weight: string;
}

export type BodyErrors = Partial<Record<keyof BodyInput, string>>;

const RULES: Record<keyof BodyInput, { min: number; max: number; message: string }> = {
  age: { min: 13, max: 100, message: 'Enter an age from 13 to 100.' },
  height: { min: 120, max: 230, message: 'Enter your height in cm (120–230).' },
  weight: { min: 30, max: 300, message: 'Enter your weight in kg (30–300).' },
};

/** Inline errors for the body sheet; an empty object means everything is usable for targets. */
export function validateBody(input: BodyInput): BodyErrors {
  const errors: BodyErrors = {};
  for (const key of Object.keys(RULES) as Array<keyof BodyInput>) {
    const { min, max, message } = RULES[key];
    const n = Number(input[key].replace(',', '.'));
    if (!input[key].trim() || !Number.isFinite(n) || n < min || n > max) errors[key] = message;
  }
  return errors;
}

/** Up to two initials: first and last word of the name, else the email's first letter. */
export function initialsFor(fullName: string | null | undefined, email: string | null | undefined): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email?.trim()[0] ?? '?').toUpperCase();
}
