import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Meal } from '../types';
import { hapticFeedback } from '../utils/haptics';
import { useMealImageSource } from '../lib/mealImages';
import { MEAL_TYPES } from '../constants/mealTypes';
import { palette, radius, space, type } from '../theme';

interface MealItemCardProps {
  meal: Meal;
  onDelete: (id: string) => void;
  onPress?: (meal: Meal) => void;
}

const THUMB = 44;

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** One logged meal: photo, name, time and macros, calories on the right. Long-press to delete. */
export function MealItemCard({ meal, onDelete, onPress }: MealItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageSource = useMealImageSource(meal.image_url);
  const icon = MEAL_TYPES.find((m) => m.type === meal.meal_type)?.icon ?? 'nutrition-outline';
  const kcal = Math.round(Number(meal.calories) || 0);
  const macros = `P ${Math.round(meal.protein_g)} · C ${Math.round(meal.carbs_g)} · F ${Math.round(meal.fat_g)}`;
  const time = formatTime(meal.logged_at);

  const confirmDelete = () => {
    hapticFeedback.medium();
    Alert.alert('Delete this meal?', `"${meal.name}" will be removed from today's totals.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(meal.id) },
    ]);
  };

  return (
    <Pressable
      onPress={() => {
        hapticFeedback.light();
        onPress?.(meal);
      }}
      onLongPress={confirmDelete}
      accessibilityRole="button"
      accessibilityLabel={`${meal.name}, ${kcal} calories${time ? `, ${time}` : ''}`}
      accessibilityHint="Opens the meal. Long-press to delete."
      accessibilityActions={[{ name: 'delete', label: 'Delete meal' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && confirmDelete()}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {imageSource && !imageError ? (
        <Image
          source={imageSource}
          style={styles.thumb}
          contentFit="cover"
          transition={150}
          recyclingKey={meal.id}
          accessibilityIgnoresInvertColors
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.thumb, styles.iconThumb]}>
          <Ionicons name={icon} size={20} color={palette.textMuted} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {time ? `${time} · ` : ''}
          {macros}
        </Text>
      </View>

      <Text style={styles.kcal}>
        {kcal}
        <Text style={styles.unit}> kcal</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingVertical: space[2] + 2,
    paddingHorizontal: space[3],
    marginBottom: space[2],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.control,
  },
  iconThumb: {
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: type.bodyBold,
    fontSize: type.size.body,
    color: palette.text,
  },
  meta: {
    fontFamily: type.body,
    fontSize: type.size.caption,
    color: palette.textMuted,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  kcal: {
    fontFamily: type.displayBold,
    fontSize: type.size.body,
    color: palette.text,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: type.body,
    fontSize: type.size.caption,
    color: palette.textMuted,
  },
});
