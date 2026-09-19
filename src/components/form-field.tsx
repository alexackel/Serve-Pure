import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
};

// The one generalized label+input+error field for the create-event and
// self-upload forms — styled after create-group-panel.tsx's inline input,
// the only other text-input pattern in the codebase before this.
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required,
  multiline,
  keyboardType,
}: FormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
        {required ? ' *' : ''}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, borderColor: error ? theme.error : theme.border },
        ]}
      />
      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
