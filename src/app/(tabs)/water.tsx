import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useWaterStore } from '../../stores/waterStore';
import { useAuthStore } from '../../stores/authStore';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { CalorieEyeRing } from '../../components/CalorieEyeRing';
import { SiaPeek } from '../../features/sia/SiaPeek';
import { PEEK_SHOWN_Y, PEEK_SIZE } from '../../features/sia/peekMotion';
import { useSiaStore } from '../../features/sia/siaStore';
import { useWaterReaction } from '../../features/water/useWaterReaction';
import { Tap } from '../../components/Tap';
import { hapticFeedback } from '../../utils/haptics';
import { waterStatus } from '../../utils/historyText';
import { palette, radius, space, type } from '../../theme';

const QUICK_AMOUNTS = [250, 500, 750, 1000];
const GOAL_OPTIONS = [2000, 2500, 3000, 3500, 4000];
const MAX_CUSTOM_ML = 3000;

const litres = (ml: number) => `${(ml / 1000).toFixed(1)} L`;
const amountLabel = (ml: number) => (ml >= 1000 ? `+${ml / 1000} L` : `+${ml} ml`);
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** Water: Sia's eye filling with blue, quick adds, and today's log. Sia (on the tab bar) cheers the goal. */
export default function WaterScreen() {
  const { profile, saveProfile } = useAuthStore(useShallow((s) => ({ profile: s.profile, saveProfile: s.saveProfile })));
  const { todayMl, dailyGoalMl, logs, loadTodayWater, addWater, deleteWaterLog, setDailyGoal } = useWaterStore(
    useShallow((s) => ({
      todayMl: s.todayMl,
      dailyGoalMl: s.dailyGoalMl,
      logs: s.logs,
      loadTodayWater: s.loadTodayWater,
      addWater: s.addWater,
      deleteWaterLog: s.deleteWaterLog,
      setDailyGoal: s.setDailyGoal,
    }))
  );

  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [addedAt, setAddedAt] = useState(0);
  const siaHidden = useSiaStore((s) => s.hidden);
  const [goalOpen, setGoalOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const goal = Number(profile?.target_water_ml) || Number(dailyGoalMl) || 2500;
  const fraction = goal > 0 ? Math.min(1, todayMl / goal) : 0;
  const waterReaction = useWaterReaction(todayMl, goal, addedAt);

  useEffect(() => {
    loadTodayWater();
  }, []);

  const add = async (ml: number) => {
    hapticFeedback.medium();
    const before = todayMl;
    await addWater(ml);
    setAddedAt(Date.now());
    if (before < goal && before + ml >= goal) hapticFeedback.success();
    setToast({ title: `${amountLabel(ml)} water`, message: `${litres(before + ml)} of ${litres(goal)} today`, type: 'water' });
  };

  const remove = async (id: string, ml: number) => {
    hapticFeedback.light();
    await deleteWaterLog(id);
    setToast({ title: 'Removed', message: `${ml} ml taken off today.`, type: 'info' });
  };

  const addCustom = async () => {
    const ml = Number(customText.replace(/[^0-9]/g, ''));
    if (!ml) {
      setCustomError('Enter an amount in ml.');
      return;
    }
    if (ml > MAX_CUSTOM_ML) {
      setCustomError(`That's more than ${MAX_CUSTOM_ML / 1000} L at once. Try a smaller amount.`);
      return;
    }
    setCustomOpen(false);
    setCustomText('');
    setCustomError(null);
    await add(ml);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex]} accessibilityRole="header">
            Water
          </Text>
          <Tap
            onPress={() => setGoalOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: goalOpen }}
            accessibilityLabel={`Daily goal ${litres(goal)}`}
            style={({ pressed }) => [styles.goalPill, pressed && styles.pressed]}
          >
            <Text style={styles.goalText}>Goal {litres(goal)}</Text>
            <Ionicons name={goalOpen ? 'chevron-up' : 'chevron-down'} size={14} color={palette.text} />
          </Tap>
        </View>

        {goalOpen && (
          <View style={styles.goalRow} accessibilityRole="radiogroup">
            {GOAL_OPTIONS.map((g) => {
              const on = g === goal;
              return (
                <Tap
                  key={g}
                  onPress={async () => {
                    hapticFeedback.selection();
                    // The profile's water target wins elsewhere (Today), so keep both in step.
                    await Promise.all([setDailyGoal(g), saveProfile({ target_water_ml: g })]);
                    setGoalOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.goalChip, on && styles.goalChipOn, pressed && styles.pressed]}
                >
                  <Text style={[styles.goalChipText, on && styles.goalChipTextOn]}>{litres(g)}</Text>
                </Tap>
              );
            })}
          </View>
        )}

        <View style={siaHidden ? styles.heroWrap : [styles.heroWrap, styles.heroWithSia]}>
        <View style={styles.hero} accessible accessibilityLabel={`${litres(todayMl)} of ${litres(goal)} today. ${waterStatus(todayMl, goal)}`}>
          <CalorieEyeRing
            size={176}
            eaten={todayMl}
            target={goal}
            fraction={fraction}
            over={false}
            color={palette.water}
            centerLabel={litres(todayMl)}
            centerCaption={`of ${litres(goal)}`}
          />
          <Text style={styles.status}>{waterStatus(todayMl, goal)}</Text>
        </View>
        <SiaPeek reaction={waterReaction} />
        </View>

        <View style={styles.quick}>
          {QUICK_AMOUNTS.map((ml) => (
            <Tap
              key={ml}
              onPress={() => add(ml)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${ml} millilitres`}
              style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
            >
              <Ionicons name="water" size={18} color={palette.water} />
              <Text style={styles.quickText}>{amountLabel(ml)}</Text>
            </Tap>
          ))}
        </View>
        <Tap
          onPress={() => setCustomOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.other, pressed && styles.pressed]}
        >
          <Text style={styles.otherText}>Other amount</Text>
        </Tap>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Today
        </Text>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No water yet today.</Text>
        ) : (
          [...logs]
            .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
            .map((log) => (
              <View key={log.id} style={styles.logRow}>
                <Ionicons name="water-outline" size={18} color={palette.water} />
                <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
                <Text style={styles.logTime}>{formatTime(log.logged_at)}</Text>
                <Tap
                  onPress={() => remove(log.id, log.amount_ml)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${log.amount_ml} millilitres from ${formatTime(log.logged_at)}`}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={18} color={palette.textMuted} />
                </Tap>
              </View>
            ))
        )}
      </ScrollView>

      <Modal visible={customOpen} transparent animationType="slide" onRequestClose={() => setCustomOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap}>
          <Tap style={styles.backdrop} onPress={() => setCustomOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>How much did you drink?</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={customText}
                onChangeText={(t) => {
                  setCustomText(t);
                  setCustomError(null);
                }}
                placeholder="350"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={addCustom}
                accessibilityLabel="Amount in millilitres"
                style={styles.input}
                autoFocus
              />
              <Text style={styles.unit}>ml</Text>
            </View>
            {customError && <Text style={styles.error}>{customError}</Text>}
            <Tap onPress={addCustom} accessibilityRole="button" style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed]}>
              <Text style={styles.sheetButtonText}>Add water</Text>
            </Tap>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: 120 },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space[3] },
  title: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  goalText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[3] },
  goalChip: {
    minHeight: 44,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  goalChipOn: { backgroundColor: palette.point, borderColor: palette.point },
  goalChipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  goalChipTextOn: { color: palette.pointText },
  heroWrap: { marginBottom: space[4] },
  heroWithSia: { marginTop: PEEK_SIZE - PEEK_SHOWN_Y + space[1] },
  hero: { alignItems: 'center', paddingVertical: space[6], borderRadius: radius.hero, backgroundColor: palette.point },
  status: { fontFamily: type.displayBold, fontSize: type.size.section, color: palette.pointText, marginTop: space[3] },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  quickButton: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    minHeight: 56,
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  quickText: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  other: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: space[2] },
  otherText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text, textDecorationLine: 'underline' },
  sectionTitle: { fontFamily: type.displayBold, fontSize: type.size.section + 3, color: palette.text, marginTop: space[6], marginBottom: space[2] },
  empty: { fontFamily: type.body, fontSize: type.size.body, color: palette.textMuted },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 52,
    paddingLeft: space[4],
    marginBottom: space[2],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  logAmount: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  logTime: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: { padding: space[6], borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, backgroundColor: palette.bg },
  sheetTitle: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginTop: space[4],
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  input: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.section, color: palette.text },
  unit: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.textMuted },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[2] },
  sheetButton: { minHeight: 52, marginTop: space[3], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  sheetButtonText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
});
