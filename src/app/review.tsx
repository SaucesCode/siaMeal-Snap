import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMealStore } from '../stores/mealStore';
import { useAuthStore } from '../stores/authStore';
import { MealType } from '../types';
import { getDefaultMealType } from '../utils/nutrition';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SiaCatMascot from '../components/SiaCatMascot';
import { AiNutritionCoachModal } from '../components/AiNutritionCoachModal';

interface MealTypeOption {
  type: MealType;
  label: string;
  sublabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const MEAL_TYPES: MealTypeOption[] = [
  { type: 'breakfast', label: 'Morning Pounce', sublabel: 'Breakfast', icon: 'cat', color: '#f59e0b' },
  { type: 'lunch', label: 'Midday Catch', sublabel: 'Lunch', icon: 'fish', color: '#10b981' },
  { type: 'dinner', label: 'Night Prowl', sublabel: 'Dinner', icon: 'weather-night', color: '#818cf8' },
  { type: 'snack', label: 'Paws & Treats', sublabel: 'Snack', icon: 'paw', color: '#06b6d4' },
];

export default function ReviewScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { draftMeal, logMeal, meals } = useMealStore();

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [portionScale, setPortionScale] = useState<number>(1.0);
  const [coachModalVisible, setCoachModalVisible] = useState(false);
  const [coachInitialQuery, setCoachInitialQuery] = useState('');

