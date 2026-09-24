import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
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
import SiaCatMascot from './SiaCatMascot';
import { ToastBanner, ToastConfig } from './ToastBanner';

interface AiNutritionCoachModalProps {
  visible: boolean;
  onClose: () => void;
  userContext: UserNutritionContext;
  initialQuery?: string;
}

interface FormattedChatMessageProps {
  content: string;
  isUser: boolean;
  onLogMeal?: (meal: ParsedSuggestedMeal) => void;
  onCopy?: (text: string) => void;
}

/**
 * Returns user-friendly calendar day divider label (e.g. "Today", "Yesterday", "Mon, Sep 21")
 */
function getDateDividerLabel(isoString?: string): string {
  if (!isoString) return 'Today';
  try {
    const msgDate = new Date(isoString);
    const now = new Date();

    const isSameDay =
      msgDate.getFullYear() === now.getFullYear() &&
      msgDate.getMonth() === now.getMonth() &&
      msgDate.getDate() === now.getDate();
    if (isSameDay) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      msgDate.getFullYear() === yesterday.getFullYear() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getDate() === yesterday.getDate();
    if (isYesterday) return 'Yesterday';

    return msgDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Today';
  }
}

/**
 * Parses markdown bold (**text**) and renders clean styled Text components
 * without showing raw markdown asterisks (**) or stray metadata headers,
 * renders interactive 1-tap quick log cards for meal recommendations,
 * and provides a 1-tap copy action.
 */
