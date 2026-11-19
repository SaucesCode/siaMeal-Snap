import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { linkError, linkParams } from '../../features/auth/linkParams';
import { routeAfterAuth } from '../../features/auth/afterAuth';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Sia } from '../../components/sia';
import { palette, space, type } from '../../theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const search = useLocalSearchParams<Record<string, string>>();
  const url = Linking.useURL();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (url === null) return;
    // Email-confirmation and implicit-flow links carry their tokens after "#", which route params never see.
    const params = { ...search, ...linkParams(url) };
    const giveUp = (message: string) => {
      setErrorMsg(message);
      setTimeout(() => router.replace('/(auth)/login' as any), 2500);
    };
    (async () => {
      try {
        const failed = linkError(params);
        if (failed) return giveUp(failed);
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) return giveUp('That link didn’t sign you in.');
        await routeAfterAuth(router, fetchProfile);
      } catch (err: any) {
        giveUp(err?.message || 'Please try again.');
      }
    })();
  }, [url]);

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
