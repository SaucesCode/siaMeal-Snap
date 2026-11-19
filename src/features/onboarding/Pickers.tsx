import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tap } from '../../components/Tap';
import { hapticFeedback } from '../../utils/haptics';
import { palette, radius, space, type } from '../../theme';
import { FOODS_TO_AVOID, MEAL_SLOTS, displayTime, shiftTime } from './flow';

export interface MealSlot {
  label: string;
  time: string;
  on: boolean;
}

/** Breakfast/Lunch/Dinner slots from saved times (HH:MM); unsaved meals start at their usual time, off. */
export function slotsFromTimes(times: string[] | undefined, allOnWhenEmpty = true): MealSlot[] {
  const saved = [...(times ?? [])].sort();
  if (saved.length === 0) return MEAL_SLOTS.map((m) => ({ label: m.label, time: m.time, on: allOnWhenEmpty }));
  return MEAL_SLOTS.map((m, i) => (saved[i] ? { label: m.label, time: saved[i], on: true } : { label: m.label, time: m.time, on: false }));
}

/** Multi-select chips for foods to leave out of suggestions. */
export function FoodChips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <View style={styles.chips}>
      {FOODS_TO_AVOID.map((f) => {
        const on = value.includes(f);
        return (
          <Tap
            key={f}
            onPress={() => {
              hapticFeedback.selection();
              onChange(on ? value.filter((x) => x !== f) : [...value, f]);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
          >
            {on && <Ionicons name="checkmark" size={16} color={palette.pointText} />}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** One row per meal: on/off and the time in 30-minute steps. */
export function MealTimes({ value, onChange }: { value: MealSlot[]; onChange: (next: MealSlot[]) => void }) {
  const update = (i: number, patch: Partial<MealSlot>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <View style={styles.rows}>
      {value.map((m, i) => (
        <View key={m.label} style={[styles.row, !m.on && styles.off]}>
          <Switch
            value={m.on}
            onValueChange={(v) => update(i, { on: v })}
            accessibilityLabel={`${m.label} reminder`}
            trackColor={{ false: palette.line, true: palette.leafOnLight }}
            thumbColor={palette.surface}
          />
          <Text style={styles.label}>{m.label}</Text>
          <Tap
            onPress={() => update(i, { time: shiftTime(m.time, -30) })}
            disabled={!m.on}
            accessibilityRole="button"
            accessibilityLabel={`${m.label} 30 minutes earlier`}
            style={styles.stepper}
          >
            <Ionicons name="remove" size={20} color={palette.text} />
          </Tap>
          <Text style={styles.time}>{displayTime(m.time)}</Text>
          <Tap
            onPress={() => update(i, { time: shiftTime(m.time, 30) })}
            disabled={!m.on}
            accessibilityRole="button"
            accessibilityLabel={`${m.label} 30 minutes later`}
            style={styles.stepper}
          >
            <Ionicons name="add" size={20} color={palette.text} />
          </Tap>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipOn: { backgroundColor: palette.point, borderColor: palette.point },
  chipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  chipTextOn: { color: palette.pointText },
  rows: { gap: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 60,
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  off: { opacity: 0.55 },
  label: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  stepper: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: palette.bg },
  time: { minWidth: 72, textAlign: 'center', fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
});
