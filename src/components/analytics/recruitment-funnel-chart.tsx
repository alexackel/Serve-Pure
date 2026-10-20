import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FunnelStage } from '@/types/analytics';
import { abbreviateNumber, formatPercent } from '@/utils/format-number';

// gifted-charts has no funnel chart type, so this is hand-built: one
// full-width-scaled horizontal bar per stage, each bar's width relative to
// the first stage's count (the funnel's starting cohort size).
export function RecruitmentFunnelChart({ stages }: { stages: FunnelStage[] }) {
  const theme = useTheme();
  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  const baseline = sorted[0]?.volunteerCount ?? 0;

  const summary = `Recruitment funnel: ${sorted.map((stage) => `${stage.stage} ${abbreviateNumber(stage.volunteerCount)}`).join(', ')}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  return (
    <View style={styles.container} accessible accessibilityLabel={summary}>
      {sorted.map((stage, index) => {
        const widthPercent = baseline === 0 ? 0 : Math.max((stage.volunteerCount / baseline) * 100, stage.volunteerCount > 0 ? 4 : 0);
        const conversionFromStart = index === 0 || baseline === 0 ? null : (stage.volunteerCount / baseline) * 100;
        // Opacity step: one hue (chartPrimary), darkest at the top of the
        // funnel — avoids needing a dedicated per-stage color token.
        const opacity = 1 - index * 0.25;
        return (
          <View key={stage.stage} style={styles.stageRow}>
            <View style={styles.stageHeader}>
              <ThemedText type="bodyBold">{stage.stage}</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                {abbreviateNumber(stage.volunteerCount)}
                {conversionFromStart !== null ? ` · ${formatPercent(conversionFromStart)}` : ''}
              </ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.bar,
                  { width: `${widthPercent}%`, backgroundColor: theme.chartPrimary, opacity },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function RecruitmentFunnelEmptyState() {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        No signups yet for this range.
      </ThemedText>
    </View>
  );
}

export function RecruitmentFunnelSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {[100, 75, 50].map((width, index) => (
        <View key={index} style={[styles.skeletonBar, { backgroundColor: theme.backgroundElement, width: `${width}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  stageRow: {
    gap: Spacing.one,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 28,
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
    height: 28,
    borderRadius: BorderRadius.sm,
  },
});
