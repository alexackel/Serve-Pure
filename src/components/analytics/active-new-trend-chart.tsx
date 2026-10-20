import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ActiveNewTrendPoint } from '@/types/analytics';
import { abbreviateNumber } from '@/utils/format-number';

function formatBucketLabel(isoDate: string, granularity: ActiveNewTrendPoint['bucketGranularity']): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (granularity === 'month') return date.toLocaleDateString('en-US', { month: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActiveNewTrendChart({ data }: { data: ActiveNewTrendPoint[] }) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  const totalNew = data.reduce((sum, point) => sum + point.newVolunteers, 0);
  const totalReturning = data.reduce((sum, point) => sum + point.returningVolunteers, 0);
  const summary = `Active vs. new volunteers: ${abbreviateNumber(totalNew)} new and ${abbreviateNumber(totalReturning)} returning across ${data.length} ${data[0]?.bucketGranularity ?? 'period'}${data.length === 1 ? '' : 's'}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  const chartWidth = Math.max(containerWidth - Spacing.four * 2, 0);
  const barSpacing = data.length > 1 ? Math.max(chartWidth / data.length - 24, 8) : 8;

  const stackData = data.map((point) => ({
    label: formatBucketLabel(point.bucketStart, point.bucketGranularity),
    stacks: [
      { value: point.newVolunteers, color: theme.chartSuccess },
      { value: point.returningVolunteers, color: theme.chartPrimary },
    ],
  }));

  // Same label-truncation workaround as hours-trend-chart.tsx: gifted-charts
  // rounds down (not to nearest) fractional auto-computed y-axis steps.
  const noOfSections = 4;
  const maxBucketTotal = Math.max(1, ...data.map((point) => point.newVolunteers + point.returningVolunteers));
  const yAxisLabelTexts = Array.from({ length: noOfSections + 1 }, (_, i) =>
    abbreviateNumber(Math.round((maxBucketTotal * i) / noOfSections)),
  );

  return (
    <View onLayout={handleLayout} accessible accessibilityLabel={summary}>
      <View style={styles.legend}>
        <LegendDot color={theme.chartSuccess} label="New" />
        <LegendDot color={theme.chartPrimary} label="Returning" />
      </View>

      {containerWidth > 0 && (
        <BarChart
          stackData={stackData}
          width={chartWidth}
          height={200}
          spacing={barSpacing}
          initialSpacing={12}
          barBorderRadius={4}
          xAxisColor={theme.border}
          yAxisColor={theme.border}
          yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
          noOfSections={noOfSections}
          maxValue={maxBucketTotal}
          yAxisLabelTexts={yAxisLabelTexts}
          disableScroll
          isAnimated
          renderTooltip={(item: { stacks: { value: number }[] }) => (
            <View style={[styles.tooltip, { backgroundColor: theme.text }]}>
              <ThemedText type="caption" style={{ color: theme.background }}>
                {abbreviateNumber(item.stacks[0]?.value ?? 0)} new, {abbreviateNumber(item.stacks[1]?.value ?? 0)} returning
              </ThemedText>
            </View>
          )}
        />
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export function ActiveNewTrendEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No volunteer activity yet for this range.
      </ThemedText>
    </View>
  );
}

export function ActiveNewTrendSkeleton() {
  const theme = useTheme();
  return <View style={[styles.skeleton, { backgroundColor: theme.backgroundElement }]} />;
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltip: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  skeleton: {
    height: 200,
    borderRadius: BorderRadius.md,
  },
});
