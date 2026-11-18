import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useWeightStore, WeightEntry } from '../stores/weightStore';
import { WeightTrendChart } from './WeightTrendChart';
import { hapticFeedback } from '../utils/haptics';
import { useShallow } from 'zustand/react/shallow';

interface WeightTrackerSheetProps {
  visible: boolean;
  onClose: () => void;
  currentProfileWeight?: number;
  onWeightLogged?: (weightKg: number) => void;
}

export function WeightTrackerSheet({
  visible,
  onClose,
  currentProfileWeight = 75,
  onWeightLogged,
}: WeightTrackerSheetProps) {
  const { entries, logWeight, deleteWeightEntry, loadWeightHistory } = useWeightStore(
    useShallow((s) => ({ entries: s.entries, logWeight: s.logWeight, deleteWeightEntry: s.deleteWeightEntry, loadWeightHistory: s.loadWeightHistory }))
  );
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightInput, setWeightInput] = useState(String(currentProfileWeight || '75'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWeightHistory();
      const latest = entries.length > 0 ? entries[entries.length - 1].weight_kg : currentProfileWeight;
      setWeightInput(String(latest || '75'));
    }
  }, [visible]);

  if (!visible) return null;

  const currentVal = parseFloat(weightInput) || currentProfileWeight || 75;

  const handleAdjustWeight = (delta: number) => {
    hapticFeedback.selection();
    const next = Math.max(30, Math.min(300, Math.round((currentVal + delta) * 10) / 10));
    setWeightInput(String(next));
  };

  const handleSaveWeight = async () => {
    const val = parseFloat(weightInput);
    if (!val || isNaN(val) || val <= 0) {
      hapticFeedback.error();
      return;
    }

    const valKg = unit === 'lbs' ? Math.round((val / 2.20462) * 10) / 10 : Math.round(val * 10) / 10;

    try {
      setIsSubmitting(true);
      hapticFeedback.success();
      await logWeight(valKg);
      if (onWeightLogged) onWeightLogged(valKg);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <View className="absolute inset-0 z-50 justify-end bg-black/80">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="w-full justify-end"
      >
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[88vh]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
                <Ionicons name="scale-outline" size={17} color="#10b981" />
              </View>
              <View>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-lg"
                >
                  Body Weight Lab
                </Text>
                <Text className="text-zinc-500 text-xs font-semibold">
                  Scale weight & 14-day trend analysis
                </Text>
              </View>
            </View>

            {/* Unit Switcher & Close */}
            <View className="flex-row items-center gap-2">
              <View className="flex-row bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    setUnit('kg');
                  }}
                  className={`px-2.5 py-1 rounded-lg ${unit === 'kg' ? 'bg-zinc-800' : 'bg-transparent'}`}
                >
                  <Text className={`text-[10px] font-bold ${unit === 'kg' ? 'text-white' : 'text-zinc-500'}`}>
                    KG
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    setUnit('lbs');
                  }}
                  className={`px-2.5 py-1 rounded-lg ${unit === 'lbs' ? 'bg-zinc-800' : 'bg-transparent'}`}
                >
                  <Text className={`text-[10px] font-bold ${unit === 'lbs' ? 'text-white' : 'text-zinc-500'}`}>
                    LBS
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center ml-1"
              >
                <Ionicons name="close" size={16} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Interactive Weight Input & Stepper Pod */}
            <View className="bg-zinc-950/80 border border-zinc-800/90 rounded-3xl p-4.5 mb-4 shadow-sm">
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest text-center mb-3">
                Log Morning Weigh-In
              </Text>

              {/* Central Value Readout & Steppers */}
              <View className="flex-row items-center justify-center gap-2 mb-3">
                <TouchableOpacity
                  onPress={() => handleAdjustWeight(-0.5)}
                  activeOpacity={0.7}
                  className="bg-zinc-900 border border-zinc-800 w-10 h-10 rounded-2xl items-center justify-center"
                >
                  <Text className="text-zinc-300 font-bold text-xs">-0.5</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAdjustWeight(-0.1)}
                  activeOpacity={0.7}
                  className="bg-zinc-900 border border-zinc-800 w-10 h-10 rounded-2xl items-center justify-center"
                >
                  <Text className="text-zinc-300 font-bold text-xs">-0.1</Text>
                </TouchableOpacity>

                {/* Main Text Input Field */}
                <View className="bg-zinc-900 border border-emerald-500/40 px-4 py-2 rounded-2xl flex-row items-baseline gap-1 min-w-[120px] justify-center shadow-md shadow-emerald-500/10">
                  <TextInput
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="numeric"
                    className="text-white text-2xl font-black text-center"
                    selectTextOnFocus
                  />
                  <Text className="text-emerald-400 font-extrabold text-xs uppercase">{unit}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleAdjustWeight(0.1)}
                  activeOpacity={0.7}
                  className="bg-zinc-900 border border-zinc-800 w-10 h-10 rounded-2xl items-center justify-center"
                >
                  <Text className="text-zinc-300 font-bold text-xs">+0.1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAdjustWeight(0.5)}
                  activeOpacity={0.7}
                  className="bg-zinc-900 border border-zinc-800 w-10 h-10 rounded-2xl items-center justify-center"
                >
                  <Text className="text-zinc-300 font-bold text-xs">+0.5</Text>
                </TouchableOpacity>
              </View>

              {/* Log Button */}
              <TouchableOpacity
                onPress={handleSaveWeight}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className="w-full bg-emerald-500 active:bg-emerald-600 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm"
                >
                  Save Scale Weigh-In
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. 14-Day Trend SVG Curve */}
            <View className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-4.5 mb-4 shadow-sm">
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest mb-2">
                14-Day Weight Velocity
              </Text>
              <WeightTrendChart entries={entries} unit={unit} />
            </View>

            {/* 3. Logged History Timeline */}
            <View className="mb-2">
              <View className="flex-row items-center justify-between mb-2.5 px-1">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm"
                >
                  Weigh-In History
                </Text>
                <Text className="text-zinc-500 text-xs font-semibold">
                  {entries.length} entries
                </Text>
              </View>

              {entries.length === 0 ? (
                <View className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-4 items-center">
                  <Text className="text-zinc-500 text-xs font-medium">No check-ins logged yet</Text>
                </View>
              ) : (
                entries.slice(-7).reverse().map((item: WeightEntry) => (
                  <View
                    key={item.id}
                    className="bg-zinc-950/80 border border-zinc-800/70 rounded-2xl p-3 mb-2 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View className="w-7 h-7 rounded-xl bg-emerald-500/15 items-center justify-center">
                        <Ionicons name="scale" size={14} color="#10b981" />
                      </View>
                      <View>
                        <Text
                          style={{ fontFamily: 'Outfit_700Bold' }}
                          className="text-white text-sm"
                        >
                          {unit === 'lbs' ? (item.weight_kg * 2.20462).toFixed(1) : item.weight_kg.toFixed(1)}{' '}
                          <Text className="text-zinc-500 text-xs font-normal">{unit}</Text>
                        </Text>
                        <Text className="text-zinc-500 text-[10px] font-semibold">{formatDate(item.logged_at)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        deleteWeightEntry(item.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="w-7 h-7 rounded-full bg-zinc-900 items-center justify-center"
                    >
                      <Ionicons name="trash-outline" size={13} color="#71717a" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
