import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: 'primary' | 'success' | 'warning';
  variant?: 'default' | 'headline';
};

export function StatCard({ label, value, icon, accentColor = 'primary', variant = 'default' }: StatCardProps) {
  const theme = useTheme();
  const iconColor = theme[accentColor];
  const iconBackground = accentColor === 'primary' ? theme.primaryTint : theme[`${accentColor}Background`];

  if (variant === 'headline') {
    return (
      <ThemedView style={[styles.card, styles.headlineCard, { borderColor: theme.border }, CardShadow]}>
        {icon && (
          <View style={[styles.iconCircle, styles.headlineIconCircle, { backgroundColor: iconBackground }]}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
        )}
        <View style={styles.headlineTextRow}>
          <ThemedText type="h1" style={styles.headlineValue}>
            {value}
          </ThemedText>
          <ThemedText type="h2" themeColor="textSecondary" style={styles.headlineLabel}>
            {label}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <ThemedText type="statValue" style={styles.centerText}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.centerText}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.one,
    gap: Spacing.one,
    flex: 1,
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  headlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  headlineIconCircle: {
    width: 44,
    height: 44,
    marginBottom: 0,
  },
  headlineTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  headlineValue: {
    fontSize: 32,
    lineHeight: 38,
  },
  headlineLabel: {
    fontSize: 22,
    lineHeight: 28,
  },
});
