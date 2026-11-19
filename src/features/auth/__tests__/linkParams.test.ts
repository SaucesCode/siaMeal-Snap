import { linkParams, linkError } from '../linkParams';

describe('linkParams', () => {
  it('reads tokens from the hash of an implicit-flow link', () => {
    const p = linkParams('exp://192.168.1.2:8081/--/auth/reset#access_token=a.b.c&refresh_token=r1&type=recovery');
    expect(p).toMatchObject({ access_token: 'a.b.c', refresh_token: 'r1', type: 'recovery' });
  });

  it('reads a PKCE code from the query', () => {
    expect(linkParams('siamealsnap://auth/callback?code=abc-123').code).toBe('abc-123');
  });

  it('reads both query and hash, decoding values', () => {
    const p = linkParams('siamealsnap://auth/reset?x=1#error=access_denied&error_description=Email+link+is+invalid+or+has+expired');
    expect(p.x).toBe('1');
    expect(p.error_description).toBe('Email link is invalid or has expired');
  });

  it('returns nothing for a link without parameters or no link at all', () => {
    expect(linkParams('siamealsnap://auth/reset')).toEqual({});
    expect(linkParams(null)).toEqual({});
  });
});

describe('linkError', () => {
  it('turns an expired link into plain words', () => {
    expect(linkError({ error: 'access_denied', error_code: 'otp_expired', error_description: 'Email link is invalid or has expired' })).toBe(
      'This link has expired or was already used. Ask for a new one.'
    );
  });

  it('passes other errors through and is null when there is none', () => {
    expect(linkError({ error: 'server_error', error_description: 'Something broke' })).toBe('Something broke');
    expect(linkError({ code: 'x' })).toBeNull();
  });
});
