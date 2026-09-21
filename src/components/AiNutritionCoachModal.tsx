import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  sendNutritionCoachMessage,
  cleanCoachReply,
  ChatMessage,
  UserNutritionContext,
} from '../services/aiService';
import { hapticFeedback } from '../utils/haptics';
import { useCoachStore } from '../stores/coachStore';
import { useMealStore } from '../stores/mealStore';
import { getDefaultMealType } from '../utils/nutrition';
import { parseMealSuggestions, ParsedSuggestedMeal } from '../utils/mealSuggestionParser';


interface AiNutritionCoachModalProps {
  visible: boolean;
  onClose: () => void;
  userContext: UserNutritionContext;
}

interface FormattedChatMessageProps {
  content: string;
  isUser: boolean;
  onLogMeal?: (meal: ParsedSuggestedMeal) => void;
}

/**
 * Parses markdown bold (**text**) and renders clean styled Text components
 * without showing raw markdown asterisks (**) or stray metadata headers,
 * and renders interactive 1-tap quick log cards for meal recommendations.
 */
function FormattedChatMessage({ content, isUser, onLogMeal }: FormattedChatMessageProps) {
  // Aggressively clean any metadata, telemetry dumps, thoughts, or prefixes
  const cleanedContent = isUser ? content : cleanCoachReply(content);
  const suggestedMeals = useMemo(() => {
    return isUser || !onLogMeal ? [] : parseMealSuggestions(cleanedContent);
  }, [cleanedContent, isUser, onLogMeal]);

  const lines = cleanedContent.split('\n');

  return (
    <View>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const isHeader = trimmed.startsWith('###');

        // Split line by **bold** tokens
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <Text
            key={lineIndex}
            className={`text-xs leading-5 ${
              lineIndex > 0 ? 'mt-1' : ''
            } ${
              isUser
                ? 'text-white font-medium'
                : isHeader
                ? 'text-zinc-100 font-semibold'
                : isBullet
                ? 'text-zinc-200 pl-1'
                : 'text-zinc-300'
            }`}
          >
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const boldText = part.slice(2, -2);
                return (
                  <Text
                    key={partIndex}
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className={isUser ? 'text-white font-extrabold' : 'text-emerald-400 font-extrabold'}
                  >
                    {boldText}
                  </Text>
                );
              }
              // Clean any stray markdown asterisks
              const cleanPart = part.replace(/\*\*/g, '');
              return <Text key={partIndex}>{cleanPart}</Text>;
            })}
          </Text>
        );
      })}

      {suggestedMeals.length > 0 && onLogMeal && (
        <View className="mt-3 pt-2.5 border-t border-zinc-800/80 gap-2">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <Ionicons name="sparkles" size={11} color="#10b981" />
            <Text className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Quick Log Suggestions
            </Text>
          </View>
          {suggestedMeals.map((meal, mIdx) => (
            <View
              key={mIdx}
              className="bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-2.5 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-2.5">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                  numberOfLines={1}
                >
                  {meal.name}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                  <View className="bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    <Text className="text-emerald-400 text-[10px] font-extrabold">
                      {meal.calories} kcal
                    </Text>
                  </View>
                  <View className="bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                    <Text className="text-sky-400 text-[10px] font-bold">
                      {meal.protein_g}g P
                    </Text>
                  </View>
                  {meal.carbs_g > 0 && (
                    <View className="bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                      <Text className="text-amber-400 text-[10px] font-medium">
                        {meal.carbs_g}g C
                      </Text>
                    </View>
                  )}
                  {meal.fat_g > 0 && (
                    <View className="bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                      <Text className="text-rose-400 text-[10px] font-medium">
                        {meal.fat_g}g F
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onLogMeal(meal)}
                className="bg-emerald-500 active:bg-emerald-400 px-3 py-1.5 rounded-lg flex-row items-center gap-1 shadow-sm"
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color="#ffffff" />
                <Text className="text-white text-[11px] font-bold">Log</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function AiNutritionCoachModal({
  visible,
  onClose,
  userContext,
}: AiNutritionCoachModalProps) {
  const router = useRouter();
  const { setDraftMeal } = useMealStore();
  const { messages, isLoaded, loadHistory, addMessage, setMessages, clearHistory } = useCoachStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const lastSendTimeRef = useRef<number>(0);

  // Dynamic context-aware prompts based on live remaining calories and protein
  const dynamicPrompts = useMemo(() => {
    const remCal = userContext.remainingCalories ?? 2000;
    const remProt = userContext.remainingProtein ?? 150;
    const list: string[] = [];

    if (remProt > 35) {
      list.push(`High-protein ideas for my remaining ${remProt}g`);
    } else {
      list.push('How to hit my exact protein target today');
    }

    if (remCal < 400 && remCal > 0) {
      list.push(`Low-calorie snacks under ${remCal} kcal`);
    } else if (remCal <= 0) {
      list.push('How to balance macros after exceeding calories');
    } else {
      list.push(`Best meal fitting ~${Math.min(650, remCal)} kcal`);
    }

    list.push('How is my macro split looking today?');
    list.push('Quick pre-workout energy snack');
    list.push('High-volume vegetables & sides');

    return list;
  }, [userContext.remainingCalories, userContext.remainingProtein]);

  const handleLogSuggestedMeal = useCallback(
    (meal: ParsedSuggestedMeal) => {
      hapticFeedback.medium();
      Keyboard.dismiss();
      onClose();

      setDraftMeal({
        name: meal.name,
        meal_type: getDefaultMealType(),
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        food_items: meal.food_items,
        image_url: null,
      });

      // Allow modal exit animation before presenting review modal
      setTimeout(() => {
        router.push('/review' as any);
      }, 120);
    },
    [onClose, router, setDraftMeal]
  );

  // Load persisted history once on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Inject friendly conversational feline greeting when history is empty
  useEffect(() => {
    if (visible && isLoaded && messages.length === 0) {
      const remainingCal = userContext.remainingCalories ?? 2000;
      const remainingProt = userContext.remainingProtein ?? 150;
      const greeting: ChatMessage = {
        id: `greeting_${new Date().toISOString().split('T')[0]}`,
        role: 'assistant',
        content: `Hey ${userContext.displayName || 'Athlete'}, I'm **Sia**! I've got your live numbers queued up: you have ${remainingCal} kcal and ${remainingProt}g protein left to hit today.\n\nWhat are you craving, or should we pounce on a quick meal idea together?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([greeting]);
    }
  }, [visible, isLoaded]);

  const handleClearHistory = useCallback(() => {
    hapticFeedback.light();
    Alert.alert(
      'Clear Chat',
      'Start a fresh conversation with Sia? Today\'s history will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            hapticFeedback.error();
            clearHistory();
          },
        },
      ]
    );
  }, [clearHistory]);

  // Robust native keyboard listener for both iOS and Android
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 0;
      if (height > 0) {
        setKeyboardHeight(height);
      }
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto scroll on new messages
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  if (!visible) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isTyping) return;

    // Client anti-spam debounce: minimum 2 seconds between sends
    const now = Date.now();
    if (now - lastSendTimeRef.current < 2000) {
      return;
    }
    lastSendTimeRef.current = now;

    hapticFeedback.light();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    await addMessage(userMsg);
    setInputText('');
    setIsTyping(true);

    try {
      // Sliding window: send only the 4 most recent messages to conserve tokens
      const conversationPayload = [...messages, userMsg].slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendNutritionCoachMessage(conversationPayload, userContext);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      hapticFeedback.success();
      await addMessage(assistantMsg);
    } catch (err: any) {
      hapticFeedback.error();
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to connect with AI coach. Please try again.'}`,
        timestamp: new Date().toISOString(),
      };
      await addMessage(errorMsg);
    } finally {
      setIsTyping(false);
    }
  };


  const remainingCal = userContext.remainingCalories ?? 2000;
  const remainingProt = userContext.remainingProtein ?? 150;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
      }}
    >
      {/* 1. Absolute Backdrop Overlay - tap to dismiss keyboard & modal */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Main High-Impact Bottom Sheet (86% Height, padded flush above keyboard) */}
      <View
        style={{
          height: '86%',
          backgroundColor: '#18181b',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: '#27272a',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom:
            keyboardHeight > 0
              ? (Platform.OS === 'ios' ? keyboardHeight + 2 : Math.max(8, keyboardHeight - 28))
              : (Platform.OS === 'ios' ? 30 : 16),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 24,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pb-3 border-b border-zinc-800/80">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-zinc-950 border border-emerald-500/40 items-center justify-center overflow-hidden">
              <Image
                source={require('../../assets/images/logo.jpg')}
                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                resizeMode="cover"
              />
            </View>
            <View>
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-base"
              >
                Sia Nutrition Intelligence
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  Sia is Active & Listening
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleClearHistory}
              className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={14} color="#71717a" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                hapticFeedback.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Telemetry Context Ribbon */}
        <View className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl px-3.5 py-2 my-2.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Text className="text-zinc-400 text-[11px] font-bold">
              Remaining: <Text className="text-white font-extrabold">{remainingCal} kcal</Text>
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <Text className="text-zinc-400 text-[11px] font-bold">
              Protein: <Text className="text-sky-400 font-extrabold">{remainingProt}g</Text>
            </Text>
          </View>
        </View>

        {/* Chat Messages List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 py-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {messages.map((msg: ChatMessage) => (
            <View
              key={msg.id}
              className={`mb-3 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <View className="w-7 h-7 rounded-xl bg-zinc-950 border border-emerald-500/30 items-center justify-center mr-2 mt-1 overflow-hidden">
                  <Image
                    source={require('../../assets/images/logo.jpg')}
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View
                className={`max-w-[84%] rounded-2xl p-3.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 rounded-tr-sm shadow-md shadow-emerald-600/20'
                    : 'bg-zinc-950 border border-zinc-800/90 rounded-tl-sm shadow-sm'
                }`}
              >
                <FormattedChatMessage
                  content={msg.content}
                  isUser={msg.role === 'user'}
                  onLogMeal={msg.id.startsWith('greeting_') ? undefined : handleLogSuggestedMeal}
                />
              </View>
            </View>
          ))}

          {isTyping && (
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-7 h-7 rounded-xl bg-zinc-950 border border-emerald-500/30 items-center justify-center overflow-hidden">
                <Image
                  source={require('../../assets/images/logo.jpg')}
                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  resizeMode="cover"
                />
              </View>
              <View className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex-row items-center gap-1.5">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-zinc-500 text-xs font-semibold">Coach is crafting your nutrition advice...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View className="mb-2.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-row"
          >
            {dynamicPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSendMessage(prompt)}
                disabled={isTyping}
                className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl mr-2"
              >
                <Text className="text-zinc-300 text-[11px] font-medium">{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar (Directly Above Keyboard) */}
        <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 pr-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about meals, macros, or food choices..."
            placeholderTextColor="#52525b"
            multiline
            maxLength={200}
            className="flex-1 text-white text-xs px-3 py-2 max-h-20"
            editable={!isTyping}
          />

          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.8}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              inputText.trim() && !isTyping ? 'bg-emerald-500' : 'bg-zinc-800 opacity-50'
            }`}
          >
            <Ionicons name="arrow-up" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
