import React from 'react';
import { View } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/tabs';
import { SiaPerch, SiaPerchPaws } from './SiaPerch';
import { useSiaStore } from './siaStore';

/**
 * The tab bar with Sia perched on it: her strip sits above the bar (so screens end above her),
 * her chin tucks behind the bar, and her paws grip its edge. Hidden entirely by "Show Sia".
 */
export function SiaTabBar(props: BottomTabBarProps) {
  const hidden = useSiaStore((s) => s.hidden);
  return (
    <View>
      {!hidden && <SiaPerch />}
      <BottomTabBar {...props} />
      {!hidden && <SiaPerchPaws />}
    </View>
  );
}
