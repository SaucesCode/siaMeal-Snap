import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../stores/authStore';
import { useMealStore, getTodayString, selectTodayMeals } from '../../stores/mealStore';
import { useWaterStore } from '../../stores/waterStore';
import { useStreakStore } from '../../stores/streakStore';
import { useCoachStore } from '../../stores/coachStore';
import { DailyMacroSummary } from '../../components/MacroCard';
import { MealItemCard } from '../../components/MealItemCard';
import { MealDetailModal } from '../../components/MealDetailModal';
import { TextLogModal } from '../../components/TextLogModal';
import { QuickLogActionSheet } from '../../components/QuickLogActionSheet';
import { RePounceSheet } from '../../components/RePounceSheet';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { NextMealIdea } from '../../components/NextMealIdea';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';
import { ProgressBar } from '../../components/ProgressBar';
import { Sia } from '../../components/sia';
import { SiaPeek } from '../../features/sia/SiaPeek';
import { SiaSays } from '../../features/sia/SiaSays';
import { useSiaStore } from '../../features/sia/siaStore';
import { PEEK_SHOWN_Y, PEEK_SIZE } from '../../features/sia/peekMotion';
import { compressImage, analyzeMealPhoto, NotFoodError } from '../../services/aiService';
import { MEAL_TYPES } from '../../constants/mealTypes';
import { Meal, MealType } from '../../types';
import { hapticFeedback } from '../../utils/haptics';
import { calorieSummary, greetingName } from '../../utils/todaySummary';
import { palette, radius, space, type } from '../../theme';

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** What the (still dark) quick-log and log-again sheets need to title themselves. */
interface SheetCategory {
  type: MealType;
  title: string;
  icon: MciName;
}

const SHEET_ICONS: Record<MealType, MciName> = {
  breakfast: 'weather-sunny',
  lunch: 'silverware-fork-knife',
  dinner: 'weather-night',
  snack: 'food-apple-outline',
};

const SHEET_ACCENT = palette.leaf;
const SHEET_BADGE = 'bg-leaf/10 border-leaf/30';

const sheetCategory = (t: MealType): SheetCategory => ({
  type: t,
  title: MEAL_TYPES.find((m) => m.type === t)?.label ?? 'Snack',
  icon: SHEET_ICONS[t],
});

