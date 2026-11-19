import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useMealStore, selectTodayMeals } from '../stores/mealStore';
import { useAuthStore } from '../stores/authStore';
import { useCoachStore } from '../stores/coachStore';
import { useMealImageSource } from '../lib/mealImages';
import { CalorieEyeRing } from '../components/CalorieEyeRing';
import { SiaPeek } from '../features/sia/SiaPeek';
import { PEEK_SHOWN_Y, PEEK_SIZE } from '../features/sia/peekMotion';
import type { SiaReaction } from '../features/sia/siaReactions';
import { MEAL_TYPES, mealTypeLabel } from '../constants/mealTypes';
import { MealType } from '../types';
import { getDefaultMealType, reconcileCaloriesWithMacros } from '../utils/nutrition';
import { mealFit, scaleMacros, type Macros } from '../utils/reviewMath';
import { hapticFeedback } from '../utils/haptics';
import { palette, radius, space, type } from '../theme';

const PORTIONS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: '½' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1½' },
  { value: 2, label: '2×' },
];
const MACRO_FIELDS: Array<{ key: keyof Macros; label: string; unit: string }> = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];
const nf = new Intl.NumberFormat('en-US');

const nextMealType = (t: MealType): MealType => {
  const i = MEAL_TYPES.findIndex((m) => m.type === t);
  return MEAL_TYPES[(i + 1) % MEAL_TYPES.length].type;
};