function FormattedChatMessage({
  content,
  isUser,
  onLogMeal,
  onCopy,
}: FormattedChatMessageProps) {
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

      {/* Suggested Meal Cards */}
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
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-emerald-400 text-[10px] font-extrabold"
                    >
                      {meal.calories} kcal
                    </Text>
                  </View>
                  <View className="bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-sky-400 text-[10px] font-bold"
                    >
                      {meal.protein_g}g P
                    </Text>
                  </View>
                  {meal.carbs_g > 0 && (
                    <View className="bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                      <Text
                        style={{ fontVariant: ['tabular-nums'] }}
                        className="text-amber-400 text-[10px] font-medium"
                      >
                        {meal.carbs_g}g C
                      </Text>
                    </View>
                  )}
                  {meal.fat_g > 0 && (
                    <View className="bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                      <Text
                        style={{ fontVariant: ['tabular-nums'] }}
                        className="text-rose-400 text-[10px] font-medium"
                      >
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

      {/* Bubble Footer: 1-Tap Copy Action for Sia's responses */}
      {!isUser && onCopy && (
        <View className="flex-row items-center justify-end mt-2 pt-0.5">
          <Pressable
            onPress={() => onCopy(cleanedContent)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 0.8 }]}
            className="flex-row items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-md"
          >
            <Ionicons name="copy-outline" size={11} color="#a1a1aa" />
            <Text className="text-[9px] text-zinc-400 font-semibold">Copy</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function AiNutritionCoachModal({
  visible,
  onClose,
  userContext,
  initialQuery,
}: AiNutritionCoachModalProps) {
  const router = useRouter();
  const { setDraftMeal } = useMealStore();
  const { messages, isLoaded, loadHistory, addMessage, setMessages, clearHistory } = useCoachStore();
  const [inputText, setInputText] = useState(initialQuery || '');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const lastSendTimeRef = useRef<number>(0);

  useEffect(() => {
    if (visible && initialQuery) {
      setInputText(initialQuery);
    }
  }, [visible, initialQuery]);

  const remainingCal = userContext.remainingCalories ?? 2000;
  const remainingProt = userContext.remainingProtein ?? 150;
  const remainingCarbs = userContext.remainingCarbs ?? 200;
  const remainingFat = userContext.remainingFat ?? 65;

  // Dynamic context-aware prompts grouped by intent
  const dynamicPrompts = useMemo(() => {
    const list: { label: string; query: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [];

    if (remainingProt > 35) {
      list.push({
        label: `Hit ${remainingProt}g Protein`,
        query: `High-protein meal and snack ideas to hit my remaining ${remainingProt}g protein today.`,
        icon: 'food-drumstick',
      });
    } else {
      list.push({
        label: 'Exact Protein Hit',
        query: `Suggest a lean snack to hit my remaining ${remainingProt}g protein target exactly.`,
        icon: 'target',
      });
    }

    if (remainingCal < 400 && remainingCal > 0) {
      list.push({
        label: `Snacks < ${remainingCal} kcal`,
        query: `What are delicious, filling low-calorie snacks under ${remainingCal} kcal?`,
        icon: 'flash-outline',
      });
    } else if (remainingCal <= 0) {
      list.push({
        label: 'Over Budget Reset',
        query: 'I exceeded my calories today. How should I balance my hydration and macros for the rest of the day?',
        icon: 'scale-balance',
      });
    } else {
      list.push({
        label: `Meal ~${Math.min(650, remainingCal)} kcal`,
        query: `Give me a high-satiety meal idea fitting roughly ${Math.min(650, remainingCal)} kcal.`,
        icon: 'silverware-fork-knife',
      });
    }

    list.push({
      label: 'Macro Audit',
      query: 'Analyze my current macro balance for today and tell me what to adjust.',
      icon: 'chart-pie',
    });

    list.push({
      label: 'Pre-Workout Fuel',
      query: 'What is a quick pre-workout energy snack that fits my remaining macros?',
      icon: 'lightning-bolt',
    });

    list.push({
      label: 'High-Volume Sides',
      query: 'What are the best low-calorie high-volume vegetables and side dishes to feel full?',
      icon: 'leaf',
    });

    return list;
  }, [remainingCal, remainingProt]);

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

  const handleCopyMessage = useCallback(async (text: string) => {
    hapticFeedback.light();
    await Clipboard.setStringAsync(text);
    setToast({
      title: 'Copied to Clipboard',
      message: "Sia's advice is ready to paste anywhere.",
      type: 'info',
    });
  }, []);

  // Load persisted history on mount or whenever modal opens
  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  // Inject friendly conversational feline greeting when history is empty
  useEffect(() => {
    if (visible && isLoaded && messages.length === 0) {
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
      'Start a fresh conversation with Sia? Message history will be cleared.',
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
      {/* Dynamic Toast HUD inside modal */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* 1. Absolute Backdrop Overlay - tap to dismiss keyboard & modal */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Main High-Impact Bottom Sheet (88% Height, padded flush above keyboard) */}
      <View
        style={{
          height: '88%',
          backgroundColor: '#18181b',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: '#27272a',
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom:
            keyboardHeight > 0
              ? (Platform.OS === 'ios' ? keyboardHeight + 4 : Math.max(8, keyboardHeight - 24))
              : (Platform.OS === 'ios' ? 32 : 16),
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
            <SiaCatMascot size={36} mood="happy" withGlow={true} />
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
              className="w-8 h-8 rounded-full bg-zinc-800/90 border border-zinc-700/50 items-center justify-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#a1a1aa" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                hapticFeedback.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-zinc-800/90 border border-zinc-700/50 items-center justify-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#e4e4e7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4-Macro Interactive HUD Ribbon (Tap-to-Ask) */}
        <View className="my-2.5">
          <View className="flex-row items-center justify-between mb-1.5 px-0.5">
            <View className="flex-row items-center gap-1">
              <MaterialCommunityIcons name="paw" size={11} color="#10b981" />
              <Text className="text-zinc-500 text-[9px] font-extrabold uppercase tracking-wider">
                Live Targets • Tap to ask Sia
              </Text>
            </View>
          </View>

          <View className="flex-row gap-1.5">
            {/* Calories Pill */}
            <Pressable
              onPress={() => {
                hapticFeedback.selection();
                handleSendMessage(`What can I eat with my remaining ${remainingCal} kcal?`);
              }}
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.8 : 1 },
              ]}
              className="flex-1 bg-zinc-950/85 border border-emerald-500/25 p-2 rounded-xl items-center"
            >
              <Text className="text-zinc-500 text-[8px] font-extrabold uppercase">Cal</Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
                className="text-white text-xs mt-0.5"
                numberOfLines={1}
              >
                {remainingCal}
              </Text>
            </Pressable>

            {/* Protein Pill */}
            <Pressable
              onPress={() => {
                hapticFeedback.selection();
                handleSendMessage(`High-protein ideas for my remaining ${remainingProt}g protein?`);
              }}
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.8 : 1 },
              ]}
              className="flex-1 bg-zinc-950/85 border border-sky-500/25 p-2 rounded-xl items-center"
            >
              <Text className="text-sky-400 text-[8px] font-extrabold uppercase">Prot</Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
                className="text-sky-400 text-xs mt-0.5"
                numberOfLines={1}
              >
                {remainingProt}g
              </Text>
            </Pressable>

            {/* Carbs Pill */}
            <Pressable
              onPress={() => {
                hapticFeedback.selection();
                handleSendMessage(`What clean carb sources fit my remaining ${remainingCarbs}g carbs?`);
              }}
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.8 : 1 },
              ]}
              className="flex-1 bg-zinc-950/85 border border-amber-500/25 p-2 rounded-xl items-center"
            >
              <Text className="text-amber-400 text-[8px] font-extrabold uppercase">Carb</Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
                className="text-amber-400 text-xs mt-0.5"
                numberOfLines={1}
              >
                {remainingCarbs}g
              </Text>
            </Pressable>

            {/* Fat Pill */}
            <Pressable
              onPress={() => {
                hapticFeedback.selection();
                handleSendMessage(`What healthy fat options fit my remaining ${remainingFat}g fat?`);
              }}
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.95 : 1 }], opacity: pressed ? 0.8 : 1 },
              ]}
              className="flex-1 bg-zinc-950/85 border border-rose-500/25 p-2 rounded-xl items-center"
            >
              <Text className="text-rose-400 text-[8px] font-extrabold uppercase">Fat</Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
                className="text-rose-400 text-xs mt-0.5"
                numberOfLines={1}
              >
                {remainingFat}g
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Chat Messages List with Calendar Date Dividers */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 py-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {messages.map((msg: ChatMessage, index: number) => {
            // Compute whether this message begins a new calendar day
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const msgDateStr = msg.timestamp ? new Date(msg.timestamp).toDateString() : '';
            const prevDateStr = prevMsg?.timestamp ? new Date(prevMsg.timestamp).toDateString() : '';
            const isNewDay = index === 0 || msgDateStr !== prevDateStr;

            return (
              <React.Fragment key={msg.id}>
                {/* Calendar Date Divider Badge */}
                {isNewDay && (
                  <View className="items-center my-3">
                    <View className="bg-zinc-950/90 border border-zinc-800/90 px-3 py-1 rounded-full flex-row items-center gap-1.5 shadow-sm">
                      <MaterialCommunityIcons name="calendar-today" size={10} color="#71717a" />
                      <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                        {getDateDividerLabel(msg.timestamp)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Chat Message Bubble */}
                <View
                  className={`mb-3 flex-row ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <View className="mr-2 mt-0.5">
                      <SiaCatMascot size={28} mood="idle" withGlow={false} />
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
                      onCopy={msg.role === 'assistant' ? handleCopyMessage : undefined}
                    />
                  </View>
                </View>
              </React.Fragment>
            );
          })}

          {/* Thinking / Typing State with Animated Mascot */}
          {isTyping && (
            <View className="flex-row items-center gap-2 mb-3">
              <SiaCatMascot size={32} mood="thinking" withGlow={true} />
              <View className="bg-zinc-950 border border-zinc-800/90 px-3.5 py-3 rounded-2xl flex-row items-center gap-2 shadow-sm">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-zinc-400 text-xs font-semibold">
                  Sia is crafting your nutrition advice...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips Carousel with Icons & Spring Physics */}
        <View className="mb-2.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-row"
          >
            {dynamicPrompts.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSendMessage(item.query)}
                disabled={isTyping}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="bg-zinc-950 border border-zinc-800/90 px-3 py-1.5 rounded-xl mr-2 flex-row items-center gap-1.5 shadow-sm"
              >
                <MaterialCommunityIcons name={item.icon} size={12} color="#10b981" />
                <Text className="text-zinc-300 text-[11px] font-semibold">{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar (Directly Above Keyboard) */}
        <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 pr-2 shadow-sm">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask Sia about meals, macros, or ideas..."
            placeholderTextColor="#52525b"
            multiline
            maxLength={200}
            className="flex-1 text-white text-xs px-3 py-2 max-h-20"
            editable={!isTyping}
          />

          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              inputText.trim() && !isTyping ? 'bg-emerald-500' : 'bg-zinc-800 opacity-40'
            }`}
          >
            <Ionicons name="arrow-up" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
