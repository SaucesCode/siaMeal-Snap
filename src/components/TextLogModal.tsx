import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeMealText } from '../services/aiService';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import { MealType } from '../types';

interface TextLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMealType?: MealType;
}

const QUICK_SUGGESTIONS = [
  { label: 'Eggs & sourdough toast', text: '2 scrambled eggs with butter and 2 slices of sourdough toast' },
  { label: 'Chicken & rice bowl', text: '200g grilled chicken breast with 1 cup white rice and steamed broccoli' },
  { label: 'Whey protein shake', text: '1 scoop whey protein with 300ml almond milk and a banana' },
  { label: 'Salmon & avocado salad', text: 'Grilled salmon fillet with mixed greens, avocado, and olive oil' },
];

export function TextLogModal({
  visible,
  onClose,
  onSuccess,
  initialMealType = 'snack',
}: TextLogModalProps) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const textInputRef = useRef<TextInput | null>(null);

  const setDraftMeal = useMealStore((state) => state.setDraftMeal);

  useEffect(() => {
    if (visible) {
      setTimeout(() => textInputRef.current?.focus(), 250);
    }
  }, [visible]);

  const handleAnalyze = async (overrideText?: string) => {
    if (isAnalyzing) return;

    const description = (overrideText || text).trim();
    if (!description) {
      hapticFeedback.error();
      Alert.alert(
        'Empty Description',
        'Please type what you ate (e.g., "Two scrambled eggs, sourdough toast, and black coffee").'
      );
      return;
    }

    try {
      hapticFeedback.medium();
      setIsAnalyzing(true);
      const result = await analyzeMealText(description);

      setDraftMeal({
        name: result.meal_name || description,
        meal_type: initialMealType,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        food_items: result.ingredients,
        image_url: null,
        confidence_score: result.confidence_score,
        portion_notes: result.portion_notes,
        dietary_tags: result.dietary_tags,
        feline_verdict: result.feline_verdict,
      });

      hapticFeedback.success();
      setText('');
      onSuccess();
    } catch (error: any) {
      hapticFeedback.error();
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', error.message || 'Unable to estimate nutrients. Please try again or log manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 justify-end bg-black/80">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="w-full justify-end"
      >
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 items-center justify-center">
                <Ionicons name="sparkles-outline" size={16} color="#c084fc" />
              </View>
              <View>
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-lg"
                >
                  Log Meal by Text
                </Text>
                <Text className="text-zinc-500 text-xs font-semibold">
                  Natural language nutrition engine
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              disabled={isAnalyzing}
              className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <Text className="text-zinc-400 text-xs mb-3.5 leading-4">
            Describe what you ate in natural language. The AI Vision & Text engine calculates portions and macros automatically.
          </Text>

          {/* Text Input Area */}
          <TextInput
            ref={textInputRef}
            value={text}
            onChangeText={setText}
            placeholder="e.g. 200g grilled salmon with steamed broccoli and 1 cup of brown rice"
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-zinc-950 border border-zinc-800 text-white rounded-2xl p-4 text-base min-h-[110px] mb-3.5 font-medium"
            editable={!isAnalyzing}
          />

          {/* 1-Tap Quick Suggestions */}
          <View className="mb-4">
            <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">
              Quick Suggestions (Tap to Fill)
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    hapticFeedback.selection();
                    setText(item.text);
                  }}
                  className="bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl"
                >
                  <Text className="text-zinc-300 text-[11px] font-medium">
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={() => handleAnalyze()}
            disabled={isAnalyzing || !text.trim()}
            activeOpacity={0.8}
            className={`w-full rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              text.trim()
                ? 'bg-emerald-500 active:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                : 'bg-zinc-800 border border-zinc-700 opacity-60'
            }`}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#ffffff" />
                <Text numberOfLines={1} className="text-white font-bold text-base">
                  Analyze & Calculate Macros
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
