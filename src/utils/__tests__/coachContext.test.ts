import { buildCoachContext } from '../coachContext';

describe('buildCoachContext', () => {
  it("passes the foods someone avoids to the coach, and never invents a name", () => {
    const ctx = buildCoachContext({ foods_avoided: ['No pork', 'No dairy'] } as any, null, []);
    expect(ctx.foodsAvoided).toEqual(['No pork', 'No dairy']);
    expect(ctx.displayName).toBeUndefined();
  });

  it('no foods avoided gives an empty list', () => {
    expect(buildCoachContext(null, 'a@b.com', []).foodsAvoided).toEqual([]);
  });
});
