import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { SegmentedTabs } from '@/components/segmented-tabs';
import { DatePickerField } from '@/components/date-picker-field';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Overlay, Spacing } from '@/constants/theme';
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@/hooks/use-analytics-date-range';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

export type DateRangePickerProps = {
  preset: DateRangePreset;
  onSelectPreset: (preset: DateRangePreset) => void;
  onSelectCustomRange: (start: Date, end: Date) => void;
};

export function DateRangePicker({ preset, onSelectPreset, onSelectCustomRange }: DateRangePickerProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  function handleSelect(key: DateRangePreset) {
    if (key === 'custom') {
      setCustomModalOpen(true);
      return;
    }
    onSelectPreset(key);
  }

  function applyCustomRange() {
    if (draftStart && draftEnd) {
      onSelectCustomRange(draftStart, draftEnd);
      setCustomModalOpen(false);
    }
  }

  return (
    <>
      <SegmentedTabs tabs={DATE_RANGE_PRESETS} activeKey={preset} onChange={handleSelect} />

      {customModalOpen && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setCustomModalOpen(false)}>
          <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomModalOpen(false)} />
          </View>
          <View style={styles.centerWrap}>
            <View style={[styles.card, cardShadow, { backgroundColor: theme.background }]}>
              <ThemedText type="h3">Custom range</ThemedText>
              <DatePickerField label="Start" value={draftStart} onChange={setDraftStart} allowToday />
              <DatePickerField label="End" value={draftEnd} onChange={setDraftEnd} allowToday />
              <Pressable
                onPress={applyCustomRange}
                disabled={!draftStart || !draftEnd}
                style={[styles.applyButton, { backgroundColor: theme.primary, opacity: draftStart && draftEnd ? 1 : 0.5 }]}>
                <ThemedText type="bodyBold" themeColor="background">
                  Apply
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: Overlay.backdrop,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: 320,
    maxWidth: '100%',
    gap: Spacing.three,
  },
  applyButton: {
    minHeight: 44,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
