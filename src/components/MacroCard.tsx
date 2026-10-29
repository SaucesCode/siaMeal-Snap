import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DailySummaryCardProps {
  targetCalories: number;
  consumedCalories: number;
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}

function CatEarTabs({ borderColor = '#27272a' }: { borderColor?: string }) {
  return (
    <>
      {/* Left Feline Ear Silhouette Tab */}
      <View style={{ position: 'absolute', top: -10, left: 24, zIndex: 2 }}>
        <Svg width={26} height={12} viewBox="0 0 26 12" fill="none">
          <Path
            d="M 2 12 L 11 2 C 12 1 14 1 15 2 L 24 12"
            fill="#09090b"
            stroke={borderColor}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M 7 12 L 12 4.5 C 12.5 4 13.5 4 14 4.5 L 19 12"
            fill="#fda4af"
            fillOpacity={0.25}
          />
        </Svg>
      </View>
      {/* Right Feline Ear Silhouette Tab */}
      <View style={{ position: 'absolute', top: -10, right: 24, zIndex: 2 }}>
        <Svg width={26} height={12} viewBox="0 0 26 12" fill="none">
          <Path
            d="M 2 12 L 11 2 C 12 1 14 1 15 2 L 24 12"
            fill="#09090b"
            stroke={borderColor}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M 7 12 L 12 4.5 C 12.5 4 13.5 4 14 4.5 L 19 12"
            fill="#fda4af"
            fillOpacity={0.25}
          />
        </Svg>
      </View>
    </>
  );
}

