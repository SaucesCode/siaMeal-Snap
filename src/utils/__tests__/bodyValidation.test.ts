import { validateBody } from '../bodyValidation';

describe('validateBody', () => {
  it('accepts realistic adult measurements', () => {
    expect(validateBody({ age: '26', height: '175', weight: '74.5' })).toEqual({});
  });

  it('explains each out-of-range or missing value in plain words', () => {
    expect(validateBody({ age: '9', height: '175', weight: '74' })).toEqual({ age: 'Enter an age from 13 to 100.' });
    expect(validateBody({ age: '26', height: '', weight: '74' })).toEqual({ height: 'Enter your height in cm (120–230).' });
    expect(validateBody({ age: '26', height: '175', weight: '400' })).toEqual({ weight: 'Enter your weight in kg (30–300).' });
  });
});
