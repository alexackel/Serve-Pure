import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BarChartEntry = {
  label: string;
  value: number;
  color: string;
};

export type BarChartProps = {
  data: BarChartEntry[];
};

export function BarChart({ data }: BarChartProps) {
  const theme = useTheme();
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const maxValue = Math.max(...data.map((entry) => entry.value), 0);

  if (total <= 0) {
    return (
      <View style={styles.emptyState}>
        <ThemedText type="body" themeColor="textSecondary">
          No hours logged yet
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data
        .filter((entry) => entry.value > 0)
        .map((entry) => (
          <View key={entry.label} style={styles.row}>
            <View style={styles.labelRow}>
              <ThemedText type="body">{entry.label}</ThemedText>
              <ThemedText type="bodyBold">{entry.value}</ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${maxValue > 0 ? (entry.value / maxValue) * 100 : 0}%`,
                    backgroundColor: entry.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  row: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 12,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.pill,
  },
});
