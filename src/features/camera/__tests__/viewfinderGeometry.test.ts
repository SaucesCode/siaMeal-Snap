import { windowFor } from '../viewfinderGeometry';

describe('windowFor', () => {
  it("photo: a circle 78% of the width (at most 300) a bit above the middle, like Sia's eye", () => {
    expect(windowFor('photo', 375, 700)).toEqual({ x: 41, y: 148, width: 293, height: 293, radius: 146.5 });
    expect(windowFor('photo', 800, 900).width).toBe(300);
  });

  it('barcode: a wide rounded window', () => {
    expect(windowFor('barcode', 375, 700)).toEqual({ x: 30, y: 219, width: 315, height: 150, radius: 20 });
  });
});
