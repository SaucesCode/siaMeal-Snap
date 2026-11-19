import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SiaPeek } from '../sia/SiaPeek';
import type { SiaReaction } from '../sia/siaReactions';
import { palette, radius, space, type } from '../../theme';
import { Tap } from '../../components/Tap';

interface NotFoodSheetProps {
  reason: string;
  onTryAgain: () => void;
  onTypeInstead: () => void;
}

/** Shown over the frozen photo when it isn't food: puzzled Sia peeks over the sheet's edge. */
export function NotFoodSheet({ reason, onTryAgain, onTypeInstead }: NotFoodSheetProps) {
  const puzzled = useMemo<SiaReaction>(() => ({ expression: 'puzzled', line: null, spot: 'center' }), []);
  return (
    <View style={styles.sheet} accessibilityViewIsModal>
      <SiaPeek reaction={puzzled} startHidden />
      <Text style={styles.title} accessibilityRole="header">
        That doesn't look like food
      </Text>
      <Text style={styles.reason}>{reason}</Text>
      <Tap onPress={onTryAgain} accessibilityRole="button" style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryText}>Try again</Text>
      </Tap>
      <Tap onPress={onTypeInstead} accessibilityRole="button" style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>Type it instead</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[4],
    paddingTop: space[6],
    paddingBottom: space[6],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  title: { fontFamily: type.display, fontSize: type.size.title, color: palette.text },
  reason: { fontFamily: type.body, fontSize: type.size.body, lineHeight: 21, color: palette.textMuted, marginTop: space[1], marginBottom: space[4] },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, marginTop: space[2] },
  primary: { backgroundColor: palette.shutter },
  primaryText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.shutterGlyph },
  secondary: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  secondaryText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  pressed: { opacity: 0.7 },
});