export function DailyMacroSummary({
  targetCalories,
  consumedCalories,
  protein,
  carbs,
  fat,
}: DailySummaryCardProps) {
  const safeTargetCal = Number(targetCalories) > 0 ? Number(targetCalories) : 2000;
  const safeConsumedCal = Number(consumedCalories) || 0;
  const safeProtConsumed = Number(protein?.consumed) || 0;
  const safeProtTarget = Number(protein?.target) > 0 ? Number(protein?.target) : 150;
  const safeCarbConsumed = Number(carbs?.consumed) || 0;
  const safeCarbTarget = Number(carbs?.target) > 0 ? Number(carbs?.target) : 200;
  const safeFatConsumed = Number(fat?.consumed) || 0;
  const safeFatTarget = Number(fat?.target) > 0 ? Number(fat?.target) : 65;

  const isOverCalories = safeConsumedCal > safeTargetCal;
  const overCaloriesAmount = Math.max(0, safeConsumedCal - safeTargetCal);
  const remainingCalories = Math.max(0, safeTargetCal - safeConsumedCal);

  const calPct = Math.max(0, Math.min(100, Math.round((safeConsumedCal / safeTargetCal) * 100))) || 0;
  const protPct = Math.max(0, Math.min(100, Math.round((safeProtConsumed / safeProtTarget) * 100))) || 0;
  const carbPct = Math.max(0, Math.min(100, Math.round((safeCarbConsumed / safeCarbTarget) * 100))) || 0;
  const fatPct = Math.max(0, Math.min(100, Math.round((safeFatConsumed / safeFatTarget) * 100))) || 0;

  // Concentric Multi-Orbital Radii
  const size = 216;
  const center = size / 2;

  // Outer Ring: Calories (Radius 94, Stroke 11)
  const rCal = 94;
  const strokeCal = 11;
  const cCal = 2 * Math.PI * rCal;

  // Middle Ring: Protein (Radius 78, Stroke 7.5)
  const rProt = 78;
  const strokeProt = 7.5;
  const cProt = 2 * Math.PI * rProt;

  // Inner Ring: Carbs (Radius 64, Stroke 6.5)
  const rCarb = 64;
  const strokeCarb = 6.5;
  const cCarb = 2 * Math.PI * rCarb;

  // Animated Arcs
  const animCal = useRef(new Animated.Value(cCal)).current;
  const animProt = useRef(new Animated.Value(cProt)).current;
  const animCarb = useRef(new Animated.Value(cCarb)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animCal, {
        toValue: cCal - (calPct / 100) * cCal,
        duration: 950,
        useNativeDriver: false,
      }),
      Animated.timing(animProt, {
        toValue: cProt - (protPct / 100) * cProt,
        duration: 900,
        useNativeDriver: false,
      }),
      Animated.timing(animCarb, {
        toValue: cCarb - (carbPct / 100) * cCarb,
        duration: 850,
        useNativeDriver: false,
      }),
    ]).start();
  }, [calPct, protPct, carbPct]);

  return (
    <View
      className={`relative rounded-3xl p-5 mb-4 border ${
        isOverCalories
          ? 'bg-zinc-900/95 border-rose-500/40 shadow-xl shadow-rose-500/10'
          : 'bg-zinc-900/95 border-zinc-800/90 shadow-xl shadow-black/60'
      }`}
    >
      {/* Sleek Feline Ear Silhouette Tabs */}
      <CatEarTabs borderColor={isOverCalories ? 'rgba(244,63,94,0.45)' : 'rgba(16,185,129,0.35)'} />

      {/* Top Header Tag Row */}
      <View className="flex-row items-center justify-between mb-1 px-1">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2.5 h-2.5 rounded-full ${
              isOverCalories ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
            {isOverCalories ? 'Energy Limit Exceeded' : 'Sia Macro Aperture HUD'}
          </Text>
        </View>

        <View className="bg-zinc-950 px-2.5 py-1 rounded-xl border border-emerald-500/30 flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/10">
          <MaterialCommunityIcons
            name="cat"
            size={13}
            color={isOverCalories ? '#fb7185' : '#10b981'}
          />
          <Text
            style={{ fontFamily: 'Outfit_800ExtraBold' }}
            className={`text-[10px] uppercase tracking-wider ${
              isOverCalories ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {isOverCalories ? 'Prowl Mode' : 'Deficit Locked'}
          </Text>
        </View>
      </View>

      {/* Hero Multi-Tier Concentric Orbital Dial */}
      <View className="items-center justify-center my-2">
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#34d399" />
                <Stop offset="100%" stopColor="#059669" />
              </LinearGradient>
              <LinearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#fb7185" />
                <Stop offset="100%" stopColor="#e11d48" />
              </LinearGradient>
              <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#38bdf8" />
                <Stop offset="100%" stopColor="#0284c7" />
              </LinearGradient>
              <LinearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#fbbf24" />
                <Stop offset="100%" stopColor="#d97706" />
              </LinearGradient>
            </Defs>

            {/* Orbit Tracks */}
            <Circle cx={center} cy={center} r={rCal} stroke="#18181b" strokeWidth={strokeCal} fill="transparent" />
            <Circle cx={center} cy={center} r={rProt} stroke="#18181b" strokeWidth={strokeProt} fill="transparent" />
            <Circle cx={center} cy={center} r={rCarb} stroke="#18181b" strokeWidth={strokeCarb} fill="transparent" />

            {/* Concentric Active Rings */}
            {/* 1. Outer Calorie Ring */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={rCal}
              stroke={isOverCalories ? 'url(#roseGrad)' : 'url(#emeraldGrad)'}
              strokeWidth={strokeCal}
              strokeDasharray={[cCal, cCal]}
              strokeDashoffset={animCal}
              strokeLinecap="round"
              fill="transparent"
              rotation="-90"
              origin={`${center}, ${center}`}
            />

            {/* 2. Middle Protein Ring */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={rProt}
              stroke="url(#skyGrad)"
              strokeWidth={strokeProt}
              strokeDasharray={[cProt, cProt]}
              strokeDashoffset={animProt}
              strokeLinecap="round"
              fill="transparent"
              rotation="-90"
              origin={`${center}, ${center}`}
            />

            {/* 3. Inner Carbs Ring */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={rCarb}
              stroke="url(#amberGrad)"
              strokeWidth={strokeCarb}
              strokeDasharray={[cCarb, cCarb]}
              strokeDashoffset={animCarb}
              strokeLinecap="round"
              fill="transparent"
              rotation="-90"
              origin={`${center}, ${center}`}
            />
          </Svg>

          {/* Center Aperture Core Readout */}
          <View className="items-center justify-center px-4">
            <View className="flex-row items-center gap-1 mb-0.5">
              <MaterialCommunityIcons
                name="paw"
                size={13}
                color={isOverCalories ? '#fb7185' : '#10b981'}
              />
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className={`text-[9px] uppercase tracking-wider ${
                  isOverCalories ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isOverCalories ? 'Exceeded' : 'Remaining'}
              </Text>
            </View>

            <Text
              style={{ fontFamily: 'Outfit_900Black', fontVariant: ['tabular-nums'] }}
              className={`text-3xl tracking-tight ${
                isOverCalories ? 'text-rose-400' : 'text-white'
              }`}
            >
              {isOverCalories
                ? `+${Math.round(overCaloriesAmount)}`
                : Math.round(remainingCalories).toLocaleString()}
            </Text>

            {/* Micro Whisker Detail */}
            <View className="flex-row items-center gap-1 my-0.5 opacity-60">
              <View className="w-3 h-px bg-zinc-600" />
              <View className="w-1 h-1 rounded-full bg-emerald-400" />
              <View className="w-3 h-px bg-zinc-600" />
            </View>

            <Text className="text-zinc-500 text-[10px] font-bold mt-0.5">
              {calPct}% of {Math.round(safeTargetCal)} kcal
            </Text>
          </View>
        </View>
      </View>

      {/* Celebratory Goal Hit Banner */}
      {protPct >= 100 && (
        <View className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl px-3.5 py-2 my-1 flex-row items-center justify-between shadow-sm shadow-emerald-500/10">
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="trophy" size={14} color="#34d399" />
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-emerald-400 text-xs">
              Protein Target Reached
            </Text>
          </View>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-emerald-300 text-xs">
            {Math.round(safeProtConsumed)}g ({protPct}%)
          </Text>
        </View>
      )}

      {/* 3 Athletic Telemetry Bars (Protein, Carbs, Fat) */}
      <View className="flex-row gap-2 mt-2 pt-3 border-t border-zinc-800/70">
        {/* Protein Pod */}
        <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-2.5">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <Text className="text-sky-400 text-[9px] font-black uppercase">Protein</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] font-bold">{protPct}%</Text>
          </View>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }} className="text-white text-sm">
            {Math.round(safeProtConsumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(safeProtTarget)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, protPct)}%` }}
              className="h-full bg-sky-400 rounded-full"
            />
          </View>
          <Text className="text-zinc-500 text-[9px] font-semibold mt-1">
            {safeProtConsumed >= safeProtTarget ? 'Target Met' : `${Math.round(Math.max(0, safeProtTarget - safeProtConsumed))}g left`}
          </Text>
        </View>

        {/* Carbs Pod */}
        <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-2.5">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <Text className="text-amber-400 text-[9px] font-black uppercase">Carbs</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] font-bold">{carbPct}%</Text>
          </View>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }} className="text-white text-sm">
            {Math.round(safeCarbConsumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(safeCarbTarget)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, carbPct)}%` }}
              className="h-full bg-amber-400 rounded-full"
            />
          </View>
          <Text className="text-zinc-500 text-[9px] font-semibold mt-1">
            {safeCarbConsumed >= safeCarbTarget ? 'Target Met' : `${Math.round(Math.max(0, safeCarbTarget - safeCarbConsumed))}g left`}
          </Text>
        </View>

        {/* Fat Pod */}
        <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-2.5">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <Text className="text-rose-400 text-[9px] font-black uppercase">Fat</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] font-bold">{fatPct}%</Text>
          </View>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }} className="text-white text-sm">
            {Math.round(safeFatConsumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(safeFatTarget)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, fatPct)}%` }}
              className="h-full bg-rose-400 rounded-full"
            />
          </View>
          <Text className="text-zinc-500 text-[9px] font-semibold mt-1">
            {safeFatConsumed >= safeFatTarget ? 'Target Met' : `${Math.round(Math.max(0, safeFatTarget - safeFatConsumed))}g left`}
          </Text>
        </View>
      </View>
    </View>
  );
}
