import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useShallow } from 'zustand/react/shallow';
import { streamNutritionCoachMessage, cleanCoachReply, ChatMessage, UserNutritionContext } from '../services/aiService';
import { hapticFeedback } from '../utils/haptics';
import { useCoachStore } from '../stores/coachStore';
import { useMealStore, getTodayString } from '../stores/mealStore';
import { getDefaultMealType } from '../utils/nutrition';
import { getLocalDateString } from '../utils/localDate';
import { dayLabel } from '../utils/historyText';
import { greetingName } from '../utils/todaySummary';
import { parseMealSuggestions, ParsedSuggestedMeal } from '../utils/mealSuggestionParser';
import { Sia } from './sia';
import { ToastBanner, ToastConfig } from './ToastBanner';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface AiNutritionCoachModalProps {
  visible: boolean;
  onClose: () => void;
  userContext: UserNutritionContext;
  initialQuery?: string;
}

interface ChatDateGroup {
  dateKey: string;
  label: string;
  isToday: boolean;
  messages: ChatMessage[];
}

/**
 * Colour for a **bold** token in Sia's replies. Calories use the readable leaf green; everything else
 * stays dark (the macro colours are too light for text on white).
 */
function boldColor(text: string): string {
  return /\b(kcal|calories|cal)\b/i.test(text) ? palette.leafText : palette.text;
}

const MACRO_AMOUNT = /(\b\d+(?:\.\d+)?\s*(?:g\s*(?:protein|carbs?|fat)|kcal|calories|cal)\b)/i;

