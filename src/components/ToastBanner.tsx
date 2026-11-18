import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const getTheme = () => {
    switch (toast.type) {
      case 'water':
        return {
          icon: toast.icon || 'water',
          iconColor: toast.iconColor || '#06b6d4',
          badgeBg: toast.badgeBg || 'bg-cyan-500/15 border border-cyan-500/30',
          borderColor: 'border-cyan-500/30',
        };
      case 'warning':
        return {
          icon: toast.icon || 'alert-circle',
          iconColor: toast.iconColor || '#fb7185',
          badgeBg: toast.badgeBg || 'bg-rose-500/15 border border-rose-500/30',
          borderColor: 'border-rose-500/30',
        };
      case 'info':
        return {
          icon: toast.icon || 'information-circle',
          iconColor: toast.iconColor || '#818cf8',
          badgeBg: toast.badgeBg || 'bg-indigo-500/15 border border-indigo-500/30',
          borderColor: 'border-indigo-500/30',
        };
      default:
        return {
          icon: toast.icon || 'checkmark-circle',
          iconColor: toast.iconColor || '#10b981',
          badgeBg: toast.badgeBg || 'bg-emerald-500/15 border border-emerald-500/30',
          borderColor: 'border-emerald-500/30',
        };
    }
  };

  const theme = getTheme();

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        className={`bg-zinc-900/95 ${theme.borderColor} border rounded-2xl px-4 py-3 flex-row items-center gap-3 shadow-2xl shadow-black`}
        style={styles.cardShadow}
      >
        <View className={`w-9 h-9 rounded-xl ${theme.badgeBg} items-center justify-center`}>
          <Ionicons name={theme.icon as any} size={18} color={theme.iconColor} />
        </View>

        <View className="flex-1 mr-1">
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-sm"
            numberOfLines={1}
          >
            {toast.title}
          </Text>
          {toast.message && (
            <Text className="text-zinc-400 text-xs font-medium mt-0.5" numberOfLines={1}>
              {toast.message}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
});
