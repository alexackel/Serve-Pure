import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NewReturningSplit } from '@/types/analytics';
import { abbreviateNumber, formatPercent } from '@/utils/format-number';

export function NewReturningDonut({ split }: { split: NewReturningSplit }) {
  const theme = useTheme();
  const total = split.newVolunteers + split.returningVolunteers;
  const newPercent = total === 0 ? null : (split.newVolunteers / total) * 100;

  const summary = `New vs. returning volunteers: ${abbreviateNumber(split.newVolunteers)} new and ${abbreviateNumber(split.returningVolunteers)} returning.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  const pieData = [
    { value: Math.max(split.newVolunteers, 0.0001), color: theme.chartSuccess, text: 'New' },
    { value: Math.max(split.returningVolunteers, 0.0001), color: theme.chartPrimary, text: 'Returning' },
  ];

  return (
    <View style={styles.row} accessible accessibilityLabel={summary}>
      <PieChart
        data={pieData}
        donut
        radius={70}
        innerRadius={46}
        innerCircleColor={theme.background}
        centerLabelComponent={() => (
          <View style={styles.centerLabel}>
            <ThemedText type="statValue">{formatPercent(newPercent)}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              new
            </ThemedText>
          </View>
        )}
      />
      <View style={styles.legend}>
        <LegendRow color={theme.chartSuccess} label="New" value={abbreviateNumber(split.newVolunteers)} />
        <LegendRow color={theme.chartPrimary} label="Returning" value={abbreviateNumber(split.returningVolunteers)} />
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="body">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export function NewReturningEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No volunteer activity yet for this range.
      </ThemedText>
    </View>
  );
}

export function NewReturningSkeleton() {
  const theme = useTheme();
  return <View style={[styles.skeleton, { backgroundColor: theme.backgroundElement }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.five,
    flexWrap: 'wrap',
  },
  centerLabel: {
    alignItems: 'center',
  },
  legend: {
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  skeleton: {
    height: 160,
    borderRadius: 12,
  },
});
