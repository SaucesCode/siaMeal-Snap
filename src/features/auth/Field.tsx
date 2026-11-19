import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tap } from '../../components/Tap';
import { palette, radius, space, type } from '../../theme';

/** A labelled text field with its own error line; password fields get a show/hide button. */
export function Field({
  label,
  error,
  secure,
  value,
  onText,
  ...input
}: {
  label: string;
  error?: string;
  secure?: boolean;
  value: string;
  onText: (t: string) => void;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText' | 'onChange'>) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, error ? styles.inputError : null]}>
        <TextInput
          value={value}
          onChangeText={onText}
          secureTextEntry={secure && hidden}
          placeholderTextColor={palette.textMuted}
          accessibilityLabel={label}
          style={styles.input}
          {...input}
        />
        {secure && (
          <Tap
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={palette.textMuted} />
          </Tap>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space[3] },
  label: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, marginBottom: space[1] },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: space[4],
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  inputError: { borderColor: palette.over },
  input: { flex: 1, minHeight: 50, fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.text },
  eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.over, marginTop: space[1] },
});
