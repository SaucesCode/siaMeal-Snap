import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useShallow } from 'zustand/react/shallow';
import { Meal, MealType } from '../types';
import { useMealStore } from '../stores/mealStore';
import { useMealImageSource } from '../lib/mealImages';
import { MEAL_TYPES, mealTypeLabel } from '../constants/mealTypes';
import { hapticFeedback } from '../utils/haptics';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface MealDetailModalProps {
  meal: Meal | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  onAskCoach?: (meal: Meal) => void;
  onDuplicate?: (meal: Meal) => void;
}

const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
] as const;
type FieldKey = (typeof FIELDS)[number]['key'];

/** A logged meal: see it, log it again today, ask Sia, edit or delete. */
export function MealDetailModal({ meal, visible, onClose, onAskCoach, onDuplicate }: MealDetailModalProps) {
  const { updateMeal, deleteMeal, duplicateMeal } = useMealStore(
    useShallow((s) => ({ updateMeal: s.updateMeal, deleteMeal: s.deleteMeal, duplicateMeal: s.duplicateMeal }))
  );
  const imageSource = useMealImageSource(meal?.image_url);
  const [imageError, setImageError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [values, setValues] = useState<Record<FieldKey, string>>({ calories: '0', protein: '0', carbs: '0', fat: '0' });
  const [busy, setBusy] = useState<null | 'save' | 'delete' | 'again'>(null);

  useEffect(() => {
    if (!meal) return;
    setName(meal.name || '');
    setMealType(meal.meal_type || 'snack');
    setValues({
      calories: String(Math.round(meal.calories ?? 0)),
      protein: String(Math.round(meal.protein_g ?? 0)),
      carbs: String(Math.round(meal.carbs_g ?? 0)),
      fat: String(Math.round(meal.fat_g ?? 0)),
    });
    setEditing(false);
    setNameError(false);
    setImageError(false);
  }, [meal]);

  if (!meal) return null;

  const num = (k: FieldKey) => Math.max(0, parseFloat(values[k].replace(',', '.')) || 0);

  const save = async () => {
    if (!name.trim()) {
      hapticFeedback.error();
      setNameError(true);
      return;
    }
    try {
      setBusy('save');
      await updateMeal(meal.id, {
        name: name.trim(),
        meal_type: mealType,
        calories: num('calories'),
        protein_g: num('protein'),
        carbs_g: num('carbs'),
        fat_g: num('fat'),
      });
      hapticFeedback.success();
      onClose();
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't save your changes", err?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    hapticFeedback.medium();
    Alert.alert('Delete this meal?', `"${meal.name}" will be removed from that day's totals.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy('delete');
            await deleteMeal(meal.id);
            hapticFeedback.success();
            onClose();
          } catch (err: any) {
            hapticFeedback.error();
            Alert.alert("Couldn't delete this meal", err?.message || 'Please try again.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const logAgain = async () => {
    try {
      setBusy('again');
      hapticFeedback.success();
      await duplicateMeal(meal);
      onDuplicate?.(meal);
      onClose();
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't log this again", err?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const items = Array.isArray(meal.food_items) ? meal.food_items : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
        <Tap style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.kicker}>
                {mealTypeLabel(meal.meal_type || 'snack')} · {time}
              </Text>
              <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {editing ? 'Edit meal' : meal.name}
              </Text>
            </View>
            <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Tap>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {imageSource && !imageError && !editing && (
              <Image
                source={imageSource}
                style={styles.photo}
                contentFit="cover"
                accessibilityIgnoresInvertColors
                onError={() => setImageError(true)}
              />
            )}

            {editing ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (t.trim()) setNameError(false);
                  }}
                  accessibilityLabel="Meal name"
                  style={[styles.input, nameError && styles.inputError]}
                />
                {nameError && <Text style={styles.error}>Give it a name</Text>}

                <Text style={styles.label}>Meal</Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {MEAL_TYPES.map((m) => (
                    <Tap
                      key={m.type}
                      onPress={() => setMealType(m.type)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: mealType === m.type }}
                      style={[styles.chip, mealType === m.type && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, mealType === m.type && styles.chipTextOn]}>{m.label}</Text>
                    </Tap>
                  ))}
                </View>

                <View style={styles.fields}>
                  {FIELDS.map((f) => (
                    <View key={f.key} style={styles.fieldWrap}>
                      <Text style={styles.label}>{f.label}</Text>
                      <View style={styles.field}>
                        <TextInput
                          value={values[f.key]}
                          onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                          keyboardType="decimal-pad"
                          accessibilityLabel={`${f.label} in ${f.unit === 'g' ? 'grams' : 'calories'}`}
                          style={styles.fieldInput}
                          selectTextOnFocus
                        />
                        <Text style={styles.unit}>{f.unit}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.tiles}>
                  <View style={[styles.tile, styles.tileDark]}>
                    <Text style={[styles.tileValue, styles.tileValueDark]}>{Math.round(meal.calories)}</Text>
                    <Text style={[styles.tileLabel, styles.tileLabelDark]}>kcal</Text>
                  </View>
                  {[
                    [meal.protein_g, 'protein'],
                    [meal.carbs_g, 'carbs'],
                    [meal.fat_g, 'fat'],
                  ].map(([v, l]) => (
                    <View key={l} style={styles.tile}>
                      <Text style={styles.tileValue}>{Math.round(Number(v) || 0)} g</Text>
                      <Text style={styles.tileLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
                {items.length > 0 && (
                  <View style={styles.chips}>
                    {items.map((item, i) => (
                      <View key={`${item}-${i}`} style={styles.item}>
                        <Text style={styles.itemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {editing ? (
            <View style={styles.actionsRow}>
              <Tap onPress={() => setEditing(false)} accessibilityRole="button" style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Tap>
              <Tap onPress={save} disabled={busy !== null} accessibilityRole="button" style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}>
                {busy === 'save' ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.primaryText}>Save</Text>}
              </Tap>
            </View>
          ) : (
            <View style={styles.actions}>
              <Tap onPress={logAgain} disabled={busy !== null} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                {busy === 'again' ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.primaryText}>Log again today</Text>}
              </Tap>
              <View style={styles.actionsRow}>
                {onAskCoach && (
                  <Tap onPress={() => onAskCoach(meal)} accessibilityRole="button" style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.text} />
                    <Text style={styles.secondaryText}>Ask Sia</Text>
                  </Tap>
                )}
                <Tap onPress={() => setEditing(true)} accessibilityRole="button" style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]}>
                  <Ionicons name="pencil" size={18} color={palette.text} />
                  <Text style={styles.secondaryText}>Edit</Text>
                </Tap>
              </View>
              <Tap onPress={remove} disabled={busy !== null} accessibilityRole="button" style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                {busy === 'delete' ? <ActivityIndicator color={palette.over} /> : <Text style={styles.deleteText}>Delete meal</Text>}
              </Tap>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: {
    maxHeight: '90%',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space[2] },
  kicker: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted },
  title: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  body: { paddingBottom: space[3] },
  photo: { width: '100%', height: 180, borderRadius: radius.card, marginBottom: space[3], backgroundColor: palette.line },
  tiles: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  tile: { flex: 1, paddingVertical: space[3], alignItems: 'center', borderRadius: radius.card, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  tileDark: { backgroundColor: palette.point, borderColor: palette.point },
  tileValue: { fontFamily: type.displayBold, fontSize: type.size.section, color: palette.text, fontVariant: ['tabular-nums'] },
  tileValueDark: { color: palette.pointText },
  tileLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted },
  tileLabelDark: { color: palette.pointMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },
  item: { minHeight: 32, justifyContent: 'center', paddingHorizontal: space[3], borderRadius: radius.full, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  itemText: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.text },
  label: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginTop: space[3], marginBottom: space[1] },
  input: {
    minHeight: 52,
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    fontFamily: type.bodySemibold,
    fontSize: type.size.body,
    color: palette.text,
  },
  inputError: { borderColor: palette.over },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[1] },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space[4], borderRadius: radius.full, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface },
  chipOn: { backgroundColor: palette.point, borderColor: palette.point },
  chipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  chipTextOn: { color: palette.pointText },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  fieldWrap: { width: '48%', flexGrow: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space[3],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  fieldInput: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text },
  unit: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  actions: { gap: space[2], marginTop: space[2] },
  actionsRow: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  primary: { minHeight: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  primaryText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  secondary: {
    flexDirection: 'row',
    gap: space[2],
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  secondaryText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.over },
});
