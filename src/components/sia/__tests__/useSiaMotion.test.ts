import { renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { siaPose } from '../siaPose';
import { useSiaMotion } from '../useSiaMotion';

jest.mock('react-native-reanimated', () => ({
  ...require('../../../../jest/reanimatedMock'),
  useReducedMotion: jest.fn(() => false),
}));

const mockedReducedMotion = useReducedMotion as jest.Mock;

describe('useSiaMotion', () => {
  afterEach(() => mockedReducedMotion.mockReturnValue(false));

  it('animates an expression that has motion when enabled', async () => {
    const { result } = await renderHook(() => useSiaMotion(siaPose('thinking'), true));
    expect(result.current.isAnimating).toBe(true);
  });

  it('stays static under the system reduced-motion setting', async () => {
    mockedReducedMotion.mockReturnValue(true);
    const { result } = await renderHook(() => useSiaMotion(siaPose('thinking'), true));
    expect(result.current.isAnimating).toBe(false);
  });

  it('stays static when animation is disabled (e.g. animated={false})', async () => {
    const { result } = await renderHook(() => useSiaMotion(siaPose('loves'), false));
    expect(result.current.isAnimating).toBe(false);
  });

  it('never animates an expression whose motion is none', async () => {
    const { result } = await renderHook(() => useSiaMotion(siaPose('puzzled'), true));
    expect(result.current.isAnimating).toBe(false);
  });

  it('starts pupils and aperture at the pose values', async () => {
    const { result } = await renderHook(() => useSiaMotion(siaPose('loves'), false));
    expect(result.current.pupilRx.value).toBe(11.5);
    expect(result.current.pupilRy.value).toBe(11.5);
    expect(result.current.aperture.value).toBe(1.4);
  });
});
