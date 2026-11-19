import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SIA_COLORS as C } from './siaArt';

export const PAW_WIDTH = 26;
export const PAW_HEIGHT = 19;

/**
 * One paw resting on a ledge, seen from the front: a rounded bean (the back of the paw) whose
 * toes curl forward over the edge, so the two toe lines sit on the lower edge, dividing it into
 * three toes. Ear-coloured, like a Siamese cat's points.
 */
function Paw() {
  return (
    <Svg width={PAW_WIDTH} height={PAW_HEIGHT} viewBox="0 0 30 22">
      <Path
        d="M2.5 11 C2.5 4.5 8 1.5 15 1.5 C22 1.5 27.5 4.5 27.5 11 C27.5 17 23 20.5 15 20.5 C7 20.5 2.5 17 2.5 11 Z"
        fill={C.mask}
        stroke={C.outline}
        strokeWidth={3}
      />
      <Path d="M10.5 20 V15 M19.5 20 V15" stroke={C.outline} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Sia's two front paws. Decorative. */
export function SiaPaws({ gap, style }: { gap: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ flexDirection: 'row', gap }, style]}
    >
      <Paw />
      <Paw />
    </View>
  );
}
