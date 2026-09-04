import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type RoleCardProps = {
  title: string;
  organization: string;
  location: string;
  hoursPerWeek: number;
  paid?: boolean;
  onPress?: () => void;
};

function PaidIndicator() {
  const theme = useTheme();

  return (
    <View style={[styles.neutralPill, { backgroundColor: theme.primaryTint }]}>
      <ThemedText type="label" themeColor="primary">
        Paid
      </ThemedText>
    </View>
  );
}

export function RoleCard({ title, organization, location, hoursPerWeek, paid, onPress }: RoleCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <View style={styles.header}>
          <View style={styles.orgRow}>
            <Avatar icon="business-outline" iconSize={18} />
            <ThemedText type="caption" themeColor="textSecondary">
              {organization}
            </ThemedText>
          </View>
          {paid && <PaidIndicator />}
        </View>

        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>

        <View style={styles.metaList}>
          <MetaRow icon="location-outline" text={location} />
          <MetaRow icon="time-outline" text={`${hoursPerWeek} hrs/week`} />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    marginBottom: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  neutralPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
});
