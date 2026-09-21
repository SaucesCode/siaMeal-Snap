import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Platform } from 'react-native';
import Svg, { Circle, Ellipse, Path, Line, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

// --- Custom Cat-Themed Tab Icons ---

/** Dashboard: minimal 2D cat face */
function CatFaceIcon({ color = '#71717a', size = 22 }: { color?: any; size?: number }) {
  const c = color as any;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <Ellipse cx="12" cy="13" rx="8" ry="7" stroke={c} strokeWidth="1.6" fill="none" />
      {/* Left ear */}
      <Path d="M6 8 L4 3 L9 6.5 Z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* Right ear */}
      <Path d="M18 8 L20 3 L15 6.5 Z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* Left eye (normal dot) */}
      <Circle cx="9.5" cy="12.5" r="1.1" fill={c} />
      {/* Right eye (camera aperture: outer circle + inner dot) */}
      <Circle cx="14.5" cy="12.5" r="1.8" stroke={c} strokeWidth="1.2" fill="none" />
      <Circle cx="14.5" cy="12.5" r="0.7" fill={c} />
      {/* Nose */}
      <Path d="M11.3 15.2 L12 14.4 L12.7 15.2 Z" fill={c} />
      {/* Mouth */}
      <Path d="M10.5 16 Q12 17.2 13.5 16" stroke={c} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Hydration: fish outline */
function FishIcon({ color = '#71717a', size = 23 }: { color?: any; size?: number }) {
  const c = color as any;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body */}
      <Ellipse cx="10.5" cy="12" rx="7.5" ry="4.5" stroke={c} strokeWidth="1.5" fill="none" />
      {/* Tail */}
      <Path d="M18 12 L22 8 L22 16 Z" stroke={c} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* Eye */}
      <Circle cx="6.5" cy="11.2" r="1" fill={c} />
      {/* Fin */}
      <Path d="M10 7.8 Q12 5.5 14 7.8" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Analytics: paw bar chart */
function PawChartIcon({ color = '#71717a', size = 22 }: { color?: any; size?: number }) {
  const c = color as any;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bars */}
      <Rect x="2" y="14" width="4" height="7" rx="1" stroke={c} strokeWidth="1.5" fill="none" />
      <Rect x="8" y="9" width="4" height="12" rx="1" stroke={c} strokeWidth="1.5" fill="none" />
      <Rect x="14" y="5" width="4" height="16" rx="1" stroke={c} strokeWidth="1.5" fill="none" />
      {/* Tiny paw dot on top bar */}
      <Circle cx="16" cy="3.2" r="1.3" fill={c} />
      <Circle cx="13.8" cy="2.2" r="0.85" fill={c} />
      <Circle cx="18.2" cy="2.2" r="0.85" fill={c} />
    </Svg>
  );
}

/** Profile: sitting cat silhouette outline */
function SittingCatIcon({ color = '#71717a', size = 22 }: { color?: any; size?: number }) {
  const c = color as any;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body oval */}
      <Ellipse cx="12" cy="16" rx="5.5" ry="5" stroke={c} strokeWidth="1.5" fill="none" />
      {/* Head */}
      <Circle cx="12" cy="7.5" r="4" stroke={c} strokeWidth="1.5" fill="none" />
      {/* Left ear */}
      <Path d="M8.5 5 L7 2 L10.5 4.2 Z" stroke={c} strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* Right ear */}
      <Path d="M15.5 5 L17 2 L13.5 4.2 Z" stroke={c} strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      {/* Eyes */}
      <Circle cx="10.2" cy="7.3" r="0.9" fill={c} />
      <Circle cx="13.8" cy="7.3" r="0.9" fill={c} />
      {/* Tail curling from body */}
      <Path d="M17 19 Q21 17 20 13 Q19 10 17 11" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

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
          backgroundColor: '#0c0c0e',
          borderTopColor: '#1e1e24',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      {/* 1. Dashboard — cat face */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <CatFaceIcon color={color} />,
        }}
      />

      {/* 2. Hydration — fish */}
      <Tabs.Screen
        name="water"
        options={{
          title: 'Hydration',
          tabBarIcon: ({ focused }) => (
            <FishIcon color={focused ? '#06b6d4' : '#71717a'} />
          ),
        }}
      />

      {/* 3. Center Camera — floating aperture pedestal (unchanged) */}
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: '#0c0c0e',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: Platform.OS === 'ios' ? -28 : -24,
                borderWidth: 2.5,
                borderColor: focused ? '#10b981' : '#27272a',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.45,
                shadowRadius: 10,
                elevation: 14,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#10b981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: '#34d399',
                }}
              >
                <Ionicons name="camera" size={26} color="#ffffff" />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* 4. Analytics — paw bar chart */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <PawChartIcon color={color} />,
        }}
      />

      {/* 5. Profile — sitting cat */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <SittingCatIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

