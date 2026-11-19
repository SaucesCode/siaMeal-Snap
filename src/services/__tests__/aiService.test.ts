import { supabase } from '../../lib/supabase';
import { analyzeMealPhoto, analyzeMealText, NotFoodError } from '../aiService';

jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() }, auth: { getSession: jest.fn() } },
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
}));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: {} }));

const invoke = supabase.functions.invoke as jest.Mock;

/** Shape of supabase-js FunctionsHttpError: the HTTP Response sits on `context`. */
function httpError(status: number, body: unknown) {
  return { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(body), { status }) };
}

describe('analyzeMealPhoto', () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    invoke.mockReset();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it('rejects a non-food photo with NotFoodError carrying Sia\'s reason, without logging an error', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(422, { is_food: false, non_food_reason: "That's a keyboard, not a meal." }),
    });

    const result = analyzeMealPhoto('data:image/webp;base64,AAAA');

    await expect(result).rejects.toBeInstanceOf(NotFoodError);
    await expect(result).rejects.toThrow("That's a keyboard, not a meal.");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('also treats a 200 response marked is_food:false as NotFoodError', async () => {
    invoke.mockResolvedValue({ data: { is_food: false, non_food_reason: 'Not food.' }, error: null });
    await expect(analyzeMealPhoto('x')).rejects.toBeInstanceOf(NotFoodError);
  });

  it('passes other server messages through as plain errors (e.g. the hourly limit)', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(429, { error: 'Sia needs a short catnap.' }) });
    const result = analyzeMealPhoto('x');
    await expect(result).rejects.not.toBeInstanceOf(NotFoodError);
    await expect(result).rejects.toThrow('Sia needs a short catnap.');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('analyzeMealText', () => {
  beforeEach(() => invoke.mockReset());

  it('rejects a non-food description with NotFoodError', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(422, { is_food: false, non_food_reason: 'Not food.' }) });
    await expect(analyzeMealText('a brick')).rejects.toBeInstanceOf(NotFoodError);
  });
});
