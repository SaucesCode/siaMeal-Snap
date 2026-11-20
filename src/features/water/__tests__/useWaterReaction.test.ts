import { act, renderHook } from '@testing-library/react-native';
import { useWaterReaction } from '../useWaterReaction';

type Props = { ml: number; goal: number; addedAt: number };
const setup = (initial: Props) => renderHook((p: Props) => useWaterReaction(p.ml, p.goal, p.addedAt), { initialProps: initial });

describe('useWaterReaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 20, 14, 30));
  });
  afterEach(() => jest.useRealTimers());

  it('follows the pace, and keeps the same reaction when nothing changed', async () => {
    const { result } = await setup({ ml: 300, goal: 2500, addedAt: 0 });
    expect(result.current).toEqual({ expression: 'concerned', line: null, spot: 'center' });
    const first = result.current;
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(first);
  });

  it('is pleased at a new spot after an add, then goes back to her mood there', async () => {
    const { result, rerender } = await setup({ ml: 300, goal: 2500, addedAt: 0 });
    await rerender({ ml: 550, goal: 2500, addedAt: Date.now() });
    expect(result.current.expression).toBe('loves');
    const spot = result.current.spot;
    expect(spot).not.toBe('center');
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current).toEqual({ expression: 'resting', line: null, spot });
  });

  it('stays pleased until 1.5 s after the last of two quick adds', async () => {
    const { result, rerender } = await setup({ ml: 300, goal: 2500, addedAt: 0 });
    await rerender({ ml: 550, goal: 2500, addedAt: Date.now() });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await rerender({ ml: 800, goal: 2500, addedAt: Date.now() });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.expression).toBe('loves');
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.expression).not.toBe('loves');
  });

  it('celebrates in the middle straight away when an add reaches the goal', async () => {
    const { result, rerender } = await setup({ ml: 2200, goal: 2500, addedAt: 0 });
    await rerender({ ml: 2700, goal: 2500, addedAt: Date.now() });
    expect(result.current).toEqual({ expression: 'celebrating', line: null, spot: 'center' });
  });

  it('re-reads the clock while the tab stays open', async () => {
    jest.setSystemTime(new Date(2026, 10, 20, 8, 30));
    const { result } = await setup({ ml: 0, goal: 2500, addedAt: 0 });
    expect(result.current.expression).toBe('sleepy');
    jest.setSystemTime(new Date(2026, 10, 20, 16, 0));
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.expression).toBe('concerned');
  });
});
