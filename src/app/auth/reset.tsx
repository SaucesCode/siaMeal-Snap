import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { hapticFeedback } from '../../utils/haptics';
import { routeAfterAuth } from '../../features/auth/afterAuth';
import { validateAuthForm, type AuthErrors } from '../../features/auth/authForm';
import { linkError, linkParams } from '../../features/auth/linkParams';
import { Field } from '../../features/auth/Field';
import { Sia } from '../../components/sia';
import { Tap } from '../../components/Tap';
import { palette, radius, space, type } from '../../theme';

type Stage = 'checking' | 'ready' | 'failed';

/** Opened from the password-reset email: signs in with the link, then asks for a new password. */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [stage, setStage] = useState<Stage>('checking');
  const [problem, setProblem] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url || stage === 'ready') return;
    const params = linkParams(url);
    const fail = (message: string) => {
      setProblem(message);
      setStage('failed');
    };
    const failed = linkError(params);
    if (failed) return fail(failed);
    (async () => {
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return fail('Open the reset link from your email on this phone.');
        }
        setStage('ready');
      } catch (err: any) {
        fail(err?.message || "Couldn't open that link. Ask for a new one.");
      }
    })();
  }, [url]);

  const save = async () => {
    const found = validateAuthForm('reset', { email: '', password, confirm });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      hapticFeedback.error();
      return;
    }
    try {
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      hapticFeedback.success();
      await routeAfterAuth(router, fetchProfile);
    } catch (err: any) {
      hapticFeedback.error();
      const message = String(err?.message || '');
      setErrors({
        password: /different from the old/i.test(message) ? 'Use a password you haven’t used before.' : message || "Couldn't save it. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {stage === 'checking' && (
            <View style={styles.center} accessibilityLiveRegion="polite">
              <Sia expression="thinking" size={88} />
              <ActivityIndicator color={palette.text} style={styles.spinner} />
              <Text style={styles.title}>Opening your link…</Text>
            </View>
          )}

          {stage === 'failed' && (
            <View style={styles.center} accessibilityLiveRegion="polite">
              <Sia expression="puzzled" size={88} />
              <Text style={styles.title} accessibilityRole="header">
                That link didn’t work
              </Text>
              <Text style={[styles.subtitle, styles.centered]}>{problem}</Text>
              <Tap
                onPress={() => router.replace({ pathname: '/(auth)/email', params: { mode: 'signin' } } as any)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.submit, styles.wide, pressed && styles.pressed]}
              >
                <Text style={styles.submitText}>Back to sign in</Text>
              </Tap>
            </View>
          )}

          {stage === 'ready' && (
            <>
              <Sia expression="happy" size={72} />
              <Text style={styles.title} accessibilityRole="header">
                Set a new password
              </Text>
              <Text style={styles.subtitle}>You’re signed in. Choose a password you’ll remember.</Text>
              <Field
                label="New password"
                secure
                value={password}
                onText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                error={errors.password}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                textContentType="newPassword"
                autoFocus
              />
              <Field
                label="Confirm password"
                secure
                value={confirm}
                onText={(t) => {
                  setConfirm(t);
                  if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
                }}
                error={errors.confirm}
                placeholder="Type it again"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={save}
              />
              <Tap
                onPress={save}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: busy }}
                style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
              >
                {busy ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.submitText}>Save password</Text>}
              </Tap>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space[6], paddingTop: space[8], paddingBottom: space[8] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginTop: space[4] },
  title: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text, marginTop: space[3] },
  subtitle: { fontFamily: type.body, fontSize: type.size.body, lineHeight: 21, color: palette.textMuted, marginTop: space[1], marginBottom: space[4] },
  submit: { minHeight: 54, marginTop: space[2], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  wide: { alignSelf: 'stretch' },
  centered: { textAlign: 'center' },
  submitText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
});
