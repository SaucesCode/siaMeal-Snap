import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getNotificationStatus, requestNotificationPermission } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';
import { hapticFeedback } from '../utils/haptics';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

/** Asks once (on Today) whether Sia may remind you at your meal times. */
export function NotificationPermissionBanner() {
  const mealTimes = useAuthStore((s) => s.profile?.meal_times);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    getNotificationStatus().then((s) => {
      if (s.isSupported && !s.hasBeenPrompted && !s.hasPermission) setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const enable = async () => {
    hapticFeedback.medium();
    setBusy(true);
    await requestNotificationPermission(mealTimes ?? []);
    setBusy(false);
    setVisible(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="notifications-outline" size={20} color={palette.text} />
        <Text style={styles.title}>Want a nudge at mealtimes?</Text>
        <Tap
          onPress={() => setVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Not now"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={18} color={palette.textMuted} />
        </Tap>
      </View>
      <Text style={styles.body}>Sia can remind you to snap your meals. You can change this any time in Me.</Text>
      <View style={styles.actions}>
        <Tap onPress={enable} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.primaryText}>Turn on reminders</Text>}
        </Tap>
        <Tap onPress={() => setVisible(false)} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Not now</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: { padding: space[4], marginBottom: space[4], borderRadius: radius.card, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -space[2] },
  body: { fontFamily: type.body, fontSize: type.size.secondary, lineHeight: 19, color: palette.textMuted, marginBottom: space[3] },
  actions: { flexDirection: 'row', gap: space[2] },
  primary: { flex: 1, minHeight: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  primaryText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointText },
  secondary: { minHeight: 44, paddingHorizontal: space[4], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.textMuted },
});
