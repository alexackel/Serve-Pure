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
};

export function StatCard({ label, value, icon, accentColor = 'primary' }: StatCardProps) {
  const theme = useTheme();
  const iconColor = theme[accentColor];
  const iconBackground = accentColor === 'primary' ? theme.primaryTint : theme[`${accentColor}Background`];

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <ThemedText type="statValue">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
});
