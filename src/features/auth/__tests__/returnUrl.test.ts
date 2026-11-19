import { returnUrlFrom } from '../returnUrl';

const APP = 'siamealsnap://auth/callback';

describe('returnUrlFrom', () => {
  it('in Expo Go, comes back through the exp:// address that opened the app', () => {
    expect(returnUrlFrom(['exp://192.168.10.28:8081'], 'auth/callback', APP)).toBe('exp://192.168.10.28:8081/--/auth/callback');
  });

  it('keeps only the host of a launch link that already had a path or tokens', () => {
    expect(returnUrlFrom(['exp://192.168.10.28:8081/--/auth/reset#access_token=x'], 'auth/reset', APP)).toBe(
      'exp://192.168.10.28:8081/--/auth/reset'
    );
  });

  it('works for a tunnel (exps://) and skips empty candidates', () => {
    expect(returnUrlFrom([null, undefined, 'exps://ab-cd.exp.direct'], 'auth/callback', APP)).toBe('exps://ab-cd.exp.direct/--/auth/callback');
  });

  it('uses the app scheme in an installed build, or when nothing opened the app by link', () => {
    expect(returnUrlFrom(['siamealsnap://'], 'auth/callback', APP)).toBe(APP);
    expect(returnUrlFrom([null], 'auth/callback', APP)).toBe(APP);
  });
});
