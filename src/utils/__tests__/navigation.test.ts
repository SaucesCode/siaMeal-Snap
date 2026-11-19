import { goBackOr } from '../navigation';

const fakeRouter = (canGoBack: boolean) => ({ canGoBack: jest.fn(() => canGoBack), back: jest.fn(), replace: jest.fn() });

describe('goBackOr', () => {
  it('goes back when there is a screen behind', () => {
    const router = fakeRouter(true);
    goBackOr(router, '/(auth)/login');
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the fallback screen when there is nothing to go back to', () => {
    const router = fakeRouter(false);
    goBackOr(router, '/(auth)/login');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
