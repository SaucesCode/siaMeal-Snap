import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SIA_COLORS as C } from './siaArt';

export const PAW_WIDTH = 26;
export const PAW_HEIGHT = 19;

/** One paw over a ledge: ear-coloured (Siamese points), dark outline, two toe lines. */
function Paw() {
  return (
    <Svg width={PAW_WIDTH} height={PAW_HEIGHT} viewBox="0 0 30 22">
      <Path
        d="M1.5 9 C1.5 4 6 1.5 15 1.5 C24 1.5 28.5 4 28.5 9 L28.5 20.5 L1.5 20.5 Z"
        fill={C.mask}
        stroke={C.outline}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path d="M10.5 3 V8.5 M19.5 3 V8.5" stroke={C.outline} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Sia's two front paws gripping an edge. Decorative. */
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
