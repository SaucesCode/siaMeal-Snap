export type AuthMode = 'signin' | 'create' | 'forgot' | 'reset';
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
  if (mode !== 'reset') {
    const e = email.trim();
    if (!e) errors.email = 'Enter your email.';
    else if (!EMAIL.test(e)) errors.email = 'That email doesn’t look right.';
  }
  if (mode === 'forgot') return errors;
  const newPassword = mode === 'create' || mode === 'reset';
  if (!password) errors.password = mode === 'reset' ? 'Enter a new password.' : 'Enter your password.';
  else if (newPassword && password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (newPassword && password.length >= MIN_PASSWORD && confirm !== password) errors.confirm = 'Passwords don’t match.';
  return errors;
}