function MealsSkeleton() {
  return (
    <View accessibilityLabel="Loading today's meals" accessible>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore(useShallow((s) => ({ user: s.user, profile: s.profile })));
  const { meals, isLoading, fetchTodayMeals, deleteMeal, setDraftMeal, fetchWeeklyStats, duplicateMeal, getYesterdayMeals } =
    useMealStore(
      useShallow((s) => ({
        meals: selectTodayMeals(s),
        isLoading: s.isLoading,
        fetchTodayMeals: s.fetchTodayMeals,
        deleteMeal: s.deleteMeal,
        setDraftMeal: s.setDraftMeal,
        fetchWeeklyStats: s.fetchWeeklyStats,
        duplicateMeal: s.duplicateMeal,
        getYesterdayMeals: s.getYesterdayMeals,
      }))
    );
  const { addWater, todayMl, dailyGoalMl, loadTodayWater } = useWaterStore(
    useShallow((s) => ({ addWater: s.addWater, todayMl: s.todayMl, dailyGoalMl: s.dailyGoalMl, loadTodayWater: s.loadTodayWater }))
  );
  const streak = useStreakStore((s) => s.streak);
  const openCoach = useCoachStore((s) => s.openCoach);
  const siaHidden = useSiaStore((s) => s.hidden);

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [actionSheetCategory, setActionSheetCategory] = useState<SheetCategory | null>(null);
  const [logAgainCategory, setLogAgainCategory] = useState<SheetCategory | null>(null);
  const [yesterdayMeals, setYesterdayMeals] = useState<Record<MealType, Meal | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  });

  const todayStr = useMemo(() => getTodayString(), []);
  const formattedDate = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  const targetCalories = Number(profile?.target_calories) || 2000;
  const targetProtein = Number(profile?.target_protein_g) || 150;
  const targetCarbs = Number(profile?.target_carbs_g) || 200;
  const targetFat = Number(profile?.target_fat_g) || 65;

  const loadYesterday = () => getYesterdayMeals().then(setYesterdayMeals).catch(() => {});

  useEffect(() => {
    fetchTodayMeals();
    fetchWeeklyStats(targetCalories);
    loadTodayWater();
    loadYesterday();
  }, [todayStr]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodayMeals(), fetchWeeklyStats(targetCalories), loadTodayWater(), loadYesterday()]);
    setRefreshing(false);
  };

  const consumedTotals = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein_g: acc.protein_g + (Number(meal.protein_g) || 0),
          carbs_g: acc.carbs_g + (Number(meal.carbs_g) || 0),
          fat_g: acc.fat_g + (Number(meal.fat_g) || 0),
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      ),
    [meals]
  );

  const targets = useMemo(
    () => ({ calories: targetCalories, protein_g: targetProtein, carbs_g: targetCarbs, fat_g: targetFat }),
    [targetCalories, targetProtein, targetCarbs, targetFat]
  );

  const mealSections = useMemo(
    () =>
      MEAL_TYPES.map((mt) => {
        const sectionMeals = meals.filter((m) => (m.meal_type || 'snack') === mt.type);
        const kcal = Math.round(sectionMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0));
        return { ...mt, meals: sectionMeals, kcal };
      }),
    [meals]
  );

  const summary = calorieSummary(consumedTotals.calories, targetCalories);

  const safeTodayMl = Number(todayMl) || 0;
  const targetWaterMl = Number(profile?.target_water_ml) || Number(dailyGoalMl) || 2500;
  const waterFraction = targetWaterMl > 0 ? Math.min(1, safeTodayMl / targetWaterMl) : 0;

  const handleLogAgain = async (meal: Meal, targetType?: MealType) => {
    try {
      hapticFeedback.success();
      await duplicateMeal(meal, targetType);
      setToast({ title: 'Logged again', message: `${meal.name} · ${Math.round(meal.calories)} kcal`, type: 'success' });
    } catch (err: any) {
      Alert.alert("Couldn't log that again", err?.message || 'Please try again.');
    }
  };

  const handleQuickAddWater = async (amountMl: number) => {
    hapticFeedback.medium();
    const newTotal = safeTodayMl + amountMl;
    await addWater(amountMl);
    if (newTotal >= targetWaterMl && safeTodayMl < targetWaterMl) hapticFeedback.success();
    setToast({
      title: `+${amountMl} ml water`,
      message: `${(newTotal / 1000).toFixed(1)} of ${(targetWaterMl / 1000).toFixed(1)} L today`,
      type: 'water',
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeal(id);
      setToast({ title: 'Meal deleted', message: "Today's totals are updated.", type: 'info' });
    } catch (err: any) {
      Alert.alert("Couldn't delete that meal", err?.message || 'Please try again.');
    }
  };

  const handlePickGallery = async (mealType: MealType) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos access needed', 'Allow access to your photos to log a meal from one.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const selectedUri = picked.assets[0].uri;
      hapticFeedback.medium();
      setToast({ title: 'Looking at your photo…', message: 'Usually takes a few seconds.', type: 'info' });

      const { base64, uri: compressedUri } = await compressImage(selectedUri);
      const result = await analyzeMealPhoto(base64);
      setDraftMeal({
        name: result.meal_name || 'Logged Meal',
        meal_type: mealType,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        food_items: result.ingredients,
        image_url: compressedUri || selectedUri,
      });
      setToast(null);
      hapticFeedback.success();
      router.push('/review' as any);
    } catch (err: any) {
      setToast(null);
      if (err instanceof NotFoodError) {
        Alert.alert("That doesn't look like food", err.message);
      } else {
        Alert.alert("Couldn't read that photo", err?.message || 'Please try again.');
      }
    }
  };

  const showSkeleton = isLoading && meals.length === 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text} colors={[palette.point]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.greeting} accessibilityRole="header" numberOfLines={1}>
              Hi {greetingName(profile?.full_name, user?.email)}
            </Text>
            <SiaSays summary={summary} />
          </View>
          {streak != null && streak > 0 && (
            <View style={styles.streak} accessible accessibilityLabel={`${streak}-day logging streak`}>
              <Ionicons name="flame" size={16} color={palette.carbsOnLight} />
              <Text style={styles.streakText}>{streak}-day streak</Text>
            </View>
          )}
        </View>

        <NotificationPermissionBanner />

        {/* Sia peeks over the top edge of the calories card, so the card leaves room above it for her. */}
        <View style={siaHidden ? undefined : styles.heroWithSia}>
          <DailyMacroSummary
            targetCalories={targetCalories}
            consumedCalories={consumedTotals.calories}
            protein={{ consumed: consumedTotals.protein_g, target: targetProtein }}
            carbs={{ consumed: consumedTotals.carbs_g, target: targetCarbs }}
            fat={{ consumed: consumedTotals.fat_g, target: targetFat }}
          />
          <SiaPeek />
        </View>

        <View style={styles.card}>
          <View style={styles.waterRow}>
            <Ionicons name="water" size={20} color={palette.water} />
            <View style={styles.waterText}>
              <Text style={styles.cardTitle}>Water</Text>
              <Text style={styles.muted}>
                {(safeTodayMl / 1000).toFixed(1)} of {(targetWaterMl / 1000).toFixed(1)} L
              </Text>
            </View>
            {[250, 500].map((ml) => (
              <Pressable
                key={ml}
                onPress={() => handleQuickAddWater(ml)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ml} millilitres of water`}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text style={styles.chipText}>+{ml} ml</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.waterBar}>
            <ProgressBar fraction={waterFraction} fill={palette.water} track={palette.line} height={6} />
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              setTextModalVisible(true);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={18} color={palette.text} />
            <Text style={styles.quickActionText}>Type a meal</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              handlePickGallery('snack');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          >
            <Ionicons name="images-outline" size={18} color={palette.text} />
            <Text style={styles.quickActionText}>Pick a photo</Text>
          </Pressable>
        </View>

        <NextMealIdea targets={targets} consumed={consumedTotals} loggedMeals={meals} />

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Meals
        </Text>

        {showSkeleton ? (
          <MealsSkeleton />
        ) : (
          <>
            {meals.length === 0 && (
              <View style={styles.empty}>
                <Sia expression="sleepy" size={96} animated={false} />
                <Text style={styles.emptyTitle}>Nothing logged yet.</Text>
                <Text style={styles.emptyBody}>Snap your plate and Sia will count it for you.</Text>
                <Pressable
                  onPress={() => {
                    hapticFeedback.medium();
                    router.push('/(tabs)/camera' as any);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.snapButton, pressed && styles.pressed]}
                >
                  <Ionicons name="camera" size={18} color={palette.shutterGlyph} />
                  <Text style={styles.snapButtonText}>Snap a meal</Text>
                </Pressable>
              </View>
            )}

            {mealSections.map((section) => {
              const yesterday = yesterdayMeals[section.type];
              return (
                <View key={section.type} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name={section.icon} size={18} color={palette.textMuted} />
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    {section.kcal > 0 && <Text style={styles.sectionKcal}>{section.kcal} kcal</Text>}
                    <Pressable
                      onPress={() => {
                        hapticFeedback.light();
                        setActionSheetCategory(sheetCategory(section.type));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${section.label.toLowerCase()}`}
                      style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="add" size={22} color={palette.text} />
                    </Pressable>
                  </View>

                  {section.meals.map((meal) => (
                    <MealItemCard key={meal.id} meal={meal} onDelete={handleDelete} onPress={setSelectedMeal} />
                  ))}

                  {section.meals.length === 0 && yesterday && (
                    <Pressable
                      onPress={() => handleLogAgain(yesterday, section.type)}
                      accessibilityRole="button"
                      accessibilityLabel={`Log again: ${yesterday.name}, ${Math.round(yesterday.calories)} calories`}
                      style={({ pressed }) => [styles.logAgain, pressed && styles.pressed]}
                    >
                      <Ionicons name="repeat" size={18} color={palette.leafText} />
                      <Text style={styles.logAgainText} numberOfLines={1}>
                        Log again: <Text style={styles.logAgainName}>{yesterday.name}</Text>
                      </Text>
                      <Text style={styles.logAgainKcal}>{Math.round(yesterday.calories)} kcal</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {actionSheetCategory && (
        <QuickLogActionSheet
          visible
          mealType={actionSheetCategory.type}
          categoryTitle={actionSheetCategory.title}
          categoryIcon={actionSheetCategory.icon}
          categoryColor={SHEET_ACCENT}
          categoryBadgeBg={SHEET_BADGE}
          onClose={() => setActionSheetCategory(null)}
          onSelectCamera={(t) => router.push({ pathname: '/(tabs)/camera', params: { mode: 'photo', meal_type: t } } as any)}
          onSelectBarcode={(t) => router.push({ pathname: '/(tabs)/camera', params: { mode: 'barcode', meal_type: t } } as any)}
          onSelectGallery={(t) => handlePickGallery(t)}
          onSelectText={() => setTextModalVisible(true)}
          onSelectRePounce={() => setLogAgainCategory(actionSheetCategory)}
        />
      )}

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          visible
          onClose={() => setSelectedMeal(null)}
          onDuplicate={(meal) =>
            setToast({ title: 'Logged again', message: `${meal.name} · ${Math.round(meal.calories)} kcal`, type: 'success' })
          }
          onAskCoach={(meal) => {
            setSelectedMeal(null);
            openCoach(
              `I logged "${meal.name}" (${Math.round(meal.calories)} kcal, ${Math.round(meal.protein_g)}g protein, ${Math.round(meal.carbs_g)}g carbs, ${Math.round(meal.fat_g)}g fat). How does it fit today, and what should I eat next to hit my macros?`
            );
          }}
        />
      )}

      {textModalVisible && (
        <TextLogModal
          visible
          onClose={() => setTextModalVisible(false)}
          onSuccess={() => {
            setTextModalVisible(false);
            router.push('/review' as any);
          }}
          initialMealType={actionSheetCategory?.type || 'snack'}
        />
      )}

      {logAgainCategory && (
        <RePounceSheet
          visible
          categoryType={logAgainCategory.type}
          categoryTitle={logAgainCategory.title}
          categoryIcon={logAgainCategory.icon}
          categoryColor={SHEET_ACCENT}
          onClose={() => setLogAgainCategory(null)}
          onPounceMeal={(meal) => handleLogAgain(meal, logAgainCategory.type)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: 120 },
  pressed: { opacity: 0.7 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginBottom: space[2] },
  heroWithSia: { marginTop: PEEK_SIZE - PEEK_SHOWN_Y + space[1] },
  headerText: { flex: 1 },
  date: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.textMuted },
  greeting: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text, marginTop: 2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 32,
    marginTop: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  streakText: { fontFamily: type.bodyBold, fontSize: type.size.caption, color: palette.text, fontVariant: ['tabular-nums'] },

  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space[3],
    marginBottom: space[3],
  },
  cardTitle: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  muted: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, fontVariant: ['tabular-nums'] },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  waterText: { flex: 1, marginLeft: space[1] },
  waterBar: { marginTop: space[3] },
  chip: {
    minHeight: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.water, fontVariant: ['tabular-nums'] },

  quickActions: { flexDirection: 'row', gap: space[2], marginBottom: space[3] },
  quickAction: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  quickActionText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },

  sectionTitle: { fontFamily: type.displayBold, fontSize: type.size.section + 3, color: palette.text, marginBottom: space[2] },
  section: { marginBottom: space[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 },
  sectionLabel: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  sectionKcal: { fontFamily: type.displayBold, fontSize: type.size.secondary, color: palette.textMuted, fontVariant: ['tabular-nums'] },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logAgain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.line,
  },
  logAgainText: { flex: 1, fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  logAgainName: { fontFamily: type.bodyBold, color: palette.text },
  logAgainKcal: { fontFamily: type.displayBold, fontSize: type.size.secondary, color: palette.leafText, fontVariant: ['tabular-nums'] },

  empty: {
    alignItems: 'center',
    paddingVertical: space[6],
    paddingHorizontal: space[4],
    marginBottom: space[3],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  emptyTitle: { fontFamily: type.displayBold, fontSize: type.size.section, color: palette.text, marginTop: space[3] },
  emptyBody: {
    fontFamily: type.body,
    fontSize: type.size.secondary,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: space[1],
    maxWidth: 300,
  },
  snapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: space[6],
    marginTop: space[4],
    borderRadius: radius.full,
    backgroundColor: palette.shutter,
  },
  snapButtonText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.shutterGlyph },

  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    padding: space[3],
    marginBottom: space[2],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  skeletonThumb: { width: 44, height: 44, borderRadius: radius.control, backgroundColor: palette.line },
  skeletonLines: { flex: 1, gap: space[2] },
  skeletonLine: { height: 10, borderRadius: radius.full, backgroundColor: palette.line },
});
