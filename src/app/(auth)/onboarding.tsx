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
import { CatEarCard, PawProgressBar, WhiskerDivider } from '../../components/feline';

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
        Alert.alert('Invalid Weight', 'Please enter a valid weight in kg (30 - 300 kg).');
        return;
      }
      if (!height || height < 100 || height > 250) {
        hapticFeedback.error();
        Alert.alert('Invalid Height', 'Please enter a valid height in cm (100 - 250 cm).');
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

  // Step Titles and Mascot Moods
  const stepMeta = useMemo(() => {
    switch (step) {
      case 1:
        return {
          title: 'Hunter Biometrics',
          subtitle: 'Mifflin-St Jeor Basal Metabolic Rate',
          mascotMood: 'idle' as const,
          speech: "Let's calibrate your resting metabolism. Enter your biometrics so I can pinpoint your exact daily burn!",
        };
      case 2:
        return {
          title: 'Daily Prowl Activity',
          subtitle: 'Physical Activity Level (PAL)',
          mascotMood: 'thinking' as const,
          speech: 'How active are your daily prowls? This multiplier scales your BMR into your Total Daily Energy Expenditure (TDEE).',
        };
      case 3:
        return {
          title: 'Hunting Objective',
          subtitle: 'Caloric Deficit or Surplus Pace',
          mascotMood: 'scanning' as const,
          speech: 'Choose your hunting goal. We can dial in a fat-loss deficit, athletic agility maintenance, or muscle-building surplus.',
        };
      case 4:
        return {
          title: 'Macro Fuel Ratio',
          subtitle: 'Protein, Carbs & Healthy Fats',
          mascotMood: 'happy' as const,
          speech: 'What kind of prey fuels your engine best? Choose how we balance your calories across clean macros.',
        };
      case 5:
      default:
        return {
          title: "Sia's Macro Blueprint",
          subtitle: 'Personalized Daily Nutrition Plan',
          mascotMood: 'celebrating' as const,
          speech: "Purr-fect! Your daily nutrition blueprint is calibrated and ready. Let's pounce on those goals!",
        };
    }
  }, [step]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header Navigation & Feline Paw Progress Bar */}
        <View className="px-5 pt-2 pb-3 border-b border-zinc-900 bg-zinc-950/80">
          <View className="flex-row items-center justify-between mb-2.5">
            {step > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center active:bg-zinc-800"
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
              <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                Hunter Onboarding
              </Text>
            </View>

            <View className="w-9 h-9 items-center justify-center">
              <View className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
                <Ionicons name="paw" size={11} color="#10b981" />
              </View>
            </View>
          </View>

          {/* Feline Paw-Print Progress Bar */}
          <PawProgressBar
            progress={step / 5}
            color="#10b981"
            label="Hunter Calibration"
            readout={`Step ${step} of 5`}
            trackHeight={6}
            showPaws={true}
          />
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sia Mascot Interactive Speech Bubble */}
          <View className="bg-zinc-900/90 border border-emerald-500/25 rounded-3xl p-3.5 flex-row items-center gap-3.5 mb-5 shadow-sm shadow-emerald-500/5">
            <View className="items-center justify-center">
              <SiaCatMascot
                size={48}
                mood={stepMeta.mascotMood}
                withGlow={step === 5 || step === 3}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  {stepMeta.title}
                </Text>
                <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                  <Text className="text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                    Sia Coach
                  </Text>
                </View>
              </View>
              <Text className="text-zinc-400 text-[11px] font-medium leading-4">
                {stepMeta.speech}
              </Text>
            </View>
          </View>

          {/* =========================================================================
              STEP 1: CORE BIOMETRICS
          ========================================================================= */}
          {step === 1 && (
            <CatEarCard
              title="Athlete Biometrics"
              badge="🐾 BMR CALC"
              borderColor="#27272a"
              className="mb-4"
            >
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
                  activeOpacity={0.8}
                  className={`flex-1 py-3.5 rounded-2xl items-center border ${
                    gender === 'male'
                      ? 'bg-emerald-500/15 border-emerald-500'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <Ionicons
                    name="man-outline"
                    size={22}
                    color={gender === 'male' ? '#10b981' : '#71717a'}
                  />
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className={`text-sm mt-1 ${
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
                  activeOpacity={0.8}
                  className={`flex-1 py-3.5 rounded-2xl items-center border ${
                    gender === 'female'
                      ? 'bg-emerald-500/15 border-emerald-500'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <Ionicons
                    name="woman-outline"
                    size={22}
                    color={gender === 'female' ? '#10b981' : '#71717a'}
                  />
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className={`text-sm mt-1 ${
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
                <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={ageStr}
                    onChangeText={setAgeStr}
                    keyboardType="numeric"
                    placeholder="e.g. 26"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-2.5"
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
                <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={heightStr}
                    onChangeText={setHeightStr}
                    keyboardType="numeric"
                    placeholder="e.g. 175"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-2.5"
                  />
                  <View className="bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                    <Text className="text-zinc-400 text-xs font-bold uppercase">cm</Text>
                  </View>
                </View>
              </View>

              {/* Weight */}
              <View className="mb-2">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Current Weight
                </Text>
                <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-1">
                  <TextInput
                    value={weightStr}
                    onChangeText={setWeightStr}
                    keyboardType="numeric"
                    placeholder="e.g. 75"
                    placeholderTextColor="#52525b"
                    className="text-white text-base font-semibold flex-1 py-2.5"
                  />
                  <View className="bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <Text className="text-emerald-400 text-xs font-bold uppercase">kg</Text>
                  </View>
                </View>
              </View>

              {/* Real-time BMR Preview Badge */}
              {targets?.bmr ? (
                <View className="mt-4 pt-3 border-t border-zinc-800/80 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="flash-outline" size={13} color="#10b981" />
                    <Text className="text-zinc-400 text-xs">Estimated Basal Burn (BMR):</Text>
                  </View>
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className="text-emerald-400 text-xs font-bold"
                  >
                    ~{targets.bmr} kcal/day
                  </Text>
                </View>
              ) : null}
            </CatEarCard>
          )}

          {/* =========================================================================
              STEP 2: PHYSICAL ACTIVITY LEVEL (PAL)
          ========================================================================= */}
          {step === 2 && (
            <View>
              <View className="gap-3 mb-4">
                {ACTIVITY_LEVELS.map((act) => {
                  const isSelected = activityLevel === act.level;
                  return (
                    <TouchableOpacity
                      key={act.level}
                      onPress={() => {
                        hapticFeedback.selection();
                        setActivityLevel(act.level);
                      }}
                      activeOpacity={0.8}
                      className={`p-4 rounded-3xl border flex-row items-center gap-3.5 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 shadow-sm shadow-emerald-500/20'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View
                        className={`w-11 h-11 rounded-2xl items-center justify-center ${
                          isSelected ? 'bg-emerald-500/25' : 'bg-zinc-800/80'
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
                          <View
                            className={`px-2 py-0.5 rounded-md border ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-500/40'
                                : 'bg-zinc-950 border-zinc-800'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-bold ${
                                isSelected ? 'text-emerald-400' : 'text-zinc-500'
                              }`}
                            >
                              {act.multiplier}× BMR
                            </Text>
                          </View>
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
              <View className="gap-3 mb-4">
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = goalPace === g.pace;
                  return (
                    <TouchableOpacity
                      key={g.pace}
                      onPress={() => {
                        hapticFeedback.selection();
                        setGoalPace(g.pace);
                      }}
                      activeOpacity={0.8}
                      className={`p-4 rounded-3xl border ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 shadow-sm shadow-emerald-500/20'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2.5">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${
                              isSelected ? 'bg-emerald-500/25' : 'bg-zinc-800/80'
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
              <View className="gap-3 mb-4">
                {DIET_STYLES.map((d) => {
                  const isSelected = dietType === d.type;
                  return (
                    <TouchableOpacity
                      key={d.type}
                      onPress={() => {
                        hapticFeedback.selection();
                        setDietType(d.type);
                      }}
                      activeOpacity={0.8}
                      className={`p-4 rounded-3xl border ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 shadow-sm shadow-emerald-500/20'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2.5">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${
                              isSelected ? 'bg-emerald-500/25' : 'bg-zinc-800/80'
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

                        <View className="flex-row gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800/80">
                          <Text className="text-blue-400 text-[11px] font-bold">
                            {Math.round(d.split.p * 100)}%P
                          </Text>
                          <Text className="text-zinc-600 text-[11px]">•</Text>
                          <Text className="text-amber-400 text-[11px] font-bold">
                            {Math.round(d.split.c * 100)}%C
                          </Text>
                          <Text className="text-zinc-600 text-[11px]">•</Text>
                          <Text className="text-rose-400 text-[11px] font-bold">
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
            <CatEarCard
              title="Daily Calorie Budget"
              badge="🐾 TDEE CALIBRATED"
              borderColor="#10b981"
              className="mb-4"
            >
              {/* Main Daily Calorie Target Display */}
              <View className="items-center py-2 mb-4">
                <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1 text-center">
                  Target Caloric Intake
                </Text>
                <View className="flex-row items-baseline justify-center">
                  <Text
                    style={{ fontFamily: 'Outfit_900Black' }}
                    className="text-5xl text-white tracking-tight"
                  >
                    {targets.target_calories}
                  </Text>
                  <Text className="text-emerald-400 text-lg font-bold ml-1.5">kcal / day</Text>
                </View>
              </View>

              {/* 3 Macro Target Columns */}
              <View className="flex-row items-center justify-between pt-3 pb-2 border-t border-zinc-800">
                <View className="items-center flex-1">
                  <Text
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-blue-400 text-2xl"
                  >
                    {targets.target_protein_g}g
                  </Text>
                  <Text className="text-zinc-400 text-[10px] font-bold uppercase mt-0.5">Protein</Text>
                </View>

                <View className="w-px h-9 bg-zinc-800" />

                <View className="items-center flex-1">
                  <Text
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-amber-400 text-2xl"
                  >
                    {targets.target_carbs_g}g
                  </Text>
                  <Text className="text-zinc-400 text-[10px] font-bold uppercase mt-0.5">Carbs</Text>
                </View>

                <View className="w-px h-9 bg-zinc-800" />

                <View className="items-center flex-1">
                  <Text
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-rose-400 text-2xl"
                  >
                    {targets.target_fat_g}g
                  </Text>
                  <Text className="text-zinc-400 text-[10px] font-bold uppercase mt-0.5">Fat</Text>
                </View>
              </View>

              <WhiskerDivider label="METABOLIC PROFILE" color="#10b981" />

              {/* Detailed Breakdown Box */}
              <View className="bg-zinc-950/80 rounded-2xl p-4 gap-2.5 border border-zinc-800/80">
                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 text-xs">Basal Metabolic Rate (BMR)</Text>
                  <Text className="text-zinc-200 text-xs font-semibold">{targets.bmr} kcal/day</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 text-xs">Territory Activity (PAL)</Text>
                  <Text className="text-zinc-200 text-xs font-semibold">
                    {ACTIVITY_LEVELS.find((a) => a.level === activityLevel)?.title}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 text-xs">Total Daily Energy Expenditure (TDEE)</Text>
                  <Text className="text-emerald-400 text-xs font-bold">{targets.tdee} kcal/day</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 text-xs">Hunting Deficit / Delta</Text>
                  <Text className="text-cyan-400 text-xs font-bold">
                    {currentGoalObj.adjustment > 0
                      ? `+${currentGoalObj.adjustment}`
                      : currentGoalObj.adjustment}{' '}
                    kcal
                  </Text>
                </View>

                <View className="flex-row justify-between items-center pt-2 border-t border-zinc-800/60">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="water" size={13} color="#06b6d4" />
                    <Text className="text-zinc-300 text-xs font-semibold">Hydration Target</Text>
                  </View>
                  <Text className="text-cyan-400 text-xs font-bold">
                    {(targets.target_water_ml / 1000).toFixed(1)}L ({targets.target_water_ml} ml)
                  </Text>
                </View>
              </View>
            </CatEarCard>
          )}

          {/* Bottom Action Navigation Button */}
          {step < 5 ? (
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/25"
            >
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-base"
              >
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinish}
              disabled={isSaving}
              activeOpacity={0.8}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/25"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paw" size={18} color="#ffffff" />
                  <Text
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-white text-base"
                  >
                    Pounce into SiaMeal Snap
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
