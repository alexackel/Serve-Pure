import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { FilterPill } from '@/components/find/filter-pill';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { FindPillDescriptor, FindPillKey } from '@/utils/find-filters';

export function FindPillRow({
  pills,
  onPressPill,
  showClearAll,
  onClearAll,
}: {
  pills: readonly FindPillDescriptor[];
  onPressPill: (key: FindPillKey) => void;
  showClearAll: boolean;
  onClearAll: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {pills.map((pill) => (
        <FilterPill
          key={pill.key}
          label={pill.label}
          active={pill.active}
          valueHint={pill.valueHint}
          variant={pill.key === 'sort' ? 'sort' : 'filter'}
          onPress={() => onPressPill(pill.key)}
        />
      ))}
      {showClearAll && (
        <Pressable onPress={onClearAll} style={styles.clearAll}>
          <ThemedText type="label" themeColor="error">
            Clear all
          </ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  clearAll: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
