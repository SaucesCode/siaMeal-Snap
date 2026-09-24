import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../types';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';

interface MealDetailModalProps {
  meal: Meal | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  onAskCoach?: (meal: Meal) => void;
}

interface MealTypeOption {
  type: MealType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const MEAL_TYPES: MealTypeOption[] = [
  { type: 'breakfast', label: 'Morning Pounce', icon: 'cat', color: '#f59e0b' },
  { type: 'lunch', label: 'Midday Catch', icon: 'fish', color: '#10b981' },
  { type: 'dinner', label: 'Night Prowl', icon: 'weather-night', color: '#818cf8' },
  { type: 'snack', label: 'Paws & Treats', icon: 'paw', color: '#06b6d4' },
];

export function MealDetailModal({ meal, visible, onClose, onAskCoach }: MealDetailModalProps) {
  const { updateMeal, deleteMeal } = useMealStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('snack');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (meal) {
      setName(meal.name || '');
      setMealType(meal.meal_type || 'snack');
      setCalories(String(meal.calories ?? 0));
      setProtein(String(meal.protein_g ?? 0));
      setCarbs(String(meal.carbs_g ?? 0));
      setFat(String(meal.fat_g ?? 0));
      setIsEditing(false);
      setImageError(false);
    }
  }, [meal]);

  if (!meal) return null;

  const handleSaveEdit = async () => {
    if (!name.trim()) {
      hapticFeedback.error();
      Alert.alert('Meal Name', 'Please enter a name for this meal.');
      return;
    }

    try {
      setIsSaving(true);
      await updateMeal(meal.id, {
        name: name.trim(),
        meal_type: mealType,
        calories: Math.max(0, parseFloat(calories) || 0),
        protein_g: Math.max(0, parseFloat(protein) || 0),
        carbs_g: Math.max(0, parseFloat(carbs) || 0),
        fat_g: Math.max(0, parseFloat(fat) || 0),
      });

      hapticFeedback.success();
      setIsEditing(false);
      onClose();
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert('Update Failed', err.message || 'Could not update meal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteMeal(meal.id);
              hapticFeedback.success();
              onClose();
            } catch (err: any) {
              hapticFeedback.error();
              Alert.alert('Delete Failed', err.message || 'Could not delete meal.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formattedTime = new Date(meal.logged_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/75">
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[88%] p-6">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View className="bg-zinc-800 px-3 py-1 rounded-full flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={13} color="#a1a1aa" />
                <Text className="text-zinc-300 text-xs font-semibold">{formattedTime}</Text>
              </View>
              <View className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex-row items-center gap-1.5">
                <MaterialCommunityIcons
                  name={MEAL_TYPES.find((t) => t.type === (meal.meal_type || 'snack'))?.icon || 'paw'}
                  size={12}
                  color="#10b981"
                />
                <Text className="text-emerald-400 text-xs font-bold">
                  {MEAL_TYPES.find((t) => t.type === (meal.meal_type || 'snack'))?.label || 'Catch'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setIsEditing(true);
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
                >
                  <Ionicons name="pencil" size={14} color="#e4e4e7" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close" size={17} color="#e4e4e7" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Meal Photo */}
            {meal.image_url && !imageError ? (
              <View className="mb-4 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                <Image
                  source={{ uri: meal.image_url }}
                  className="w-full h-48"
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : null}

            {/* Meal Name */}
            {isEditing ? (
              <View className="mb-4">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Meal Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-base font-semibold"
                />
              </View>
            ) : (
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-2xl text-white mb-4"
              >
                {meal.name}
              </Text>
            )}

            {/* Meal Type Switcher (Edit Mode) */}
            {isEditing && (
              <View className="mb-4">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  Category
                </Text>
                <View className="flex-row gap-2">
                  {MEAL_TYPES.map((t) => {
                    const isSelected = mealType === t.type;
                    return (
                      <TouchableOpacity
                        key={t.type}
                        onPress={() => {
                          hapticFeedback.selection();
                          setMealType(t.type);
                        }}
                        className={`flex-1 py-2 rounded-xl border items-center ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                      >
                        <MaterialCommunityIcons
                          name={t.icon}
                          size={15}
                          color={isSelected ? '#10b981' : '#71717a'}
                        />
                        <Text
                          style={{ fontFamily: 'Outfit_700Bold' }}
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? 'text-emerald-400' : 'text-zinc-400'
                          }`}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Calories & Macros Grid */}
            <View className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                  Sia Nutritional Calibration
                </Text>
                <View className="bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  <Text className="text-emerald-400 text-[9px] font-bold uppercase">Verified</Text>
                </View>
              </View>

              {isEditing ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between border-b border-zinc-800/80 pb-2">
                    <Text className="text-white font-medium text-sm">Calories (kcal)</Text>
                    <TextInput
                      value={calories}
                      onChangeText={setCalories}
                      keyboardType="numeric"
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="bg-zinc-900 border border-zinc-700 text-emerald-400 font-bold px-3 py-1 rounded-lg text-right w-24"
                    />
                  </View>

                  <View className="flex-row items-center justify-between border-b border-zinc-800/80 pb-2">
                    <Text className="text-blue-400 font-medium text-sm">Protein (g)</Text>
                    <TextInput
                      value={protein}
                      onChangeText={setProtein}
                      keyboardType="numeric"
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="bg-zinc-900 border border-zinc-700 text-blue-400 font-bold px-3 py-1 rounded-lg text-right w-24"
                    />
                  </View>

                  <View className="flex-row items-center justify-between border-b border-zinc-800/80 pb-2">
                    <Text className="text-amber-400 font-medium text-sm">Carbs (g)</Text>
                    <TextInput
                      value={carbs}
                      onChangeText={setCarbs}
                      keyboardType="numeric"
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="bg-zinc-900 border border-zinc-700 text-amber-400 font-bold px-3 py-1 rounded-lg text-right w-24"
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-rose-400 font-medium text-sm">Fat (g)</Text>
                    <TextInput
                      value={fat}
                      onChangeText={setFat}
                      keyboardType="numeric"
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="bg-zinc-900 border border-zinc-700 text-rose-400 font-bold px-3 py-1 rounded-lg text-right w-24"
                    />
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_900Black' }}
                      className="text-emerald-400 text-xl"
                    >
                      {Math.round(meal.calories)}
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">
                      Calories
                    </Text>
                  </View>

                  <View className="w-px h-8 bg-zinc-800" />

                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_900Black' }}
                      className="text-blue-400 text-xl"
                    >
                      {Math.round(meal.protein_g)}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">
                      Protein
                    </Text>
                  </View>

                  <View className="w-px h-8 bg-zinc-800" />

                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_900Black' }}
                      className="text-amber-400 text-xl"
                    >
                      {Math.round(meal.carbs_g)}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">
                      Carbs
                    </Text>
                  </View>

                  <View className="w-px h-8 bg-zinc-800" />

                  <View className="items-center flex-1">
                    <Text
                      style={{ fontFamily: 'Outfit_900Black' }}
                      className="text-rose-400 text-xl"
                    >
                      {Math.round(meal.fat_g)}g
                    </Text>
                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">
                      Fat
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Food items tags */}
            {meal.food_items && meal.food_items.length > 0 && (
              <View className="mb-6">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2 tracking-wider">
                  Ingredients & Items
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {meal.food_items.map((item, idx) => (
                    <View
                      key={idx}
                      className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl"
                    >
                      <Text className="text-zinc-300 text-xs font-medium">{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {isEditing ? (
              <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setIsEditing(false);
                  }}
                  className="flex-1 bg-zinc-800 py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-zinc-300 font-bold text-sm">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 bg-emerald-500 py-3.5 rounded-2xl items-center"
                >
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-3 mb-6">
                {onAskCoach && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.medium();
                      onAskCoach(meal);
                    }}
                    activeOpacity={0.8}
                    className="bg-zinc-950 border border-emerald-500/35 p-3.5 rounded-2xl flex-row items-center justify-between shadow-sm shadow-emerald-500/10"
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
                          Get instant AI coach tactical breakdown
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#10b981" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isDeleting}
                  className="bg-rose-500/10 border border-rose-500/30 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#fb7185" />
                      <Text className="text-rose-400 font-bold text-sm">Delete Meal</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
