import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Animated,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useWaterStore } from '../../stores/waterStore';
import { useAuthStore } from '../../stores/authStore';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { hapticFeedback } from '../../utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SiaCatMascot, { SiaMood } from '../../components/SiaCatMascot';
import { FelineEmptyState } from '../../components/FelineEmptyState';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface QuickAmountOption {
  amount: number;
  label: string;
  desc: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const QUICK_AMOUNTS: QuickAmountOption[] = [
  { amount: 250, label: 'Kitten Bowl', desc: '+250 ml', icon: 'cat' },
  { amount: 500, label: 'Cat Bottle', desc: '+500 ml', icon: 'water' },
  { amount: 750, label: 'Hydra Flask', desc: '+750 ml', icon: 'flask' },
  { amount: 1000, label: 'Pounce Pitcher', desc: '+1.0 L', icon: 'cup-water' },
];

const GOAL_OPTIONS = [2000, 2500, 3000, 3500, 4000];

const getSiaHydrationMood = (pct: number): SiaMood => {
  if (pct >= 100) return 'celebrating';
  if (pct >= 75) return 'happy';
  if (pct >= 40) return 'happy';
  if (pct > 0) return 'idle';
  return 'thinking';
};

const getHydrationStatus = (pct: number, remaining: number) => {
  if (remaining <= 0 || pct >= 100) {
    return {
      title: 'Goal Mastered 👑',
      badgeColor: '#10b981',
      icon: 'paw' as const,
    };
  }
  if (pct >= 75) {
    return {
      title: 'Almost Full 🐾',
      badgeColor: '#38bdf8',
      icon: 'water' as const,
    };
  }
  if (pct >= 40) {
    return {
      title: 'Purr-fect Pace 💧',
      badgeColor: '#06b6d4',
      icon: 'water-outline' as const,
    };
  }
  return {
    title: 'Bowl Needs Water 🥣',
    badgeColor: '#a1a1aa',
    icon: 'water-alert-outline' as const,
  };
};

const getVesselIcon = (amount: number): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (amount <= 250) return 'cat';
  if (amount <= 500) return 'water';
  if (amount <= 750) return 'flask';
  return 'cup-water';
};

const getVesselLabel = (amount: number): string => {
  if (amount === 250) return 'Kitten Bowl';
  if (amount === 500) return 'Cat Bottle';
  if (amount === 750) return 'Hydra Flask';
  if (amount === 1000) return 'Pounce Pitcher';
  return 'Custom Sip';
};

