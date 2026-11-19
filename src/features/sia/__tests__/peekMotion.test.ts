import { PEEK_LEAN, PEEK_SIZE, peekX } from '../peekMotion';

describe('peekX', () => {
  it('puts Sia over the left of the card, its middle, or its right', () => {
    expect(PEEK_SIZE).toBe(84);
    expect(peekX('left', 320)).toBe(8);
    expect(peekX('center', 320)).toBe(118);
    expect(peekX('right', 320)).toBe(228);
  });

  it('never places her off the card before it has been measured', () => {
    expect(peekX('right', 0)).toBe(0);
    expect(peekX('center', 40)).toBe(0);
  });
});

describe('PEEK_LEAN', () => {
  it('leans her toward the middle of the card as she rises', () => {
    expect(PEEK_LEAN).toEqual({ left: 4, center: 0, right: -4 });
  });
});
