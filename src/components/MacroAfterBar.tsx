import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, space, type } from '../theme';

interface MacroAfterBarProps {
  label: string;
  /** Grams eaten today before this meal. */
  before: number;
  /** Grams this meal adds. */
  add: number;
  target: number;
  color: string;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** One macro on Review: today's grams so far (muted) plus this meal (coloured), against the target. */
export function MacroAfterBar({ label, before, add, target, color }: MacroAfterBarProps) {
  const after = Math.round(before + add);
  const goal = Math.round(target);
  const b = goal > 0 ? clamp(before / goal) : 0;
  const a = goal > 0 ? clamp((before + add) / goal) : 0;
  return (
    <View accessible accessibilityLabel={`${label}: ${after} of ${goal} grams after this meal`}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{`${after} / ${goal} g`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.segment, { width: `${b * 100}%`, backgroundColor: palette.pointMuted, opacity: 0.6 }]} />
        <View style={[styles.segment, { width: `${(a - b) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[1] },
  label: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.pointMuted },
  value: { fontFamily: type.bodyBold, fontSize: type.size.caption, color: palette.pointText, fontVariant: ['tabular-nums'] },
  track: { flexDirection: 'row', height: 6, borderRadius: radius.full, overflow: 'hidden', backgroundColor: palette.pointTrack },
  segment: { height: '100%' },
});
