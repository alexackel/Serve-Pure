import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DiscoverySource = 'ai' | 'community';

// The Discovered tab's differentiator between the two kinds of listings it
// merges. 'community' is deliberately the elevated treatment (a filled,
// primary-colored pill) and 'ai' the demoted one (a flat grey row, no
// background) — the concrete mechanism behind "community posts outrank and
// visually stand out over AI-found orgs." Not built on VerificationStatus/
// VerificationBadge: that component encodes attendance/hours-verification
// state (green=verified, yellow=pending, red=warning), a different axis from
// "who authored this listing" — reusing it here would force a fake color
// mapping onto a concept it was never meant to express.
export function DiscoverySourceTag({ source }: { source: DiscoverySource }) {
  const theme = useTheme();

  if (source === 'community') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.primaryTint }]}>
        <Ionicons name="people-outline" size={14} color={theme.primary} />
        <ThemedText type="label" themeColor="primary">
          Community Post
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Ionicons name="sparkles-outline" size={14} color={theme.textSecondary} />
      <ThemedText type="caption" themeColor="textSecondary">
        AI Discovered
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
