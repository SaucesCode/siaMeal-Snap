import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../stores/authStore';
import { performGoogleOAuth } from '../../utils/oauth';
import { hapticFeedback } from '../../utils/haptics';
import { routeAfterAuth } from '../../features/auth/afterAuth';
import { SiaPeek } from '../../features/sia/SiaPeek';
import type { SiaReaction } from '../../features/sia/siaReactions';
import { Tap } from '../../components/Tap';
import { palette, radius, space, type } from '../../theme';

const BENEFITS = [
  'Snap your plate, Sia counts the calories',
  "See what's left for the day at a glance",
  'Ask Sia what to eat next',
];

/** Welcome: what the app does, then Google or email. New and returning people start here. */
export default function WelcomeScreen() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [googleBusy, setGoogleBusy] = useState(false);
  const hello = useMemo<SiaReaction>(() => ({ expression: 'happy', line: null, spot: 'center' }), []);

  const continueWithGoogle = async () => {
    try {
      hapticFeedback.medium();
      setGoogleBusy(true);
      const res = await performGoogleOAuth();
      if (res) {
        hapticFeedback.success();
        await routeAfterAuth(router, fetchProfile);
      }
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't sign in with Google", err?.message || 'Please try again, or use your email.');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={styles.top}>
        <ScrollView contentContainerStyle={styles.topContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.wordmark} accessibilityRole="header">
            SiaMeal <Text style={styles.wordmarkAccent}>Snap</Text>
          </Text>
          <Text style={styles.tagline}>Your cat-shaped calorie buddy.</Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={14} color={palette.leaf} />
                </View>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.panel}>
        <SiaPeek reaction={hello} startHidden onPress={() => hapticFeedback.purr()} />
        <Tap
          onPress={continueWithGoogle}
          disabled={googleBusy}
          accessibilityRole="button"
          accessibilityState={{ busy: googleBusy }}
          style={({ pressed }) => [styles.button, styles.google, pressed && styles.pressed]}
        >
          {googleBusy ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={palette.text} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Tap>
        <Tap
          onPress={() => router.push({ pathname: '/(auth)/email', params: { mode: 'create' } } as any)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.email, pressed && styles.pressed]}
        >
          <Ionicons name="mail-outline" size={18} color={palette.pointText} />
          <Text style={styles.emailText}>Continue with email</Text>
        </Tap>
        <Tap
          onPress={() => router.push({ pathname: '/(auth)/email', params: { mode: 'signin' } } as any)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInStrong}>Sign in</Text>
          </Text>
        </Tap>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.point },
  pressed: { opacity: 0.7 },
  top: { flex: 1 },
  topContent: { paddingHorizontal: space[6], paddingTop: space[8], paddingBottom: 110 },
  wordmark: { fontFamily: type.display, fontSize: 34, color: palette.pointText },
  wordmarkAccent: { color: palette.leaf },
  tagline: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.pointMuted, marginTop: space[1] },
  benefits: { marginTop: space[6], gap: space[3] },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.pointTrack },
  benefitText: { flex: 1, fontFamily: type.bodySemibold, fontSize: type.size.body, lineHeight: 21, color: palette.pointText },
  panel: {
    paddingHorizontal: space[6],
    paddingTop: space[6],
    paddingBottom: space[4],
    borderTopLeftRadius: radius.hero + 6,
    borderTopRightRadius: radius.hero + 6,
    backgroundColor: palette.bg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    minHeight: 54,
    borderRadius: radius.full,
    marginBottom: space[3],
  },
  google: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  googleText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  email: { backgroundColor: palette.point },
  emailText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  signIn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  signInText: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  signInStrong: { fontFamily: type.bodyBold, color: palette.text },
});
