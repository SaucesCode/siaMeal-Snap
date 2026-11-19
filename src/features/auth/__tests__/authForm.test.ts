import { validateAuthForm } from '../authForm';

describe('validateAuthForm', () => {
  it('sign in needs an email and a password', () => {
    expect(validateAuthForm('signin', { email: '', password: '', confirm: '' })).toEqual({
      email: 'Enter your email.',
      password: 'Enter your password.',
    });
    expect(validateAuthForm('signin', { email: 'me@example.com', password: 'x', confirm: '' })).toEqual({});
  });

  it('checks the email looks like one', () => {
    expect(validateAuthForm('signin', { email: 'me@', password: 'secret', confirm: '' })).toEqual({ email: 'That email doesn’t look right.' });
  });

  it('creating an account needs 6+ characters and a matching confirmation', () => {
    expect(validateAuthForm('create', { email: 'me@example.com', password: '123', confirm: '123' })).toEqual({
      password: 'Use at least 6 characters.',
    });
    expect(validateAuthForm('create', { email: 'me@example.com', password: 'secret1', confirm: 'secret2' })).toEqual({
      confirm: 'Passwords don’t match.',
    });
    expect(validateAuthForm('create', { email: ' me@example.com ', password: 'secret1', confirm: 'secret1' })).toEqual({});
  });
});

describe('forgot and reset modes', () => {
  it('forgot password only needs a valid email', () => {
    expect(validateAuthForm('forgot', { email: '', password: '', confirm: '' })).toEqual({ email: 'Enter your email.' });
    expect(validateAuthForm('forgot', { email: 'me@example.com', password: '', confirm: '' })).toEqual({});
  });

  it('a new password needs 6+ characters and a match, but no email', () => {
    expect(validateAuthForm('reset', { email: '', password: '', confirm: '' })).toEqual({ password: 'Enter a new password.' });
    expect(validateAuthForm('reset', { email: '', password: '123', confirm: '123' })).toEqual({ password: 'Use at least 6 characters.' });
    expect(validateAuthForm('reset', { email: '', password: 'secret1', confirm: 'secret2' })).toEqual({ confirm: 'Passwords don’t match.' });
    expect(validateAuthForm('reset', { email: '', password: 'secret1', confirm: 'secret1' })).toEqual({});
  });
});
