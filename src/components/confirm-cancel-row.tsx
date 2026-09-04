import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ConfirmCancelRow({
  cancelLabel = 'Cancel',
  confirmLabel,
  onCancel,
  onConfirm,
  confirmColor = 'primary',
  style,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmColor?: 'primary' | 'error';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const confirmBackground = theme[confirmColor];

  return (
    <View style={[styles.row, style]}>
      <Pressable onPress={onCancel} style={[styles.actionButton, { borderColor: theme.border }]}>
        <ThemedText type="bodyBold">{cancelLabel}</ThemedText>
      </Pressable>
      <Pressable
        onPress={onConfirm}
        style={[styles.actionButton, { backgroundColor: confirmBackground, borderColor: confirmBackground }]}>
        <ThemedText type="bodyBold" themeColor="background">
          {confirmLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
});
