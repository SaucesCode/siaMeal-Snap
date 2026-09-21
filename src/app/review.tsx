import React, { useState, useEffect } from 'react';
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
import { MealType } from '../types';
import { getDefaultMealType } from '../utils/nutrition';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import SiaCatMascot from '../components/SiaCatMascot';

interface MealTypeOption {
  type: MealType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MEAL_TYPES: MealTypeOption[] = [
  { type: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', color: '#f59e0b' },
  { type: 'lunch', label: 'Lunch', icon: 'restaurant-outline', color: '#10b981' },
  { type: 'dinner', label: 'Dinner', icon: 'moon-outline', color: '#818cf8' },
  { type: 'snack', label: 'Snack', icon: 'nutrition-outline', color: '#06b6d4' },
];

export default function ReviewScreen() {
  const router = useRouter();
  const { draftMeal, logMeal } = useMealStore();

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (draftMeal) {
      setName(draftMeal.name || '');
      setMealType(draftMeal.meal_type || getDefaultMealType());
      setCalories(String(draftMeal.calories ?? 0));
      setProtein(String(draftMeal.protein_g ?? 0));
      setCarbs(String(draftMeal.carbs_g ?? 0));
      setFat(String(draftMeal.fat_g ?? 0));
      setFoodItems(draftMeal.food_items || []);
    }
  }, [draftMeal]);

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
          Review & Edit Meal
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {/* Sia Vision Intelligence Card */}
          <View className="bg-zinc-900/90 border border-emerald-500/30 rounded-3xl p-3.5 flex-row items-center gap-3 mb-4 shadow-sm shadow-emerald-500/10">
            <View className="items-center justify-center">
              <SiaCatMascot size={46} mood="happy" withGlow={true} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  Sia Vision Assessment
                </Text>
                <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                  <Text className="text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">🐾 AI Verified</Text>
                </View>
              </View>
              <Text className="text-zinc-400 text-[11px] font-medium leading-4">
                Sia inspected your meal! Tweak portions or ingredients below before saving, human.
              </Text>
            </View>
          </View>

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

          {/* Meal Category Selector */}
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
                    className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isSelected ? '#10b981' : '#71717a'}
                    />
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className={`text-[11px] mt-1 ${
                        isSelected ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      {item.label}
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
              placeholder="e.g. Grilled Chicken & Rice"
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 text-base font-semibold"
            />
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
                    onChangeText={setCalories}
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
                    onChangeText={setProtein}
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
                    onChangeText={setCarbs}
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
                    onChangeText={setFat}
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
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-base">Save to Daily Log</Text>
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
    </SafeAreaView>
  );
}
