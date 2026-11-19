import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../stores/authStore';
import { useWeightStore } from '../../stores/weightStore';
import { useWaterStore } from '../../stores/waterStore';
import { useSiaStore } from '../../features/sia/siaStore';
import { Gender, ActivityLevel, GoalPace, DietType } from '../../types';
import { ACTIVITY_LEVELS, DIET_STYLES, GOAL_OPTIONS, calculateNutritionTargets } from '../../utils/nutrition';
import { validateBody, initialsFor, type BodyErrors } from '../../utils/bodyValidation';
import { WeightTrackerSheet } from '../../components/WeightTrackerSheet';
import { Tap } from '../../components/Tap';
import { Sheet, Option } from '../../features/me/Sheet';
import { hapticFeedback } from '../../utils/haptics';
import { openPrivacyPolicy } from '../../lib/legal';
import { getNotificationStatus, setNotificationsEnabled } from '../../services/notificationService';
import { palette, radius, space, type } from '../../theme';

type SheetName = 'name' | 'goal' | 'activity' | 'diet' | 'body' | null;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const nf = new Intl.NumberFormat('en-US');
const APP_VERSION = Constants.expoConfig?.version ?? '';

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  busy,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityState={{ busy: !!busy }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={danger ? palette.over : palette.textMuted} />
      <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={palette.textMuted} /> : !danger && <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />}
    </Tap>
  );
}

function SwitchRow({ icon, label, value, onChange }: { icon: IoniconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={palette.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: palette.line, true: palette.leafOnLight }}
        thumbColor={palette.surface}
      />
    </View>
  );
}

