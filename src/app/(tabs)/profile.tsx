import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useMealStore } from '../../stores/mealStore';
import { useWeightStore } from '../../stores/weightStore';
import { useWaterStore } from '../../stores/waterStore';
import { Gender, FitnessGoal, ActivityLevel, GoalPace, DietType } from '../../types';
import {
  calculateNutritionTargets,
  ACTIVITY_LEVELS,
  GOAL_OPTIONS,
  DIET_STYLES,
} from '../../utils/nutrition';
import { WeightTrendChart } from '../../components/WeightTrendChart';
import { WeightTrackerSheet } from '../../components/WeightTrackerSheet';
import { hapticFeedback } from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { FelineHunterRankBadge } from '../../components/FelineHunterRankBadge';
import { getNotificationStatus, setNotificationsEnabled } from '../../services/notificationService';

const AVATAR_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'person',
  'fitness',
  'barbell',
  'flash',
  'shield-checkmark',
  'heart',
  'trophy',
  'flame',
];

const DIETARY_TAGS = [
  'High Protein',
  'Gluten-Free',
  'Dairy-Free',
  'Vegetarian',
  'Vegan',
  'Nut-Free',
  'Low Sodium',
  'Pescatarian',
];

export default function ProfileScreen() {
  const { user, profile, saveProfile, signOut } = useAuthStore();
  const { meals, weeklySummary, fetchWeeklyStats } = useMealStore();
  const { entries, loadWeightHistory, logWeight } = useWeightStore();
  const { dailyGoalMl, loadTodayWater, setDailyGoal } = useWaterStore();

  // State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarIcon, setAvatarIcon] = useState<keyof typeof Ionicons.glyphMap>(
    (profile?.avatar_icon as any) || 'person'
  );
  const [gender, setGender] = useState<Gender>(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activity_level || 'moderate');
  const [goalPace, setGoalPace] = useState<GoalPace>(profile?.goal_pace || 'standard');
  const [dietType, setDietType] = useState<DietType>(profile?.diet_type || 'balanced');
  const [ageStr, setAgeStr] = useState(String(profile?.age || '26'));
  const [weightStr, setWeightStr] = useState(String(profile?.weight_kg || '75'));
  const [heightStr, setHeightStr] = useState(String(profile?.height_cm || '175'));
  const [selectedTags, setSelectedTags] = useState<string[]>(['High Protein']);

  // Sheet Modal Controls
  const [activeSheet, setActiveSheet] = useState<
    'edit_profile' | 'goal' | 'activity' | 'diet' | 'biometrics' | 'weight' | 'dietary_tags' | 'science' | null
  >(null);
  const [showWeightTracker, setShowWeightTracker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);

  useEffect(() => {
    loadWeightHistory();
    loadTodayWater();
    fetchWeeklyStats(profile?.target_calories || 2000);
    getNotificationStatus().then((status) => {
      setNotificationsEnabledState(status.isEnabled);
    });
  }, []);

  const handleToggleNotifications = async () => {
    hapticFeedback.medium();
    const status = await getNotificationStatus();
    if (status.isExpoGo) {
      Alert.alert(
        'Expo Go Notice',
        'Android notifications provided by expo-notifications were removed from Expo Go in SDK 53+. To test notifications, use an Expo Development Build (EAS or npx expo run:android).'
      );
      return;
    }
    const nextState = !notificationsEnabled;
    const success = await setNotificationsEnabled(nextState);
    if (success) {
      setNotificationsEnabledState(nextState);
      Alert.alert(
        nextState ? 'Reminders Enabled' : 'Reminders Disabled',
        nextState
          ? "Sia will nudge you to hydrate and protect your hunting streak!"
          : 'Daily reminders have been turned off.'
      );
    } else if (nextState) {
      Alert.alert(
        'Permission Required',
        'Please allow notifications for SiaMeal Snap in your device Settings to receive reminders.'
      );
    }
  };

  const handleWeightLogged = async (valKg: number) => {
    setWeightStr(String(valKg));

    const newTargets = calculateNutritionTargets(
      gender,
      age,
      valKg,
      height,
      currentGoalObj.goal,
      activityLevel,
      goalPace,
      dietType
    );

    await saveProfile({
      weight_kg: valKg,
      target_calories: newTargets.target_calories,
      target_protein_g: newTargets.target_protein_g,
      target_carbs_g: newTargets.target_carbs_g,
      target_fat_g: newTargets.target_fat_g,
    });
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarIcon((profile.avatar_icon as any) || 'person');
      setGender(profile.gender || 'male');
      setActivityLevel(profile.activity_level || 'moderate');
      setGoalPace(profile.goal_pace || 'standard');
      setDietType(profile.diet_type || 'balanced');
      setAgeStr(String(profile.age || '26'));
      setWeightStr(String(profile.weight_kg || '75'));
      setHeightStr(String(profile.height_cm || '175'));
    }
  }, [profile]);

  const age = parseInt(ageStr, 10) || 0;
  const weight = parseFloat(weightStr) || 0;
  const height = parseFloat(heightStr) || 0;

  const currentGoalObj = useMemo(() => {
    return GOAL_OPTIONS.find((g) => g.pace === goalPace) || GOAL_OPTIONS[0];
  }, [goalPace]);

  const currentActivityObj = useMemo(() => {
    return ACTIVITY_LEVELS.find((a) => a.level === activityLevel) || ACTIVITY_LEVELS[1];
  }, [activityLevel]);

  const currentDietObj = useMemo(() => {
    return DIET_STYLES.find((d) => d.type === dietType) || DIET_STYLES[1];
  }, [dietType]);

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

  // Safe water volume display guaranteed to avoid NaN
  const waterTargetL = useMemo(() => {
    const ml = Number(targets?.target_water_ml) || Number(dailyGoalMl) || 2500;
    return (ml / 1000).toFixed(1);
  }, [targets, dailyGoalMl]);

  // Auto-Save Handler for Sheet Confirmations
  const persistChanges = async (override?: Partial<typeof profile>) => {
    if (!targets) return;

    try {
      setIsSaving(true);
      const dataToSave = {
        full_name: fullName.trim(),
        avatar_icon: avatarIcon,
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
        ...override,
      };

      await saveProfile(dataToSave as any);

      if (targets.target_water_ml) {
        setDailyGoal(targets.target_water_ml);
      }

      hapticFeedback.success();
      setActiveSheet(null);
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Error saving profile:', err);
      Alert.alert('Save Error', err.message || 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogWeight = async () => {
    const val = parseFloat(newWeightInput);
    if (!val || val < 30 || val > 300) {
      hapticFeedback.error();
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg (e.g. 74.5).');
      return;
    }

    try {
      setIsSaving(true);
      await logWeight(val);
      setWeightStr(String(val));

      const newTargets = calculateNutritionTargets(
        gender,
        age,
        val,
        height,
        currentGoalObj.goal,
        activityLevel,
        goalPace,
        dietType
      );

      await saveProfile({
        weight_kg: val,
        target_calories: newTargets.target_calories,
        target_protein_g: newTargets.target_protein_g,
        target_carbs_g: newTargets.target_carbs_g,
        target_fat_g: newTargets.target_fat_g,
      });

      if (newTargets.target_water_ml) {
        setDailyGoal(newTargets.target_water_ml);
      }

      hapticFeedback.success();
      setActiveSheet(null);
      setNewWeightInput('');
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert('Error', err.message || 'Failed to log weight.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDietaryTag = (tag: string) => {
    hapticFeedback.selection();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSignOut = () => {
    hapticFeedback.medium();
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SiaMeal Snap?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const displayName = fullName.trim() || user?.email?.split('@')[0] || 'Athlete';
  const streakCount = weeklySummary?.streakDays || 1;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-5 pt-3 pb-3 border-b border-zinc-900 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
            <Ionicons name="person" size={16} color="#10b981" />
          </View>
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-xl tracking-tight"
          >
            Profile & Goals
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="bg-emerald-950/70 border border-emerald-500/50 px-3 py-1.5 rounded-2xl flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/10">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-emerald-400 text-[10px] uppercase tracking-wider"
            >
              Sia Club Athlete
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 1. User Profile Pedestal (Tap to Edit Identity) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticFeedback.light();
            setActiveSheet('edit_profile');
          }}
          className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 mb-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3.5 flex-1 mr-2">
            <View className="w-13 h-13 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 items-center justify-center relative shadow-sm shadow-emerald-500/20">
              <Ionicons name={avatarIcon} size={22} color="#10b981" />
              <View className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-base"
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <Ionicons name="pencil-sharp" size={12} color="#71717a" />
              </View>
              <Text className="text-zinc-500 text-xs font-semibold mt-0.5" numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          <View className="w-8 h-8 rounded-full bg-zinc-800/80 items-center justify-center">
            <Ionicons name="chevron-forward" size={15} color="#a1a1aa" />
          </View>
        </TouchableOpacity>

        {/* 2. Athlete Performance Snapshot Bento (4 Badges) */}
        <View className="flex-row gap-2.5 mb-5">
          {/* Consistency Streak */}
          <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 items-center">
            <View className="w-7 h-7 rounded-lg bg-amber-500/10 items-center justify-center mb-1">
              <Ionicons name="flame" size={15} color="#f59e0b" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_900Black' }}
              className="text-white text-base"
            >
              {streakCount}d
            </Text>
            <Text className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Streak</Text>
          </View>

          {/* Meals Logged */}
          <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 items-center">
            <View className="w-7 h-7 rounded-lg bg-emerald-500/10 items-center justify-center mb-1">
              <Ionicons name="restaurant" size={14} color="#10b981" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_900Black' }}
              className="text-white text-base"
            >
              {meals.length}
            </Text>
            <Text className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Meals</Text>
          </View>

          {/* Hydration Goal */}
          <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 items-center">
            <View className="w-7 h-7 rounded-lg bg-cyan-500/10 items-center justify-center mb-1">
              <Ionicons name="water" size={14} color="#06b6d4" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_900Black' }}
              className="text-white text-base"
            >
              {waterTargetL}L
            </Text>
            <Text className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Water</Text>
          </View>

          {/* Weight Entries */}
          <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 items-center">
            <View className="w-7 h-7 rounded-lg bg-indigo-500/10 items-center justify-center mb-1">
              <Ionicons name="scale" size={14} color="#818cf8" />
            </View>
            <Text
              style={{ fontFamily: 'Outfit_900Black' }}
              className="text-white text-base"
            >
              {weight}kg
            </Text>
            <Text className="text-zinc-500 text-[9px] font-bold uppercase mt-0.5">Current</Text>
          </View>
        </View>

        {/* Feline Hunter Rank & Milestones Card */}
        <View className="mb-5">
          <FelineHunterRankBadge streakDays={streakCount} compact={false} />
        </View>

        {/* 3. Target Energy Blueprint Hero Card */}
        {targets && (
          <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-5 mb-5 shadow-lg">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  Target Daily Output
                </Text>
              </View>
              <View className="bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-lg">
                <Text className="text-emerald-400 text-xs font-bold">{currentGoalObj.tag}</Text>
              </View>
            </View>

            {/* Main Numbers */}
            <View className="flex-row items-baseline mb-3.5">
              <Text
                style={{ fontFamily: 'Outfit_900Black' }}
                className="text-4xl text-white tracking-tight"
              >
                {targets.target_calories}
              </Text>
              <Text className="text-emerald-400 text-base font-extrabold ml-1.5">kcal / day</Text>
            </View>

            {/* 4 Balanced Macro & Water Pillars */}
            <View className="flex-row gap-2 pt-3 border-t border-zinc-800/80">
              <View className="flex-1 bg-zinc-950/90 p-2 rounded-2xl border border-zinc-800/60 items-center">
                <Text className="text-blue-400 text-[10px] font-bold uppercase">Protein</Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {targets.target_protein_g}g
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold">
                  {Math.round((targets.target_protein_g * 4 / targets.target_calories) * 100)}%
                </Text>
              </View>

              <View className="flex-1 bg-zinc-950/90 p-2 rounded-2xl border border-zinc-800/60 items-center">
                <Text className="text-amber-400 text-[10px] font-bold uppercase">Carbs</Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {targets.target_carbs_g}g
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold">
                  {Math.round((targets.target_carbs_g * 4 / targets.target_calories) * 100)}%
                </Text>
              </View>

              <View className="flex-1 bg-zinc-950/90 p-2 rounded-2xl border border-zinc-800/60 items-center">
                <Text className="text-rose-400 text-[10px] font-bold uppercase">Fat</Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {targets.target_fat_g}g
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold">
                  {Math.round((targets.target_fat_g * 9 / targets.target_calories) * 100)}%
                </Text>
              </View>

              <View className="flex-1 bg-zinc-950/90 p-2 rounded-2xl border border-zinc-800/60 items-center">
                <Text className="text-cyan-400 text-[10px] font-bold uppercase">Water</Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {waterTargetL}L
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold">Goal</Text>
              </View>
            </View>

            {/* Scientific Energy Calculation Strip */}
            <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 px-0.5">
              <Text className="text-zinc-500 text-[11px] font-semibold">
                BMR: <Text className="text-zinc-300 font-bold">{targets.bmr}</Text> kcal
              </Text>
              <Text className="text-zinc-700 text-xs">•</Text>
              <Text className="text-zinc-500 text-[11px] font-semibold">
                TDEE: <Text className="text-emerald-400 font-bold">{targets.tdee}</Text> kcal
              </Text>
              <Text className="text-zinc-700 text-xs">•</Text>
              <Text className="text-zinc-500 text-[11px] font-semibold">
                Adj: <Text className="text-cyan-400 font-bold">{currentGoalObj.adjustment >= 0 ? `+${currentGoalObj.adjustment}` : currentGoalObj.adjustment}</Text> kcal
              </Text>
            </View>
          </View>
        )}

        {/* 4. Modular Settings Group (Zero-Scroll Row Architecture) */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl overflow-hidden mb-5">
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider px-4 pt-3.5 pb-2">
            Target Configurations
          </Text>

          {/* Row 1: Primary Goal */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('goal');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
                <Ionicons name={currentGoalObj.icon} size={16} color="#10b981" />
              </View>
              <View>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Fitness Objective</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {currentGoalObj.title}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Text className="text-emerald-400 font-bold text-xs">{currentGoalObj.tag}</Text>
              <Ionicons name="chevron-forward" size={15} color="#71717a" />
            </View>
          </TouchableOpacity>

          {/* Row 2: Physical Activity */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('activity');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-blue-500/15 items-center justify-center">
                <Ionicons name={currentActivityObj.icon} size={16} color="#38bdf8" />
              </View>
              <View>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Activity Level (PAL)</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {currentActivityObj.title}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Text className="text-zinc-400 font-semibold text-xs">{currentActivityObj.multiplier}× BMR</Text>
              <Ionicons name="chevron-forward" size={15} color="#71717a" />
            </View>
          </TouchableOpacity>

          {/* Row 3: Macro Distribution */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('diet');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-amber-500/15 items-center justify-center">
                <Ionicons name={currentDietObj.icon} size={16} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Macro Distribution</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {currentDietObj.title}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Text className="text-zinc-400 font-semibold text-xs">
                {Math.round(currentDietObj.split.p * 100)}/{Math.round(currentDietObj.split.c * 100)}/{Math.round(currentDietObj.split.f * 100)}
              </Text>
              <Ionicons name="chevron-forward" size={15} color="#71717a" />
            </View>
          </TouchableOpacity>

          {/* Row 4: Biometrics */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('biometrics');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-pink-500/15 items-center justify-center">
                <Ionicons name="body-outline" size={16} color="#fb7185" />
              </View>
              <View>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Body Metrics</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  {gender === 'male' ? 'Male' : 'Female'} • {age} yrs • {height} cm
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Text className="text-emerald-400 font-bold text-xs">{weight} kg</Text>
              <Ionicons name="chevron-forward" size={15} color="#71717a" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Body Weight Velocity & Trend Graph Card */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-5 mb-5 shadow-lg">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
                <Ionicons name="scale-outline" size={17} color="#10b981" />
              </View>
              <View>
                <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  Weight Velocity
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-base"
                >
                  Body Weight Trend
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setShowWeightTracker(true);
              }}
              className="bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex-row items-center gap-1"
            >
              <Ionicons name="add" size={14} color="#10b981" />
              <Text className="text-emerald-400 font-bold text-xs">Log Weight</Text>
            </TouchableOpacity>
          </View>

          {/* SVG Trend Chart */}
          <WeightTrendChart entries={entries} unit="kg" />
        </View>

        {/* 6. Lifestyle, Nutrition Science & Preferences */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl overflow-hidden mb-5">
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider px-4 pt-3.5 pb-2">
            Lifestyle & Nutrition
          </Text>

          {/* Dietary Tags Row */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('dietary_tags');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3 flex-1 mr-2">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
                <Ionicons name="leaf-outline" size={16} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Dietary Preferences & Allergens</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                  numberOfLines={1}
                >
                  {selectedTags.length > 0 ? selectedTags.join(', ') : 'None selected'}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={15} color="#71717a" />
          </TouchableOpacity>

          {/* Scientific Formula Explainer Row */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveSheet('science');
            }}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 border-t border-zinc-800/60"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
                <Ionicons name="calculator-outline" size={16} color="#10b981" />
              </View>
              <View>
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Nutrition Math Engine</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  Sia Metabolic Engine (Mifflin-St Jeor)
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={15} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* 6. Quick Weight Tracker Row */}
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setNewWeightInput(String(weight || ''));
            setActiveSheet('weight');
          }}
          activeOpacity={0.8}
          className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 mb-5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-2xl bg-emerald-500/15 items-center justify-center">
              <Ionicons name="scale-outline" size={20} color="#10b981" />
            </View>
            <View>
              <Text className="text-zinc-400 text-[10px] font-bold uppercase">Weight Tracking</Text>
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-base mt-0.5"
              >
                {weight} kg <Text className="text-zinc-500 text-xs font-normal">({entries.length} logged)</Text>
              </Text>
            </View>
          </View>

          <View className="bg-emerald-500 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/20">
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text className="text-white font-bold text-xs">Log Weight</Text>
          </View>
        </TouchableOpacity>

        {/* 7. Feline Reminders & Notifications */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl overflow-hidden mb-5">
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider px-4 pt-3.5 pb-2">
            Preferences & Notifications
          </Text>

          <View className="flex-row items-center justify-between p-4 border-t border-zinc-800/60">
            <View className="flex-row items-center gap-3 flex-1 mr-3">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/15 items-center justify-center">
                <Ionicons name="notifications-outline" size={16} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase">Sia's Daily Reminders</Text>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm mt-0.5"
                >
                  Hydration & Streak Shield
                </Text>
                <Text className="text-zinc-500 text-xs mt-0.5">
                  13:30 Hydration check • 19:30 Dinner streak protector
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleToggleNotifications}
              activeOpacity={0.8}
              className={`px-3 py-1.5 rounded-xl border ${
                notificationsEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40'
                  : 'bg-zinc-800/80 border-zinc-700/60'
              }`}
            >
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className={notificationsEnabled ? 'text-emerald-400 text-xs' : 'text-zinc-400 text-xs'}
              >
                {notificationsEnabled ? 'Enabled' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 8. Sign Out & Account Actions */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl overflow-hidden mb-6">
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4 bg-rose-500/5 active:bg-rose-500/10"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-rose-500/15 items-center justify-center">
                <Ionicons name="log-out-outline" size={17} color="#fb7185" />
              </View>
              <View>
                <Text className="text-rose-400 font-bold text-sm">Sign Out of SiaMeal Snap</Text>
                <Text className="text-zinc-500 text-xs font-medium mt-0.5">Securely log out of this device</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fb7185" />
          </TouchableOpacity>
        </View>

        {/* App Version Footer */}
        <View className="items-center pb-6">
          <Text className="text-zinc-600 text-xs font-semibold">
            SiaMeal Snap v1.2.0 • Pro Edition
          </Text>
          <Text className="text-zinc-700 text-[10px] mt-1">
            Engineered with Precision & Science
          </Text>
        </View>
      </ScrollView>

      {/* =========================================================================
          MODAL 1: EDIT PROFILE & AVATAR
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'edit_profile'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/75"
        >
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Edit Member Profile
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            {/* Display Name Input */}
            <Text className="text-zinc-400 text-[11px] font-bold uppercase mb-1.5">
              Display Name / Athlete Name
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Alex Hunter"
              placeholderTextColor="#52525b"
              className="bg-zinc-950 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 text-base font-semibold mb-5"
            />

            {/* Avatar Icon Selector */}
            <Text className="text-zinc-400 text-[11px] font-bold uppercase mb-2.5">
              Choose Avatar Icon
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-6">
              {AVATAR_ICONS.map((iconName) => {
                const isSelected = avatarIcon === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    onPress={() => {
                      hapticFeedback.selection();
                      setAvatarIcon(iconName);
                    }}
                    className={`w-12 h-12 rounded-2xl items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={isSelected ? '#10b981' : '#71717a'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={() => persistChanges({ full_name: fullName.trim(), avatar_icon: avatarIcon })}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Save Profile
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================================================================
          MODAL 2: FITNESS GOAL PICKER
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'goal'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Select Objective
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="gap-2.5">
                {GOAL_OPTIONS.map((item) => {
                  const isSelected = goalPace === item.pace;
                  return (
                    <TouchableOpacity
                      key={item.pace}
                      onPress={() => {
                        hapticFeedback.selection();
                        setGoalPace(item.pace);
                      }}
                      className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        <View className="w-8 h-8 rounded-xl bg-zinc-800/80 items-center justify-center">
                          <Ionicons
                            name={item.icon}
                            size={16}
                            color={isSelected ? '#10b981' : '#a1a1aa'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className={`text-sm ${
                              isSelected ? 'text-emerald-400' : 'text-zinc-200'
                            }`}
                          >
                            {item.title}
                          </Text>
                          <Text className="text-zinc-400 text-xs mt-0.5 leading-4">{item.desc}</Text>
                        </View>
                      </View>
                      <Text className="text-emerald-400 text-xs font-bold">{item.tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => persistChanges()}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Apply Objective
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 3: ACTIVITY LEVEL PICKER
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'activity'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Physical Activity Level
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="gap-2.5">
                {ACTIVITY_LEVELS.map((act) => {
                  const isSelected = activityLevel === act.level;
                  return (
                    <TouchableOpacity
                      key={act.level}
                      onPress={() => {
                        hapticFeedback.selection();
                        setActivityLevel(act.level);
                      }}
                      className={`p-3 rounded-2xl border flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-8 h-8 rounded-xl bg-zinc-800/80 items-center justify-center">
                          <Ionicons
                            name={act.icon}
                            size={16}
                            color={isSelected ? '#10b981' : '#a1a1aa'}
                          />
                        </View>
                        <Text
                          style={{ fontFamily: 'Outfit_700Bold' }}
                          className={`text-sm ${
                            isSelected ? 'text-emerald-400' : 'text-zinc-300'
                          }`}
                        >
                          {act.title}
                        </Text>
                      </View>
                      <Text className="text-zinc-400 text-xs font-semibold">{act.multiplier}× BMR</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => persistChanges()}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Apply Activity Level
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 4: DIET STYLE PICKER
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'diet'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Macro Distribution Style
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <View className="gap-2.5 mb-5">
              {DIET_STYLES.map((d) => {
                const isSelected = dietType === d.type;
                return (
                  <TouchableOpacity
                    key={d.type}
                    onPress={() => {
                      hapticFeedback.selection();
                      setDietType(d.type);
                    }}
                    className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-xl bg-zinc-800/80 items-center justify-center">
                        <Ionicons
                          name={d.icon}
                          size={16}
                          color={isSelected ? '#10b981' : '#a1a1aa'}
                        />
                      </View>
                      <Text
                        style={{ fontFamily: 'Outfit_700Bold' }}
                        className={`text-sm ${
                          isSelected ? 'text-emerald-400' : 'text-zinc-300'
                        }`}
                      >
                        {d.title}
                      </Text>
                    </View>

                    <View className="flex-row gap-1">
                      <Text className="text-blue-400 text-xs font-bold">{Math.round(d.split.p * 100)}%P</Text>
                      <Text className="text-zinc-600 text-xs">•</Text>
                      <Text className="text-amber-400 text-xs font-bold">{Math.round(d.split.c * 100)}%C</Text>
                      <Text className="text-zinc-600 text-xs">•</Text>
                      <Text className="text-rose-400 text-xs font-bold">{Math.round(d.split.f * 100)}%F</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => persistChanges()}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Apply Macro Split
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 5: BIOMETRICS PICKER
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'biometrics'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/75"
        >
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Edit Body Metrics
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            {/* Sex Toggle */}
            <Text className="text-zinc-400 text-[11px] font-bold uppercase mb-2">Biological Sex</Text>
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  setGender('male');
                }}
                className={`flex-1 py-3 rounded-xl items-center border ${
                  gender === 'male'
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <Text className={`font-bold text-xs ${gender === 'male' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  setGender('female');
                }}
                className={`flex-1 py-3 rounded-xl items-center border ${
                  gender === 'female'
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <Text className={`font-bold text-xs ${gender === 'female' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>

            {/* Metrics Inputs */}
            <View className="flex-row gap-2.5 mb-5">
              <View className="flex-1">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-1.5">Age</Text>
                <TextInput
                  value={ageStr}
                  onChangeText={setAgeStr}
                  keyboardType="numeric"
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-base font-semibold"
                />
              </View>

              <View className="flex-1">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-1.5">Height (cm)</Text>
                <TextInput
                  value={heightStr}
                  onChangeText={setHeightStr}
                  keyboardType="numeric"
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-base font-semibold"
                />
              </View>

              <View className="flex-1">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-1.5">Weight (kg)</Text>
                <TextInput
                  value={weightStr}
                  onChangeText={setWeightStr}
                  keyboardType="numeric"
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-base font-semibold"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => persistChanges()}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Save Metrics
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================================================================
          MODAL 6: LOG WEIGHT
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'weight'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Log New Weight
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <Text className="text-zinc-400 text-xs mb-3">
              Logging automatically updates your baseline and recalculates your daily macro budget.
            </Text>

            <View className="flex-row items-center gap-3 mb-6">
              <TextInput
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                keyboardType="numeric"
                placeholder="74.5"
                placeholderTextColor="#52525b"
                autoFocus
                className="flex-1 bg-zinc-950 border border-zinc-800 text-white text-2xl font-bold rounded-2xl px-4 py-3.5"
              />
              <Text className="text-zinc-400 font-bold text-lg">kg</Text>
            </View>

            <TouchableOpacity
              onPress={handleLogWeight}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Save Weight
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 7: DIETARY PREFERENCES & ALLERGENS
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'dietary_tags'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Dietary Preferences & Allergens
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <Text className="text-zinc-400 text-xs mb-4">
              Select your dietary restrictions and preferences to customize your food scanning recommendations.
            </Text>

            <View className="flex-row flex-wrap gap-2.5 mb-6">
              {DIETARY_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleDietaryTag(tag)}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#10b981" />}
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.success();
                setActiveSheet(null);
              }}
              className="w-full bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <Text numberOfLines={1} className="text-white font-bold text-base">
                Save Preferences
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 8: NUTRITION SCIENCE GUIDE
      ========================================================================= */}
      <Modal
        visible={activeSheet === 'science'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-lg">
                Nutrition Science Engine
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-3">
                <Text className="text-emerald-400 font-bold text-sm mb-1">Mifflin-St Jeor Formula</Text>
                <Text className="text-zinc-400 text-xs leading-5">
                  SiaMeal Snap uses the clinically validated Mifflin-St Jeor equation to compute your exact Basal Metabolic Rate (BMR) based on your sex, age, height, and weight.
                </Text>
              </View>

              <View className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-3">
                <Text className="text-blue-400 font-bold text-sm mb-1">Physical Activity Multiplier (PAL)</Text>
                <Text className="text-zinc-400 text-xs leading-5">
                  Your BMR is scaled by your Physical Activity Level (1.2× to 1.9×) to determine your Total Daily Energy Expenditure (TDEE).
                </Text>
              </View>

              <View className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <Text className="text-amber-400 font-bold text-sm mb-1">Optimal Macro Ratios</Text>
                <Text className="text-zinc-400 text-xs leading-5">
                  Carbs and Protein provide 4 kcal/g, while Fat provides 9 kcal/g. Your daily grams are calibrated to fuel performance, lean muscle retention, and metabolic health.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveSheet(null)}
              className="w-full bg-zinc-800 py-4 rounded-2xl flex-row items-center justify-center"
            >
              <Text numberOfLines={1} className="text-zinc-300 font-bold text-base">
                Got It
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Interactive Weight Tracker Bottom Sheet */}
      {showWeightTracker && (
        <WeightTrackerSheet
          visible={showWeightTracker}
          onClose={() => setShowWeightTracker(false)}
          currentProfileWeight={weight}
          onWeightLogged={handleWeightLogged}
        />
      )}
    </SafeAreaView>
  );
}
