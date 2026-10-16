import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HoursTrendPoint } from '@/types/analytics';
import { abbreviateNumber } from '@/utils/format-number';

function formatBucketLabel(isoDate: string, granularity: HoursTrendPoint['bucketGranularity']): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (granularity === 'month') return date.toLocaleDateString('en-US', { month: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HoursTrendChart({ data }: { data: HoursTrendPoint[] }) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  const totalVerified = data.reduce((sum, point) => sum + point.verifiedHours, 0);
  const totalPending = data.reduce((sum, point) => sum + point.pendingHours, 0);
  const summary = `Hours over time: ${abbreviateNumber(totalVerified)} verified and ${abbreviateNumber(totalPending)} pending hours across ${data.length} ${data[0]?.bucketGranularity ?? 'period'}${data.length === 1 ? '' : 's'}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  const chartWidth = Math.max(containerWidth - Spacing.four * 2, 0);
  const barSpacing = data.length > 1 ? Math.max(chartWidth / data.length - 24, 8) : 8;

  const stackData = data.map((point) => ({
    label: formatBucketLabel(point.bucketStart, point.bucketGranularity),
    stacks: [
      { value: point.verifiedHours, color: theme.chartSuccess },
      { value: point.pendingHours, color: theme.chartWarning },
    ],
  }));

  return (
    <View onLayout={handleLayout} accessible accessibilityLabel={summary}>
      <View style={styles.legend}>
        <LegendDot color={theme.chartSuccess} label="Verified" />
        <LegendDot color={theme.chartWarning} label="Pending" />
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
          noOfSections={4}
          disableScroll
          isAnimated
          renderTooltip={(item: { stacks: { value: number }[] }) => (
            <View style={[styles.tooltip, { backgroundColor: theme.text }]}>
              <ThemedText type="caption" style={{ color: theme.background }}>
                {abbreviateNumber(item.stacks[0]?.value ?? 0)} verified, {abbreviateNumber(item.stacks[1]?.value ?? 0)} pending
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

export function HoursTrendEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No hours logged yet for this range.
      </ThemedText>
    </View>
  );
}

export function HoursTrendSkeleton() {
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
