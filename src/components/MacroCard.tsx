import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DailySummaryCardProps {
  targetCalories: number;
  consumedCalories: number;
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}

export function DailyMacroSummary({
  targetCalories,
  consumedCalories,
  protein,
  carbs,
  fat,
}: DailySummaryCardProps) {
  const isOverCalories = consumedCalories > targetCalories;
  const overCaloriesAmount = Math.max(0, consumedCalories - targetCalories);
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);

  const calPct = targetCalories > 0 ? Math.min(100, Math.round((consumedCalories / targetCalories) * 100)) : 0;
  const protPct = protein.target > 0 ? Math.min(100, Math.round((protein.consumed / protein.target) * 100)) : 0;
  const carbPct = carbs.target > 0 ? Math.min(100, Math.round((carbs.consumed / carbs.target) * 100)) : 0;
  const fatPct = fat.target > 0 ? Math.min(100, Math.round((fat.consumed / fat.target) * 100)) : 0;

  // Concentric Multi-Orbital Radii
  const size = 210;
  const center = size / 2;

  // Outer Ring: Calories (Radius 92, Stroke 11)
  const rCal = 92;
  const strokeCal = 11;
  const cCal = 2 * Math.PI * rCal;

  // Middle Ring: Protein (Radius 76, Stroke 7)
  const rProt = 76;
  const strokeProt = 7;
  const cProt = 2 * Math.PI * rProt;

  // Inner Ring: Carbs (Radius 63, Stroke 6)
  const rCarb = 63;
  const strokeCarb = 6;
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
      className={`rounded-3xl p-5 mb-4 border ${
        isOverCalories
          ? 'bg-zinc-900/95 border-rose-500/40 shadow-xl shadow-rose-500/10'
          : 'bg-zinc-900/95 border-zinc-800/90 shadow-xl shadow-black/50'
      }`}
    >
      {/* Top Header Tag Row */}
      <View className="flex-row items-center justify-between mb-1 px-1">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2.5 h-2.5 rounded-full ${
              isOverCalories ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
            {isOverCalories ? 'Energy Limit Exceeded' : 'Sia Bio-Aperture HUD'}
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
                <Stop offset="0%" stopColor="#10b981" />
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
              strokeDasharray={`${cCal} ${cCal}`}
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
              strokeDasharray={`${cProt} ${cProt}`}
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
              strokeDasharray={`${cCarb} ${cCarb}`}
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
              style={{ fontFamily: 'Outfit_900Black' }}
              className={`text-3xl tracking-tight ${
                isOverCalories ? 'text-rose-400' : 'text-white'
              }`}
            >
              {isOverCalories
                ? `+${Math.round(overCaloriesAmount)}`
                : Math.round(remainingCalories).toLocaleString()}
            </Text>

            <Text className="text-zinc-500 text-[10px] font-bold mt-0.5">
              {calPct}% of {Math.round(targetCalories)} kcal
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
            {Math.round(protein.consumed)}g ({protPct}%)
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
          <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-white text-sm">
            {Math.round(protein.consumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(protein.target)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, protPct)}%` }}
              className="h-full bg-sky-400 rounded-full"
            />
          </View>
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
          <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-white text-sm">
            {Math.round(carbs.consumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(carbs.target)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, carbPct)}%` }}
              className="h-full bg-amber-400 rounded-full"
            />
          </View>
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
          <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-white text-sm">
            {Math.round(fat.consumed)} <Text className="text-[10px] text-zinc-500 font-normal">/ {Math.round(fat.target)}g</Text>
          </Text>
          {/* Micro Progress Track */}
          <View className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
            <View
              style={{ width: `${Math.min(100, fatPct)}%` }}
              className="h-full bg-rose-400 rounded-full"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
