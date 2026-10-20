import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TopEventRow } from '@/types/analytics';
import { abbreviateNumber } from '@/utils/format-number';

// Hand-built ranked horizontal bars (same approach as the funnel chart)
// rather than gifted-charts' BarChart in horizontal mode — event titles are
// free text of unpredictable length and need their own truncation/layout,
// which this gives full control over.
export function TopEventsChart({ events }: { events: TopEventRow[] }) {
  const theme = useTheme();
  const maxHours = Math.max(1, ...events.map((event) => event.verifiedHours));

  const summary = `Top events by verified hours: ${events
    .slice(0, 3)
    .map((event) => `${event.title}, ${abbreviateNumber(event.verifiedHours)} hours`)
    .join('; ')}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  return (
    <View style={styles.container} accessible accessibilityLabel={summary}>
      {events.map((event) => {
        const widthPercent = Math.max((event.verifiedHours / maxHours) * 100, event.verifiedHours > 0 ? 4 : 0);
        return (
          <View key={event.eventId} style={styles.row}>
            <View style={styles.rowHeader}>
              <ThemedText type="body" numberOfLines={1} style={styles.title}>
                {event.title}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {abbreviateNumber(event.verifiedHours)}h · {event.attendeeCount} attended
              </ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.bar, { width: `${widthPercent}%`, backgroundColor: theme.chartPrimary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function TopEventsEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No verified hours yet for this range.
      </ThemedText>
    </View>
  );
}

export function TopEventsSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {[100, 80, 60, 40].map((width, index) => (
        <View key={index} style={[styles.skeletonBar, { backgroundColor: theme.backgroundElement, width: `${width}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  track: {
    height: 20,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  skeletonBar: {
    height: 20,
    borderRadius: BorderRadius.sm,
  },
});
