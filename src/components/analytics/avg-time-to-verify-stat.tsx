import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AvgTimeToVerifyStat as AvgTimeToVerifyStatType } from '@/types/analytics';

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

// Not a chart — the brief gives this metric no trend/breakdown framing, so
// it's a single stat (no card wrapper of its own; SectionContainer supplies
// the card, same as every other Phase 2 section).
export function AvgTimeToVerifyStat({ stat }: { stat: AvgTimeToVerifyStatType }) {
  const value = stat.avgHoursToVerify === null ? '—' : formatHours(stat.avgHoursToVerify);
  const summary = `Average time to verify: ${value}, based on ${stat.sampleSize} verified event${stat.sampleSize === 1 ? '' : 's'}.`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  return (
    <View accessible accessibilityLabel={summary}>
      <ThemedText type="h1">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        Based on {stat.sampleSize} verified event{stat.sampleSize === 1 ? '' : 's'} in this range
      </ThemedText>
    </View>
  );
}

export function AvgTimeToVerifySkeleton() {
  const theme = useTheme();
  return <View style={[styles.skeleton, { backgroundColor: theme.backgroundElement }]} />;
}

const styles = StyleSheet.create({
  skeleton: {
    height: 64,
    borderRadius: 12,
    width: 160,
    marginTop: Spacing.one,
  },
});
