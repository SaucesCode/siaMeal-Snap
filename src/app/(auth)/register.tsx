import React from 'react';
import { Redirect } from 'expo-router';

/** Old sign-up link: account creation now lives on the email screen. */
export default function RegisterScreen() {
  return <Redirect href={{ pathname: '/(auth)/email', params: { mode: 'create' } } as any} />;
}
