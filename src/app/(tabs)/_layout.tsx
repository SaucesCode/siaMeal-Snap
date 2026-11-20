import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../stores/authStore';
import { hapticFeedback } from '../../utils/haptics';
import { SiaPerchOverlay } from '../../features/sia/SiaPerch';
import { SiaTabBar } from '../../features/sia/SiaTabBar';
import { useSiaEvents } from '../../features/sia/useSiaEvents';
import { palette, type } from '../../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Room for the 6 px top padding, a 24 px icon and a label line, even with larger Android font sizes. */
const BAR_CONTENT_HEIGHT = 64;
const SNAP_SIZE = 56;
const SNAP_RING = 4;

function tabIcon(outline: IoniconName, filled: IoniconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? filled : outline} size={24} color={color as string} />
  );
}

/** The raised camera button: shutter green, the one bright accent in the app. */
function SnapButton() {
  return (
    <View style={styles.snap}>
      <Ionicons name="camera" size={26} color={palette.shutterGlyph} />
    </View>
  );
}

const selectHaptic = { tabPress: () => hapticFeedback.selection() };

export default function TabLayout() {
  const { session, profile, isInitialized } = useAuthStore(
    useShallow((s) => ({ session: s.session, profile: s.profile, isInitialized: s.isInitialized }))
  );

  const insets = useSafeAreaInsets();

  // Sia reacts to app events only on signed-in screens.
  useSiaEvents();

  if (!isInitialized) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profile?.target_calories) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <View style={styles.root}>
    <Tabs
      tabBar={(props) => <SiaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.bar, { height: BAR_CONTENT_HEIGHT + insets.bottom }],
        tabBarActiveTintColor: palette.pointText,
        tabBarInactiveTintColor: palette.pointMuted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: tabIcon('today-outline', 'today') }}
        listeners={selectHaptic}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('calendar-outline', 'calendar') }}
        listeners={selectHaptic}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Snap',
          tabBarAccessibilityLabel: 'Snap a meal',
          tabBarIcon: () => <SnapButton />,
          tabBarLabel: () => null,
        }}
        listeners={{ tabPress: () => hapticFeedback.medium() }}
      />
      <Tabs.Screen
        name="water"
        options={{ title: 'Water', tabBarIcon: tabIcon('water-outline', 'water') }}
        listeners={selectHaptic}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Me', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }}
        listeners={selectHaptic}
      />
    </Tabs>
    {/* On Me, Sia perches on the tab bar's edge above the Me tab. */}
    <SiaPerchOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    backgroundColor: palette.pointDeep,
    borderTopWidth: 0,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.caption,
    marginTop: 2,
    marginBottom: 4,
  },
  snap: {
    width: SNAP_SIZE,
    height: SNAP_SIZE,
    borderRadius: SNAP_SIZE / 2,
    backgroundColor: palette.shutter,
    borderWidth: SNAP_RING,
    borderColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SNAP_SIZE / 2,
  },
});
