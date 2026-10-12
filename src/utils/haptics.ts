import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const hapticFeedback = {
  light: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  },
  medium: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  },
  heavy: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
  },
  success: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  },
  error: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
  },
  selection: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
  },

  /**
   * Feline Sensory Signature: Purr
   * Rhythmic micro-vibration sequence simulating a contented cat purring in your palms.
   */
  purr: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
          Haptics.selectionAsync();
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTimeout(() => {
              Haptics.selectionAsync();
            }, 60);
          }, 60);
        }, 60);
      } catch {}
    }
  },

  /**
   * Feline Sensory Signature: Pounce
   * Crisp, decisive double impact when logging a meal or catching a nutrition milestone.
   */
  pounce: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 45);
      } catch {}
    }
  },

  /**
   * Festive Celebration Burst
   * Multi-frequency celebration pattern when unlocking new hunter tiers or daily mastery.
   */
  celebration: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 80);
        }, 100);
      } catch {}
    }
  },
};
