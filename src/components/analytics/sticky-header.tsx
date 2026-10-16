import { StyleSheet, View } from 'react-native';

import { DateRangePicker, type DateRangePickerProps } from '@/components/analytics/date-range-picker';
import { EventFilterDropdown } from '@/components/analytics/event-filter-dropdown';
import { Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';

export type StickyHeaderProps = DateRangePickerProps & {
  orgId: string;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
};

// A fixed View above the body ScrollView, not scroll-pinning inside it — RN
// has no native position:sticky equivalent without stickyHeaderIndices on a
// list component, and a fixed header achieves the same practical effect
// more simply for a header that never needs to scroll away.
export function StickyHeader({ orgId, preset, onSelectPreset, onSelectCustomRange, selectedEventId, onSelectEvent }: StickyHeaderProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }, breakpoint === 'phone' && styles.phoneContainer]}>
      <View style={breakpoint === 'phone' ? styles.phoneRow : styles.row}>
        <DateRangePicker preset={preset} onSelectPreset={onSelectPreset} onSelectCustomRange={onSelectCustomRange} />
        <View style={breakpoint === 'phone' ? undefined : styles.eventFilterSlot}>
          <EventFilterDropdown orgId={orgId} selectedEventId={selectedEventId} onSelect={onSelectEvent} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  phoneContainer: {
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  phoneRow: {
    gap: Spacing.two,
  },
  eventFilterSlot: {
    flex: 1,
    maxWidth: 280,
  },
});