/** Me: who you are, your daily targets and plan, Sia and reminder settings, privacy and account. */
export default function ProfileScreen() {
  const { user, profile, saveProfile, signOut, deleteAccount } = useAuthStore(
    useShallow((s) => ({ user: s.user, profile: s.profile, saveProfile: s.saveProfile, signOut: s.signOut, deleteAccount: s.deleteAccount }))
  );
  const { entries, loadWeightHistory } = useWeightStore(useShallow((s) => ({ entries: s.entries, loadWeightHistory: s.loadWeightHistory })));
  const setDailyGoal = useWaterStore((s) => s.setDailyGoal);
  const { siaHidden, setSiaHidden } = useSiaStore(useShallow((s) => ({ siaHidden: s.hidden, setSiaHidden: s.setHidden })));

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [gender, setGender] = useState<Gender>(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activity_level || 'moderate');
  const [goalPace, setGoalPace] = useState<GoalPace>(profile?.goal_pace || 'standard');
  const [dietType, setDietType] = useState<DietType>(profile?.diet_type || 'balanced');
  const [ageStr, setAgeStr] = useState(String(profile?.age || ''));
  const [heightStr, setHeightStr] = useState(String(profile?.height_cm || ''));
  const [weightStr, setWeightStr] = useState(String(profile?.weight_kg || ''));
  const [bodyErrors, setBodyErrors] = useState<BodyErrors>({});

  const [sheet, setSheet] = useState<SheetName>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reminders, setReminders] = useState(false);

  useEffect(() => {
    loadWeightHistory();
    getNotificationStatus().then((s) => setReminders(s.isEnabled));
  }, []);

  // Re-sync the editable copies whenever the saved profile changes.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setGender(profile.gender || 'male');
    setActivityLevel(profile.activity_level || 'moderate');
    setGoalPace(profile.goal_pace || 'standard');
    setDietType(profile.diet_type || 'balanced');
    setAgeStr(String(profile.age || ''));
    setHeightStr(String(profile.height_cm || ''));
    setWeightStr(String(profile.weight_kg || ''));
  }, [profile]);

  const age = parseInt(ageStr, 10) || 0;
  const height = parseFloat(heightStr.replace(',', '.')) || 0;
  const weight = parseFloat(weightStr.replace(',', '.')) || 0;
  const goalObj = GOAL_OPTIONS.find((g) => g.pace === goalPace) || GOAL_OPTIONS[0];
  const activityObj = ACTIVITY_LEVELS.find((a) => a.level === activityLevel) || ACTIVITY_LEVELS[1];
  const dietObj = DIET_STYLES.find((d) => d.type === dietType) || DIET_STYLES[1];

  const targets = useMemo(
    () =>
      age > 0 && weight > 0 && height > 0
        ? calculateNutritionTargets(gender, age, weight, height, goalObj.goal, activityLevel, goalPace, dietType)
        : null,
    [gender, age, weight, height, goalObj, activityLevel, goalPace, dietType]
  );

  const shown = {
    calories: Number(profile?.target_calories) || targets?.target_calories || 0,
    protein: Number(profile?.target_protein_g) || targets?.target_protein_g || 0,
    carbs: Number(profile?.target_carbs_g) || targets?.target_carbs_g || 0,
    fat: Number(profile?.target_fat_g) || targets?.target_fat_g || 0,
    water: Number(profile?.target_water_ml) || targets?.target_water_ml || 0,
  };

  /** Saves the edits and the targets they imply; water goal stays in step with the profile. */
  const persist = async (override: Record<string, unknown> = {}) => {
    if (!targets) {
      setSheet('body');
      return;
    }
    try {
      setIsSaving(true);
      await saveProfile({
        full_name: fullName.trim(),
        gender,
        age,
        weight_kg: weight,
        height_cm: height,
        activity_level: activityLevel,
        fitness_goal: goalObj.goal,
        goal_pace: goalPace,
        diet_type: dietType,
        target_calories: targets.target_calories,
        target_protein_g: targets.target_protein_g,
        target_carbs_g: targets.target_carbs_g,
        target_fat_g: targets.target_fat_g,
        ...(targets.target_water_ml ? { target_water_ml: targets.target_water_ml } : {}),
        ...override,
      } as any);
      if (targets.target_water_ml) await setDailyGoal(targets.target_water_ml);
      hapticFeedback.success();
      setSheet(null);
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert("Couldn't save your changes", err?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveBody = () => {
    const errors = validateBody({ age: ageStr, height: heightStr, weight: weightStr });
    setBodyErrors(errors);
    if (Object.keys(errors).length === 0) persist();
  };

  const toggleReminders = async (next: boolean) => {
    hapticFeedback.selection();
    const status = await getNotificationStatus();
    if (status.isExpoGo) {
      Alert.alert('Not available in Expo Go', 'Reminders work in the installed app. They can’t be tested in Expo Go.');
      return;
    }
    if (await setNotificationsEnabled(next)) setReminders(next);
    else if (next) Alert.alert('Allow notifications', 'Turn on notifications for SiaMeal Snap in your phone’s Settings to get reminders.');
  };

  const confirmSignOut = () => {
    hapticFeedback.medium();
    Alert.alert('Sign out?', 'Your meals stay saved to your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const confirmDelete = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, every meal you have logged, your meal photos, and your coach chats. Water and weight history on this phone is erased too. This cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              hapticFeedback.success();
            } catch (err: unknown) {
              hapticFeedback.error();
              setIsDeleting(false);
              Alert.alert('Account not deleted', err instanceof Error ? err.message : 'Please try again in a moment.');
            }
          },
        },
      ]
    );
  };

  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight_kg : weight;
  const name = fullName.trim() || user?.email?.split('@')[0] || '';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Me
        </Text>

        <Tap
          onPress={() => setSheet('name')}
          accessibilityRole="button"
          accessibilityLabel={`${name}, edit your name`}
          style={({ pressed }) => [styles.person, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initialsFor(fullName, user?.email)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {user?.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
          <Ionicons name="pencil" size={18} color={palette.textMuted} />
        </Tap>

        <Text style={styles.section} accessibilityRole="header">
          Daily targets
        </Text>
        <View style={styles.targets}>
          <Text style={styles.kcal}>{nf.format(shown.calories)}</Text>
          <Text style={styles.kcalCaption}>kcal a day</Text>
          <View style={styles.targetRow}>
            {[
              { label: 'Protein', value: `${shown.protein} g` },
              { label: 'Carbs', value: `${shown.carbs} g` },
              { label: 'Fat', value: `${shown.fat} g` },
              { label: 'Water', value: `${(shown.water / 1000).toFixed(1)} L` },
            ].map((t) => (
              <View key={t.label} style={styles.target}>
                <Text style={styles.targetValue}>{t.value}</Text>
                <Text style={styles.targetLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footnote}>Worked out from your body, activity and goal (Mifflin–St Jeor).</Text>
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Your plan
        </Text>
        <View style={styles.group}>
          <Row icon="flag-outline" label="Goal" value={goalObj.title.replace(/\s*\(.*\)$/, '')} onPress={() => setSheet('goal')} />
          <Row icon="walk-outline" label="Activity" value={activityObj.title} onPress={() => setSheet('activity')} />
          <Row icon="nutrition-outline" label="Eating style" value={dietObj.title.split(' / ')[0]} onPress={() => setSheet('diet')} />
          <Row icon="body-outline" label="Body" value={age && height ? `${age} · ${height} cm` : 'Add'} onPress={() => setSheet('body')} />
          <Row icon="scale-outline" label="Weight" value={latestWeight ? `${latestWeight} kg` : 'Add'} onPress={() => setWeightOpen(true)} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Settings
        </Text>
        <View style={styles.group}>
          <SwitchRow icon="paw-outline" label="Show Sia" value={!siaHidden} onChange={(v) => setSiaHidden(!v)} />
          <SwitchRow icon="notifications-outline" label="Reminders" value={reminders} onChange={toggleReminders} />
          <Row icon="shield-checkmark-outline" label="Privacy policy" onPress={openPrivacyPolicy} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Account
        </Text>
        <View style={styles.group}>
          <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} />
          <Row icon="trash-outline" label="Delete account" onPress={confirmDelete} danger busy={isDeleting} />
        </View>

        {APP_VERSION ? <Text style={styles.version}>SiaMeal Snap {APP_VERSION}</Text> : null}
      </ScrollView>

      <Sheet visible={sheet === 'name'} title="Your name" onClose={() => setSheet(null)} actionLabel="Save" onAction={() => persist({ full_name: fullName.trim() })} busy={isSaving}>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor={palette.textMuted}
          accessibilityLabel="Your name"
          style={styles.input}
          autoFocus
        />
      </Sheet>

      <Sheet visible={sheet === 'goal'} title="Goal" onClose={() => setSheet(null)} actionLabel="Save" onAction={() => persist()} busy={isSaving}>
        {GOAL_OPTIONS.map((g) => (
          <Option key={g.pace} title={g.title} detail={g.desc} selected={g.pace === goalPace} onPress={() => setGoalPace(g.pace)} />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'activity'} title="Activity" onClose={() => setSheet(null)} actionLabel="Save" onAction={() => persist()} busy={isSaving}>
        {ACTIVITY_LEVELS.map((a) => (
          <Option key={a.level} title={a.title} detail={a.desc} selected={a.level === activityLevel} onPress={() => setActivityLevel(a.level)} />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'diet'} title="Eating style" onClose={() => setSheet(null)} actionLabel="Save" onAction={() => persist()} busy={isSaving}>
        {DIET_STYLES.map((d) => (
          <Option key={d.type} title={d.title} detail={d.desc} selected={d.type === dietType} onPress={() => setDietType(d.type)} />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'body'} title="Body" onClose={() => setSheet(null)} actionLabel="Save" onAction={saveBody} busy={isSaving}>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(['male', 'female'] as Gender[]).map((g) => (
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
            { key: 'age', label: 'Age', unit: 'years', value: ageStr, set: setAgeStr },
            { key: 'height', label: 'Height', unit: 'cm', value: heightStr, set: setHeightStr },
            { key: 'weight', label: 'Weight', unit: 'kg', value: weightStr, set: setWeightStr },
          ] as const
        ).map((f) => (
          <View key={f.key}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={[styles.field, bodyErrors[f.key] && styles.fieldError]}>
              <TextInput
                value={f.value}
                onChangeText={(t) => {
                  f.set(t);
                  if (bodyErrors[f.key]) setBodyErrors((e) => ({ ...e, [f.key]: undefined }));
                }}
                keyboardType="decimal-pad"
                accessibilityLabel={`${f.label} in ${f.unit}`}
                style={styles.fieldInput}
              />
              <Text style={styles.fieldUnit}>{f.unit}</Text>
            </View>
            {bodyErrors[f.key] ? <Text style={styles.error}>{bodyErrors[f.key]}</Text> : null}
          </View>
        ))}
      </Sheet>

      <WeightTrackerSheet
        visible={weightOpen}
        onClose={() => setWeightOpen(false)}
        currentProfileWeight={weight}
        onWeightLogged={async (kg) => {
          setWeightStr(String(kg));
          if (!targets) return;
          const next = calculateNutritionTargets(gender, age, kg, height, goalObj.goal, activityLevel, goalPace, dietType);
          await saveProfile({
            weight_kg: kg,
            target_calories: next.target_calories,
            target_protein_g: next.target_protein_g,
            target_carbs_g: next.target_carbs_g,
            target_fat_g: next.target_fat_g,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: 120 },
  pressed: { opacity: 0.7 },
  title: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text, marginBottom: space[4] },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  initials: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.pointText },
  name: { fontFamily: type.displayBold, fontSize: type.size.section, color: palette.text },
  email: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted, marginTop: 2 },
  section: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.textMuted, marginTop: space[6], marginBottom: space[2] },
  targets: { padding: space[4], borderRadius: radius.hero, backgroundColor: palette.point },
  kcal: { fontFamily: type.display, fontSize: type.size.hero, lineHeight: 46, color: palette.pointText, fontVariant: ['tabular-nums'] },
  kcalCaption: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.pointMuted },
  targetRow: { flexDirection: 'row', gap: space[2], marginTop: space[4] },
  target: { flex: 1 },
  targetValue: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.pointText, fontVariant: ['tabular-nums'] },
  targetLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.pointMuted, marginTop: 2 },
  footnote: { fontFamily: type.body, fontSize: type.size.caption, color: palette.pointMuted, marginTop: space[4] },
  group: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  rowLabel: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  rowValue: { maxWidth: '50%', fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  danger: { color: palette.over },
  version: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, textAlign: 'center', marginTop: space[6] },
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
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: palette.line, marginBottom: space[2] },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  segmentOn: { backgroundColor: palette.point },
  segmentText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  segmentTextOn: { color: palette.pointText },
  fieldLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginBottom: space[1] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  fieldError: { borderColor: palette.over },
  fieldInput: { flex: 1, fontFamily: type.displayBold, fontSize: type.size.body, color: palette.text },
  fieldUnit: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[1] },
});
