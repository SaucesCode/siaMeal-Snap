import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useShallow } from 'zustand/react/shallow';

export default function AuthLayout() {
  const { session, profile, isInitialized } = useAuthStore(
    useShallow((s) => ({ session: s.session, profile: s.profile, isInitialized: s.isInitialized }))
  );

  if (isInitialized && session && profile?.target_calories) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#09090b' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
