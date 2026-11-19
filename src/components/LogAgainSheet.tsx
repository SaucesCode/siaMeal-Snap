import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Meal, MealType } from '../types';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import { dayLabel } from '../utils/historyText';
import { getLocalDateString } from '../utils/localDate';
import { Sia } from './sia';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface LogAgainSheetProps {
  visible: boolean;
  mealType: MealType;
  mealLabel: string;
  onClose: () => void;
  onPick: (meal: Meal) => Promise<void> | void;
}

/** Recent meals of this type (last two weeks) to log again with one tap; searchable. */
export function LogAgainSheet({ visible, mealType, mealLabel, onClose, onPick }: LogAgainSheetProps) {
  const getRecentMeals = useMealStore((s) => s.getRecentMeals);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setQuery('');
    getRecentMeals(mealType, 25)
      .then(setMeals)
      .finally(() => setLoading(false));
  }, [visible, mealType]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => m.name.toLowerCase().includes(q) || m.food_items?.some((f) => f.toLowerCase().includes(q)));
  }, [meals, query]);

  const pick = async (meal: Meal) => {
    setBusyId(meal.id);
    hapticFeedback.success();
    try {
      await onPick(meal);
      onClose();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Tap style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Log {mealLabel.toLowerCase()} again
            </Text>
            <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Tap>
          </View>

          <View style={styles.search}>
            <Ionicons name="search" size={18} color={palette.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your meals"
              placeholderTextColor={palette.textMuted}
              accessibilityLabel="Search your meals"
              style={styles.searchInput}
            />
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={palette.text} style={styles.loading} />
            ) : shown.length === 0 ? (
              <View style={styles.empty}>
                <Sia expression="resting" size={64} animated={false} />
                <Text style={styles.emptyText}>
                  {query ? `No ${mealLabel.toLowerCase()} matches "${query}".` : `No ${mealLabel.toLowerCase()} logged in the last two weeks.`}
                </Text>
              </View>
            ) : (
              shown.map((meal) => (
                <Tap
                  key={meal.id}
                  onPress={() => pick(meal)}
                  disabled={busyId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${meal.name} again, ${Math.round(meal.calories)} calories`}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={styles.meta}>
                      {dayLabel(getLocalDateString(new Date(meal.logged_at)))} · P {Math.round(meal.protein_g)} · C {Math.round(meal.carbs_g)} · F{' '}
                      {Math.round(meal.fat_g)}
                    </Text>
                  </View>
                  {busyId === meal.id ? (
                    <ActivityIndicator color={palette.text} />
                  ) : (
                    <Text style={styles.kcal}>
                      {Math.round(meal.calories)}
                      <Text style={styles.unit}> kcal</Text>
                    </Text>
                  )}
                </Tap>
              ))
            )}
          </ScrollView>
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
    maxHeight: '85%',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space[2] },
  title: { flex: 1, fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: space[3],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  searchInput: { flex: 1, fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.text },
  list: { marginTop: space[3] },
  listContent: { gap: space[2], paddingBottom: space[2] },
  loading: { marginVertical: space[8] },
  empty: { alignItems: 'center', paddingVertical: space[6] },
  emptyText: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.textMuted, textAlign: 'center', marginTop: space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  name: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  meta: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  kcal: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
});
