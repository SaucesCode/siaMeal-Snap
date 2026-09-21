import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { compressImage, analyzeMealPhoto } from '../../services/aiService';
import { lookupBarcode } from '../../services/barcodeService';
import { useMealStore } from '../../stores/mealStore';
import { hapticFeedback } from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { MealType } from '../../types';

type ScanMode = 'photo' | 'barcode';

export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: string; meal_type?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(
    params.mode === 'barcode' ? 'barcode' : 'photo'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Analyzing meal...');
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();
  const setDraftMeal = useMealStore((state) => state.setDraftMeal);

  React.useEffect(() => {
    if (params.mode === 'barcode') {
      setScanMode('barcode');
    } else if (params.mode === 'photo') {
      setScanMode('photo');
    }
  }, [params.mode]);

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
        <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center mb-4">
          <Ionicons name="camera" size={32} color="#10b981" />
        </View>
        <Text className="text-white text-xl font-bold mb-2 text-center">Camera Access Required</Text>
        <Text className="text-zinc-400 text-sm text-center mb-6">
          We need camera access to photograph your meals or scan barcodes to estimate calories and macronutrients.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-emerald-500 active:bg-emerald-600 px-6 py-3.5 rounded-2xl"
        >
          <Text className="text-white font-bold text-base">Grant Permission</Text>
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

      // 2. Invoke Supabase Edge Function
      setProcessingStatus('Analyzing meal nutrients with AI...');
      const result = await analyzeMealPhoto(compressed.base64);

      // 3. Set draft meal in store and navigate to Review & Edit screen
      setDraftMeal({
        name: result.meal_name || 'Logged Meal',
        meal_type: (params.meal_type as MealType) || 'snack',
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        food_items: result.ingredients,
        image_url: compressed.uri,
      });

      router.push('/review' as any);
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      Alert.alert('Analysis Error', err.message || 'Could not analyze the photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (isProcessing) return;

    try {
      hapticFeedback.medium();
      setIsProcessing(true);
      setProcessingStatus('Capturing photo...');

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
      console.error('Failed to take photo:', err);
      Alert.alert('Camera Error', err.message || 'Could not capture photo. Try choosing from gallery.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const rawData = result.data;
    if (isProcessing || !rawData || rawData === lastScannedBarcode) return;

    setLastScannedBarcode(rawData);
    setIsProcessing(true);
    setProcessingStatus(`Looking up barcode ${rawData}...`);

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
        });

        router.push('/review' as any);
      } else {
        Alert.alert(
          'Product Not Found',
          `Barcode ${rawData} wasn't found in OpenFoodFacts database. You can take a photo of the food or nutrition label instead.`,
          [
            { text: 'Switch to Photo Mode', onPress: () => setScanMode('photo') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      Alert.alert('Scan Error', 'Could not retrieve product information.');
    } finally {
      setIsProcessing(false);
      // Reset scan debounce after 2 seconds
      setTimeout(() => setLastScannedBarcode(null), 2000);
    }
  };

  const handlePickFromGallery = async () => {
    if (isProcessing) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await processImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Gallery pick error:', err);
      Alert.alert('Gallery Error', 'Could not select photo.');
    }
  };

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
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Mode Switcher Pill */}
            <View className="flex-row bg-black/70 p-1 rounded-full border border-white/15">
              <TouchableOpacity
                onPress={() => setScanMode('photo')}
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
                  className={`text-xs font-bold ${
                    scanMode === 'photo' ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setScanMode('barcode')}
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
                  className={`text-xs font-bold ${
                    scanMode === 'barcode' ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Barcode
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setTorch((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-black/60 items-center justify-center border border-white/10"
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-off'}
                size={20}
                color={torch ? '#facc15' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Scanner Reticle (in Photo & Barcode modes) */}
        {scanMode === 'photo' ? (
          <View className="items-center justify-center px-8 pointer-events-none">
            <View className="w-72 h-72 rounded-3xl border border-dashed border-emerald-500/40 items-center justify-center bg-black/10 relative">
              {/* Corner Targeting Accents */}
              <View className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <View className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <View className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <View className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

              {/* Sia Center Reticle Tag */}
              <View className="bg-black/75 px-3.5 py-1.5 rounded-full border border-emerald-500/40 flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                <Ionicons name="scan-outline" size={13} color="#10b981" />
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-[11px] tracking-wide"
                >
                  Sia Optical Scanner
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center justify-center px-8">
            <View className="w-64 h-48 border-2 border-emerald-400/80 rounded-3xl items-center justify-center bg-black/20 relative">
              <View className="w-full h-0.5 bg-emerald-400" style={{ elevation: 4 }} />
              <View className="absolute -bottom-8 bg-black/70 px-4 py-1.5 rounded-full border border-white/10">
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

              {/* Big Shutter Button */}
              <Pressable
                onPress={handleCapture}
                disabled={isProcessing}
                hitSlop={15}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: isProcessing ? 0.5 : 1,
                  },
                ]}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center p-1 bg-white/20"
              >
                <View className="w-full h-full rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
              </Pressable>

              {/* Flip Camera */}
              <TouchableOpacity
                onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                disabled={isProcessing}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/25 items-center justify-center active:opacity-60"
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="pb-8 pt-4 items-center">
            <Text className="text-zinc-400 text-xs font-medium">
              Scanning barcodes automatically...
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Loading Overlay */}
      {isProcessing && (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}
          className="bg-black/85 items-center justify-center px-8"
        >
          <View className="bg-zinc-900 border border-emerald-500/30 p-6 rounded-3xl items-center w-full max-w-xs shadow-2xl shadow-emerald-500/20">
            <ActivityIndicator size="large" color="#10b981" />
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-base mt-4 text-center"
            >
              {processingStatus}
            </Text>
            <Text className="text-emerald-400 text-xs mt-1 text-center font-semibold">
              Sia is estimating macronutrients...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
