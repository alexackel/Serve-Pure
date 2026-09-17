import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Unlike FilterPill (which opens a bottom sheet), this is a flat row of
// always-visible toggle chips — there's nothing to configure per category
// beyond picking one, so a sheet would be unnecessary friction.
export function CategoryChipRow<Key extends string>({
  chips,
  activeKey,
  onChange,
}: {
  chips: readonly { key: Key; label: string }[];
  activeKey: Key;
  onChange: (key: Key) => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const active = chip.key === activeKey;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onChange(chip.key)}
            style={[
              styles.chip,
              { borderColor: active ? theme.primary : theme.border },
              active && { backgroundColor: theme.primaryTint },
            ]}>
            <ThemedText type="label" themeColor={active ? 'primary' : 'text'}>
              {chip.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
});