/** A chat message: **bold** without asterisks, macro amounts highlighted, meal ideas as "Log" cards, Copy. */
function FormattedChatMessage({
  content,
  isUser,
  onLogMeal,
  onCopy,
}: {
  content: string;
  isUser: boolean;
  onLogMeal?: (meal: ParsedSuggestedMeal) => void;
  onCopy?: (text: string) => void;
}) {
  const cleaned = isUser ? content : cleanCoachReply(content);
  const meals = useMemo(() => (isUser || !onLogMeal ? [] : parseMealSuggestions(cleaned)), [cleaned, isUser, onLogMeal]);
  const textStyle = isUser ? styles.userText : styles.siaText;

  return (
    <View>
      {cleaned.split('\n').map((line, i) => (
        <Text key={i} style={[textStyle, i > 0 && styles.lineGap]}>
          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
              const bold = part.slice(2, -2);
              return (
                <Text key={j} style={[styles.bold, !isUser && { color: boldColor(bold) }]}>
                  {bold}
                </Text>
              );
            }
            const clean = part.replace(/\*\*/g, '');
            if (isUser || !MACRO_AMOUNT.test(clean)) return <Text key={j}>{clean}</Text>;
            return (
              <Text key={j}>
                {clean.split(new RegExp(MACRO_AMOUNT.source, 'gi')).map((sub, k) =>
                  MACRO_AMOUNT.test(sub) && sub.trim().length === sub.length ? (
                    <Text key={k} style={[styles.bold, { color: boldColor(sub) }]}>
                      {sub}
                    </Text>
                  ) : (
                    <Text key={k}>{sub}</Text>
                  )
                )}
              </Text>
            );
          })}
        </Text>
      ))}

      {meals.length > 0 && onLogMeal && (
        <View style={styles.ideas}>
          {meals.map((meal, i) => (
            <View key={i} style={styles.idea}>
              <View style={styles.flex}>
                <Text style={styles.ideaName} numberOfLines={1}>
                  {meal.name}
                </Text>
                <Text style={styles.ideaMeta}>
                  {`${meal.calories} kcal · P ${meal.protein_g}${meal.carbs_g > 0 ? ` · C ${meal.carbs_g}` : ''}${meal.fat_g > 0 ? ` · F ${meal.fat_g}` : ''}`}
                </Text>
              </View>
              <Tap
                onPress={() => onLogMeal(meal)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${meal.name}`}
                style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}
              >
                <Text style={styles.logText}>Log</Text>
              </Tap>
            </View>
          ))}
        </View>
      )}

      {!isUser && onCopy && (
        <Tap
          onPress={() => onCopy(cleaned)}
          accessibilityRole="button"
          accessibilityLabel="Copy Sia's reply"
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <Ionicons name="copy-outline" size={14} color={palette.textMuted} />
          <Text style={styles.copyText}>Copy</Text>
        </Tap>
      )}
    </View>
  );
}

/** Three dots pulsing in turn while Sia thinks; still under reduced motion is handled by the OS animation scale. */
function ThinkingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          Animated.delay(Math.max(0, 360 - i * 160)),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={styles.dots}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

/** Sia the nutrition coach: a cream chat sheet with today's numbers one tap away. */
export function AiNutritionCoachModal({ visible, onClose, userContext, initialQuery }: AiNutritionCoachModalProps) {
  const router = useRouter();
  const setDraftMeal = useMealStore((s) => s.setDraftMeal);
  const { messages, isLoaded, loadHistory, addMessage, setMessages, clearHistory } = useCoachStore(
    useShallow((s) => ({
      messages: s.messages,
      isLoaded: s.isLoaded,
      loadHistory: s.loadHistory,
      addMessage: s.addMessage,
      setMessages: s.setMessages,
      clearHistory: s.clearHistory,
    }))
  );
  const [inputText, setInputText] = useState(initialQuery || '');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const lastSendTimeRef = useRef(0);

  const remainingCal = userContext.remainingCalories ?? 2000;
  const remainingProt = userContext.remainingProtein ?? 150;
  const remainingCarbs = userContext.remainingCarbs ?? 200;
  const remainingFat = userContext.remainingFat ?? 65;

  const toggleDateGroup = useCallback((dateKey: string) => {
    hapticFeedback.selection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  }, []);

  // Messages grouped by local calendar day; earlier days start folded away.
  const dateGroups = useMemo<ChatDateGroup[]>(() => {
    const todayKey = getLocalDateString(new Date());
    const groups: ChatDateGroup[] = [];
    for (const msg of messages) {
      const d = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dateKey = Number.isNaN(d.getTime()) ? todayKey : getLocalDateString(d);
      const last = groups[groups.length - 1];
      if (last && last.dateKey === dateKey) last.messages.push(msg);
      else groups.push({ dateKey, label: dayLabel(dateKey), isToday: dateKey === todayKey, messages: [msg] });
    }
    return groups;
  }, [messages]);

  const prompts = useMemo(
    () => [
      remainingProt > 35
        ? { label: `Reach ${remainingProt} g protein`, query: `High-protein meal and snack ideas to reach my remaining ${remainingProt}g protein today.` }
        : { label: 'Finish my protein', query: `Suggest a lean snack for my last ${remainingProt}g of protein today.` },
      remainingCal <= 0
        ? { label: "I'm over today", query: 'I went over my calories today. How should I handle the rest of the day?' }
        : remainingCal < 400
          ? { label: `Snacks under ${remainingCal} kcal`, query: `What are filling snacks under ${remainingCal} kcal?` }
          : { label: `A ${Math.min(650, remainingCal)} kcal meal`, query: `Give me a filling meal idea of about ${Math.min(650, remainingCal)} kcal.` },
      { label: 'How am I doing today?', query: 'Look at my macros so far today and tell me what to adjust.' },
      { label: 'Before a workout', query: 'What is a quick pre-workout snack that fits what I have left today?' },
      { label: 'Filling sides', query: 'What are low-calorie, filling vegetables and side dishes?' },
    ],
    [remainingCal, remainingProt]
  );

  const macroChips = [
    { label: 'kcal', value: `${remainingCal}`, query: `What can I eat with my remaining ${remainingCal} kcal?` },
    { label: 'protein', value: `${remainingProt} g`, query: `High-protein ideas for my remaining ${remainingProt}g protein?` },
    { label: 'carbs', value: `${remainingCarbs} g`, query: `Which carbs fit my remaining ${remainingCarbs}g carbs?` },
    { label: 'fat', value: `${remainingFat} g`, query: `Which healthy fats fit my remaining ${remainingFat}g fat?` },
  ];

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
      // Let the sheet close before Review opens.
      setTimeout(() => router.push('/review' as any), 120);
    },
    [onClose, router, setDraftMeal]
  );

  const handleCopyMessage = useCallback(async (text: string) => {
    hapticFeedback.light();
    await Clipboard.setStringAsync(text);
    setToast({ title: 'Copied', message: "Sia's reply is ready to paste.", type: 'info' });
  }, []);

  useEffect(() => {
    if (visible && initialQuery) setInputText(initialQuery);
  }, [visible, initialQuery]);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

  // A first hello when there's no history yet.
  useEffect(() => {
    if (visible && isLoaded && messages.length === 0) {
      setMessages([
        {
          id: `greeting_${getTodayString()}`,
          role: 'assistant',
          content: `Hi ${greetingName(userContext.displayName, null)}, I'm **Sia**! You have **${remainingCal} kcal** and **${remainingProt}g protein** left today.\n\nWhat are you in the mood for?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [visible, isLoaded]);

  const handleClearHistory = useCallback(() => {
    hapticFeedback.light();
    Alert.alert('Clear the chat?', 'This removes your conversation with Sia from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setExpandedDates({});
          clearHistory();
        },
      },
    ]);
  }, [clearHistory]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const height = e?.endCoordinates?.height || 0;
      if (height > 0) setKeyboardHeight(height);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, visible, isTyping, streamingReply]);

  if (!visible) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isTyping) return;
    // At most one send every 2 seconds.
    const now = Date.now();
    if (now - lastSendTimeRef.current < 2000) return;
    lastSendTimeRef.current = now;

    hapticFeedback.light();
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: new Date().toISOString() };
    await addMessage(userMsg);
    setInputText('');
    setIsTyping(true);

    try {
      // Only the 4 most recent messages go to the server, to keep replies fast and cheap.
      const payload = [...messages, userMsg].slice(-4).map((m) => ({ role: m.role, content: m.content }));
      const reply = await streamNutritionCoachMessage(payload, userContext, setStreamingReply);
      hapticFeedback.success();
      await addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch (err: any) {
      hapticFeedback.error();
      await addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't answer just now. ${err?.message || 'Please check your connection and try again.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Cleared together with isTyping, after the reply is saved, so the streamed bubble hands over without a flicker.
      setStreamingReply('');
      setIsTyping(false);
    }
  };

  const sheetPadding =
    keyboardHeight > 0 ? (Platform.OS === 'ios' ? keyboardHeight + 4 : Math.max(8, keyboardHeight - 24)) : Platform.OS === 'ios' ? 32 : 16;
  const canSend = inputText.trim() !== '' && !isTyping;

  return (
    <View style={styles.overlay}>
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
      <Tap
        style={styles.backdrop}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        accessibilityLabel="Close the coach"
      />

      <View style={[styles.sheet, { paddingBottom: sheetPadding }]} accessibilityViewIsModal>
        <View style={styles.header}>
          <Sia expression="resting" size={48} />
          <View style={styles.flex}>
            <Text style={styles.title} accessibilityRole="header">
              Sia
            </Text>
            <Text style={styles.subtitle}>Your nutrition coach</Text>
          </View>
          <Tap
            onPress={handleClearHistory}
            accessibilityRole="button"
            accessibilityLabel="Clear the chat"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
          </Tap>
          <Tap
            onPress={() => {
              Keyboard.dismiss();
              hapticFeedback.light();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close the coach"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={palette.text} />
          </Tap>
        </View>

        <Text style={styles.leftLabel}>Left today · tap to ask</Text>
        <View style={styles.macros}>
          {macroChips.map((m) => (
            <Tap
              key={m.label}
              onPress={() => {
                hapticFeedback.selection();
                handleSendMessage(m.query);
              }}
              disabled={isTyping}
              accessibilityRole="button"
              accessibilityLabel={`${m.value} ${m.label} left. Ask Sia about it.`}
              style={({ pressed }) => [styles.macro, pressed && styles.pressed]}
            >
              <Text style={styles.macroValue} numberOfLines={1}>
                {m.value}
              </Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </Tap>
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.chat}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {dateGroups.map((group) => {
            const expanded = group.isToday || !!expandedDates[group.dateKey];
            return (
              <View key={group.dateKey}>
                {group.isToday ? (
                  <Text style={styles.day}>Today</Text>
                ) : (
                  <Tap
                    onPress={() => toggleDateGroup(group.dateKey)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={({ pressed }) => [styles.pastDay, pressed && styles.pressed]}
                  >
                    <Ionicons name="time-outline" size={16} color={palette.textMuted} />
                    <Text style={styles.pastDayText}>
                      {group.label} · {group.messages.length} message{group.messages.length === 1 ? '' : 's'}
                    </Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
                  </Tap>
                )}

                {expanded &&
                  group.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <View key={msg.id} style={[styles.messageRow, isUser && styles.messageRowUser]}>
                        {!isUser && (
                          <View style={styles.avatar}>
                            <Sia expression="happy" size={28} />
                          </View>
                        )}
                        <View style={[styles.bubble, isUser ? styles.userBubble : styles.siaBubble]}>
                          <FormattedChatMessage
                            content={msg.content}
                            isUser={isUser}
                            onLogMeal={msg.id.startsWith('greeting_') ? undefined : handleLogSuggestedMeal}
                            onCopy={isUser ? undefined : handleCopyMessage}
                          />
                        </View>
                      </View>
                    );
                  })}
              </View>
            );
          })}

          {dateGroups.length > 0 && dateGroups.every((g) => !g.isToday) && (
            <View style={styles.newDay}>
              <Sia expression="happy" size={28} />
              <Text style={styles.newDayText}>A new day. Earlier chats are folded above — ask me anything.</Text>
            </View>
          )}

          {isTyping && streamingReply !== '' && (
            <View style={styles.messageRow}>
              <View style={styles.avatar}>
                <Sia expression="happy" size={28} />
              </View>
              <View style={[styles.bubble, styles.siaBubble]} accessibilityLiveRegion="polite">
                <FormattedChatMessage content={streamingReply} isUser={false} />
              </View>
            </View>
          )}

          {isTyping && streamingReply === '' && (
            <View style={styles.messageRow}>
              <View style={styles.thinkingAvatar}>
                <Sia expression="thinking" size={48} />
              </View>
              <View style={[styles.bubble, styles.siaBubble, styles.thinking]}>
                <Text style={styles.thinkingText}>Sia is thinking</Text>
                <ThinkingDots />
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView
          horizontal
          style={styles.promptRow}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.prompts}
        >
          {prompts.map((p) => (
            <Tap
              key={p.label}
              onPress={() => handleSendMessage(p.query)}
              disabled={isTyping}
              accessibilityRole="button"
              style={({ pressed }) => [styles.prompt, pressed && styles.pressed, isTyping && styles.disabled]}
            >
              <Text style={styles.promptText}>{p.label}</Text>
            </Tap>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask Sia about meals or macros…"
            placeholderTextColor={palette.textMuted}
            multiline
            maxLength={200}
            editable={!isTyping}
            accessibilityLabel="Message Sia"
            style={styles.input}
          />
          <Tap
            onPress={() => handleSendMessage()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [styles.send, !canSend && styles.disabled, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-up" size={20} color={palette.pointText} />
          </Tap>
        </View>
        <Text style={styles.disclaimer}>Sia shares general nutrition info, not medical advice.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 9999, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: palette.pointDeep, opacity: 0.7 },
  sheet: {
    height: '88%',
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopLeftRadius: radius.hero + 6,
    borderTopRightRadius: radius.hero + 6,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: palette.line },
  title: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  subtitle: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  leftLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginTop: space[3], marginBottom: space[1] },
  macros: { flexDirection: 'row', gap: space[2] },
  macro: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    backgroundColor: palette.point,
  },
  macroValue: { fontFamily: type.displayBold, fontSize: type.size.body, color: palette.pointText, fontVariant: ['tabular-nums'] },
  macroLabel: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.pointMuted },
  chat: { paddingTop: space[2], paddingBottom: space[3] },
  day: { alignSelf: 'center', fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginVertical: space[2] },
  pastDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: space[3],
    marginVertical: space[1],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  pastDayText: { flex: 1, fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.text },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space[3] },
  messageRowUser: { justifyContent: 'flex-end' },
  avatar: { marginRight: space[2], marginTop: 2 },
  thinkingAvatar: { marginRight: space[2] },
  bubble: { maxWidth: '84%', padding: space[3], borderRadius: radius.card },
  siaBubble: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: palette.point, borderTopRightRadius: 4 },
  siaText: { fontFamily: type.body, fontSize: type.size.secondary + 1, lineHeight: 21, color: palette.text },
  userText: { fontFamily: type.bodySemibold, fontSize: type.size.secondary + 1, lineHeight: 21, color: palette.pointText },
  lineGap: { marginTop: space[1] },
  bold: { fontFamily: type.bodyBold },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  thinkingText: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.textMuted },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.leafOnLight },
  ideas: { marginTop: space[3], paddingTop: space[2], borderTopWidth: 1, borderTopColor: palette.line, gap: space[2] },
  idea: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[2], borderRadius: radius.control, backgroundColor: palette.bg },
  ideaName: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.text },
  ideaMeta: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, fontVariant: ['tabular-nums'], marginTop: 2 },
  logButton: { minHeight: 44, minWidth: 56, paddingHorizontal: space[3], alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: palette.point },
  logText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointText },
  copy: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: space[1], minHeight: 32, paddingHorizontal: space[2], marginTop: space[1] },
  copyText: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted },
  newDay: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3], marginVertical: space[2], borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.line },
  newDayText: { flex: 1, fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted },
  // A horizontal list in a column would otherwise grow to fill the sheet.
  promptRow: { flexGrow: 0, flexShrink: 0 },
  prompts: { gap: space[2], paddingBottom: space[2], alignItems: 'center' },
  prompt: {
    minHeight: 40,
    paddingHorizontal: space[3],
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  promptText: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.text },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    padding: space[1],
    paddingLeft: space[3],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  input: { flex: 1, maxHeight: 96, minHeight: 44, paddingVertical: space[2], fontFamily: type.body, fontSize: type.size.secondary + 1, color: palette.text },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: palette.point },
  disclaimer: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, textAlign: 'center', marginTop: space[2] },
});
