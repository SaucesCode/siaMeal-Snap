import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { compressImage, analyzeMealPhoto, NotFoodError } from '../../services/aiService';
import { lookupBarcode } from '../../services/barcodeService';
import { useMealStore } from '../../stores/mealStore';
import { hapticFeedback } from '../../utils/haptics';
import { getDefaultMealType } from '../../utils/nutrition';
import { MEAL_TYPES, mealTypeLabel } from '../../constants/mealTypes';
import { MealType } from '../../types';
import { Sia } from '../../components/sia';
import { TextLogModal } from '../../components/TextLogModal';
import { SiaPeek } from '../../features/sia/SiaPeek';
import type { SiaReaction } from '../../features/sia/siaReactions';
import { EyeViewfinder } from '../../features/camera/EyeViewfinder';
import { NotFoodSheet } from '../../features/camera/NotFoodSheet';
import type { ViewfinderMode } from '../../features/camera/viewfinderGeometry';
import { palette, radius, space, type } from '../../theme';
import { Tap } from '../../components/Tap';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] as const;
const LOOKING = { title: 'Looking at your plate…', subtitle: 'Usually takes a few seconds.' };
const LOOKING_UP = { title: 'Looking up the barcode…', subtitle: 'Usually takes a few seconds.' };
const SHUTTER = 72;

const isMealType = (v: unknown): v is MealType => MEAL_TYPES.some((m) => m.type === v);
const nextMealType = (t: MealType): MealType => MEAL_TYPES[(MEAL_TYPES.findIndex((m) => m.type === t) + 1) % MEAL_TYPES.length].type;

function RoundButton({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.round, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={22} color={palette.pointText} />
    </Tap>
  );
}

