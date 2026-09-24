import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { performGoogleOAuth } from '../../utils/oauth';
import { BrandLogo } from '../../components/BrandLogo';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { hapticFeedback } from '../../utils/haptics';
import SiaCatMascot from '../../components/SiaCatMascot';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const handleLogin = async () => {
    if (!email || !password) {
      hapticFeedback.error();
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    try {
      hapticFeedback.medium();
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        hapticFeedback.error();
        Alert.alert('Sign In Failed', error.message);
        return;
      }

      if (data.user) {
        hapticFeedback.success();
        const profile = await fetchProfile();
        if (!profile || !profile.target_calories) {
          router.replace('/(auth)/onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }
    } catch (err: any) {
      hapticFeedback.error();
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      hapticFeedback.medium();
      setGoogleLoading(true);
      const res: any = await performGoogleOAuth();
      if (res) {
        hapticFeedback.success();
        const profile = await fetchProfile();
        if (!profile || !profile.target_calories) {
          router.replace('/(auth)/onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Google Sign In error:', err);
      Alert.alert('Google Sign-In', err.message || 'Could not authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-zinc-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6 py-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View className="mb-6">
          <BrandLogo size="lg" />
        </View>

        {/* Sia Mascot Greeting Pod */}
        <View className="bg-zinc-900/90 border border-emerald-500/30 rounded-3xl p-3.5 flex-row items-center gap-3.5 mb-5 shadow-sm shadow-emerald-500/10">
          <View className="items-center justify-center">
            <SiaCatMascot size={46} mood="happy" withGlow={true} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-xs"
              >
                Welcome back, Athlete!
              </Text>
              <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                <Text className="text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">🐾 Sia Ready</Text>
              </View>
            </View>
            <Text className="text-zinc-400 text-[11px] font-medium leading-4">
              Sign in to sync your meal logs, macro rings, and hydration progress.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6 shadow-sm shadow-black">
          <Text
            style={{ fontFamily: 'Outfit_800ExtraBold' }}
            className="text-xl text-white mb-5"
          >
            Athlete Access
          </Text>

          {/* Google OAuth Button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.8}
            className="bg-zinc-950 border border-zinc-700/80 active:bg-zinc-800 rounded-2xl py-3.5 px-4 flex-row items-center justify-center gap-3 mb-5"
          >
            {googleLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#ffffff" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-sm"
                >
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-1 h-px bg-zinc-800" />
            <Text className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Or with email</Text>
            <View className="flex-1 h-px bg-zinc-800" />
          </View>

          {/* Email Field */}
          <View className="mb-4">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Email Address
            </Text>
            <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-1">
              <Ionicons name="mail-outline" size={18} color="#71717a" style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="athlete@domain.com"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                keyboardType="email-address"
                className="text-white text-base font-semibold flex-1 py-3"
              />
            </View>
          </View>

          {/* Password Field */}
          <View className="mb-6">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Password
            </Text>
            <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-1">
              <Ionicons name="lock-closed-outline" size={18} color="#71717a" style={{ marginRight: 10 }} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#52525b"
                secureTextEntry={!showPassword}
                className="text-white text-base font-semibold flex-1 py-3"
              />
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setShowPassword(!showPassword);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="p-1"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#71717a"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In CTA */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
            className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 items-center justify-center flex-row gap-2 shadow-sm shadow-emerald-500/20"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="paw" size={16} color="#ffffff" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white font-bold text-base"
                >
                  Sign In
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center items-center">
          <Text className="text-zinc-400 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity
              onPress={() => hapticFeedback.light()}
              className="py-1"
            >
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-emerald-400 font-bold text-sm ml-1"
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
