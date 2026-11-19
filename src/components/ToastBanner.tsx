import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space, type } from '../theme';

export interface ToastConfig {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badgeBg?: string;
  type?: 'success' | 'water' | 'info' | 'warning';
}

interface ToastBannerProps {
  toast: ToastConfig | null;
  onDismiss: () => void;
  duration?: number;
}

export function ToastBanner({ toast, onDismiss, duration = 2400 }: ToastBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      // Slide down and fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        // Slide up and fade out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-100);
      opacity.setValue(0);
    }
  }, [toast]);

  if (!toast) return null;

  const icon = toast.icon || ICONS[toast.type ?? 'success'];

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { transform: [{ translateY }], opacity }]} accessibilityLiveRegion="polite">
      <View style={styles.card}>
        <Ionicons name={icon as any} size={20} color={toast.type === 'warning' ? palette.carbs : palette.leaf} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={styles.message} numberOfLines={1}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const ICONS: Record<NonNullable<ToastConfig['type']>, string> = {
  success: 'checkmark-circle',
  water: 'water',
  info: 'information-circle',
  warning: 'alert-circle',
};

const styles = StyleSheet.create({
  container: { position: 'absolute', left: space[4], right: space[4], top: 0, zIndex: 9999, elevation: 9999 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.card,
    backgroundColor: palette.point,
    shadowColor: palette.pointDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  text: { flex: 1 },
  title: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointText },
  message: { fontFamily: type.body, fontSize: type.size.caption, color: palette.pointMuted, marginTop: 2 },
});
