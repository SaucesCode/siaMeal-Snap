import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AiNutritionCoachModal } from '../AiNutritionCoachModal';
import { useCoachStore } from '../../stores/coachStore';

jest.mock('../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

configure({ defaultIncludeHiddenElements: true });

const now = new Date().toISOString();
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderCoach = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AiNutritionCoachModal visible onClose={jest.fn()} userContext={{ remainingCalories: 760, remainingProtein: 62 }} />
    </SafeAreaProvider>
  );

describe('<AiNutritionCoachModal />', () => {
  beforeEach(() => {
    useCoachStore.setState({
      isLoaded: true,
      loadHistory: jest.fn(),
      messages: [
        { id: '1', role: 'user', content: 'What should I eat?', timestamp: now },
        { id: '2', role: 'assistant', content: 'Try **grilled chicken** with rice, about 450 kcal.', timestamp: now },
        { id: '3', role: 'user', content: 'Something lighter?', timestamp: now },
        { id: '4', role: 'assistant', content: 'A tuna salad: 320 kcal and 30g protein.', timestamp: now },
      ],
    });
  });

  it('a long chat has one animated Sia (the header); message avatars are the small still drawing', async () => {
    await renderCoach();
    expect(screen.getAllByTestId('sia')).toHaveLength(3);
    expect(screen.getAllByTestId('sia-simplified')).toHaveLength(2);
  });

  it('shows what is left today as tap-to-ask chips, and the disclaimer', async () => {
    await renderCoach();
    expect(screen.getByLabelText('760 kcal left. Ask Sia about it.')).toBeTruthy();
    expect(screen.getByText('Sia shares general nutrition info, not medical advice.')).toBeTruthy();
  });
});
