import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Sia } from '../../components/sia';
import { palette, space, type } from '../../theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string; error?: string }>();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuth() {
      try {
        if (params.error) {
          setErrorMsg(params.error);
          setTimeout(() => router.replace('/(auth)/login' as any), 2000);
          return;
        }

        // 1. PKCE code exchange
        if (params.code) {
          console.log('[Auth Callback] Exchanging code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        }
        // 2. Implicit token session
        else if (params.access_token && params.refresh_token) {
          console.log('[Auth Callback] Setting session from tokens...');
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
        }

        // 3. Check profile and navigate
        const profile = await fetchProfile();
        if (!profile || !profile.target_calories) {
          router.replace('/(auth)/onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } catch (err: any) {
        console.error('[Auth Callback] Error handling callback:', err);
        setErrorMsg(err.message || 'Authentication failed');
        setTimeout(() => router.replace('/(auth)/login' as any), 2500);
      }
    }

    handleAuth();
  }, [params]);

  return (
    <View style={styles.screen}>
      <Sia expression={errorMsg ? 'puzzled' : 'thinking'} size={96} />
      {!errorMsg && <ActivityIndicator color={palette.text} style={styles.spinner} />}
      <Text style={styles.title} accessibilityLiveRegion="polite">
        {errorMsg ? "Couldn't finish signing in" : 'Signing you in…'}
      </Text>
      <Text style={styles.body}>{errorMsg ? `${errorMsg} Taking you back to sign in.` : 'One moment.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: palette.bg },
  spinner: { marginTop: space[4] },
  title: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text, marginTop: space[4], textAlign: 'center' },
  body: { fontFamily: type.body, fontSize: type.size.body, color: palette.textMuted, marginTop: space[1], textAlign: 'center' },
});
