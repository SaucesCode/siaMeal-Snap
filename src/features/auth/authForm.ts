export type AuthMode = 'signin' | 'create';
export interface AuthFields {
  email: string;
  password: string;
  confirm: string;
}
export type AuthErrors = Partial<Record<keyof AuthFields, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

/** Inline messages for the email form; an empty object means it can be sent. */
export function validateAuthForm(mode: AuthMode, { email, password, confirm }: AuthFields): AuthErrors {
  const errors: AuthErrors = {};
  const e = email.trim();
  if (!e) errors.email = 'Enter your email.';
  else if (!EMAIL.test(e)) errors.email = 'That email doesn’t look right.';
  if (!password) errors.password = 'Enter your password.';
  else if (mode === 'create' && password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (mode === 'create' && password.length >= MIN_PASSWORD && confirm !== password) errors.confirm = 'Passwords don’t match.';
  return errors;
}