export default function WaterScreen() {
  const { profile } = useAuthStore();
  const {
    todayMl,
    dailyGoalMl,
    logs,
    loadTodayWater,
    addWater,
    deleteWaterLog,
    setDailyGoal,
  } = useWaterStore();

  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMlText, setCustomMlText] = useState('350');
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  const effectiveGoal = profile?.target_water_ml || dailyGoalMl || 2500;
  const percentage = effectiveGoal > 0 ? Math.min(100, Math.round((todayMl / effectiveGoal) * 100)) : 0;
  const remainingMl = Math.max(0, effectiveGoal - todayMl);

  // SVG Dial Dimensions
  const size = 196;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2; // (196 - 14) / 2 = 91
  const circumference = 2 * Math.PI * radius;

  // Animated Ring Sweep
  const animatedStroke = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    loadTodayWater();
  }, []);

  useEffect(() => {
    const strokeOffset = circumference - (percentage / 100) * circumference;
    Animated.timing(animatedStroke, {
      toValue: strokeOffset,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [percentage, circumference]);

  const handleAddWater = async (amount: number, label = '') => {
    hapticFeedback.medium();
    await addWater(amount);
    const newTotal = (todayMl + amount) / 1000;
    const goalL = (effectiveGoal / 1000).toFixed(1);
    setToast({
      title: 'Hydration Logged',
      message: `+${amount} ml added ${label ? `(${label})` : ''} • Today: ${newTotal.toFixed(1)}L / ${goalL}L`,
      type: 'water',
    });

    // Trigger cat celebration if goal just reached
    const newMl = todayMl + amount;
    if (newMl >= effectiveGoal && todayMl < effectiveGoal) {
      hapticFeedback.success();
      setShowCelebration(true);
      celebrationAnim.setValue(0);
      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowCelebration(false));
        }, 2400);
      });
    }
  };

  const handleDeleteLog = async (id: string, amount: number) => {
    hapticFeedback.light();
    await deleteWaterLog(id);
    setToast({
      title: 'Hydration Removed',
      message: `-${amount} ml subtracted from daily total`,
      type: 'info',
    });
  };

  const handleCustomAdd = async () => {
    const amount = parseInt(customMlText, 10);
    if (!amount || isNaN(amount) || amount <= 0) {
      hapticFeedback.error();
      return;
    }
    setShowCustomModal(false);
    await handleAddWater(amount, 'Custom');
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const status = getHydrationStatus(percentage, remainingMl);

  // Dial milestone notch markers at 25%, 50%, 75%
  // Center is (98, 98), radius is 91
  // Angle = -PI/2 + pct * 2 * PI
  const milestoneNotches = [
    { pct: 25, cx: 98 + 91 * Math.cos(0), cy: 98 + 91 * Math.sin(0) }, // 3 o'clock (189, 98)
    { pct: 50, cx: 98 + 91 * Math.cos(Math.PI / 2), cy: 98 + 91 * Math.sin(Math.PI / 2) }, // 6 o'clock (98, 189)
    { pct: 75, cx: 98 + 91 * Math.cos(Math.PI), cy: 98 + 91 * Math.sin(Math.PI) }, // 9 o'clock (7, 98)
  ];

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Dynamic Island Toast HUD */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* Hydration Goal Celebration Overlay */}
      {showCelebration && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.72)',
            transform: [{ scale: celebrationAnim }],
            opacity: celebrationAnim,
          }}
          pointerEvents="none"
        >
          <View
            style={{
              backgroundColor: '#07181c',
              borderWidth: 1.5,
              borderColor: '#06b6d4',
              borderRadius: 32,
              paddingHorizontal: 36,
              paddingVertical: 28,
              alignItems: 'center',
              shadowColor: '#06b6d4',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.6,
              shadowRadius: 24,
              elevation: 20,
            }}
          >
            <SiaCatMascot size={72} mood="celebrating" style={{ marginBottom: 14 }} />
            <Text style={{ fontFamily: 'Outfit_900Black', color: '#38bdf8', fontSize: 22, letterSpacing: -0.5 }}>
              Paws Fully Hydrated! 🏆
            </Text>
            <Text style={{ color: '#a5f3fc', fontSize: 13, marginTop: 4, textAlign: 'center', fontWeight: '600' }}>
              Sia is purring with delight! Target reached!
            </Text>
            <View
              style={{
                marginTop: 12,
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                borderColor: 'rgba(6, 182, 212, 0.3)',
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>
                +10 Hydration Streak XP Active
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Header Bar */}
      <View className="px-5 pt-3 pb-3 border-b border-zinc-900 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
            <Ionicons name="water" size={17} color="#06b6d4" />
          </View>
          <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              Hydration Command
            </Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-lg tracking-tight"
            >
              Water & Fluid Tracker
            </Text>
          </View>
        </View>

        {/* Goal Selector Pill */}
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setShowGoalPicker(!showGoalPicker);
          }}
          activeOpacity={0.8}
          className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-2xl flex-row items-center gap-1.5"
        >
          <Text className="text-zinc-400 text-xs font-semibold">Goal:</Text>
          <Text
            style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
            className="text-cyan-400 text-xs"
          >
            {(effectiveGoal / 1000).toFixed(1)}L
          </Text>
          <Ionicons name="chevron-down" size={13} color="#71717a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Goal Selection Dropdown Sheet */}
        {showGoalPicker && (
          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-4">
            <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-wider mb-3">
              Set Daily Hydration Target Volume
            </Text>
            <View className="flex-row gap-2">
              {GOAL_OPTIONS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  onPress={() => {
                    hapticFeedback.selection();
                    setDailyGoal(goal);
                    setShowGoalPicker(false);
                    setToast({
                      title: 'Target Updated',
                      message: `Daily hydration goal set to ${(goal / 1000).toFixed(1)} Liters`,
                      type: 'water',
                    });
                  }}
                  className={`flex-1 py-3 rounded-2xl border items-center ${
                    effectiveGoal === goal
                      ? 'bg-cyan-500/20 border-cyan-500 shadow-md shadow-cyan-500/20'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }}
                    className={`text-xs ${
                      effectiveGoal === goal ? 'text-cyan-400' : 'text-zinc-400'
                    }`}
                  >
                    {(goal / 1000).toFixed(1)}L
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 1. Hero Animated Cyan Radial Gauge Card */}
        <View className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 mb-4 shadow-xl shadow-black/50">
          {/* Top Status Header */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
                Sia Fluid Matrix
              </Text>
            </View>

            <View className="bg-zinc-950 px-2.5 py-1 rounded-xl border border-cyan-500/30 flex-row items-center gap-1.5 shadow-sm shadow-cyan-500/10">
              <MaterialCommunityIcons
                name={status.icon}
                size={12}
                color={status.badgeColor}
              />
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold', color: status.badgeColor }}
                className="text-[10px] uppercase tracking-wider"
              >
                {status.title}
              </Text>
            </View>
          </View>

          {/* Central Radial SVG Gauge with Dynamic Sia Mascot */}
          <View className="items-center justify-center my-3">
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#38bdf8" />
                    <Stop offset="100%" stopColor="#0284c7" />
                  </LinearGradient>
                </Defs>

                {/* Track Ring */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#18181b"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />

                {/* Milestone Notches */}
                {milestoneNotches.map((m) => (
                  <Circle
                    key={m.pct}
                    cx={m.cx}
                    cy={m.cy}
                    r={3.5}
                    fill={percentage >= m.pct ? '#38bdf8' : '#27272a'}
                    stroke="#09090b"
                    strokeWidth={1.5}
                  />
                ))}

                {/* Active Animated Ring */}
                <AnimatedCircle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="url(#cyanGradient)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={animatedStroke}
                  strokeLinecap="round"
                  fill="transparent"
                  rotation="-90"
                  origin={`${size / 2}, ${size / 2}`}
                />
              </Svg>

              {/* Central Radial Mascot & Typography */}
              <View className="items-center justify-center">
                <View className="mb-1">
                  <SiaCatMascot
                    size={40}
                    mood={getSiaHydrationMood(percentage)}
                    withGlow={percentage >= 100}
                  />
                </View>
                <Text
                  style={{ fontFamily: 'Outfit_900Black', fontVariant: ['tabular-nums'] }}
                  className="text-3xl text-white tracking-tight leading-none mt-1"
                >
                  {(todayMl / 1000).toFixed(2)}
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-cyan-400 text-[10px] uppercase tracking-wider mt-1"
                >
                  LITERS LOGGED
                </Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-zinc-500 text-[10px] font-semibold mt-0.5"
                >
                  {percentage}% of {(effectiveGoal / 1000).toFixed(1)}L
                </Text>
              </View>
            </View>
          </View>

          {/* Telemetry Stats — asymmetric 2-col layout */}
          <View className="flex-row gap-2.5 pt-3 border-t border-zinc-800/50">

            {/* LEFT: Hero Pour Target stat */}
            <View
              style={{
                flex: 1.4,
                backgroundColor: remainingMl <= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(6,182,212,0.07)',
                borderWidth: 1,
                borderColor: remainingMl <= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(6,182,212,0.18)',
                borderRadius: 20,
                padding: 14,
              }}
            >
              <Text style={{ color: '#71717a', fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                Still to pour
              </Text>
              <Text
                style={{
                  fontFamily: 'Outfit_900Black',
                  fontVariant: ['tabular-nums'],
                  fontSize: remainingMl <= 0 ? 28 : 30,
                  color: remainingMl <= 0 ? '#10b981' : '#f4f4f5',
                  lineHeight: 32,
                }}
              >
                {remainingMl <= 0 ? '0' : remainingMl >= 1000
                  ? `${(remainingMl / 1000).toFixed(1)}`
                  : remainingMl.toString()}
              </Text>
              <Text style={{ color: remainingMl <= 0 ? '#10b981' : '#06b6d4', fontSize: 11, fontWeight: '700', marginTop: 1 }}>
                {remainingMl >= 1000 ? 'liters left' : 'ml left'}
              </Text>
              {/* Mini fill bar */}
              <View style={{ marginTop: 10, height: 4, backgroundColor: '#18181b', borderRadius: 4, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 4,
                    width: `${Math.min(100, percentage)}%`,
                    backgroundColor: remainingMl <= 0 ? '#10b981' : '#06b6d4',
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={{ color: '#52525b', fontSize: 9, fontWeight: '600', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                {percentage}% of {(effectiveGoal / 1000).toFixed(1)}L goal
              </Text>
            </View>

            {/* RIGHT: Two stacked secondary stats */}
            <View style={{ flex: 1, gap: 8 }}>

              {/* Sips Today */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#0d0d10',
                  borderWidth: 1,
                  borderColor: '#27272a',
                  borderRadius: 18,
                  padding: 12,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MaterialCommunityIcons name="cup-water" size={13} color="#52525b" />
                  <Text style={{ color: '#52525b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Sips Today
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
                  <Text style={{ fontFamily: 'Outfit_900Black', fontSize: 26, color: '#f4f4f5', fontVariant: ['tabular-nums'], lineHeight: 28 }}>
                    {logs.length}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#52525b', fontWeight: '600', marginBottom: 2 }}>drinks</Text>
                </View>
              </View>

              {/* Hydration Pace */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#0d0d10',
                  borderWidth: 1,
                  borderColor: '#27272a',
                  borderRadius: 18,
                  padding: 12,
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MaterialCommunityIcons name="paw" size={13} color="#06b6d4" />
                  <Text style={{ color: '#52525b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Pace
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Outfit_800ExtraBold',
                    fontSize: percentage >= 100 ? 14 : 15,
                    color: percentage >= 100 ? '#10b981' : percentage >= 50 ? '#38bdf8' : '#a1a1aa',
                    marginTop: 6,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {percentage >= 100 ? '✓ Done' : percentage >= 75 ? 'Almost' : percentage >= 50 ? 'On Track' : 'Building'}
                </Text>
              </View>

            </View>
          </View>
        </View>

        {/* Sia Hydration Companion Banner */}
        {percentage >= 100 ? (
          <View className="bg-cyan-500/10 border border-cyan-500/30 rounded-3xl p-4 mb-4 flex-row items-center gap-3.5 shadow-sm shadow-cyan-500/10">
            <SiaCatMascot size={46} mood="celebrating" withGlow={false} />
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-cyan-400 text-sm"
                >
                  Paws Fully Hydrated! 🏆
                </Text>
              </View>
              <Text className="text-zinc-300 text-xs leading-4">
                Sia is purring with delight! Daily target of {(effectiveGoal / 1000).toFixed(1)}L smashed for today.
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 items-center justify-center">
              <MaterialCommunityIcons name="paw" size={16} color="#06b6d4" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-300 text-xs font-semibold leading-4">
                {percentage === 0
                  ? '“A well-hydrated human is a high-energy hunter! Pour a fresh bowl.” — Sia'
                  : percentage < 50
                  ? `“Keep sipping! ${remainingMl.toLocaleString()} ml to go until my bowl is purr-fect.” — Sia`
                  : `“You’re crushing it! Over halfway to your ${(effectiveGoal / 1000).toFixed(1)}L target.” — Sia`}
              </Text>
            </View>
          </View>
        )}

        {/* 2. Quick Vessel Intake Grid with Spring Press Physics */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
              Rapid Vessel Logging
            </Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setShowCustomModal(true);
              }}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="add-circle-outline" size={14} color="#06b6d4" />
              <Text className="text-cyan-400 text-xs font-bold">Custom Amount</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            {QUICK_AMOUNTS.map((item) => (
              <Pressable
                key={item.amount}
                onPress={() => handleAddWater(item.amount, item.label)}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                className="flex-1 bg-zinc-900/90 border border-zinc-800/90 p-3 rounded-2xl items-center justify-center shadow-sm shadow-black"
              >
                <View className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center mb-1.5">
                  <MaterialCommunityIcons name={item.icon} size={18} color="#06b6d4" />
                </View>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs text-center"
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-cyan-400 text-[10px] font-extrabold mt-0.5"
                >
                  {item.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 3. Hydration Timeline */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-base"
            >
              Today's Fluid Timeline
            </Text>
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="text-zinc-500 text-xs font-semibold"
            >
              {logs.length} logged entries
            </Text>
          </View>

          {logs.length === 0 ? (
            <FelineEmptyState
              title="Sia's Water Bowl is Dry!"
              description="Zero fluid logged yet today. Tap any vessel tile above to pour fresh water into Sia's bowl and hit your daily goal."
              actionLabel="Add +250ml Bowl"
              onAction={() => handleAddWater(250, 'Kitten Bowl')}
              mood="thinking"
            />
          ) : (
            logs.map((log) => (
              <View
                key={log.id}
                className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
                    <MaterialCommunityIcons
                      name={getVesselIcon(log.amount_ml)}
                      size={18}
                      color="#06b6d4"
                    />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text
                        style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
                        className="text-white text-base"
                      >
                        +{log.amount_ml} <Text className="text-xs text-cyan-400 font-bold">ml</Text>
                      </Text>
                      <Text className="text-zinc-400 text-[11px] font-medium">
                        • {getVesselLabel(log.amount_ml)}
                      </Text>
                    </View>
                    <Text className="text-zinc-500 text-xs font-semibold">{formatTime(log.logged_at)}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleDeleteLog(log.id, log.amount_ml)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.88 : 1 }],
                    },
                  ]}
                  className="w-8 h-8 rounded-full bg-zinc-800/70 border border-zinc-700/40 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={14} color="#a1a1aa" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Custom Volume Modal */}
      {showCustomModal && (
        <Modal
          visible={showCustomModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCustomModal(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
                    <Ionicons name="water" size={16} color="#06b6d4" />
                  </View>
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className="text-white text-lg"
                  >
                    Custom Fluid Volume
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowCustomModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-400 text-xs mb-4 leading-4">
                Enter any volume in milliliters (ml) to add to your daily hydration total.
              </Text>

              {/* Number Input */}
              <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 mb-5">
                <TextInput
                  value={customMlText}
                  onChangeText={setCustomMlText}
                  keyboardType="numeric"
                  placeholder="350"
                  placeholderTextColor="#52525b"
                  className="flex-1 text-white text-2xl font-bold"
                  autoFocus
                />
                <Text className="text-cyan-400 text-base font-extrabold ml-2">ML</Text>
              </View>

              {/* Quick Preset Chips */}
              <View className="flex-row gap-2 mb-5">
                {[150, 330, 450, 600].map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => {
                      hapticFeedback.selection();
                      setCustomMlText(val.toString());
                    }}
                    style={({ pressed }) => [
                      {
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    className="flex-1 bg-zinc-950 border border-zinc-800 py-2.5 rounded-xl items-center"
                  >
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-zinc-300 text-xs font-bold"
                    >
                      +{val}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleCustomAdd}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                className="w-full bg-cyan-500 rounded-2xl py-4 items-center justify-center shadow-lg shadow-cyan-500/25"
              >
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white font-bold text-base"
                >
                  Log Fluid Intake
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
