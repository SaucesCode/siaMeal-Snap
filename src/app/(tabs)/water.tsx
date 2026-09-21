import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import SiaCatMascot from '../../components/SiaCatMascot';
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
  const size = 185;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
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
        }, 2200);
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
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.65)',
            transform: [{ scale: celebrationAnim }],
            opacity: celebrationAnim,
          }}
          pointerEvents="none"
        >
          <View
            style={{
              backgroundColor: '#0c1a14',
              borderWidth: 1.5,
              borderColor: '#10b981',
              borderRadius: 32,
              paddingHorizontal: 36,
              paddingVertical: 26,
              alignItems: 'center',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            <SiaCatMascot size={64} mood="celebrating" style={{ marginBottom: 12 }} />
            <Text style={{ fontFamily: 'Outfit_900Black', color: '#10b981', fontSize: 20, letterSpacing: -0.5 }}>
              Daily Goal Achieved
            </Text>
            <Text style={{ color: '#6ee7b7', fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '600' }}>
              Target hydration completed for today
            </Text>
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
            style={{ fontFamily: 'Outfit_800ExtraBold' }}
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
        contentContainerStyle={{ paddingBottom: 40 }}
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
                    style={{ fontFamily: 'Outfit_700Bold' }}
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
                name={remainingMl <= 0 ? 'paw' : 'water'}
                size={12}
                color={remainingMl <= 0 ? '#10b981' : '#06b6d4'}
              />
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className={`text-[10px] uppercase tracking-wider ${
                  remainingMl <= 0 ? 'text-emerald-400' : 'text-cyan-400'
                }`}
              >
                {remainingMl <= 0 ? 'Goal Mastered' : 'Purr-fect Pace'}
              </Text>
            </View>
          </View>

          {/* Central Radial SVG Gauge */}
          <View className="items-center justify-center my-3">
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#06b6d4" />
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

              {/* Central Radial Typography */}
              <View className="items-center justify-center">
                <View className="mb-1 opacity-90">
                  <MaterialCommunityIcons name="cat" size={20} color="#06b6d4" />
                </View>
                <Text
                  style={{ fontFamily: 'Outfit_900Black' }}
                  className="text-4xl text-white tracking-tight"
                >
                  {(todayMl / 1000).toFixed(2)}
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-cyan-400 text-xs uppercase tracking-wider mt-0.5"
                >
                  LITERS LOGGED
                </Text>
                <Text className="text-zinc-500 text-[10px] font-semibold mt-1">
                  {percentage}% of {(effectiveGoal / 1000).toFixed(1)}L
                </Text>
              </View>
            </View>
          </View>

          {/* 3 Telemetry Metrics */}
          <View className="flex-row gap-2 pt-2 border-t border-zinc-800/60">
            {/* Remaining */}
            <View className="flex-1 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-2.5 items-center">
              <Text className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                Remaining
              </Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-sm mt-0.5"
              >
                {remainingMl <= 0 ? '0' : remainingMl.toLocaleString()} <Text className="text-[10px] text-zinc-500 font-normal">ml</Text>
              </Text>
            </View>

            {/* Total Drinks */}
            <View className="flex-1 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-2.5 items-center">
              <Text className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                Intakes
              </Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-sm mt-0.5"
              >
                {logs.length} <Text className="text-[10px] text-zinc-500 font-normal">drinks</Text>
              </Text>
            </View>

            {/* Pacing */}
            <View className="flex-1 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-2.5 items-center">
              <Text className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                Hydration Pace
              </Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-cyan-400 text-sm mt-0.5"
              >
                {percentage >= 100 ? 'Complete' : percentage >= 50 ? 'On Track' : 'In Progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* Feline Hydration Goal Celebration Banner */}
        {percentage >= 100 && (
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
        )}

        {/* 2. Quick Vessel Intake Grid */}
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
              <TouchableOpacity
                key={item.amount}
                onPress={() => handleAddWater(item.amount, item.label)}
                activeOpacity={0.75}
                className="flex-1 bg-zinc-900/90 border border-zinc-800/90 active:border-cyan-500/60 p-3 rounded-2xl items-center justify-center shadow-sm shadow-black"
              >
                <View className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center mb-1.5">
                  <MaterialCommunityIcons name={item.icon} size={18} color="#06b6d4" />
                </View>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  {item.label}
                </Text>
                <Text className="text-cyan-400 text-[10px] font-extrabold mt-0.5">
                  {item.desc}
                </Text>
              </TouchableOpacity>
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
            <Text className="text-zinc-500 text-xs font-semibold">{logs.length} logged entries</Text>
          </View>

          {logs.length === 0 ? (
            <FelineEmptyState
              title="Sia's Water Bowl is Dry!"
              description="Zero fluid logged yet today. Tap any vessel tile above to pour fresh water into Sia's bowl and hit your daily goal."
              actionLabel="Add +250ml Glass"
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
                    <Ionicons name="water" size={17} color="#06b6d4" />
                  </View>
                  <View>
                    <Text
                      style={{ fontFamily: 'Outfit_800ExtraBold' }}
                      className="text-white text-base"
                    >
                      +{log.amount_ml} <Text className="text-xs text-cyan-400 font-bold">ml</Text>
                    </Text>
                    <Text className="text-zinc-500 text-xs font-semibold">{formatTime(log.logged_at)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteLog(log.id, log.amount_ml)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="w-8 h-8 rounded-full bg-zinc-800/70 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={14} color="#71717a" />
                </TouchableOpacity>
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
                  <TouchableOpacity
                    key={val}
                    onPress={() => setCustomMlText(val.toString())}
                    className="flex-1 bg-zinc-950 border border-zinc-800 py-2 rounded-xl items-center"
                  >
                    <Text className="text-zinc-300 text-xs font-bold">+{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCustomAdd}
                activeOpacity={0.8}
                className="w-full bg-cyan-500 active:bg-cyan-600 rounded-2xl py-4 items-center justify-center shadow-lg shadow-cyan-500/25"
              >
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white font-bold text-base"
                >
                  Log Fluid Intake
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
