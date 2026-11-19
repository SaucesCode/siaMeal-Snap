import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, space, type } from '../theme';
import { calorieSummary, macroProgress } from '../utils/todaySummary';
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
    <View
      style={styles.macro}
      accessible
      accessibilityLabel={`${label}: ${p.eaten} of ${p.target} grams`}
    >
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {p.eaten}
        <Text style={styles.macroTarget}> / {p.target} g</Text>
      </Text>
      <ProgressBar fraction={p.fraction} fill={color} track={palette.pointTrack} height={5} />
    </View>
  );
}

/** Today's hero card: calories eaten, what's left, and the three macros, on the cocoa "point". */
export function DailyMacroSummary({ targetCalories, consumedCalories, protein, carbs, fat }: DailyMacroSummaryProps) {
  const s = calorieSummary(consumedCalories, targetCalories);
  const status = s.over > 0 ? `${nf.format(s.over)} over` : `${nf.format(s.left)} left`;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${nf.format(s.eaten)} of ${nf.format(s.target)} calories eaten, ${status}`}
      >
        <Text style={styles.caption}>Eaten today</Text>
        <Text style={styles.hero}>{nf.format(s.eaten)}</Text>
        <Text style={styles.of}>
          of {nf.format(s.target)} kcal · <Text style={styles.status}>{status}</Text>
        </Text>
      </View>
      <View style={styles.calorieBar}>
        <ProgressBar fraction={s.fraction} fill={s.over > 0 ? palette.carbs : palette.leaf} track={palette.pointTrack} />
      </View>
      <View style={styles.macros}>
        <Macro label="Protein" amount={protein} color={palette.protein} />
        <Macro label="Carbs" amount={carbs} color={palette.carbs} />
        <Macro label="Fat" amount={fat} color={palette.fat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.point,
    borderRadius: radius.hero,
    padding: space[4] + space[1],
    marginBottom: space[4],
  },
  caption: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.caption,
    color: palette.pointMuted,
  },
  hero: {
    fontFamily: type.display,
    fontSize: type.size.hero,
    lineHeight: 46,
    color: palette.pointText,
    fontVariant: ['tabular-nums'],
    marginTop: space[1],
  },
  of: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.secondary,
    color: palette.pointMuted,
    fontVariant: ['tabular-nums'],
  },
  status: {
    color: palette.pointText,
  },
  calorieBar: {
    marginTop: space[3],
  },
  macros: {
    flexDirection: 'row',
    gap: space[3],
    marginTop: space[4],
  },
  macro: {
    flex: 1,
  },
  macroLabel: {
    fontFamily: type.bodyBold,
    fontSize: type.size.caption,
    color: palette.pointMuted,
  },
  macroValue: {
    fontFamily: type.displayBold,
    fontSize: type.size.body,
    color: palette.pointText,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
    marginBottom: space[1] + 2,
  },
  macroTarget: {
    fontFamily: type.body,
    fontSize: type.size.caption,
    color: palette.pointMuted,
  },
});
