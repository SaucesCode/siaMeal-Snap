import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen from '../(auth)/login';
import EmailScreen from '../(auth)/email';
import OnboardingScreen from '../(auth)/onboarding';
import { useAuthStore } from '../../stores/authStore';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockParams: { mode?: string } = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
const mockSignIn = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (...a: unknown[]) => mockSignIn(...a), signUp: jest.fn() } },
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
}));
jest.mock('../../services/notificationService', () => ({ requestNotificationPermission: jest.fn().mockResolvedValue(false) }));

configure({ defaultIncludeHiddenElements: true });

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const show = (el: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mode = undefined;
});

describe('Welcome', () => {
  it('explains the app and offers Google or email; email goes to account creation', async () => {
    await show(<WelcomeScreen />);
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue with email'));
    expect(mockRouter.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(auth)/email', params: { mode: 'create' } }));
  });
});

describe('Email sign-in', () => {
  it('shows what is missing next to each field and does not call the server', async () => {
    mockParams.mode = 'signin';
    await show(<EmailScreen />);
    await fireEvent.press(screen.getByText('Sign in'));
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('a wrong password is explained in plain words and the typed email stays', async () => {
    mockParams.mode = 'signin';
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    await show(<EmailScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'me@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'nope');
    await fireEvent.press(screen.getByText('Sign in'));
    expect(await screen.findByText('That email and password don’t match. Check them and try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('me@example.com')).toBeTruthy();
  });
});

describe('Onboarding', () => {
  beforeEach(() => useAuthStore.setState({ user: { email: 'me@example.com', user_metadata: {} } as any, profile: null }));

  it('asks for a name first when sign-up gave none, and Back keeps the answer', async () => {
    await show(<OnboardingScreen />);
    expect(screen.getByText('What should Sia call you?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Tell Sia what to call you.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Your name'), 'James');
    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('A little about you')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByDisplayValue('James')).toBeTruthy();
  });

  it('a Google name skips the name question', async () => {
    useAuthStore.setState({ user: { user_metadata: { full_name: 'James De Mesa' } } as any, profile: null });
    await show(<OnboardingScreen />);
    expect(screen.getByText('A little about you')).toBeTruthy();
    expect(screen.getByText('1 of 8')).toBeTruthy();
  });
});
