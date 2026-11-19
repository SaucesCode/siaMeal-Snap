import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { MealItem } from '../../types';
import { palette, radius, space, type } from '../../theme';

const LABEL_WIDTH_GUESS = 120;
const LABEL_HEIGHT = 26;

/** A small label on each food in the photo ("Chicken · 320"), at the spot the AI reported. */
export function PhotoLabels({ items, multipliers }: { items: MealItem[]; multipliers: number[] }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {items.map((item, i) => {
        if (item.x == null || item.y == null || (multipliers[i] ?? 1) === 0) return null;
        const kcal = Math.round(item.calories * (multipliers[i] ?? 1));
        // Keep labels inside the photo; before it's measured they sit at the top-left and get placed after layout.
        const left = Math.max(space[2], Math.min(item.x * size.w - LABEL_WIDTH_GUESS / 2, size.w - LABEL_WIDTH_GUESS - space[2]));
        const top = Math.max(space[2], Math.min(item.y * size.h - LABEL_HEIGHT / 2, size.h - LABEL_HEIGHT - space[2]));
        return (
          <View key={`${item.name}-${i}`} style={[styles.label, { left, top, opacity: size.w ? 1 : 0 }]}>
            <Text style={styles.text} numberOfLines={1}>{`${item.name} · ${kcal}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    maxWidth: LABEL_WIDTH_GUESS + 40,
    height: LABEL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: space[2] + 2,
    borderRadius: radius.full,
    backgroundColor: palette.bg,
    shadowColor: palette.pointDeep,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: { fontFamily: type.bodyBold, fontSize: type.size.caption, color: palette.text, fontVariant: ['tabular-nums'] },
});