  // Baseline macro snapshot from AI to support proportional scaling
  const baseMacros = useRef<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  });

  useEffect(() => {
    if (draftMeal) {
      setName(draftMeal.name || '');
      setMealType(draftMeal.meal_type || getDefaultMealType());
      const cal = draftMeal.calories ?? 0;
      const prot = draftMeal.protein_g ?? 0;
      const crb = draftMeal.carbs_g ?? 0;
      const ft = draftMeal.fat_g ?? 0;

      baseMacros.current = {
        calories: cal,
        protein_g: prot,
        carbs_g: crb,
        fat_g: ft,
      };

      setCalories(String(cal));
      setProtein(String(prot));
      setCarbs(String(crb));
      setFat(String(ft));
      setFoodItems(draftMeal.food_items || []);
      setPortionScale(1.0);
    }
  }, [draftMeal]);

  // Consumed totals so far today
  const consumedCalories = useMemo(() => {
    return meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  }, [meals]);

  const consumedProtein = useMemo(() => {
    return meals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
  }, [meals]);

  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein_g || 150;

  // Real-Time Sia Macro Fit Assessment
  const macroFit = useMemo(() => {
    const currentCal = Math.max(0, parseFloat(calories) || 0);
    const currentProt = Math.max(0, parseFloat(protein) || 0);
    const totalCalAfter = consumedCalories + currentCal;
    const totalProtAfter = consumedProtein + currentProt;
    const calorieOver = totalCalAfter - targetCalories;
    const proteinMet = totalProtAfter >= targetProtein;

    if (proteinMet && calorieOver <= 100) {
      return {
        mood: 'celebrating' as const,
        badgeText: '👑 Protein Goal Smashed',
        badgeColor: '#10b981',
        badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
        message: `Purr-fect! This catch pushes today's protein to ${Math.round(totalProtAfter)}g / ${targetProtein}g. Target conquered!`,
      };
    }

    if (calorieOver > 150) {
      return {
        mood: 'thinking' as const,
        badgeText: '⚠️ Over Daily Budget',
        badgeColor: '#f59e0b',
        badgeBg: 'bg-amber-500/15 border-amber-500/30',
        message: `Pushes today's calories +${Math.round(calorieOver)} kcal above your target. Try a 0.75× portion or balance your next catch!`,
      };
    }

    const remainingKcal = Math.max(0, targetCalories - totalCalAfter);
    const remainingProt = Math.max(0, targetProtein - totalProtAfter);
    return {
      mood: 'happy' as const,
      badgeText: '🐾 Fits Daily Budget',
      badgeColor: '#10b981',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      message: `Wholesome catch! Leaves ~${Math.round(remainingKcal)} kcal and ${Math.round(remainingProt)}g protein for the rest of today.`,
    };
  }, [calories, protein, consumedCalories, consumedProtein, targetCalories, targetProtein]);

  const handleScalePortion = (multiplier: number) => {
    hapticFeedback.selection();
    setPortionScale(multiplier);
    setCalories(String(Math.round(baseMacros.current.calories * multiplier)));
    setProtein(String(Math.round(baseMacros.current.protein_g * multiplier)));
    setCarbs(String(Math.round(baseMacros.current.carbs_g * multiplier)));
    setFat(String(Math.round(baseMacros.current.fat_g * multiplier)));
  };

  const handleAddItem = () => {
    if (newItemText.trim()) {
      hapticFeedback.light();
      setFoodItems([...foodItems, newItemText.trim()]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index: number) => {
    hapticFeedback.light();
    setFoodItems(foodItems.filter((_, i) => i !== index));
  };

  const handleAskSiaAboutMeal = () => {
    hapticFeedback.medium();
    const query = `I am reviewing "${name || 'this catch'}" (~${Math.round(parseFloat(calories) || 0)} kcal, ${Math.round(parseFloat(protein) || 0)}g protein, ${Math.round(parseFloat(carbs) || 0)}g carbs). How does this fit into my daily goal, and what should I eat for my next meal?`;
    setCoachInitialQuery(query);
    setCoachModalVisible(true);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      hapticFeedback.error();
      Alert.alert('Meal Name', 'Please give this meal a name.');
      return;
    }

    try {
      setIsSaving(true);
      await logMeal({
        name: name.trim(),
        meal_type: mealType,
        calories: Math.max(0, parseFloat(calories) || 0),
        protein_g: Math.max(0, parseFloat(protein) || 0),
        carbs_g: Math.max(0, parseFloat(carbs) || 0),
        fat_g: Math.max(0, parseFloat(fat) || 0),
        food_items: foodItems,
        image_url: draftMeal?.image_url || null,
        logged_at: new Date().toISOString(),
      });

      hapticFeedback.success();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Failed to log meal:', err);
      Alert.alert('Save Error', err.message || 'Could not save the meal to your history.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!draftMeal) {
    return null;
  }

  const confidencePct = Math.round((draftMeal.confidence_score ?? 0.94) * 100);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-zinc-900">
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            router.back();
          }}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <Ionicons name="arrow-back" size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: 'Outfit_700Bold' }}
          className="text-white text-lg"
        >
          Review & Edit Catch
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Sia Vision Intelligence & Macro Fit Card */}
          <View className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-3.5 mb-3 shadow-sm shadow-black">
            <View className="flex-row items-center gap-3.5">
              <View className="items-center justify-center">
                <SiaCatMascot size={48} mood={macroFit.mood} withGlow={true} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="text-white text-xs"
                    >
                      Sia Macro Fit
                    </Text>
                    <View className={`px-1.5 py-0.5 rounded-md border ${macroFit.badgeBg}`}>
                      <Text
                        style={{ color: macroFit.badgeColor }}
                        className="text-[9px] font-extrabold uppercase tracking-wider"
                      >
                        {macroFit.badgeText}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-zinc-400 text-[11px] font-medium leading-4">
                  {macroFit.message}
                </Text>
              </View>
            </View>

            {/* Quick Micro Telemetry Pill */}
            <View className="mt-3 pt-2.5 border-t border-zinc-800/80 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-zinc-500 text-[10px] font-bold uppercase">Budget Pace:</Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-zinc-300 text-[11px] font-bold"
                >
                  {consumedCalories} + <Text className="text-emerald-400 font-extrabold">{Math.round(parseFloat(calories) || 0)}</Text> = {Math.round(consumedCalories + (parseFloat(calories) || 0))} / {targetCalories} kcal
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-zinc-500 text-[10px] font-bold uppercase">Protein:</Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-sky-400 text-[11px] font-extrabold"
                >
                  {Math.round(consumedProtein + (parseFloat(protein) || 0))}g / {targetProtein}g
                </Text>
              </View>
            </View>
          </View>

          {/* Explainable AI Vision Assessment Card */}
          <View className="bg-zinc-900/90 border border-emerald-500/25 rounded-3xl p-3.5 mb-3 shadow-sm shadow-emerald-500/10">
            {/* Header: AI Confidence Badge & Icon */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="shield-check" size={14} color="#10b981" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  Explainable AI Nutrition
                </Text>
              </View>
              <View className="bg-emerald-500/15 border border-emerald-500/35 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <Text className="text-emerald-400 text-[10px] font-extrabold">
                  {confidencePct}% Certainty
                </Text>
              </View>
            </View>

            {/* Portion Notes */}
            <View className="flex-row items-start gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 mb-2">
              <MaterialCommunityIcons name="scale" size={13} color="#10b981" style={{ marginTop: 1 }} />
              <Text className="text-zinc-300 text-xs flex-1 leading-relaxed">
                {draftMeal.portion_notes || "Estimated serving based on visual cues & macronutrient density"}
              </Text>
            </View>

            {/* Feline Coach Verdict */}
            {draftMeal.feline_verdict && (
              <Text className="text-zinc-400 text-[11px] italic mb-2 leading-4">
                "{draftMeal.feline_verdict}"
              </Text>
            )}

            {/* Dietary Tags */}
            {draftMeal.dietary_tags && draftMeal.dietary_tags.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {draftMeal.dietary_tags.map((tag, tIdx) => (
                  <View
                    key={tIdx}
                    className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md"
                  >
                    <Text className="text-emerald-400 text-[10px] font-bold">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Ask Sia Coach Continuity Button */}
          <TouchableOpacity
            onPress={handleAskSiaAboutMeal}
            activeOpacity={0.8}
            className="bg-zinc-900 border border-emerald-500/30 p-3.5 rounded-2xl flex-row items-center justify-between mb-4 shadow-sm shadow-emerald-500/10"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-emerald-500/20 items-center justify-center border border-emerald-500/40">
                <Ionicons name="chatbubble-ellipses" size={15} color="#10b981" />
              </View>
              <View>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  🐾 Ask Sia About This Catch
                </Text>
                <Text className="text-zinc-400 text-[10px]">
                  Get instant tactical advice for your remaining meals
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#10b981" />
          </TouchableOpacity>

          {/* Photo Thumbnail if available */}
          {draftMeal.image_url && (
            <View className="mb-4 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <Image
                source={{ uri: draftMeal.image_url }}
                className="w-full h-44"
                resizeMode="cover"
              />
            </View>
          )}

          {/* Feline Meal Category Selector */}
          <View className="mb-4">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Meal Category
            </Text>
            <View className="flex-row gap-2">
              {MEAL_TYPES.map((item) => {
                const isSelected = mealType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    onPress={() => {
                      hapticFeedback.selection();
                      setMealType(item.type);
                    }}
                    className={`flex-1 py-2.5 px-1 rounded-2xl border items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={18}
                      color={isSelected ? item.color : '#71717a'}
                    />
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      numberOfLines={1}
                      className={`text-[10px] mt-1 text-center ${
                        isSelected ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {item.label}
                    </Text>
                    <Text
                      className={`text-[8px] uppercase tracking-wider font-semibold ${
                        isSelected ? 'text-emerald-400' : 'text-zinc-600'
                      }`}
                    >
                      {item.sublabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Meal Name Input */}
          <View className="mb-4">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Meal Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grilled Salmon & Quinoa"
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 text-base font-semibold"
            />
          </View>

          {/* Quick Portion Scaler Strip */}
          <View className="mb-4 bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="scale-bathroom" size={14} color="#10b981" />
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                  Quick Portion Scaler
                </Text>
              </View>
              {portionScale !== 1.0 && (
                <TouchableOpacity
                  onPress={() => handleScalePortion(1.0)}
                  className="px-2 py-0.5 bg-zinc-800 rounded-md border border-zinc-700/60"
                >
                  <Text className="text-emerald-400 text-[10px] font-bold">Reset 1.0×</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row gap-2">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((scale) => {
                const isSelected = portionScale === scale;
                return (
                  <TouchableOpacity
                    key={scale}
                    onPress={() => handleScalePortion(scale)}
                    className={`flex-1 py-2 rounded-xl items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className={`text-xs ${
                        isSelected ? 'text-emerald-400 font-extrabold' : 'text-zinc-400'
                      }`}
                    >
                      {scale === 1.0 ? '1.0×' : `${scale}×`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Macronutrients Grid */}
          <View className="mb-5">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Macronutrients Breakdown
            </Text>

            <View className="flex-row gap-2.5 mb-2.5">
              {/* Calories */}
              <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3.5">
                <Text className="text-emerald-400 text-[10px] font-bold uppercase mb-1">Calories</Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={calories}
                    onChangeText={(val) => {
                      setCalories(val);
                      setPortionScale(0);
                    }}
                    keyboardType="numeric"
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-white text-2xl p-0 flex-1"
                  />
                  <Text className="text-zinc-500 text-xs font-bold ml-1">kcal</Text>
                </View>
              </View>

              {/* Protein */}
              <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3.5">
                <Text className="text-blue-400 text-[10px] font-bold uppercase mb-1">Protein</Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={protein}
                    onChangeText={(val) => {
                      setProtein(val);
                      setPortionScale(0);
                    }}
                    keyboardType="numeric"
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-white text-2xl p-0 flex-1"
                  />
                  <Text className="text-zinc-500 text-xs font-bold ml-1">g</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              {/* Carbs */}
              <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3.5">
                <Text className="text-amber-400 text-[10px] font-bold uppercase mb-1">Carbohydrates</Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={carbs}
                    onChangeText={(val) => {
                      setCarbs(val);
                      setPortionScale(0);
                    }}
                    keyboardType="numeric"
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-white text-2xl p-0 flex-1"
                  />
                  <Text className="text-zinc-500 text-xs font-bold ml-1">g</Text>
                </View>
              </View>

              {/* Fat */}
              <View className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3.5">
                <Text className="text-rose-400 text-[10px] font-bold uppercase mb-1">Total Fat</Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={fat}
                    onChangeText={(val) => {
                      setFat(val);
                      setPortionScale(0);
                    }}
                    keyboardType="numeric"
                    style={{ fontFamily: 'Outfit_800ExtraBold' }}
                    className="text-white text-2xl p-0 flex-1"
                  />
                  <Text className="text-zinc-500 text-xs font-bold ml-1">g</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Detected Ingredients Tag List */}
          <View className="mb-6">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Identified Ingredients & Items
            </Text>

            <View className="flex-row flex-wrap gap-2 mb-3">
              {foodItems.map((item, idx) => (
                <View
                  key={idx}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 flex-row items-center gap-1.5"
                >
                  <Text className="text-zinc-200 text-xs font-semibold">{item}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                    <Ionicons name="close-circle" size={15} color="#71717a" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Add ingredient input */}
            <View className="flex-row gap-2">
              <TextInput
                value={newItemText}
                onChangeText={setNewItemText}
                placeholder="Add missing ingredient..."
                placeholderTextColor="#52525b"
                onSubmitEditing={handleAddItem}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium"
              />
              <TouchableOpacity
                onPress={handleAddItem}
                className="bg-zinc-800 px-4 rounded-xl items-center justify-center"
              >
                <Ionicons name="add" size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-10">
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paw" size={18} color="#ffffff" />
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className="text-white font-bold text-base"
                  >
                    Save Catch to Daily Log
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.back();
              }}
              className="py-3 items-center"
            >
              <Text className="text-zinc-500 font-semibold text-sm">Discard & Retake</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cross-Modal AI Nutrition Coach Assistant */}
      <AiNutritionCoachModal
        visible={coachModalVisible}
        onClose={() => setCoachModalVisible(false)}
        userContext={{
          displayName: profile?.full_name || 'Athlete',
          goal: profile?.goal_pace || 'Fat Loss / Maintenance',
          dietType: profile?.diet_type || 'Balanced',
          targetCalories,
          targetProtein,
          targetCarbs: profile?.target_carbs_g || 200,
          targetFat: profile?.target_fat_g || 65,
          consumedCalories,
          consumedProtein,
          consumedCarbs: 0,
          consumedFat: 0,
          remainingCalories: Math.max(0, targetCalories - (consumedCalories + (parseFloat(calories) || 0))),
          remainingProtein: Math.max(0, targetProtein - (consumedProtein + (parseFloat(protein) || 0))),
          todayMeals: meals.map((m) => `${m.name} (${m.calories} kcal)`),
        }}
        initialQuery={coachInitialQuery}
      />
    </SafeAreaView>
  );
}
