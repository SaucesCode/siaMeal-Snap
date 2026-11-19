import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useWeightStore } from '../stores/weightStore';
import { WeightTrendChart } from './WeightTrendChart';
import { hapticFeedback } from '../utils/haptics';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface WeightTrackerSheetProps {
  visible: boolean;
  onClose: () => void;
  currentProfileWeight?: number;
  onWeightLogged?: (weightKg: number) => void;
}

const KG_TO_LB = 2.20462;
const LIMITS = { kg: [30, 300], lbs: [66, 660] } as const;

/** Log today's weight (kg or lb), see the trend, and remove a wrong entry. */
export function WeightTrackerSheet({ visible, onClose, currentProfileWeight = 0, onWeightLogged }: WeightTrackerSheetProps) {
  const { entries, logWeight, deleteWeightEntry, loadWeightHistory } = useWeightStore(
    useShallow((s) => ({ entries: s.entries, logWeight: s.logWeight, deleteWeightEntry: s.deleteWeightEntry, loadWeightHistory: s.loadWeightHistory }))
  );
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadWeightHistory();
    const latest = entries.length > 0 ? entries[entries.length - 1].weight_kg : currentProfileWeight;
    setUnit('kg');
    setInput(latest ? String(latest) : '');
    setError(null);
  }, [visible]);

  if (!visible) return null;

  const value = parseFloat(input.replace(',', '.'));
  const [min, max] = LIMITS[unit];

  const adjust = (delta: number) => {
    hapticFeedback.selection();
    const base = Number.isFinite(value) ? value : unit === 'kg' ? currentProfileWeight || 70 : (currentProfileWeight || 70) * KG_TO_LB;
    setInput(String(Math.max(min, Math.min(max, Math.round((base + delta) * 10) / 10))));
    setError(null);
  };

  const switchUnit = (next: 'kg' | 'lbs') => {
    if (next === unit) return;
    if (Number.isFinite(value)) setInput(String(Math.round((next === 'lbs' ? value * KG_TO_LB : value / KG_TO_LB) * 10) / 10));
    setUnit(next);
    setError(null);
  };

  const save = async () => {
    if (!Number.isFinite(value) || value < min || value > max) {
      hapticFeedback.error();
      setError(`Enter a weight from ${min} to ${max} ${unit}.`);
      return;
    }
    const kg = Math.round((unit === 'lbs' ? value / KG_TO_LB : value) * 10) / 10;
    try {
      setSaving(true);
      await logWeight(kg);
      hapticFeedback.success();
      onWeightLogged?.(kg);
      onClose();
    } catch (err: any) {
      hapticFeedback.error();
      setError(`Couldn't save your weight. ${err?.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const shown = (kg: number) => (unit === 'lbs' ? kg * KG_TO_LB : kg).toFixed(1);
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
        <Tap style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Weight
            </Text>
            <View style={styles.units} accessibilityRole="radiogroup">
              {(['kg', 'lbs'] as const).map((u) => (
                <Tap
                  key={u}
                  onPress={() => switchUnit(u)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: unit === u }}
                  style={[styles.unitChip, unit === u && styles.unitChipOn]}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextOn]}>{u}</Text>
                </Tap>
              ))}
            </View>
            <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Tap>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <View style={styles.entry}>
              <Tap onPress={() => adjust(-0.1)} accessibilityRole="button" accessibilityLabel="Less by 0.1" style={styles.stepper}>
                <Ionicons name="remove" size={22} color={palette.text} />
              </Tap>
              <View style={[styles.valueBox, error ? styles.valueError : null]}>
                <TextInput
                  value={input}
                  onChangeText={(t) => {
                    setInput(t);
                    setError(null);
                  }}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Weight in ${unit}`}
                  style={styles.value}
                  selectTextOnFocus
                />
                <Text style={styles.valueUnit}>{unit}</Text>
              </View>
              <Tap onPress={() => adjust(0.1)} accessibilityRole="button" accessibilityLabel="More by 0.1" style={styles.stepper}>
                <Ionicons name="add" size={22} color={palette.text} />
              </Tap>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Tap onPress={save} disabled={saving} accessibilityRole="button" style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
              {saving ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.saveText}>Log weight</Text>}
            </Tap>

            <View style={styles.card}>
              <WeightTrendChart entries={entries} unit={unit} />
            </View>

            {entries.length > 0 && <Text style={styles.section}>Recent weigh-ins</Text>}
            {entries
              .slice(-7)
              .reverse()
              .map((e) => (
                <View key={e.id} style={styles.row}>
                  <Text style={styles.rowValue}>
                    {shown(e.weight_kg)}
                    <Text style={styles.rowUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.rowDate}>{date(e.logged_at)}</Text>
                  <Tap
                    onPress={() => {
                      hapticFeedback.light();
                      deleteWeightEntry(e.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${shown(e.weight_kg)} ${unit} from ${date(e.logged_at)}`}
                    style={styles.remove}
                  >
                    <Ionicons name="close" size={18} color={palette.textMuted} />
                  </Tap>
                </View>
              ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50 },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[3] },
  title: { flex: 1, fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  units: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: palette.line },
  unitChip: { minWidth: 48, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  unitChipOn: { backgroundColor: palette.point },
  unitText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  unitTextOn: { color: palette.pointText },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  body: { paddingBottom: space[3] },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stepper: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  valueBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  valueError: { borderColor: palette.over },
  value: { minWidth: 80, textAlign: 'center', fontFamily: type.display, fontSize: 32, color: palette.text, fontVariant: ['tabular-nums'] },
  valueUnit: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.textMuted },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[2], textAlign: 'center' },
  save: { minHeight: 52, marginTop: space[3], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  saveText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  card: { marginTop: space[4], padding: space[4], borderRadius: radius.card, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  section: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginTop: space[4], marginBottom: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 52,
    paddingLeft: space[4],
    marginBottom: space[2],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  rowValue: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  rowUnit: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  rowDate: { flex: 1, textAlign: 'right', fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
