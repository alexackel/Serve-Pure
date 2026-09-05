import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FilterPill({
  label,
  active,
  valueHint,
  onPress,
  variant = 'filter',
}: {
  label: string;
  active: boolean;
  valueHint?: string;
  onPress: () => void;
  variant?: 'sort' | 'filter';
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: active ? theme.primary : theme.border },
        active && { backgroundColor: theme.primaryTint },
      ]}>
      {variant === 'sort' && (
        <Ionicons name="swap-vertical" size={14} color={active ? theme.primary : theme.textSecondary} />
      )}
      <ThemedText type="label" themeColor={active ? 'primary' : 'text'}>
        {valueHint ? `${label}: ${valueHint}` : label}
      </ThemedText>
      <Ionicons name="chevron-down" size={14} color={active ? theme.primary : theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
});