/** Check what the AI found and save it: the meal fills today's eye ring, one portion row, one Save. */
export default function ReviewScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const openCoach = useCoachStore((s) => s.openCoach);
  const { draftMeal, logMeal, todayMeals } = useMealStore(
    useShallow((s) => ({ draftMeal: s.draftMeal, logMeal: s.logMeal, todayMeals: selectTodayMeals(s) }))
  );
  const imageSource = useMealImageSource(draftMeal?.image_url);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());
  const [portion, setPortion] = useState(1);
  /** Exact numbers typed in "Edit details"; null means "the AI's numbers × portion". */
  const [edited, setEdited] = useState<Macros | null>(null);
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const base = useRef<Macros>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  useEffect(() => {
    if (!draftMeal) return;
    base.current = {
      calories: draftMeal.calories ?? 0,
      protein_g: draftMeal.protein_g ?? 0,
      carbs_g: draftMeal.carbs_g ?? 0,
      fat_g: draftMeal.fat_g ?? 0,
    };
    setName(draftMeal.name || '');
    setMealType(draftMeal.meal_type || getDefaultMealType());
    setFoodItems(draftMeal.food_items || []);
    setPortion(1);
    setEdited(null);
  }, [draftMeal]);

  const meal = edited ?? scaleMacros(base.current, portion);
  const targetCalories = Number(profile?.target_calories) || 2000;
  const targetProtein = Number(profile?.target_protein_g) || 150;
  const today = useMemo(
    () =>
      todayMeals.reduce(
        (acc, m) => ({ calories: acc.calories + (Number(m.calories) || 0), protein: acc.protein + (Number(m.protein_g) || 0) }),
        { calories: 0, protein: 0 }
      ),
    [todayMeals]
  );
  const fit = mealFit(today.calories, today.protein, meal, targetCalories, targetProtein);

  // Sia's face follows how this meal fits; a new face makes her duck and pop up again.
  const siaReaction = useMemo<SiaReaction>(() => ({ expression: fit.expression, line: null, spot: 'right' }), [fit.expression]);

  if (!draftMeal) return null;

  const choosePortion = (value: number) => {
    hapticFeedback.selection();
    setPortion(value);
    setEdited(null);
  };

  const editNumber = (key: keyof Macros, text: string) => {
    const n = Math.max(0, Number(text.replace(/[^0-9.]/g, '')) || 0);
    setEdited({ ...meal, [key]: n });
  };

  const addItem = () => {
    const item = newItem.trim();
    if (!item) return;
    hapticFeedback.light();
    setFoodItems((items) => [...items, item]);
    setNewItem('');
  };

  const askSia = () => {
    hapticFeedback.light();
    openCoach(
      `I'm about to log "${name || 'this meal'}" (${meal.calories} kcal, ${meal.protein_g}g protein, ${meal.carbs_g}g carbs, ${meal.fat_g}g fat). How does it fit today?`
    );
  };

  const save = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      hapticFeedback.error();
      setNameError(true);
      return;
    }
    try {
      setIsSaving(true);
      await logMeal({
        name: name.trim(),
        meal_type: mealType,
        calories: reconcileCaloriesWithMacros(meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g),
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        food_items: foodItems,
        image_url: draftMeal.image_url || null,
        logged_at: new Date().toISOString(),
      });
      hapticFeedback.success();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't save this meal", err?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const notes = [draftMeal.portion_notes, draftMeal.feline_verdict].filter(Boolean) as string[];
  const status = fit.over > 0 ? `${nf.format(fit.over)} over after` : `${nf.format(fit.left)} left after`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retake"
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={20} color={palette.text} />
            <Text style={styles.headerText}>Retake</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticFeedback.selection();
              setMealType(nextMealType(mealType));
            }}
            accessibilityRole="button"
            accessibilityLabel={`Meal: ${mealTypeLabel(mealType)}`}
            accessibilityHint="Changes to the next meal"
            style={({ pressed }) => [styles.mealChip, pressed && styles.pressed]}
          >
            <Text style={styles.mealChipText}>{mealTypeLabel(mealType)}</Text>
            <Ionicons name="chevron-down" size={14} color={palette.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {imageSource && (
            <Image source={imageSource} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
          )}

          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError && t.trim()) setNameError(false);
              }}
              accessibilityLabel="Meal name"
              placeholder="What did you eat?"
              placeholderTextColor={palette.textMuted}
              style={styles.nameInput}
              multiline
            />
            <Ionicons name="pencil" size={16} color={palette.textMuted} />
          </View>
          {nameError && <Text style={styles.error}>Give it a name</Text>}

          <View style={styles.cardZone}>
            <View style={styles.card}>
              <CalorieEyeRing
                size={112}
                eaten={meal.calories}
                target={targetCalories}
                fraction={fit.afterFraction}
                baseFraction={fit.beforeFraction}
                over={fit.over > 0}
                centerLabel={`+${nf.format(meal.calories)}`}
                centerCaption="kcal"
              />
              <View style={styles.adds}>
                {[
                  { v: meal.protein_g, l: 'protein' },
                  { v: meal.carbs_g, l: 'carbs' },
                  { v: meal.fat_g, l: 'fat' },
                ].map(({ v, l }) => (
                  <Text key={l} style={styles.add}>
                    <Text style={styles.addValue}>{`+${nf.format(v)} g`}</Text>
                    <Text style={styles.addLabel}> {l}</Text>
                  </Text>
                ))}
                <Text style={styles.after}>{status}</Text>
              </View>
            </View>
            <SiaPeek reaction={siaReaction} onPress={askSia} />
          </View>

          <View style={styles.portions} accessibilityRole="radiogroup">
            {PORTIONS.map((p) => {
              const on = !edited && portion === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => choosePortion(p.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Portion ${p.label}`}
                  style={({ pressed }) => [styles.portion, on && styles.portionOn, pressed && styles.pressed]}
                >
                  <Text style={[styles.portionText, on && styles.portionTextOn]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setDetailsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            style={({ pressed }) => [styles.detailsRow, pressed && styles.pressed]}
          >
            <Text style={styles.detailsText}>Edit details</Text>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.text} />
          </Pressable>

          {detailsOpen && (
            <View style={styles.details}>
              <View style={styles.fields}>
                {MACRO_FIELDS.map((f) => (
                  <View key={f.key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={styles.fieldBox}>
                      <TextInput
                        value={String(meal[f.key])}
                        onChangeText={(t) => editNumber(f.key, t)}
                        keyboardType="numeric"
                        accessibilityLabel={`${f.label} in ${f.unit === 'g' ? 'grams' : 'calories'}`}
                        style={styles.fieldInput}
                        selectTextOnFocus
                      />
                      <Text style={styles.fieldUnit}>{f.unit}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Ingredients</Text>
              <View style={styles.chips}>
                {foodItems.map((item, i) => (
                  <Pressable
                    key={`${item}-${i}`}
                    onPress={() => setFoodItems((items) => items.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item}`}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                    <Ionicons name="close" size={14} color={palette.textMuted} />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={newItem}
                onChangeText={setNewItem}
                onSubmitEditing={addItem}
                placeholder="Add an ingredient"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                accessibilityLabel="Add an ingredient"
                style={styles.addInput}
              />

              {notes.map((n) => (
                <Text key={n} style={styles.note}>
                  {n}
                </Text>
              ))}

              <Pressable onPress={askSia} accessibilityRole="button" style={({ pressed }) => [styles.askSia, pressed && styles.pressed]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.text} />
                <Text style={styles.detailsText}>Ask Sia about this meal</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.caption}>{draftMeal.image_url ? 'Estimated from your photo.' : 'Estimated values.'}</Text>
          <Pressable
            onPress={save}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityState={{ busy: isSaving, disabled: isSaving }}
            style={({ pressed }) => [styles.save, pressed && styles.pressed, isSaving && styles.saving]}
          >
            {isSaving ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 44, paddingHorizontal: space[2] },
  headerText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  mealChipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[4], paddingBottom: space[6] },
  photo: { width: '100%', height: 180, borderRadius: radius.card, marginTop: space[2], backgroundColor: palette.line },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] },
  nameInput: { flex: 1, fontFamily: type.display, fontSize: type.size.title, color: palette.text, padding: 0 },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[1] },
  cardZone: { marginTop: PEEK_SIZE - PEEK_SHOWN_Y + space[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    borderRadius: radius.hero,
    backgroundColor: palette.point,
  },
  adds: { flex: 1, gap: space[1] + 2 },
  add: { fontVariant: ['tabular-nums'] },
  addValue: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.pointText },
  addLabel: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.pointMuted },
  after: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointText, marginTop: space[1], fontVariant: ['tabular-nums'] },
  portions: { flexDirection: 'row', gap: space[2], marginTop: space[4] },
  portion: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  portionOn: { backgroundColor: palette.point, borderColor: palette.point },
  portionText: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text },
  portionTextOn: { color: palette.pointText },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginTop: space[4],
    paddingHorizontal: space[4],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  detailsText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  details: { marginTop: space[3], gap: space[2] },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[2] },
  field: { width: '48%', flexGrow: 1 },
  fieldLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginBottom: space[1] },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: space[3],
    borderRadius: radius.control,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  fieldInput: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  fieldUnit: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 36,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipText: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.text },
  addInput: {
    minHeight: 48,
    paddingHorizontal: space[3],
    borderRadius: radius.control,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    fontFamily: type.body,
    fontSize: type.size.secondary,
    color: palette.text,
  },
  note: { fontFamily: type.body, fontSize: type.size.secondary, lineHeight: 19, color: palette.textMuted },
  askSia: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 },
  footer: {
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.bg,
  },
  caption: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, textAlign: 'center', marginBottom: space[2] },
  save: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.point,
  },
  saving: { opacity: 0.8 },
  saveText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
});
