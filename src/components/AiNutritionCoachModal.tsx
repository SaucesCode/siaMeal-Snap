import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import {
  sendNutritionCoachMessage,
  cleanCoachReply,
  ChatMessage,
  UserNutritionContext,
} from '../services/aiService';
import { hapticFeedback } from '../utils/haptics';
import { useCoachStore } from '../stores/coachStore';

interface AiNutritionCoachModalProps {
  visible: boolean;
  onClose: () => void;
  userContext: UserNutritionContext;
}

const QUICK_PROMPTS = [
  'High-protein meal ideas for my remaining calories',
  'How is my macro split looking today?',
  'Quick pre-workout meal suggestion',
  'Low-calorie snacks under 150 kcal',
  'Post-workout recovery meal ideas',
];

/**
 * Parses markdown bold (**text**) and renders clean styled Text components
 * without showing raw markdown asterisks (**) or stray metadata headers
 */
function FormattedChatMessage({ content, isUser }: { content: string; isUser: boolean }) {
  // Aggressively clean any metadata, telemetry dumps, thoughts, or prefixes
  const cleanedContent = isUser ? content : cleanCoachReply(content);

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
    </View>
  );
}

export function AiNutritionCoachModal({
  visible,
  onClose,
  userContext,
}: AiNutritionCoachModalProps) {
  const { messages, isLoaded, loadHistory, addMessage, setMessages, clearHistory } = useCoachStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Load persisted history once on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Inject greeting only when history is truly empty (new day or first ever open)
  useEffect(() => {
    if (visible && isLoaded && messages.length === 0) {
      const remainingCal = userContext.remainingCalories ?? 2000;
      const remainingProt = userContext.remainingProtein ?? 150;
      const greeting: ChatMessage = {
        id: `greeting_${new Date().toISOString().split('T')[0]}`,
        role: 'assistant',
        content: `Hey ${userContext.displayName || 'Athlete'}, I'm **Sia**, your Nutrition Coach.\n\n**Your Live Status Today:**\n• **${remainingCal} kcal** remaining\n• **${remainingProt}g protein** remaining\n\nTell me what you are craving or ask for high-protein meal ideas to hit your target macro split today.`,
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
      const conversationPayload = [...messages, userMsg].map((m) => ({
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
                <FormattedChatMessage content={msg.content} isUser={msg.role === 'user'} />
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
            {QUICK_PROMPTS.map((prompt, idx) => (
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
            maxLength={250}
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
