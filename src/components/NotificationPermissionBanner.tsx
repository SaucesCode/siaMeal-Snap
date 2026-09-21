import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotificationStatus, requestNotificationPermission } from '../services/notificationService';
import { hapticFeedback } from '../utils/haptics';

export function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (Platform.OS === 'web') return;
    const status = await getNotificationStatus();
    // Only prompt if supported and user hasn't made a choice yet
    if (status.isSupported && !status.hasBeenPrompted && !status.hasPermission) {
      setVisible(true);
    }
  };

  const handleEnable = async () => {
    hapticFeedback.medium();
    setIsRequesting(true);
    await requestNotificationPermission();
    setIsRequesting(false);
    setVisible(false);
  };

  const handleDismiss = () => {
    hapticFeedback.light();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-4 mb-4 shadow-sm shadow-emerald-500/10">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-2.5 mb-1.5 flex-1 pr-2">
          <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
            <Ionicons name="notifications" size={16} color="#10b981" />
          </View>
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-sm"
          >
            Enable Sia's Reminders?
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          className="p-1 -mr-1 -mt-1"
        >
          <Ionicons name="close" size={16} color="#71717a" />
        </TouchableOpacity>
      </View>

      <Text className="text-zinc-400 text-xs leading-4 mb-3">
        Let Sia nudge you to hydrate and shield your streak before midnight. You can change this anytime in Profile.
      </Text>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={handleEnable}
          disabled={isRequesting}
          activeOpacity={0.8}
          className="flex-1 bg-emerald-500 active:bg-emerald-600 rounded-xl py-2 px-3 items-center justify-center"
        >
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-xs font-bold"
          >
            {isRequesting ? 'Enabling...' : 'Enable Reminders'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.7}
          className="px-3 py-2 rounded-xl bg-zinc-800/80 active:bg-zinc-700/80"
        >
          <Text className="text-zinc-400 text-xs font-semibold">Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
