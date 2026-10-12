import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { compressImage, analyzeMealPhoto } from '../../services/aiService';
import { lookupBarcode } from '../../services/barcodeService';
import { useMealStore } from '../../stores/mealStore';
import { hapticFeedback } from '../../utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MealType } from '../../types';
import SiaCatMascot from '../../components/SiaCatMascot';
import { SiaMascotHero } from '../../components/feline';

type ScanMode = 'photo' | 'barcode';

const CATEGORY_NAMES: Record<
  string,
  { title: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  breakfast: { title: 'Morning Pounce', color: '#f59e0b', icon: 'cat' },
  lunch: { title: 'Midday Catch', color: '#10b981', icon: 'fish' },
  dinner: { title: 'Night Prowl', color: '#818cf8', icon: 'weather-night' },
  snack: { title: 'Paws & Treats', color: '#06b6d4', icon: 'paw' },
};

export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: string; meal_type?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(
    params.mode === 'barcode' ? 'barcode' : 'photo'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Sniffing out ingredients...');
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualBarcodeText, setManualBarcodeText] = useState('');
  const [nonFoodModalText, setNonFoodModalText] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();
  const setDraftMeal = useMealStore((state) => state.setDraftMeal);

  // Active HUD Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const reticlePulseAnim = useRef(new Animated.Value(1)).current;
  const bracketGlowAnim = useRef(new Animated.Value(0.6)).current;
  const processingProgressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.mode === 'barcode') {
      setScanMode('barcode');
    } else if (params.mode === 'photo') {
      setScanMode('photo');
    }
  }, [params.mode]);

  // Live Continuous Viewfinder Animations
  useEffect(() => {
    // 1. Continuous Laser Sweep Animation (active for both photo & barcode)
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: scanMode === 'photo' ? 2400 : 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: scanMode === 'photo' ? 2400 : 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    scanLoop.start();

    // 2. Shutter Aperture Breathing Loop
    const reticleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(reticlePulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(reticlePulseAnim, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    reticleLoop.start();

    // 3. Viewfinder Corner Brackets Glow Loop
    const bracketLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bracketGlowAnim, {
          toValue: 1.0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bracketGlowAnim, {
          toValue: 0.45,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bracketLoop.start();

    return () => {
      scanLoop.stop();
      reticleLoop.stop();
      bracketLoop.stop();
    };
  }, [scanMode]);

  // Active progress animation while AI is analyzing
  useEffect(() => {
    if (isProcessing) {
      processingProgressAnim.setValue(0);
      Animated.timing(processingProgressAnim, {
        toValue: 0.92,
        duration: 6500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(processingProgressAnim, {
        toValue: 1.0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isProcessing]);

  if (!permission) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center mb-4 border border-emerald-500/30">
          <Ionicons name="camera" size={32} color="#10b981" />
        </View>
        <Text
          style={{ fontFamily: 'Outfit_800ExtraBold' }}
          className="text-white text-xl mb-2 text-center"
        >
          Camera Access Required
        </Text>
        <Text className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
          Sia requires camera access to photograph your catches and scan barcodes to estimate calories and macronutrients.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          activeOpacity={0.8}
          className="bg-emerald-500 active:bg-emerald-600 px-6 py-3.5 rounded-2xl flex-row items-center gap-2"
        >
          <Ionicons name="paw" size={18} color="#ffffff" />
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white font-bold text-base"
          >
            Grant Camera Permission
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const processImageUri = async (uri: string) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Compressing photo...');

      // 1. Strict compression to 512px, 0.5 quality, base64
      const compressed = await compressImage(uri);

      // 2. Invoke Supabase Edge Function with dynamic feline updates
      setProcessingStatus("Sia's vision eye is analyzing meal nutrients...");
      const result = await analyzeMealPhoto(compressed.base64);

      // 3. Set draft meal in store and navigate to Review & Edit screen
      setDraftMeal({
        name: result.meal_name || 'Logged Catch',
        meal_type: (params.meal_type as MealType) || 'snack',
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        food_items: result.ingredients,
        image_url: compressed.uri,
        confidence_score: result.confidence_score,
        portion_notes: result.portion_notes,
        dietary_tags: result.dietary_tags,
        feline_verdict: result.feline_verdict,
      });

      hapticFeedback.success();
      router.push('/review' as any);
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Error analyzing image:', err);
      const errMsg = err?.message || 'Could not analyze the photo. Please try again.';
      if (/not edible|not on the menu|not food|laptop|computer|phone|gadget|non-food/i.test(errMsg)) {
        setNonFoodModalText(errMsg);
      } else {
        Alert.alert('Analysis Error', errMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (isProcessing) return;

    try {
      hapticFeedback.medium();
      setIsProcessing(true);
      setProcessingStatus('Capturing meal...');

      let photoUri: string | null = null;

      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.7,
          });
          if (photo?.uri) {
            photoUri = photo.uri;
          }
        } catch (camErr) {
          console.warn('CameraView capture failed, falling back to system camera:', camErr);
        }
      }

      if (!photoUri) {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          mediaTypes: ['images'],
        });

        if (!result.canceled && result.assets[0]?.uri) {
          photoUri = result.assets[0].uri;
        }
      }

      if (photoUri) {
        await processImageUri(photoUri);
      }
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Failed to take photo:', err);
      Alert.alert('Camera Error', err.message || 'Could not capture photo. Try choosing from gallery.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processBarcode = async (barcode: string) => {
    const rawData = barcode.trim();
    if (!rawData) return;

    setIsProcessing(true);
    setProcessingStatus(`Inspecting barcode ${rawData}...`);
    hapticFeedback.light();

    try {
      const product = await lookupBarcode(rawData);

      if (product && product.found) {
        hapticFeedback.success();
        setDraftMeal({
          name: product.productName,
          meal_type: (params.meal_type as MealType) || 'snack',
          calories: product.calories,
          protein_g: product.protein_g,
          carbs_g: product.carbs_g,
          fat_g: product.fat_g,
          food_items: product.ingredients,
          image_url: product.imageUrl || null,
          confidence_score: 1.0,
          portion_notes: product.portion_notes || `Official label specs (${product.servingSize || '1 serving'})`,
          dietary_tags: product.dietary_tags || ['Verified Barcode'],
          feline_verdict: product.feline_verdict || `Sia verified the official package specs for ${product.productName}!`,
        });

        if (manualModalVisible) {
          setManualModalVisible(false);
          setManualBarcodeText('');
        }
        router.push('/review' as any);
      } else {
        hapticFeedback.error();
        Alert.alert(
          'Product Not Found',
          `Barcode ${rawData} wasn't found in Open Food Facts database. You can take a photo of the food or nutrition label instead.`,
          [
            {
              text: 'Switch to Photo Mode',
              onPress: () => {
                if (manualModalVisible) setManualModalVisible(false);
                setScanMode('photo');
              },
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Barcode lookup error:', err);
      Alert.alert('Scan Error', 'Could not retrieve product information.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setLastScannedBarcode(null), 2000);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const rawData = result.data;
    if (isProcessing || !rawData || rawData === lastScannedBarcode) return;

    setLastScannedBarcode(rawData);
    await processBarcode(rawData);
  };

  const handlePickFromGallery = async () => {
    if (isProcessing) return;

    try {
      hapticFeedback.light();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await processImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      hapticFeedback.error();
      console.error('Gallery pick error:', err);
      Alert.alert('Gallery Error', 'Could not select photo.');
    }
  };

  const targetCategory = params.meal_type ? CATEGORY_NAMES[params.meal_type] : null;

  return (
    <View className="flex-1 bg-black">
      {/* Full-bleed Camera Viewfinder */}
      <CameraView
        ref={(ref) => {
          cameraRef.current = ref;
        }}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        mode="picture"
        barcodeScannerSettings={
          scanMode === 'barcode'
            ? {
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }
            : undefined
        }
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
      />

      {/* Sibling Overlay UI Controls with high zIndex */}
      <SafeAreaView
        style={[StyleSheet.absoluteFill, { zIndex: 30, elevation: 30 }]}
        className="justify-between"
      >
        {/* Top Controls & Mode Switcher */}
        <View className="px-5 pt-3">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.back();
              }}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Mode Switcher Pill */}
            <View className="flex-row bg-black/70 p-1 rounded-full border border-white/15">
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  setScanMode('photo');
                }}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                  scanMode === 'photo' ? 'bg-emerald-500' : 'bg-transparent'
                }`}
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color={scanMode === 'photo' ? '#ffffff' : '#a1a1aa'}
                />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className={`text-xs ${
                    scanMode === 'photo' ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  setScanMode('barcode');
                }}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                  scanMode === 'barcode' ? 'bg-emerald-500' : 'bg-transparent'
                }`}
              >
                <Ionicons
                  name="barcode-outline"
                  size={14}
                  color={scanMode === 'barcode' ? '#ffffff' : '#a1a1aa'}
                />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className={`text-xs ${
                    scanMode === 'barcode' ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Barcode
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setTorch((prev) => !prev);
              }}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10 active:opacity-70"
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-off'}
                size={20}
                color={torch ? '#facc15' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>

          {/* Active Target Category Badge */}
          {targetCategory && (
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/15 self-center mb-1">
              <MaterialCommunityIcons name={targetCategory.icon} size={13} color={targetCategory.color} />
              <Text
                style={{ fontFamily: 'Outfit_700Bold', color: targetCategory.color }}
                className="text-[11px]"
              >
                Logging to {targetCategory.title}
              </Text>
            </View>
          )}
        </View>

        {/* Center Scanner Reticle (Photo vs Barcode modes) */}
        {scanMode === 'photo' ? (
          <View className="items-center justify-center px-8 pointer-events-none">
            <View className="w-72 h-72 rounded-3xl border border-dashed border-emerald-500/40 items-center justify-center bg-black/10 relative overflow-hidden">
              {/* Corner L-Brackets with Pulsing Glow */}
              <Animated.View style={{ opacity: bracketGlowAnim }} className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-sm shadow-emerald-400" />
              <Animated.View style={{ opacity: bracketGlowAnim }} className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-sm shadow-emerald-400" />
              <Animated.View style={{ opacity: bracketGlowAnim }} className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-sm shadow-emerald-400" />
              <Animated.View style={{ opacity: bracketGlowAnim }} className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-sm shadow-emerald-400" />

              {/* Animated Laser Scanning Beam Across Food Frame */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  right: 10,
                  height: 2.5,
                  backgroundColor: '#10b981',
                  shadowColor: '#10b981',
                  shadowOpacity: 0.95,
                  shadowRadius: 8,
                  elevation: 6,
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 240],
                      }),
                    },
                  ],
                }}
              />

              {/* Center Crosshair Aperture Ring with Shutter Breathing */}
              <Animated.View
                style={{
                  transform: [{ scale: reticlePulseAnim }],
                }}
                className="w-14 h-14 rounded-full border border-emerald-400/50 items-center justify-center bg-emerald-500/10 shadow-sm shadow-emerald-400/40"
              >
                <View className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-400" />
              </Animated.View>

              {/* Sia Center Reticle Tag */}
              <View className="absolute bottom-3 bg-black/85 px-3.5 py-1.5 rounded-full border border-emerald-500/40 flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                <MaterialCommunityIcons name="camera-iris" size={13} color="#10b981" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-emerald-400 text-[11px] tracking-wide"
                >
                  Sia Vision Active
                </Text>
              </View>
            </View>

            {/* Viewfinder Tip */}
            <View className="mt-3 bg-black/60 px-3.5 py-1.5 rounded-full border border-white/10">
              <Text className="text-zinc-300 text-[11px] font-medium text-center">
                🐾 Center meal inside frame for precision macro scan
              </Text>
            </View>
          </View>
        ) : (
          <View className="items-center justify-center px-8">
            <View className="w-68 h-48 border-2 border-emerald-400/80 rounded-3xl items-center justify-center bg-black/30 relative overflow-hidden">
              {/* Corner Brackets */}
              <View className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400" />
              <View className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400" />
              <View className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
              <View className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400" />

              {/* Animated Laser Scanning Beam */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  right: 10,
                  height: 2,
                  backgroundColor: '#10b981',
                  shadowColor: '#10b981',
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 140],
                      }),
                    },
                  ],
                }}
              />

              <View className="absolute -bottom-8 bg-black/80 px-4 py-1.5 rounded-full border border-emerald-500/30">
                <Text className="text-white text-xs font-semibold">
                  Align barcode inside frame
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Shutter & Controls Bar (in Photo mode) */}
        {scanMode === 'photo' ? (
          <View className="pb-8 pt-6 px-8 bg-black/60 border-t border-white/10">
            <View className="flex-row items-center justify-around">
              {/* Gallery Picker */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                disabled={isProcessing}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/25 items-center justify-center active:opacity-60"
              >
                <Ionicons name="images-outline" size={22} color="#ffffff" />
              </TouchableOpacity>

              {/* Big Tactile Shutter Button */}
              <Pressable
                onPress={handleCapture}
                disabled={isProcessing}
                hitSlop={15}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.90 : 1 }],
                    opacity: isProcessing ? 0.5 : 1,
                  },
                ]}
                className="w-20 h-20 rounded-full border-4 border-white/90 items-center justify-center p-1.5 bg-white/20 shadow-lg shadow-black"
              >
                <View className="w-full h-full rounded-full bg-emerald-500 items-center justify-center shadow-md shadow-emerald-500/50">
                  <MaterialCommunityIcons name="camera-iris" size={26} color="#ffffff" />
                </View>
              </Pressable>

              {/* Flip Camera */}
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
                }}
                disabled={isProcessing}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/25 items-center justify-center active:opacity-60"
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="pb-8 pt-4 items-center px-6">
            <Text className="text-zinc-400 text-xs font-medium mb-3">
              Scanning barcodes automatically...
            </Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setManualModalVisible(true);
              }}
              activeOpacity={0.8}
              className="bg-zinc-900 border border-emerald-500/40 px-5 py-2.5 rounded-full flex-row items-center gap-2 shadow-sm shadow-emerald-500/10"
            >
              <MaterialCommunityIcons name="keyboard-outline" size={16} color="#10b981" />
              <Text className="text-white text-xs font-bold">Type Barcode Manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Manual Barcode Entry Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/75"
        >
          <Pressable
            className="flex-1"
            onPress={() => setManualModalVisible(false)}
          />
          <View className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-6 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center">
                  <MaterialCommunityIcons name="barcode-scan" size={16} color="#10b981" />
                </View>
                <View>
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className="text-white text-base"
                  >
                    Enter Barcode Digits
                  </Text>
                  <Text className="text-zinc-400 text-[11px]">
                    Found on packaging (EAN-13, UPC-A, 8–13 digits)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setManualModalVisible(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Input field */}
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-4 flex-row items-center">
              <TextInput
                value={manualBarcodeText}
                onChangeText={setManualBarcodeText}
                placeholder="e.g. 737628064502"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (manualBarcodeText.trim()) {
                    processBarcode(manualBarcodeText);
                  }
                }}
                className="flex-1 text-white text-lg font-mono font-bold"
                autoFocus
              />
              {manualBarcodeText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setManualBarcodeText('')}
                  className="p-1"
                >
                  <Ionicons name="close-circle" size={18} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={() => {
                if (manualBarcodeText.trim()) {
                  processBarcode(manualBarcodeText);
                }
              }}
              disabled={!manualBarcodeText.trim() || isProcessing}
              activeOpacity={0.8}
              className={`py-3.5 rounded-2xl items-center justify-center flex-row gap-2 ${
                manualBarcodeText.trim() && !isProcessing
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                  : 'bg-zinc-800 opacity-50'
              }`}
            >
              <MaterialCommunityIcons name="magnify" size={18} color="#ffffff" />
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-sm"
              >
                Lookup Product Nutrition
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Overlay with Animated Sia Scanning Mascot & Moving Bar */}
      {isProcessing && (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}
          className="bg-black/92 items-center justify-center px-8"
        >
          <View className="bg-zinc-900 border border-emerald-500/40 p-6 rounded-3xl items-center w-full max-w-xs shadow-2xl shadow-emerald-500/30">
            {/* Animated Sia Scanner Hero */}
            <View className="mb-2">
              <SiaMascotHero
                size={92}
                pose="scanner"
                badge="AI SCANNING"
                withGlow={true}
              />
            </View>

            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-white text-base text-center mt-1"
            >
              {processingStatus}
            </Text>

            <Text className="text-emerald-400 text-xs mt-1.5 text-center font-bold">
              🐾 Sia's aperture eye is calculating macros...
            </Text>

            {/* Active Moving Progress Bar */}
            <View className="mt-4 w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
              <Animated.View
                style={{
                  width: processingProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['5%', '100%'],
                  }),
                }}
                className="h-full bg-emerald-400 rounded-full"
              />
            </View>
          </View>
        </View>
      )}

      {/* Playful Non-Food Feline Rejection Modal */}
      <Modal
        visible={!!nonFoodModalText}
        transparent
        animationType="fade"
        onRequestClose={() => setNonFoodModalText(null)}
      >
        <View className="flex-1 bg-black/85 items-center justify-center px-6">
          <View className="bg-zinc-900 border border-rose-500/40 p-6 rounded-3xl items-center w-full max-w-sm shadow-2xl shadow-rose-500/25">
            <View className="mb-2">
              <SiaMascotHero
                size={88}
                pose="chef"
                badge="NOT EDIBLE"
                withGlow={false}
              />
            </View>

            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-white text-lg text-center mt-2"
            >
              Sia Can't Eat That! 🐾
            </Text>

            <Text className="text-zinc-300 text-xs text-center leading-relaxed mt-2 px-2">
              {nonFoodModalText}
            </Text>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setNonFoodModalText(null);
              }}
              activeOpacity={0.8}
              className="mt-5 w-full bg-emerald-500 active:bg-emerald-600 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 shadow-md shadow-emerald-500/30"
            >
              <Ionicons name="camera" size={16} color="#ffffff" />
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-sm font-bold uppercase tracking-wider"
              >
                Scan Actual Food
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
