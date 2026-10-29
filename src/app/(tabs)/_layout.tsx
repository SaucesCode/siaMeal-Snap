import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Platform } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useAuthStore } from '../../stores/authStore';
import { hapticFeedback } from '../../utils/haptics';

// =================================================================
// Dark-Tech Navigation Icons (High-Precision Athletic Telemetry)
// =================================================================

interface TabIconProps {
  focused: boolean;
  color?: string;
  size?: number;
}

/**
 * 1. Dashboard: Clean 4-Quadrant Macro Telemetry Grid
 */
function DashboardTabIcon({ focused, size = 24 }: TabIconProps) {
  const color = focused ? '#10b981' : '#71717a';
  const fill = focused ? '#10b981' : 'transparent';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
        fill={fill}
        fillOpacity={focused ? 0.25 : 0}
      />
      <Rect
        x={13.5}
        y={3}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
        fill={fill}
        fillOpacity={focused ? 0.85 : 0}
      />
      <Rect
        x={3}
        y={13.5}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
        fill={fill}
        fillOpacity={focused ? 0.85 : 0}
      />
      <Rect
        x={13.5}
        y={13.5}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
        fill={fill}
        fillOpacity={focused ? 0.25 : 0}
      />
    </Svg>
  );
}

/**
 * 2. Hydration: Minimalist Athletic Aqua Droplet
 */
function HydrationTabIcon({ focused, size = 24 }: TabIconProps) {
  const color = focused ? '#06b6d4' : '#71717a';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M 12 2.8 C 12 2.8 5.2 11 5.2 15.5 C 5.2 19.2 8.2 22 12 22 C 15.8 22 18.8 19.2 18.8 15.5 C 18.8 11 12 2.8 12 2.8 Z"
        stroke={color}
        strokeWidth={1.8}
        fill={focused ? '#06b6d4' : 'transparent'}
        fillOpacity={focused ? 0.25 : 0}
        strokeLinejoin="round"
      />
      {focused && (
        <Path
          d="M 8.8 15.5 C 8.8 17.3 10.2 18.8 12 18.8"
          stroke="#a5f3fc"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

/**
 * 3. Center Camera Scan Button:
 * Floating High-Precision AI Vision Optical Viewfinder Trigger
 */
function ScanPedestalButton({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 58,
        height: 58,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Platform.OS === 'ios' ? -22 : -18,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#09090b',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: focused ? '#10b981' : '#27272a',
          shadowColor: '#10b981',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: focused ? 0.65 : 0.3,
          shadowRadius: 10,
          elevation: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: focused ? '#10b981' : '#141417',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.2,
            borderColor: focused ? '#34d399' : 'rgba(16, 185, 129, 0.45)',
          }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            {/* 4 Optical Reticle Viewfinder Brackets */}
            <Path
              d="M 4 8 L 4 5 C 4 4.4 4.4 4 5 4 L 8 4"
              stroke={focused ? '#09090b' : '#34d399'}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M 16 4 L 19 4 C 19.6 4 20 4.4 20 5 L 20 8"
              stroke={focused ? '#09090b' : '#34d399'}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M 4 16 L 4 19 C 4 19.6 4.4 20 5 20 L 8 20"
              stroke={focused ? '#09090b' : '#34d399'}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M 16 20 L 19 20 C 19.6 20 20 19.6 20 19 L 20 16"
              stroke={focused ? '#09090b' : '#34d399'}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Center Optical Lens Core */}
            <Circle
              cx={12}
              cy={12}
              r={3.4}
              stroke={focused ? '#09090b' : '#34d399'}
              strokeWidth={1.8}
              fill={focused ? '#ffffff' : '#10b981'}
            />
            <Circle
              cx={12}
              cy={12}
              r={1.4}
              fill={focused ? '#09090b' : '#ffffff'}
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

/**
 * 4. Analytics: Macro Telemetry Bars
 */
function AnalyticsTabIcon({ focused, size = 24 }: TabIconProps) {
  const color = focused ? '#10b981' : '#71717a';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={13}
        width={4}
        height={8}
        rx={1.5}
        fill={focused ? '#06b6d4' : '#27272a'}
        stroke={color}
        strokeWidth={1.6}
      />
      <Rect
        x={10}
        y={8}
        width={4}
        height={13}
        rx={1.5}
        fill={focused ? '#10b981' : '#27272a'}
        stroke={color}
        strokeWidth={1.6}
      />
      <Rect
        x={17}
        y={4}
        width={4}
        height={17}
        rx={1.5}
        fill={focused ? '#34d399' : '#27272a'}
        stroke={color}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

/**
 * 5. Profile: Athlete Silhouette
 */
function ProfileTabIcon({ focused, size = 24 }: TabIconProps) {
  const color = focused ? '#10b981' : '#71717a';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={7.5}
        r={4.2}
        stroke={color}
        strokeWidth={1.8}
        fill={focused ? '#10b981' : 'transparent'}
        fillOpacity={focused ? 0.25 : 0}
      />
      <Path
        d="M 4.5 19.5 C 4.5 15.8 7.8 14 12 14 C 16.2 14 19.5 15.8 19.5 19.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// =================================================================
// Tab Layout Definition
// =================================================================

export default function TabLayout() {
  const { session, profile, isInitialized } = useAuthStore();

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#18181b',
          borderTopWidth: 1.2,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.25,
          marginTop: 2,
        },
      }}
    >
      {/* 1. Dashboard: Sia's Head with Camera Eye & Sprout */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <DashboardTabIcon focused={focused} />,
        }}
        listeners={{
          tabPress: () => {
            hapticFeedback.selection();
          },
        }}
      />

      {/* 2. Hydration: Feline Aqua Droplet */}
      <Tabs.Screen
        name="water"
        options={{
          title: 'Hydration',
          tabBarActiveTintColor: '#06b6d4',
          tabBarIcon: ({ focused }) => <HydrationTabIcon focused={focused} />,
        }}
        listeners={{
          tabPress: () => {
            hapticFeedback.selection();
          },
        }}
      />

      {/* 3. Center Camera: Sia's 6-Blade Aperture Viewfinder Pedestal */}
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <ScanPedestalButton focused={focused} />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: () => {
            hapticFeedback.medium();
          },
        }}
      />

      {/* 4. Analytics: Macro Telemetry Bars & Feline Paw Crest */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => <AnalyticsTabIcon focused={focused} />,
        }}
        listeners={{
          tabPress: () => {
            hapticFeedback.selection();
          },
        }}
      />

      {/* 5. Profile: Sitting Siamese Silhouette with Emerald Tag */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
        listeners={{
          tabPress: () => {
            hapticFeedback.selection();
          },
        }}
      />
    </Tabs>
  );
}
