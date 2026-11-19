import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tap } from '../../components/Tap';
import type { MealItem } from '../../types';
import type { Macros } from '../../utils/reviewMath';
import { hapticFeedback } from '../../utils/haptics';
import { palette, radius, space, type } from '../../theme';

/** Dot colours for the foods, in order (cycled for longer lists). */
export const ITEM_COLORS = [
  palette.point,
  palette.carbsOnLight,
  palette.proteinOnLight,
  palette.fatOnLight,
  palette.leafOnLight,
  palette.water,
  palette.textMuted,
  palette.pointMuted,
];

const AMOUNTS: Array<{ value: number; label: string; a11y: string }> = [
  { value: 0.5, label: '½', a11y: 'Half' },
  { value: 1, label: '1×', a11y: 'Normal' },
  { value: 1.5, label: '1½', a11y: 'One and a half' },
  { value: 2, label: '2×', a11y: 'Double' },
];
const nf = new Intl.NumberFormat('en-US');

interface PlateBreakdownProps {
  items: MealItem[];
  multipliers: number[];
  onChange: (index: number, multiplier: number) => void;
  meal: Macros;
  /** "760 left" or "120 over". */
  status: string;
}

/** Each food Sia found, tap one to change how much of it you had; the total row follows. */
export function PlateBreakdown({ items, multipliers, onChange, meal, status }: PlateBreakdownProps) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      {items.map((item, i) => {
        const m = multipliers[i] ?? 1;
        const removed = m === 0;
        const expanded = open === i;
        return (
          <View key={`${item.name}-${i}`} style={i > 0 && styles.divided}>
            <Tap
              onPress={() => {
                hapticFeedback.selection();
                setOpen(expanded ? null : i);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityHint="Change how much of this you had"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.dot, { backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] }, removed && styles.faded]} />
              <Text style={[styles.name, removed && styles.removedText]} numberOfLines={1}>
                {item.name}
              </Text>
              {removed ? (
                <Text style={styles.amount}>Removed</Text>
              ) : (
                <>
                  {item.amount !== '' && <Text style={styles.amount}>{item.amount}</Text>}
                  {m !== 1 && <Text style={styles.amount}>{`× ${m === 0.5 ? '½' : m === 1.5 ? '1½' : m}`}</Text>}
                </>
              )}
              <Text style={[styles.kcal, removed && styles.removedText]}>{nf.format(Math.round(item.calories * m))}</Text>
            </Tap>
            {expanded && (
              <View style={styles.editor}>
                {AMOUNTS.map((a) => {
                  const on = m === a.value;
                  return (
                    <Tap
                      key={a.value}
                      onPress={() => {
                        hapticFeedback.selection();
                        onChange(i, a.value);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={a.a11y}
                      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
                    </Tap>
                  );
                })}
                <Tap
                  onPress={() => {
                    hapticFeedback.medium();
                    onChange(i, removed ? 1 : 0);
                    setOpen(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={removed ? `Bring back ${item.name}` : `Remove ${item.name}`}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <Ionicons name={removed ? 'arrow-undo' : 'trash-outline'} size={18} color={palette.text} />
                </Tap>
              </View>
            )}
          </View>
        );
      })}
      <View style={styles.total} accessible accessibilityLabel={`${meal.calories} calories, ${status} today`}>
        <Text style={styles.totalText}>
          {`${nf.format(meal.calories)} kcal · P ${meal.protein_g} · C ${meal.carbs_g} · F ${meal.fat_g}`}
        </Text>
        <Text style={styles.totalStatus}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.hero, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  divided: { borderTopWidth: 1, borderTopColor: palette.line },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 52, paddingHorizontal: space[4] },
  dot: { width: 12, height: 12, borderRadius: 4 },
  faded: { opacity: 0.35 },
  name: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  removedText: { color: palette.textMuted, textDecorationLine: 'line-through' },
  amount: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  kcal: { minWidth: 44, textAlign: 'right', fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  editor: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingBottom: space[3] },
  chip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
  },
  chipOn: { backgroundColor: palette.point, borderColor: palette.point },
  chipText: { fontFamily: type.displayBold, fontSize: type.size.secondary, color: palette.text },
  chipTextOn: { color: palette.pointText },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: palette.bg },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: palette.point,
  },
  totalText: { flex: 1, fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.pointText, fontVariant: ['tabular-nums'] },
  totalStatus: { fontFamily: type.display, fontSize: type.size.section, color: palette.pointText, fontVariant: ['tabular-nums'] },
});
