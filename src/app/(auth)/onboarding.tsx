import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gender, FitnessGoal, ActivityLevel, GoalPace, DietType } from '../../types';
import {
  calculateNutritionTargets,
  ACTIVITY_LEVELS,
  GOAL_OPTIONS,
  DIET_STYLES,
} from '../../utils/nutrition';
import { useAuthStore } from '../../stores/authStore';
import { useWaterStore } from '../../stores/waterStore';
import { hapticFeedback } from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import SiaCatMascot from '../../components/SiaCatMascot';


export default function OnboardingScreen() {
  const router = useRouter();
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const setDailyGoal = useWaterStore((state) => state.setDailyGoal);

  // Flow Step: 1 = Biometrics, 2 = Activity, 3 = Goal, 4 = Diet, 5 = Summary Plan
  const [step, setStep] = useState<number>(1);

  // Form State
  const [gender, setGender] = useState<Gender>('male');
  const [ageStr, setAgeStr] = useState('26');
  const [weightStr, setWeightStr] = useState('75');
  const [heightStr, setHeightStr] = useState('175');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalPace, setGoalPace] = useState<GoalPace>('standard');
  const [dietType, setDietType] = useState<DietType>('balanced');
  const [isSaving, setIsSaving] = useState(false);

  const age = parseInt(ageStr, 10) || 0;
  const weight = parseFloat(weightStr) || 0;
  const height = parseFloat(heightStr) || 0;

  // Selected Goal object
  const currentGoalObj = useMemo(() => {
    return GOAL_OPTIONS.find((g) => g.pace === goalPace) || GOAL_OPTIONS[0];
  }, [goalPace]);

  // Scientific Nutrition Targets
  const targets = useMemo(() => {
    if (age > 0 && weight > 0 && height > 0) {
      return calculateNutritionTargets(
        gender,
        age,
        weight,
        height,
        currentGoalObj.goal,
        activityLevel,
        goalPace,
        dietType
      );
    }
    return null;
  }, [gender, age, weight, height, currentGoalObj, activityLevel, goalPace, dietType]);

  const handleNext = () => {
    hapticFeedback.light();

    if (step === 1) {
      if (!age || age < 13 || age > 100) {
        hapticFeedback.error();
        Alert.alert('Invalid Age', 'Please enter a valid age between 13 and 100.');
        return;
      }
      if (!weight || weight < 30 || weight > 300) {
        hapticFeedback.error();
        Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
        return;
      }
      if (!height || height < 100 || height > 250) {
        hapticFeedback.error();
        Alert.alert('Invalid Height', 'Please enter a valid height in cm.');
        return;
      }
    }

    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    hapticFeedback.light();
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!targets) return;

    try {
      hapticFeedback.medium();
      setIsSaving(true);

      // Save custom calculated water goal
      if (targets.target_water_ml) {
        setDailyGoal(targets.target_water_ml);
      }

      await saveProfile({
        gender,
        age,
        weight_kg: weight,
        height_cm: height,
        activity_level: activityLevel,
        fitness_goal: currentGoalObj.goal,
        goal_pace: goalPace,
        diet_type: dietType,
        target_calories: targets.target_calories,
        target_protein_g: targets.target_protein_g,
        target_carbs_g: targets.target_carbs_g,
        target_fat_g: targets.target_fat_g,
      });

      hapticFeedback.success();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Failed to save your personalized profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const progressPct = (step / 5) * 100;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header Navigation & Progress Bar */}
        <View className="px-6 pt-2 pb-4 border-b border-zinc-900">
          <View className="flex-row items-center justify-between mb-3">
            {step > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            ) : (
              <View className="w-9 h-9" />
            )}

            <View className="items-center">
              <View className="flex-row items-baseline">
                <Text
                  style={{ fontFamily: 'Outfit_900Black' }}
                  className="text-lg text-white tracking-tight"
                >
                  Sia
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_900Black' }}
                  className="text-lg text-emerald-400 tracking-tight"
                >
                  Meal
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_900Black' }}
                  className="text-lg text-sky-400 tracking-tight ml-1"
                >
                  Snap
                </Text>
              </View>
              <Text className="text-zinc-500 text-[11px] font-bold mt-0.5">
                Step {step} of 5
              </Text>
            </View>

            <View className="w-9 h-9" />
          </View>

          {/* Progress Bar */}
          <View className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
            <View
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-5"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* =========================================================================
              STEP 1: CORE BIOMETRICS
          ========================================================================= */}
          {step === 1 && (
            <View>
              <View className="mb-5 items-center">
                <SiaCatMascot size={72} mood="idle" style={{ marginBottom: 10 }} />
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-2xl text-white mb-1 text-center"
                >
                  Body Metrics
                </Text>
                <Text className="text-zinc-400 text-xs text-center px-4">
                  Sia uses Mifflin-St Jeor to calculate your basal metabolic rate (BMR).
                </Text>
              </View>

              {/* Sex Selector */}
              <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                Biological Sex
              </Text>
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    setGender('male');
                  }}
                  className={`flex-1 py-4 rounded-2xl items-center border ${
                    gender === 'male'
                      ? 'bg-emerald-500/15 border-emerald-500'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <Ionicons
                    name="man-outline"
                    size={22}
                    color={gender === 'male' ? '#10b981' : '#71717a'}
                  />
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className={`text-sm mt-1.5 ${
                      gender === 'male' ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    setGender('female');
                  }}
                  className={`flex-1 py-4 rounded-2xl items-center border ${
                    gender === 'female'
                      ? 'bg-emerald-500/15 border-emerald-500'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <Ionicons
                    name="woman-outline"
                    size={22}
                    color={gender === 'female' ? '#10b981' : '#71717a'}
                  />
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className={`text-sm mt-1.5 ${
                      gender === 'female' ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Age */}
              <View className="mb-4">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Age
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={ageStr}
                    onChangeText={setAgeStr}
                    keyboardType="numeric"
                    placeholder="e.g. 26"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-3"
                  />
                  <View className="bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                    <Text className="text-zinc-400 text-xs font-bold uppercase">years</Text>
                  </View>
                </View>
              </View>

              {/* Height */}
              <View className="mb-4">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Height
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={heightStr}
                    onChangeText={setHeightStr}
                    keyboardType="numeric"
                    placeholder="e.g. 175"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-3"
                  />
                  <View className="bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                    <Text className="text-zinc-400 text-xs font-bold uppercase">cm</Text>
                  </View>
                </View>
              </View>

              {/* Weight */}
              <View className="mb-6">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Current Weight
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={weightStr}
                    onChangeText={setWeightStr}
                    keyboardType="numeric"
                    placeholder="e.g. 75"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-3"
                  />
                  <View className="bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <Text className="text-emerald-400 text-xs font-bold uppercase">kg</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 2: PHYSICAL ACTIVITY LEVEL (PAL)
          ========================================================================= */}
          {step === 2 && (
            <View>
              <View className="mb-5 items-center">
                <SiaCatMascot size={72} mood="thinking" withGlow={true} style={{ marginBottom: 10 }} />
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-2xl text-white mb-1 text-center"
                >
                  Daily Prowl Activity
                </Text>
                <Text className="text-zinc-400 text-xs text-center px-4 leading-relaxed">
                  How active are your daily prowls? Sia uses this PAL multiplier to scale your BMR into your Total Daily Energy Expenditure (TDEE).
                </Text>
              </View>

              <View className="gap-3 mb-6">
                {ACTIVITY_LEVELS.map((act) => {
                  const isSelected = activityLevel === act.level;
                  return (
                    <TouchableOpacity
                      key={act.level}
                      onPress={() => {
                        hapticFeedback.selection();
                        setActivityLevel(act.level);
                      }}
                      className={`p-4 rounded-2xl border flex-row items-center gap-3.5 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center ${
                          isSelected ? 'bg-emerald-500/20' : 'bg-zinc-800/80'
                        }`}
                      >
                        <Ionicons
                          name={act.icon}
                          size={22}
                          color={isSelected ? '#10b981' : '#a1a1aa'}
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-0.5">
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className={`text-base ${
                              isSelected ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {act.title}
                          </Text>
                          <Text className="text-zinc-500 text-xs font-semibold">
                            {act.multiplier}× BMR
                          </Text>
                        </View>
                        <Text className="text-zinc-400 text-xs leading-4">{act.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 3: PRIMARY GOAL & DEFICIT PACE
          ========================================================================= */}
          {step === 3 && (
            <View>
              <View className="mb-5 items-center">
                <SiaCatMascot size={72} mood="scanning" withGlow={true} style={{ marginBottom: 10 }} />
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-2xl text-white mb-1 text-center"
                >
                  Hunting Objective
                </Text>
                <Text className="text-zinc-400 text-xs text-center px-4 leading-relaxed">
                  Choose your hunting objective: calibrate a deficit for steady fat loss, agility maintenance, or surplus for muscle growth.
                </Text>
              </View>

              <View className="gap-3 mb-6">
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = goalPace === g.pace;
                  return (
                    <TouchableOpacity
                      key={g.pace}
                      onPress={() => {
                        hapticFeedback.selection();
                        setGoalPace(g.pace);
                      }}
                      className={`p-4 rounded-2xl border ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2.5">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${
                              isSelected ? 'bg-emerald-500/20' : 'bg-zinc-800/80'
                            }`}
                          >
                            <Ionicons
                              name={g.icon}
                              size={18}
                              color={isSelected ? '#10b981' : '#a1a1aa'}
                            />
                          </View>
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className={`text-base ${
                              isSelected ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {g.title}
                          </Text>
                        </View>

                        <View className="bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-emerald-400' : 'text-zinc-400'
                            }`}
                          >
                            {g.tag}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-zinc-400 text-xs leading-4">{g.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 4: DIETARY STYLE & MACRO SPLIT
          ========================================================================= */}
          {step === 4 && (
            <View>
              <View className="mb-5 items-center">
                <SiaCatMascot size={72} mood="happy" withGlow={true} style={{ marginBottom: 10 }} />
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-2xl text-white mb-1 text-center"
                >
                  Macro Fuel Ratio
                </Text>
                <Text className="text-zinc-400 text-xs text-center px-4 leading-relaxed">
                  What kind of prey fuels your engine? Choose how Sia balances your daily calories across Protein, Carbs, and Healthy Fats.
                </Text>
              </View>

              <View className="gap-3 mb-6">
                {DIET_STYLES.map((d) => {
                  const isSelected = dietType === d.type;
                  return (
                    <TouchableOpacity
                      key={d.type}
                      onPress={() => {
                        hapticFeedback.selection();
                        setDietType(d.type);
                      }}
                      className={`p-4 rounded-2xl border ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2.5">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${
                              isSelected ? 'bg-emerald-500/20' : 'bg-zinc-800/80'
                            }`}
                          >
                            <Ionicons
                              name={d.icon}
                              size={18}
                              color={isSelected ? '#10b981' : '#a1a1aa'}
                            />
                          </View>
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className={`text-base ${
                              isSelected ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {d.title}
                          </Text>
                        </View>

                        <View className="flex-row gap-1">
                          <Text className="text-blue-400 text-xs font-bold">
                            {Math.round(d.split.p * 100)}%P
                          </Text>
                          <Text className="text-zinc-600 text-xs">•</Text>
                          <Text className="text-amber-400 text-xs font-bold">
                            {Math.round(d.split.c * 100)}%C
                          </Text>
                          <Text className="text-zinc-600 text-xs">•</Text>
                          <Text className="text-rose-400 text-xs font-bold">
                            {Math.round(d.split.f * 100)}%F
                          </Text>
                        </View>
                      </View>
                      <Text className="text-zinc-400 text-xs leading-4">{d.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 5: SUMMARY & PERSONALIZED BLUEPRINT
          ========================================================================= */}
          {step === 5 && targets && (
            <View>
              <View className="mb-5 items-center">
                <SiaCatMascot size={78} mood="celebrating" withGlow={true} style={{ marginBottom: 10 }} />
                <Text
                  style={{ fontFamily: 'Outfit_900Black' }}
                  className="text-2xl text-white text-center"
                >
                  Sia's Macro Blueprint
                </Text>
                <Text className="text-emerald-400 text-xs text-center font-bold mt-1">
                  🐾 Scientifically calculated for your metabolic profile
                </Text>
              </View>

              {/* Main Daily Calorie Target Card */}
              <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-4">
                <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1 text-center">
                  Daily Calorie Budget
                </Text>
                <View className="flex-row items-baseline justify-center mb-4">
                  <Text
                    style={{ fontFamily: 'Outfit_900Black' }}
                    className="text-5xl text-white"
                  >
                    {targets.target_calories}
                  </Text>
                  <Text className="text-emerald-400 text-lg font-bold ml-1.5">kcal / day</Text>
                </View>

                {/* Macro Columns */}
                <View className="flex-row items-center justify-between pt-3 border-t border-zinc-800">
                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_800ExtraBold' }}
                      className="text-blue-400 text-xl"
                    >
                      {targets.target_protein_g}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">Protein</Text>
                  </View>

                  <View className="w-px h-8 bg-zinc-800" />

                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_800ExtraBold' }}
                      className="text-amber-400 text-xl"
                    >
                      {targets.target_carbs_g}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">Carbs</Text>
                  </View>

                  <View className="w-px h-8 bg-zinc-800" />

                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_800ExtraBold' }}
                      className="text-rose-400 text-xl"
                    >
                      {targets.target_fat_g}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">Fat</Text>
                  </View>
                </View>
              </View>

              {/* Energy Breakdown Box */}
              <View className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 mb-4">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-3 tracking-wider">
                  Metabolic Energy Breakdown
                </Text>

                <View className="gap-2.5">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-zinc-400 text-xs">Basal Metabolic Rate (BMR)</Text>
                    <Text className="text-zinc-200 text-xs font-semibold">{targets.bmr} kcal/day</Text>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <Text className="text-zinc-400 text-xs">Physical Activity (PAL Multiplier)</Text>
                    <Text className="text-zinc-200 text-xs font-semibold">
                      {ACTIVITY_LEVELS.find((a) => a.level === activityLevel)?.title}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <Text className="text-zinc-400 text-xs">Total Daily Energy Expenditure (TDEE)</Text>
                    <Text className="text-emerald-400 text-xs font-bold">{targets.tdee} kcal/day</Text>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <Text className="text-zinc-400 text-xs">Goal Calorie Delta</Text>
                    <Text className="text-cyan-400 text-xs font-bold">
                      {currentGoalObj.adjustment > 0
                        ? `+${currentGoalObj.adjustment}`
                        : currentGoalObj.adjustment}{' '}
                      kcal
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center pt-2 border-t border-zinc-800/60">
                    <Text className="text-zinc-400 text-xs">Daily Hydration Target</Text>
                    <Text className="text-cyan-400 text-xs font-bold">
                      {(targets.target_water_ml / 1000).toFixed(1)} Liters ({targets.target_water_ml} ml)
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Navigation Button */}
          {step < 5 ? (
            <TouchableOpacity
              onPress={handleNext}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-4"
            >
              <Text className="text-white font-bold text-base">Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinish}
              disabled={isSaving}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-4"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paw" size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-base">Pounce into SiaMeal Snap</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
