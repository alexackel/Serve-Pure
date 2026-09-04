import { Pressable, StyleSheet, View } from 'react-native';

import { statusColorKey, type VerificationStatus } from '@/components/cards/verification-badge';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HistoryFilterChips<K extends VerificationStatus>({
  filters,
  active,
  onToggle,
}: {
  filters: readonly { key: K; label: string }[];
  active: Set<K>;
  onToggle: (key: K) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.filterRow}>
      {filters.map((filter) => {
        const isActive = active.has(filter.key);
        const dotColor = theme[statusColorKey(filter.key)];

        return (
          <Pressable
            key={filter.key}
            onPress={() => onToggle(filter.key)}
            style={[
              styles.filterChip,
              { borderColor: isActive ? theme.primary : theme.border },
              isActive && { backgroundColor: theme.primaryTint },
            ]}>
            <View style={[styles.filterDot, { backgroundColor: dotColor }]} />
            <ThemedText type="label" themeColor={isActive ? 'primary' : 'textSecondary'}>
              {filter.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
