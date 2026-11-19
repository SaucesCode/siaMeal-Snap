import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tap } from '../../components/Tap';
import { palette, radius, space, type } from '../../theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** The one action at the bottom (e.g. "Save"). */
  actionLabel: string;
  onAction: () => void;
  busy?: boolean;
  children: React.ReactNode;
}

/** Cream bottom sheet used by the Me screen's editors: title, close, content, one primary button. */
export function Sheet({ visible, title, onClose, actionLabel, onAction, busy = false, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
        <Tap style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={20} color={palette.text} />
            </Tap>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <Tap
            onPress={onAction}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color={palette.pointText} /> : <Text style={styles.actionText}>{actionLabel}</Text>}
          </Tap>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One choice in a sheet's list (goal, activity, diet style). */
export function Option({ title, detail, selected, onPress }: { title: string; detail: string; selected: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleOn]}>{title}</Text>
        <Text style={[styles.optionDetail, selected && styles.optionDetailOn]}>{detail}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={palette.pointText} />}
    </Tap>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: palette.pointDeep, opacity: 0.6 },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: palette.bg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space[3] },
  title: { flex: 1, fontFamily: type.display, fontSize: type.size.section + 3, color: palette.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  pressed: { opacity: 0.7 },
  body: { flexGrow: 0 },
  bodyContent: { gap: space[2], paddingBottom: space[3] },
  action: { minHeight: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.point },
  actionText: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.pointText },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    padding: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  optionOn: { backgroundColor: palette.point, borderColor: palette.point },
  optionTitle: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  optionTitleOn: { color: palette.pointText },
  optionDetail: { fontFamily: type.body, fontSize: type.size.caption, lineHeight: 17, color: palette.textMuted, marginTop: 2 },
  optionDetailOn: { color: palette.pointMuted },
});
