import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { analyzeMealText, NotFoodError } from '../services/aiService';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import { MealType } from '../types';
import { Sia } from './sia';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface TextLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMealType?: MealType;
}

const EXAMPLES = [
  { label: 'Chicken adobo & rice', text: 'Chicken adobo, 2 pieces, with 1 cup of white rice' },
  { label: 'Pandesal & eggs', text: '2 pandesal, 2 fried eggs and a cup of coffee with milk' },
  { label: 'Sinigang & rice', text: 'A bowl of sinigang na baboy with 1 cup of rice' },
  { label: 'Banana & milk', text: '1 banana and a glass of milk' },
];

/** Type what you ate; Sia works out calories and macros, then Review opens. */
export function TextLogModal({ visible, onClose, onSuccess, initialMealType = 'snack' }: TextLogModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const inputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const setDraftMeal = useMealStore((s) => s.setDraftMeal);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 250);
  }, [visible]);

  const analyze = async () => {
    if (isAnalyzing) return;
    const description = text.trim();
    if (!description) {
      hapticFeedback.error();
      setError('Type what you ate first, like "chicken adobo with rice".');
      return;
    }
    try {
      hapticFeedback.medium();
      setIsAnalyzing(true);
      setError(null);
      const result = await analyzeMealText(description);
      setDraftMeal({
        name: result.meal_name || description,
        meal_type: initialMealType,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        food_items: result.ingredients,
        items: result.items,
        image_url: null,
        confidence_score: result.confidence_score,
        portion_notes: result.portion_notes,
        dietary_tags: result.dietary_tags,
        feline_verdict: result.feline_verdict,
      });
      hapticFeedback.success();
      setText('');
      onSuccess();
    } catch (err: any) {
      hapticFeedback.error();
      setError(
        err instanceof NotFoodError
          ? `${err.message} Try describing a meal or drink.`
          : `Couldn't read that meal. ${err?.message || 'Please try again.'}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Tap style={styles.backdrop} onPress={() => !isAnalyzing && onClose()} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Type what you ate
            </Text>
            <Tap
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              disabled={isAnalyzing}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={22} color={palette.text} />
            </Tap>
          </View>

          {isAnalyzing ? (
            <View style={styles.busy} accessibilityLiveRegion="polite">
              <Sia expression="thinking" size={96} />
              <Text style={styles.busyTitle}>Reading your meal…</Text>
              <Text style={styles.busySub}>Usually takes a few seconds.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.helper}>Include amounts if you know them. Sia works out the calories and macros.</Text>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(t) => {
                  setText(t);
                  if (error) setError(null);
                }}
                placeholder="e.g. 2 pieces chicken adobo with 1 cup of rice"
                placeholderTextColor={palette.textMuted}
                multiline
                maxLength={300}
                textAlignVertical="top"
                accessibilityLabel="What you ate"
                style={[styles.input, error ? styles.inputError : null]}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Text style={styles.examplesLabel}>Examples</Text>
              <View style={styles.examples}>
                {EXAMPLES.map((e) => (
                  <Tap
                    key={e.label}
                    onPress={() => {
                      hapticFeedback.selection();
                      setText(e.text);
                      setError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityHint="Fills in this example"
                    style={({ pressed }) => [styles.example, pressed && styles.pressed]}
                  >
                    <Text style={styles.exampleText}>{e.label}</Text>
                  </Tap>
                ))}
              </View>

              <Tap
                onPress={analyze}
                accessibilityRole="button"
                style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
              >
                <Text style={styles.submitText}>Count it</Text>
              </Tap>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[8],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space[1] },
  title: { flex: 1, fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  helper: { fontFamily: type.body, fontSize: type.size.secondary, lineHeight: 19, color: palette.textMuted, marginBottom: space[3] },
  input: {
    minHeight: 110,
    padding: space[4],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    fontFamily: type.bodySemibold,
    fontSize: type.size.body,
    lineHeight: 21,
    color: palette.text,
  },
  inputError: { borderColor: palette.over },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, lineHeight: 17, color: palette.over, marginTop: space[2] },
  examplesLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginTop: space[4], marginBottom: space[2] },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  example: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  exampleText: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.text },
  submit: { minHeight: 54, marginTop: space[6], borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  submitText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  busy: { alignItems: 'center', paddingVertical: space[6] },
  busyTitle: { fontFamily: type.display, fontSize: type.size.section, color: palette.text, marginTop: space[3] },
  busySub: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted, marginTop: space[1] },
});
