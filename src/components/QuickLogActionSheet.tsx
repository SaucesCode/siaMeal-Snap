import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MealType } from '../types';
import { hapticFeedback } from '../utils/haptics';
import { Tap } from './Tap';
import { palette, radius, space, type } from '../theme';

interface QuickLogActionSheetProps {
  visible: boolean;
  mealType: MealType;
  categoryTitle: string;
  onClose: () => void;
  onSelectCamera: (type: MealType) => void;
  onSelectText: (type: MealType) => void;
  onSelectBarcode: (type: MealType) => void;
  onSelectGallery: (type: MealType) => void;
  onSelectLogAgain?: (type: MealType) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** The "+" on a meal: snap, pick a photo, scan a barcode, type it, or log something again. */
export function QuickLogActionSheet({
  visible,
  mealType,
  categoryTitle,
  onClose,
  onSelectCamera,
  onSelectText,
  onSelectBarcode,
  onSelectGallery,
  onSelectLogAgain,
}: QuickLogActionSheetProps) {
  if (!visible) return null;

  const choose = (fn: (t: MealType) => void) => {
    hapticFeedback.light();
    onClose();
    fn(mealType);
  };

  const options: Array<{ icon: IoniconName; title: string; detail: string; onPress: () => void; primary?: boolean }> = [
    { icon: 'camera', title: 'Snap a photo', detail: 'Sia counts it from the picture', onPress: () => choose(onSelectCamera), primary: true },
    { icon: 'images-outline', title: 'Pick a photo', detail: 'From your gallery', onPress: () => choose(onSelectGallery) },
    { icon: 'barcode-outline', title: 'Scan a barcode', detail: 'For packaged food', onPress: () => choose(onSelectBarcode) },
    { icon: 'create-outline', title: 'Type it', detail: 'Describe what you ate', onPress: () => choose(onSelectText) },
    ...(onSelectLogAgain
      ? [{ icon: 'repeat' as IoniconName, title: 'Log again', detail: 'Something from the last two weeks', onPress: () => choose(onSelectLogAgain) }]
      : []),
  ];

  return (
    <View style={styles.overlay}>
      <Tap style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Add {categoryTitle.toLowerCase()}
          </Text>
          <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={palette.text} />
          </Tap>
        </View>
        {options.map((o) => (
          <Tap
            key={o.title}
            onPress={o.onPress}
            accessibilityRole="button"
            accessibilityHint={o.detail}
            style={({ pressed }) => [styles.option, o.primary && styles.optionPrimary, pressed && styles.pressed]}
          >
            <View style={[styles.icon, o.primary && styles.iconPrimary]}>
              <Ionicons name={o.icon} size={20} color={o.primary ? palette.shutterGlyph : palette.text} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.optionTitle, o.primary && styles.optionTitlePrimary]}>{o.title}</Text>
              <Text style={[styles.optionDetail, o.primary && styles.optionDetailPrimary]}>{o.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={o.primary ? palette.pointMuted : palette.textMuted} />
          </Tap>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: {
    gap: space[2],
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  optionPrimary: { backgroundColor: palette.point, borderColor: palette.point },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
  iconPrimary: { backgroundColor: palette.shutter },
  optionTitle: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  optionTitlePrimary: { color: palette.pointText },
  optionDetail: { fontFamily: type.body, fontSize: type.size.caption, color: palette.textMuted, marginTop: 2 },
  optionDetailPrimary: { color: palette.pointMuted },
});
