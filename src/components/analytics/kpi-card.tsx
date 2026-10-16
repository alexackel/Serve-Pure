import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing, type ThemeColor } from '@/constants/theme';
import { useCardShadow, useTheme } from '@/hooks/use-theme';
import type { SignedDelta } from '@/utils/format-number';

export type KpiCardBreakdownItem = {
  label: string;
  value: string;
  color: ThemeColor;
};

export type KpiCardProps = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  delta?: SignedDelta;
  // Which delta direction counts as "good" for this metric — 'up' for most
  // (e.g. Total Hours), 'down' for things like Pending Verifications.
  goodDirection?: 'up' | 'down';
  onPress?: () => void;
  // e.g. Total Hours' verified/pending split, shown as small colored chips
  // under the headline value.
  breakdown?: KpiCardBreakdownItem[];
};

export function KpiCard({ label, value, icon, delta, goodDirection = 'up', onPress, breakdown }: KpiCardProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();

  const deltaColor =
    !delta || delta.direction === 'flat' ? 'textSecondary' : delta.direction === goodDirection ? 'success' : 'error';

  const content = (
    <ThemedView style={[styles.card, { borderColor: theme.border }, cardShadow]} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryTint }]}>
            <Ionicons name={icon} size={16} color={theme.primary} />
          </View>
        )}
        {onPress && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
      </View>

      <ThemedText type="statValue">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>

      {breakdown && breakdown.length > 0 && (
        <View style={styles.breakdownRow}>
          {breakdown.map((item) => (
            <View key={item.label} style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: theme[item.color] }]} />
              <ThemedText type="caption" themeColor="textSecondary">
                {item.value} {item.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {delta && (
        <View style={styles.deltaRow}>
          <Ionicons
            name={delta.direction === 'up' ? 'arrow-up' : delta.direction === 'down' ? 'arrow-down' : 'remove'}
            size={12}
            color={theme[deltaColor]}
          />
          <ThemedText type="caption" themeColor={deltaColor}>
            {delta.magnitude}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={styles.pressable} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Tap to view.`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
    flex: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
    flex: 1,
    minHeight: 112,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginTop: Spacing.half,
  },
  breakdownRow: {
    gap: Spacing.half,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
