import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, space, type } from '../theme';
import { calorieSummary, macroProgress } from '../utils/todaySummary';
import { CalorieEyeRing, RING_FILL_MS } from './CalorieEyeRing';
import { ProgressBar } from './ProgressBar';

interface MacroAmount {
  consumed: number;
  target: number;
}

interface DailyMacroSummaryProps {
  targetCalories: number;
  consumedCalories: number;
  protein: MacroAmount;
  carbs: MacroAmount;
  fat: MacroAmount;
}

const nf = new Intl.NumberFormat('en-US');

function Macro({ label, amount, color }: { label: string; amount: MacroAmount; color: string }) {
  const p = macroProgress(amount.consumed, amount.target);
  return (
    <View accessible accessibilityLabel={`${label}: ${p.eaten} of ${p.target} grams`}>
      <Text style={styles.macroLabel}>
        {label} · {p.eaten} / {p.target} g
      </Text>
      <ProgressBar fraction={p.fraction} fill={color} track={palette.pointTrack} height={6} durationMs={RING_FILL_MS} />
    </View>
  );
}

/** Today's hero card: the calorie eye ring, the three macros, and what's left, on the cocoa "point". */
export function DailyMacroSummary({ targetCalories, consumedCalories, protein, carbs, fat }: DailyMacroSummaryProps) {
  const s = calorieSummary(consumedCalories, targetCalories);
  const over = s.over > 0;
  const status = over ? `${nf.format(s.over)} over` : `${nf.format(s.left)} left`;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View accessible accessibilityLabel={`${nf.format(s.eaten)} of ${nf.format(s.target)} calories eaten, ${status}`}>
          <CalorieEyeRing eaten={s.eaten} target={s.target} fraction={s.fraction} over={over} />
        </View>
        <View style={styles.macros}>
          <Macro label="Protein" amount={protein} color={palette.protein} />
          <Macro label="Carbs" amount={carbs} color={palette.carbs} />
          <Macro label="Fat" amount={fat} color={palette.fat} />
        </View>
      </View>
      <Text style={styles.status}>
        <Text style={styles.statusStrong}>{status}</Text> today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.point,
    borderRadius: radius.hero,
    padding: space[4],
    marginBottom: space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  macros: {
    flex: 1,
    gap: space[3],
  },
  macroLabel: {
    fontFamily: type.bodyBold,
    fontSize: type.size.caption,
    color: palette.pointMuted,
    fontVariant: ['tabular-nums'],
    marginBottom: space[1] + 2,
  },
  status: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.secondary,
    color: palette.pointMuted,
    fontVariant: ['tabular-nums'],
    marginTop: space[3],
  },
  statusStrong: {
    fontFamily: type.bodyBold,
    color: palette.pointText,
  },
});
