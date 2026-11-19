import React, { useState } from 'react';
import { Pressable, type PressableProps, type PressableStateCallbackType } from 'react-native';

/**
 * Pressable that resolves `style={({ pressed }) => …}` itself and hands the native side a plain
 * style. NativeWind (Android/iOS) drops function styles on Pressable, which strips buttons of their
 * background, size and layout; with Tap the same code works everywhere. (React 19 passes `ref`
 * through as a normal prop.)
 */
export function Tap({ style, onPressIn, onPressOut, ...rest }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed, hovered: false } as PressableStateCallbackType) : style;
  return (
    <Pressable
      {...rest}
      style={resolved}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    />
  );
}
