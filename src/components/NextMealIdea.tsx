import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Meal } from '../types';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import { getSiaForecastRecommendation } from '../utils/mealForecastEngine';
import { mealTypeLabel } from '../constants/mealTypes';
import { palette, radius, space, type } from '../theme';

interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface NextMealIdeaProps {
  targets: Macros;
  consumed: Macros;
  loggedMeals: Meal[];
}

/** A suggestion for the next meal that fits what's left today. Hidden once the day's goal is met. */
export function NextMealIdea({ targets, consumed, loggedMeals }: NextMealIdeaProps) {
  const router = useRouter();
  const setDraftMeal = useMealStore((s) => s.setDraftMeal);
  const [cycleIndex, setCycleIndex] = useState(0);

  const forecast = useMemo(
    () => getSiaForecastRecommendation({ targets, consumed, loggedMeals, cycleIndex }),
    [targets, consumed, loggedMeals, cycleIndex]
  );

  if (forecast.isGoalMet) return null;
  const idea = forecast.catch;

  const logIt = () => {
    hapticFeedback.medium();
    setDraftMeal({
      name: idea.name,
      meal_type: idea.mealType,
      calories: idea.calories,
      protein_g: idea.protein_g,
      carbs_g: idea.carbs_g,
      fat_g: idea.fat_g,
      food_items: idea.ingredients,
      image_url: null,
    });
    router.push('/review' as any);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>Idea for {mealTypeLabel(idea.mealType).toLowerCase()}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {idea.name}
      </Text>
      <Text style={styles.meta}>
        {Math.round(idea.calories)} kcal · {Math.round(idea.protein_g)} g protein
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={logIt}
          accessibilityRole="button"
          accessibilityLabel={`Log ${idea.name}`}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Log this</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapticFeedback.selection();
            setCycleIndex((i) => i + 1);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Another idea</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space[4],
    marginBottom: space[6],
  },
  caption: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.caption,
    color: palette.textMuted,
  },
  name: {
    fontFamily: type.displayBold,
    fontSize: type.size.section,
    color: palette.text,
    marginTop: space[1],
  },
  meta: {
    fontFamily: type.body,
    fontSize: type.size.secondary,
    color: palette.textMuted,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[3],
  },
  button: {
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: palette.point,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryText: {
    fontFamily: type.bodyBold,
    fontSize: type.size.secondary,
    color: palette.pointText,
  },
  secondaryText: {
    fontFamily: type.bodyBold,
    fontSize: type.size.secondary,
    color: palette.text,
  },
});
