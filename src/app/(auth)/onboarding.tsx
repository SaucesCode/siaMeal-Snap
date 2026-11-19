import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../stores/authStore';
import { useWaterStore } from '../../stores/waterStore';
import { ActivityLevel, DietType, Gender, GoalPace } from '../../types';
import { ACTIVITY_LEVELS, DIET_STYLES, GOAL_OPTIONS, calculateNutritionTargets } from '../../utils/nutrition';
import { validateBody, type BodyErrors } from '../../utils/bodyValidation';
import { mealReminderTimes, onboardingSteps, validateGoalWeight, weeksToGoal, type StepId } from '../../features/onboarding/flow';
import { requestNotificationPermission } from '../../services/notificationService';
import { hapticFeedback } from '../../utils/haptics';
import { Sia, type SiaExpression } from '../../components/sia';
import { CalorieEyeRing } from '../../components/CalorieEyeRing';
import { Tap } from '../../components/Tap';
import { Option } from '../../features/me/Sheet';
import { FoodChips, MealTimes, slotsFromTimes, type MealSlot } from '../../features/onboarding/Pickers';
import { palette, radius, space, type } from '../../theme';

const STEP_FACE: Record<StepId, SiaExpression> = {
  name: 'happy',
  body: 'resting',
  activity: 'thinking',
  goal: 'happy',
  goalWeight: 'thinking',
  diet: 'resting',
  foods: 'thinking',
  meals: 'happy',
  plan: 'celebrating',
};
const nf = new Intl.NumberFormat('en-US');

