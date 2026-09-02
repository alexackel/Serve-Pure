import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type PieChartSlice = {
  label: string;
  value: number;
  color: string;
};

export type PieChartProps = {
  data: PieChartSlice[];
  size?: number;
};

const RADIUS_RATIO = 0.5;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function PieChart({ data, size = 180 }: PieChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = size * RADIUS_RATIO;
  const center = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.emptyState, { height: size }]}>
        <ThemedText type="body" themeColor="textSecondary">
          No hours to show yet
        </ThemedText>
      </View>
    );
  }

  const { slices } = data.filter((slice) => slice.value > 0).reduce(
    (acc, slice) => {
      const angle = (slice.value / total) * 360;
      const path = describeSlicePath(center, center, radius, acc.cursor, acc.cursor + angle);
      return { slices: [...acc.slices, { ...slice, path }], cursor: acc.cursor + angle };
    },
    { slices: [] as (PieChartSlice & { path: string })[], cursor: 0 },
  );

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice) => (
          <Path key={slice.label} d={slice.path} fill={slice.color} />
        ))}
      </Svg>

      <View style={styles.legend}>
        {data.map((slice) => (
          <View key={slice.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <ThemedText type="body" style={styles.legendLabel}>
              {slice.label}
            </ThemedText>
            <ThemedText type="bodyBold">{slice.value} hrs</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.legendPercent}>
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    width: '100%',
    gap: Spacing.two,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
  },
  legendPercent: {
    minWidth: 36,
    textAlign: 'right',
  },
});
