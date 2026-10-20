import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FillNoShowRates } from '@/types/analytics';
import { formatPercent } from '@/utils/format-number';

export function FillNoShowChart({ rates }: { rates: FillNoShowRates }) {
  const theme = useTheme();

  const summary = `Fill rate ${formatPercent(rates.fillRate)}, no-show rate ${formatPercent(rates.noShowRate)}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  return (
    <View style={styles.container} accessible accessibilityLabel={summary}>
      <RateRow
        label="Fill rate"
        caption={`${rates.eventsWithCapacity} of ${rates.eventsTotal} events set a capacity`}
        value={rates.fillRate}
        color={theme.chartPrimary}
        trackColor={theme.backgroundElement}
      />
      <RateRow
        label="No-show rate"
        caption="Of registrations with a known outcome"
        value={rates.noShowRate}
        color={theme.chartWarning}
        trackColor={theme.backgroundElement}
      />
    </View>
  );
}

function RateRow({
  label,
  caption,
  value,
  color,
  trackColor,
}: {
  label: string;
  caption: string;
  value: number | null;
  color: string;
  trackColor: string;
}) {
  const widthPercent = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <ThemedText type="bodyBold">{label}</ThemedText>
        <ThemedText type="h3">{formatPercent(value)}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.bar, { width: `${widthPercent}%`, backgroundColor: color }]} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {caption}
      </ThemedText>
    </View>
  );
}

export function FillNoShowEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No events with outcomes yet for this range.
      </ThemedText>
    </View>
  );
}

export function FillNoShowSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {[0, 1].map((index) => (
        <View key={index} style={[styles.skeletonRow, { backgroundColor: theme.backgroundElement }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  row: {
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 14,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BorderRadius.pill,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  skeletonRow: {
    height: 52,
    borderRadius: BorderRadius.sm,
  },
});