/** One question per screen; ends with the person's daily plan and a nudge to snap the first meal. */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, profile, saveProfile } = useAuthStore(useShallow((s) => ({ user: s.user, profile: s.profile, saveProfile: s.saveProfile })));
  const setDailyGoal = useWaterStore((s) => s.setDailyGoal);

  // A name from Google (or an earlier profile) skips the name question.
  const [knownName] = useState(
    () => profile?.full_name?.trim() || String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim()
  );
  const [name, setName] = useState(knownName);
  const [gender, setGender] = useState<Gender>('female');
  const [ageStr, setAgeStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [bodyErrors, setBodyErrors] = useState<BodyErrors>({});
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goalPace, setGoalPace] = useState<GoalPace>('standard');
  const [goalWeightStr, setGoalWeightStr] = useState('');
  const [diet, setDiet] = useState<DietType>('balanced');
  const [foods, setFoods] = useState<string[]>([]);
  const [meals, setMeals] = useState<MealSlot[]>(() => slotsFromTimes([]));
  const [remind, setRemind] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const goal = GOAL_OPTIONS.find((g) => g.pace === goalPace) || GOAL_OPTIONS[0];
  const steps = useMemo(() => onboardingSteps({ hasName: knownName !== '', goal: goal.goal }), [knownName, goal.goal]);
  const step = steps[Math.min(index, steps.length - 1)];

  const age = parseInt(ageStr, 10) || 0;
  const height = parseFloat(heightStr.replace(',', '.')) || 0;
  const weight = parseFloat(weightStr.replace(',', '.')) || 0;
  const goalWeight = parseFloat(goalWeightStr.replace(',', '.')) || 0;
  const targets = useMemo(
    () => (age && height && weight ? calculateNutritionTargets(gender, age, weight, height, goal.goal, activity, goalPace, diet) : null),
    [gender, age, weight, height, goal, activity, goalPace, diet]
  );
  const weeks = goal.goal !== 'maintenance' && goalWeight ? weeksToGoal(weight, goalWeight, goal.adjustment) : null;
  const chosenTimes = mealReminderTimes(meals.filter((m) => m.on).map((m) => m.time));

  /** Checks the current answer; returns false (with a message) when it can't go on. */
  const answerOk = (): boolean => {
    if (step === 'name' && !name.trim()) {
      setError('Tell Sia what to call you.');
      return false;
    }
    if (step === 'body') {
      const errs = validateBody({ age: ageStr, height: heightStr, weight: weightStr });
      setBodyErrors(errs);
      return Object.keys(errs).length === 0;
    }
    if (step === 'goalWeight') {
      const msg = validateGoalWeight(weight, goalWeightStr, goal.goal);
      setError(msg);
      return msg === null;
    }
    return true;
  };

  const next = async () => {
    if (!answerOk()) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.light();
    setError(null);
    if (step === 'meals' && remind && chosenTimes.length > 0) {
      // Asked here, where the reason is on screen; a "no" doesn't stop onboarding.
      await requestNotificationPermission(chosenTimes);
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const back = () => {
    hapticFeedback.light();
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  };

  const finish = async (destination: '/(tabs)/camera' | '/(tabs)') => {
    if (!targets) return;
    try {
      setSaving(true);
      if (targets.target_water_ml) await setDailyGoal(targets.target_water_ml);
      await saveProfile({
        full_name: name.trim(),
        gender,
        age,
        weight_kg: weight,
        height_cm: height,
        activity_level: activity,
        fitness_goal: goal.goal,
        goal_pace: goalPace,
        diet_type: diet,
        target_calories: targets.target_calories,
        target_protein_g: targets.target_protein_g,
        target_carbs_g: targets.target_carbs_g,
        target_fat_g: targets.target_fat_g,
        target_water_ml: targets.target_water_ml,
        target_weight_kg: goal.goal === 'maintenance' || !goalWeight ? null : goalWeight,
        foods_avoided: foods,
        meal_times: chosenTimes,
      } as any);
      hapticFeedback.success();
      router.replace(destination as any);
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't save your plan", err?.message || 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const firstName = name.trim().split(/\s+/)[0];
  const question: Record<StepId, string> = {
    name: 'What should Sia call you?',
    body: 'A little about you',
    activity: 'How active are you most days?',
    goal: "What's your goal?",
    goalWeight: goal.goal === 'muscle_gain' ? 'What weight are you aiming for?' : 'What weight would you like to reach?',
    diet: 'How do you like to eat?',
    foods: 'Anything you don’t eat?',
    meals: 'When do you usually eat?',
    plan: `Here's your daily plan${firstName ? `, ${firstName}` : ''}`,
  };
  const helper: Partial<Record<StepId, string>> = {
    body: 'Sia uses this to work out your daily targets.',
    foods: 'Sia’s meal ideas will leave these out. Pick any, or skip.',
    meals: 'Sia can remind you to snap your meals at these times.',
  };
  const continueLabel = (step === 'foods' && foods.length === 0) || (step === 'meals' && chosenTimes.length === 0) ? 'Skip' : 'Continue';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Tap
            onPress={back}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.back, index === 0 && styles.hidden]}
          >
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Tap>
          <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${steps.length}`} accessible>
            {steps.map((s, i) => (
              <View key={s} style={[styles.progressBit, i <= index && styles.progressOn]} />
            ))}
          </View>
          <Text style={styles.count}>{`${index + 1} of ${steps.length}`}</Text>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step !== 'plan' && <Sia expression={STEP_FACE[step]} size={72} />}
          <Text style={styles.question} accessibilityRole="header">
            {question[step]}
          </Text>
          {helper[step] ? <Text style={styles.helper}>{helper[step]}</Text> : null}

          {step === 'name' && (
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              placeholder="Your first name"
              placeholderTextColor={palette.textMuted}
              accessibilityLabel="Your name"
              autoCapitalize="words"
              maxLength={40}
              style={[styles.bigInput, error ? styles.inputError : null]}
              onSubmitEditing={next}
              autoFocus
            />
          )}

          {step === 'body' && (
            <View style={styles.gap}>
              <View style={styles.segment} accessibilityRole="radiogroup">
                {(['female', 'male'] as Gender[]).map((g) => (
                  <Tap
                    key={g}
                    onPress={() => setGender(g)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: gender === g }}
                    style={[styles.segmentItem, gender === g && styles.segmentOn]}
                  >
                    <Text style={[styles.segmentText, gender === g && styles.segmentTextOn]}>{g === 'male' ? 'Male' : 'Female'}</Text>
                  </Tap>
                ))}
              </View>
              {(
                [
                  { key: 'age', label: 'Age', unit: 'years', value: ageStr, set: setAgeStr, ph: '26' },
                  { key: 'height', label: 'Height', unit: 'cm', value: heightStr, set: setHeightStr, ph: '165' },
                  { key: 'weight', label: 'Weight', unit: 'kg', value: weightStr, set: setWeightStr, ph: '62' },
                ] as const
              ).map((f) => (
                <View key={f.key}>
                  <Text style={styles.label}>{f.label}</Text>
                  <View style={[styles.field, bodyErrors[f.key] ? styles.inputError : null]}>
                    <TextInput
                      value={f.value}
                      onChangeText={(t) => {
                        f.set(t);
                        if (bodyErrors[f.key]) setBodyErrors((e) => ({ ...e, [f.key]: undefined }));
                      }}
                      placeholder={f.ph}
                      placeholderTextColor={palette.textMuted}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`${f.label} in ${f.unit}`}
                      style={styles.fieldInput}
                    />
                    <Text style={styles.unit}>{f.unit}</Text>
                  </View>
                  {bodyErrors[f.key] ? <Text style={styles.error}>{bodyErrors[f.key]}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {step === 'activity' && (
            <View style={styles.gap}>
              {ACTIVITY_LEVELS.map((a) => (
                <Option key={a.level} title={a.title} detail={a.desc} selected={activity === a.level} onPress={() => setActivity(a.level)} />
              ))}
            </View>
          )}

          {step === 'goal' && (
            <View style={styles.gap}>
              {GOAL_OPTIONS.map((g) => (
                <Option key={g.pace} title={g.title} detail={g.desc} selected={goalPace === g.pace} onPress={() => setGoalPace(g.pace)} />
              ))}
            </View>
          )}

          {step === 'goalWeight' && (
            <View>
              <View style={[styles.field, error ? styles.inputError : null]}>
                <TextInput
                  value={goalWeightStr}
                  onChangeText={(t) => {
                    setGoalWeightStr(t);
                    setError(null);
                  }}
                  placeholder={String(goal.goal === 'muscle_gain' ? Math.round(weight + 3) : Math.round(weight - 5))}
                  placeholderTextColor={palette.textMuted}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Goal weight in kg"
                  style={styles.fieldInput}
                  autoFocus
                />
                <Text style={styles.unit}>kg</Text>
              </View>
              <Text style={styles.helperBelow}>
                {weeks ? `About ${weeks} weeks from ${weight} kg at your pace.` : `You weigh ${weight} kg today.`}
              </Text>
            </View>
          )}

          {step === 'diet' && (
            <View style={styles.gap}>
              {DIET_STYLES.map((d) => (
                <Option key={d.type} title={d.title} detail={d.desc} selected={diet === d.type} onPress={() => setDiet(d.type)} />
              ))}
            </View>
          )}

          {step === 'foods' && (
            <View style={styles.gap}>
              <FoodChips value={foods} onChange={setFoods} />
            </View>
          )}

          {step === 'meals' && (
            <View style={styles.gap}>
              <MealTimes value={meals} onChange={setMeals} />
              <View style={styles.remindRow}>
                <Text style={styles.remindText}>Remind me at these times</Text>
                <Switch
                  value={remind}
                  onValueChange={setRemind}
                  accessibilityLabel="Remind me at these times"
                  trackColor={{ false: palette.line, true: palette.leafOnLight }}
                  thumbColor={palette.surface}
                />
              </View>
            </View>
          )}

          {step === 'plan' && targets && (
            <View style={styles.planZone}>
              <View style={styles.plan}>
                <View style={styles.planRow}>
                  <CalorieEyeRing
                    size={124}
                    eaten={targets.target_calories}
                    target={targets.target_calories}
                    fraction={1}
                    over={false}
                    centerLabel={nf.format(targets.target_calories)}
                    centerCaption="kcal a day"
                  />
                  <View style={styles.planMacros}>
                    {[
                      [`${targets.target_protein_g} g`, 'protein'],
                      [`${targets.target_carbs_g} g`, 'carbs'],
                      [`${targets.target_fat_g} g`, 'fat'],
                      [`${((targets.target_water_ml || 2500) / 1000).toFixed(1)} L`, 'water'],
                    ].map(([v, l]) => (
                      <Text key={l} style={styles.planMacro}>
                        <Text style={styles.planValue}>{v}</Text> {l}
                      </Text>
                    ))}
                  </View>
                </View>
                <Text style={styles.planNote}>
                  {weeks
                    ? `About ${weeks} weeks to ${goalWeight} kg.`
                    : goal.goal === 'maintenance'
                      ? 'Enough to keep your weight steady.'
                      : 'You can set a goal weight later in Me.'}
                </Text>
              </View>
              <View style={styles.planSia}>
                <Sia expression="celebrating" size={84} />
              </View>
            </View>
          )}

          {error && step !== 'body' ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step === 'plan' ? (
            <>
              <Tap
                onPress={() => finish('/(tabs)/camera')}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ busy: saving }}
                style={({ pressed }) => [styles.primary, styles.snap, pressed && styles.pressed]}
              >
                {saving ? <ActivityIndicator color={palette.shutterGlyph} /> : <Text style={styles.snapText}>Snap my first meal</Text>}
              </Tap>
              <Tap onPress={() => finish('/(tabs)')} disabled={saving} accessibilityRole="button" style={styles.later}>
                <Text style={styles.laterText}>Go to Today</Text>
              </Tap>
            </>
          ) : (
            <Tap onPress={next} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>{continueLabel}</Text>
            </Tap>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  hidden: { opacity: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingTop: space[2] },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  progressBit: { flex: 1, height: 6, borderRadius: radius.full, backgroundColor: palette.line },
  progressOn: { backgroundColor: palette.leafOnLight },
  count: { fontFamily: type.bodyBold, fontSize: type.size.caption, color: palette.textMuted, minWidth: 44, textAlign: 'right' },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: space[6], paddingTop: space[4], paddingBottom: space[8] },
  question: { fontFamily: type.display, fontSize: type.size.title + 4, lineHeight: 32, color: palette.text, marginTop: space[3] },
  helper: { fontFamily: type.body, fontSize: type.size.body, lineHeight: 21, color: palette.textMuted, marginTop: space[1] },
  helperBelow: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.leafText, marginTop: space[2] },
  gap: { gap: space[2], marginTop: space[4] },
  bigInput: {
    minHeight: 56,
    marginTop: space[4],
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    fontFamily: type.displayBold,
    fontSize: type.size.section,
    color: palette.text,
  },
  inputError: { borderColor: palette.over },
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: palette.line },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  segmentOn: { backgroundColor: palette.point },
  segmentText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  segmentTextOn: { color: palette.pointText },
  label: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginBottom: space[1] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginTop: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  fieldInput: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.section, color: palette.text },
  unit: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[2] },
  remindRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginTop: space[2] },
  remindText: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.text },
  planZone: { marginTop: 76 },
  plan: { padding: space[4], borderRadius: radius.hero, backgroundColor: palette.point },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  planMacros: { flex: 1, gap: space[1] + 2 },
  planMacro: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.pointMuted },
  planValue: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.pointText },
  planNote: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.pointMuted, marginTop: space[3] },
  planSia: { position: 'absolute', top: -70, alignSelf: 'center', height: 72, overflow: 'hidden' },
  footer: { paddingHorizontal: space[6], paddingTop: space[2], paddingBottom: space[4], width: '100%', maxWidth: 520, alignSelf: 'center' },
  primary: { minHeight: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  primaryText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  snap: { backgroundColor: palette.shutter },
  snapText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.shutterGlyph },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.textMuted },
});
