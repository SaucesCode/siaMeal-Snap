import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Tap } from '../../components/Tap';
import { hapticFeedback } from '../../utils/haptics';
import { palette, radius, space, type } from '../../theme';

export interface StripDay {
  date: string; // YYYY-MM-DD
  weekday: string; // "Mon"
  calories: number;
}

const RING = 30;
const R = 12;
const C = 2 * Math.PI * R;

/** A tiny eye ring: how full that day got against the calorie target. */
function DayRing({ calories, target, onPoint }: { calories: number; target: number; onPoint: boolean }) {
  const fraction = target > 0 ? Math.min(1, calories / target) : 0;
  const over = target > 0 && calories > target;
  return (
    <Svg width={RING} height={RING} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={R} fill="none" stroke={onPoint ? palette.pointTrack : palette.line} strokeWidth={4} />
      {fraction > 0 && (
        <Circle
          cx={15}
          cy={15}
          r={R}
          fill="none"
          stroke={over ? palette.carbs : onPoint ? palette.eye : palette.leafOnLight}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${C * fraction} ${C}`}
          transform="rotate(-90 15 15)"
        />
      )}
    </Svg>
  );
}

/** Seven days, each with its weekday, a mini eye ring and the date; the chosen day sits on cocoa. */
export function WeekStrip({
  days,
  selected,
  target,
  onSelect,
}: {
  days: StripDay[];
  selected: string;
  target: number;
  onSelect: (date: string) => void;
}) {
  return (
    <View style={styles.strip} accessibilityRole="tablist">
      {days.map((d) => {
        const on = d.date === selected;
        return (
          <Tap
            key={d.date}
            onPress={() => {
              hapticFeedback.selection();
              onSelect(d.date);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${d.weekday} ${Number(d.date.slice(8))}, ${Math.round(d.calories)} calories`}
            style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && styles.pressed]}
          >
            <Text style={[styles.weekday, on && styles.textOn]}>{d.weekday}</Text>
            <DayRing calories={d.calories} target={target} onPoint={on} />
            <Text style={[styles.date, on && styles.textOn]}>{Number(d.date.slice(8))}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: space[1], marginBottom: space[3] },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
    minHeight: 84,
    paddingVertical: space[2],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  dayOn: { backgroundColor: palette.point, borderColor: palette.point },
  pressed: { opacity: 0.7 },
  weekday: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted },
  date: { fontFamily: type.displayBold, fontSize: type.size.secondary, color: palette.text, fontVariant: ['tabular-nums'] },
  textOn: { color: palette.pointText },
});