/** Snap a meal through Sia's eye (or scan a barcode); Sia looks at it, then Review. */
export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: string; meal_type?: string }>();
  const router = useRouter();
  const setDraftMeal = useMealStore((s) => s.setDraftMeal);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [mode, setMode] = useState<ViewfinderMode>(params.mode === 'barcode' ? 'barcode' : 'photo');
  const [mealType, setMealType] = useState<MealType>(isMealType(params.meal_type) ? params.meal_type : getDefaultMealType());
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<null | typeof LOOKING>(null);
  const [frozenUri, setFrozenUri] = useState<string | null>(null);
  const [notFood, setNotFood] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [barcodeEntry, setBarcodeEntry] = useState(false);
  const [barcodeText, setBarcodeText] = useState('');
  const lastBarcode = useRef<string | null>(null);

  useEffect(() => {
    if (params.mode === 'barcode' || params.mode === 'photo') setMode(params.mode);
  }, [params.mode]);
  useEffect(() => {
    if (isMealType(params.meal_type)) setMealType(params.meal_type);
  }, [params.meal_type]);

  const thinking = useMemo<SiaReaction>(() => ({ expression: 'thinking', line: null, spot: 'center' }), []);

  const resetView = () => {
    setNotFood(null);
    setFrozenUri(null);
  };

  const analyzePhoto = async (uri: string) => {
    setFrozenUri(uri);
    setBusy(LOOKING);
    try {
      const compressed = await compressImage(uri);
      const result = await analyzeMealPhoto(compressed.base64);
      setDraftMeal({
        name: result.meal_name || 'Logged Meal',
        meal_type: mealType,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        fiber_g: result.fiber_g,
        sugar_g: result.sugar_g,
        sodium_mg: result.sodium_mg,
        food_items: result.ingredients,
        image_url: compressed.uri,
        confidence_score: result.confidence_score,
        portion_notes: result.portion_notes,
        dietary_tags: result.dietary_tags,
        feline_verdict: result.feline_verdict,
      });
      hapticFeedback.success();
      setFrozenUri(null);
      router.push('/review' as any);
    } catch (err: any) {
      if (err instanceof NotFoodError) {
        hapticFeedback.medium();
        setNotFood(err.message);
      } else {
        hapticFeedback.error();
        setFrozenUri(null);
        Alert.alert("Couldn't read that photo", err?.message || 'Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const capture = async () => {
    if (busy) return;
    hapticFeedback.medium();
    let uri: string | null = null;
    try {
      uri = (await cameraRef.current?.takePictureAsync({ quality: 0.7 }))?.uri ?? null;
    } catch (camErr) {
      console.warn('CameraView capture failed, falling back to the system camera:', camErr);
    }
    if (!uri) {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] });
      uri = !result.canceled ? result.assets[0]?.uri ?? null : null;
    }
    if (uri) await analyzePhoto(uri);
  };

  const pickFromGallery = async () => {
    if (busy) return;
    hapticFeedback.light();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]?.uri) await analyzePhoto(result.assets[0].uri);
  };

  const lookUp = async (raw: string) => {
    const code = raw.trim();
    if (!code || busy) return;
    setBusy(LOOKING_UP);
    hapticFeedback.light();
    try {
      const product = await lookupBarcode(code);
      if (product?.found) {
        hapticFeedback.success();
        setDraftMeal({
          name: product.productName,
          meal_type: mealType,
          calories: product.calories,
          protein_g: product.protein_g,
          carbs_g: product.carbs_g,
          fat_g: product.fat_g,
          food_items: product.ingredients,
          image_url: product.imageUrl || null,
          confidence_score: 1.0,
          portion_notes: product.portion_notes || `Per ${product.servingSize || '1 serving'}, from the package label.`,
          dietary_tags: product.dietary_tags,
        });
        setBarcodeEntry(false);
        setBarcodeText('');
        router.push('/review' as any);
      } else {
        hapticFeedback.error();
        Alert.alert("We couldn't find that barcode", 'Try a photo of the food or its label instead.', [
          { text: 'Use a photo', onPress: () => { setBarcodeEntry(false); setMode('photo'); } },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } catch {
      hapticFeedback.error();
      Alert.alert("Couldn't look that up", 'Check your connection and try again.');
    } finally {
      setBusy(null);
      setTimeout(() => (lastBarcode.current = null), 2000);
    }
  };

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (busy || !data || data === lastBarcode.current) return;
    lastBarcode.current = data;
    lookUp(data);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.pointText} />
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView style={[styles.centered, styles.cream]}>
        <Sia expression="resting" size={96} animated={false} />
        <Text style={styles.permTitle}>Snap your meals</Text>
        <Text style={styles.permBody}>SiaMeal needs your camera to see what you're eating. Photos stay private to you.</Text>
        <Tap
          onPress={blocked ? () => Linking.openSettings() : requestPermission}
          accessibilityRole="button"
          style={({ pressed }) => [styles.permButton, pressed && styles.pressed]}
        >
          <Text style={styles.permButtonText}>{blocked ? 'Open settings' : 'Allow camera'}</Text>
        </Tap>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={(ref) => {
          cameraRef.current = ref;
        }}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        mode="picture"
        barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: [...BARCODE_TYPES] } : undefined}
        onBarcodeScanned={mode === 'barcode' && !barcodeEntry ? onBarcodeScanned : undefined}
      />
      <EyeViewfinder
        mode={mode}
        focusing={busy === LOOKING}
        frozenUri={frozenUri}
        hint={notFood ? '' : mode === 'photo' ? 'Fit your plate in the circle' : 'Line up the barcode'}
        status={busy}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View pointerEvents="box-none">
        <View style={styles.top}>
          <RoundButton icon="close" label="Close camera" onPress={() => router.back()} />
          <View style={styles.modes} accessibilityRole="tablist">
            {(['photo', 'barcode'] as const).map((m) => (
              <Tap
                key={m}
                onPress={() => {
                  hapticFeedback.selection();
                  setMode(m);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                style={[styles.mode, mode === m && styles.modeOn]}
              >
                <Text style={[styles.modeText, mode === m && styles.modeTextOn]}>{m === 'photo' ? 'Photo' : 'Barcode'}</Text>
              </Tap>
            ))}
          </View>
          <RoundButton icon={torch ? 'flash' : 'flash-off'} label={torch ? 'Turn flash off' : 'Turn flash on'} onPress={() => setTorch((t) => !t)} />
        </View>

        <Tap
          onPress={() => {
            hapticFeedback.selection();
            setMealType(nextMealType(mealType));
          }}
          accessibilityRole="button"
          accessibilityLabel={`Meal: ${mealTypeLabel(mealType)}`}
          accessibilityHint="Changes to the next meal"
          style={({ pressed }) => [styles.mealChip, pressed && styles.pressed]}
        >
          <Text style={styles.mealChipText}>{mealTypeLabel(mealType)}</Text>
          <Ionicons name="chevron-down" size={14} color={palette.pointText} />
        </Tap>
        </View>

        <View style={styles.bottom}>
          {busy === LOOKING && <SiaPeek reaction={thinking} startHidden />}
          {mode === 'photo' ? (
            <View style={styles.controls}>
              <RoundButton icon="images-outline" label="Choose from your photos" onPress={pickFromGallery} disabled={!!busy} />
              <Tap
                onPress={capture}
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
                style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed, busy && styles.disabled]}
              >
                <View style={styles.shutterDot} />
              </Tap>
              <RoundButton
                icon="camera-reverse-outline"
                label="Flip camera"
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                disabled={!!busy}
              />
            </View>
          ) : (
            <View style={styles.controls}>
              <Tap
                onPress={() => setBarcodeEntry(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.typeButton, pressed && styles.pressed]}
              >
                <Ionicons name="keypad-outline" size={18} color={palette.text} />
                <Text style={styles.typeButtonText}>Type the number</Text>
              </Tap>
            </View>
          )}
        </View>
      </SafeAreaView>

      {notFood && (
        <NotFoodSheet
          reason={notFood}
          onTryAgain={resetView}
          onTypeInstead={() => {
            resetView();
            setTyping(true);
          }}
        />
      )}

      {typing && (
        <TextLogModal
          visible
          onClose={() => setTyping(false)}
          onSuccess={() => {
            setTyping(false);
            router.push('/review' as any);
          }}
          initialMealType={mealType}
        />
      )}

      <Modal visible={barcodeEntry} transparent animationType="slide" onRequestClose={() => setBarcodeEntry(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetBackdrop}>
          <Tap style={styles.backdrop} onPress={() => setBarcodeEntry(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Type the barcode number</Text>
            <Text style={styles.sheetBody}>The digits under the stripes, usually 8 to 13.</Text>
            <TextInput
              value={barcodeText}
              onChangeText={setBarcodeText}
              placeholder="e.g. 4800016644290"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={() => lookUp(barcodeText)}
              accessibilityLabel="Barcode number"
              style={styles.sheetInput}
              autoFocus
            />
            <Tap
              onPress={() => lookUp(barcodeText)}
              disabled={!barcodeText.trim() || !!busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: !barcodeText.trim() || !!busy, busy: !!busy }}
              style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed, (!barcodeText.trim() || busy) && styles.disabled]}
            >
              {busy ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.sheetButtonText}>Look it up</Text>}
            </Tap>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.pointDeep },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: palette.pointDeep },
  cream: { backgroundColor: palette.bg },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[3], paddingTop: space[2] },
  round: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.point,
  },
  modes: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: palette.point },
  mode: { minHeight: 42, paddingHorizontal: space[4], borderRadius: radius.full, justifyContent: 'center' },
  modeOn: { backgroundColor: palette.pointText },
  modeText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointMuted },
  modeTextOn: { color: palette.text },
  mealChip: {
    marginTop: space[2],
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 40,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: palette.point,
  },
  mealChipText: { fontFamily: type.bodyBold, fontSize: type.size.secondary, color: palette.pointText },
  bottom: { paddingBottom: space[4] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: space[4], minHeight: SHUTTER + 12 },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 5,
    borderColor: palette.bg,
    backgroundColor: palette.shutter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  shutterDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: palette.shutterGlyph },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: space[6],
    borderRadius: radius.full,
    backgroundColor: palette.pointText,
  },
  typeButtonText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  permTitle: { fontFamily: type.display, fontSize: type.size.title, color: palette.text, marginTop: space[4] },
  permBody: { fontFamily: type.body, fontSize: type.size.body, lineHeight: 21, color: palette.textMuted, textAlign: 'center', marginTop: space[2], maxWidth: 320 },
  permButton: {
    minHeight: 52,
    marginTop: space[6],
    paddingHorizontal: space[8],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.shutter,
  },
  permButtonText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.shutterGlyph },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: { padding: space[6], borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, backgroundColor: palette.bg },
  sheetTitle: { fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  sheetBody: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted, marginTop: space[1] },
  sheetInput: {
    minHeight: 52,
    marginTop: space[4],
    paddingHorizontal: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    fontFamily: type.displayBold,
    fontSize: type.size.section,
    color: palette.text,
    letterSpacing: 1,
  },
  sheetButton: {
    minHeight: 52,
    marginTop: space[3],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.point,
  },
  sheetButtonText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
});
