import React from 'react';
import { View } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/tabs';
import { create } from 'zustand';

/** The rendered tab bar height, so Sia's perch can sit exactly on its top edge. */
export const useTabBarHeight = create<{ height: number; setHeight: (h: number) => void }>((set) => ({
  height: 0,
  setHeight: (height) => set({ height }),
}));

/** The standard tab bar, measured so the floating perch knows where the bar's edge is. */
export function SiaTabBar(props: BottomTabBarProps) {
  const setHeight = useTabBarHeight((s) => s.setHeight);
  return (
    <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <BottomTabBar {...props} />
    </View>
  );
}
