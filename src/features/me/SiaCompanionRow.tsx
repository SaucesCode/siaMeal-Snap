import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sia } from '../../components/sia';
import { Tap } from '../../components/Tap';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import { palette, space, type } from '../../theme';
import { useSiaStore } from '../sia/siaStore';
import { meLine } from '../sia/tabMoods';

/** Sia on Me: a calm portrait with one line about your progress; the row opens the coach. */
export function SiaCompanionRow({ weightKg, targetWeightKg, streak }: { weightKg?: number | null; targetWeightKg?: number | null; streak?: number | null }) {
  const hidden = useSiaStore((s) => s.hidden);
  const openCoach = useCoachStore((s) => s.openCoach);
  if (hidden) return null;
  const line = meLine({ weightKg, targetWeightKg, streak });

  return (
    <Tap
      onPress={() => {
        hapticFeedback.light();
        openCoach();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Sia: ${line}. Opens the coach`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Sia expression="resting" size={56} />
      <View style={styles.flex}>
        <Text style={styles.line}>{line}</Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  line: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, lineHeight: 19, color: palette.text },
});
