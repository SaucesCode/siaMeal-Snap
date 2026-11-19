import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { hapticFeedback } from '../../utils/haptics';
import { routeAfterAuth } from '../../features/auth/afterAuth';
import { validateAuthForm, type AuthErrors, type AuthMode } from '../../features/auth/authForm';
import { Sia } from '../../components/sia';
import { Tap } from '../../components/Tap';
import { palette, radius, space, type } from '../../theme';

function Field({
  label,
  error,
  secure,
  value,
  onText,
  ...input
}: {
  label: string;
  error?: string;
  secure?: boolean;
  value: string;
  onText: (t: string) => void;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText' | 'onChange'>) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, error ? styles.inputError : null]}>
        <TextInput
          value={value}
          onChangeText={onText}
          secureTextEntry={secure && hidden}
          placeholderTextColor={palette.textMuted}
          accessibilityLabel={label}
          style={styles.input}
          {...input}
        />
        {secure && (
          <Tap
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={palette.textMuted} />
          </Tap>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Sign in or create an account with email; inline messages, typed input is never lost. */
export default function EmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [mode, setMode] = useState<AuthMode>(params.mode === 'signin' ? 'signin' : 'create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = mode === 'create';

  const clear = (key: keyof AuthErrors) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  const submit = async () => {
    const found = validateAuthForm(mode, { email, password, confirm });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      hapticFeedback.error();
      return;
    }
    try {
      setBusy(true);
      setFormError(null);
      hapticFeedback.medium();
      if (creating) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          hapticFeedback.success();
          router.replace('/(auth)/onboarding' as any);
        } else {
          setNotice(`We sent a link to ${email.trim()}. Open it to confirm your account, then sign in here.`);
          setMode('signin');
          setConfirm('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        hapticFeedback.success();
        await routeAfterAuth(router, fetchProfile);
      }
    } catch (err: any) {
      hapticFeedback.error();
      const message = String(err?.message || '');
      setFormError(
        /invalid login/i.test(message)
          ? 'That email and password don’t match. Check them and try again.'
          : /already registered/i.test(message)
            ? 'There’s already an account with that email. Sign in instead.'
            : message || 'Something went wrong. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Tap onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Tap>
          <Sia expression={creating ? 'happy' : 'resting'} size={72} />
          <Text style={styles.title} accessibilityRole="header">
            {creating ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>{creating ? 'Takes a minute. Sia will set up your plan next.' : 'Sign in to pick up where you left off.'}</Text>

          {notice ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Ionicons name="mail-unread-outline" size={18} color={palette.leafText} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <Field
            label="Email"
            value={email}
            onText={(t) => {
              setEmail(t);
              clear('email');
            }}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            secure
            value={password}
            onText={(t) => {
              setPassword(t);
              clear('password');
            }}
            error={errors.password}
            placeholder={creating ? 'At least 6 characters' : 'Your password'}
            autoComplete={creating ? 'new-password' : 'current-password'}
            textContentType={creating ? 'newPassword' : 'password'}
          />
          {creating && (
            <Field
              label="Confirm password"
              secure
              value={confirm}
              onText={(t) => {
                setConfirm(t);
                clear('confirm');
              }}
              error={errors.confirm}
              placeholder="Type it again"
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={submit}
            />
          )}

          {formError ? (
            <Text style={styles.formError} accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}

          <Tap
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.submitText}>{creating ? 'Create account' : 'Sign in'}</Text>}
          </Tap>

          <Tap
            onPress={() => {
              setMode(creating ? 'signin' : 'create');
              setErrors({});
              setFormError(null);
            }}
            accessibilityRole="button"
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {creating ? 'Already have an account? ' : 'New here? '}
              <Text style={styles.switchStrong}>{creating ? 'Sign in' : 'Create an account'}</Text>
            </Text>
          </Tap>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space[6], paddingBottom: space[8] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -space[2], marginBottom: space[2] },
  title: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text, marginTop: space[3] },
  subtitle: { fontFamily: type.body, fontSize: type.size.body, lineHeight: 21, color: palette.textMuted, marginTop: space[1], marginBottom: space[4] },
  notice: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[3],
    marginBottom: space[3],
    borderRadius: radius.control,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  noticeText: { flex: 1, fontFamily: type.bodySemibold, fontSize: type.size.secondary, lineHeight: 19, color: palette.text },
  field: { marginBottom: space[3] },
  label: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginBottom: space[1] },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  inputError: { borderColor: palette.over },
  input: { flex: 1, minHeight: 50, fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.text },
  eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[1] },
  formError: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, lineHeight: 19, color: palette.over, marginBottom: space[2] },
  submit: { minHeight: 54, marginTop: space[2], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  submitText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
  switchText: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  switchStrong: { fontFamily: type.bodyBold, color: palette.text },
});
