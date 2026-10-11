import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

// Same shell, header, and meta-row layout as EventCard so a role reads like a
// Find post. The status slot carries Paid or Available instead of an event's
// registration state.
export type RoleCardProps = {
  title: string;
  organization: string;
  location: string;
  hoursPerWeek: number;
  paid?: boolean;
  onPress?: () => void;
};

function StatusPill({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.neutralPill, { backgroundColor: theme.primaryTint }]}>
      <ThemedText type="label" themeColor="primary">
        {label}
      </ThemedText>
    </View>
  );
}

export function RoleCard({ title, organization, location, hoursPerWeek, paid, onPress }: RoleCardProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, cardShadow]}>
        <View style={styles.header}>
          <View style={styles.orgRow}>
            <Avatar icon="business-outline" iconSize={18} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.orgText} numberOfLines={1}>
              {organization}
            </ThemedText>
          </View>
          <StatusPill label={paid ? 'Paid' : 'Available'} />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>

        <View style={styles.metaList}>
          <MetaRow icon="time-outline" text={`Ongoing · ${hoursPerWeek} hrs/week`} />
          <MetaRow icon="location-outline" text={location} />
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
    flexWrap: 'wrap',
    rowGap: Spacing.one,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  orgText: {
    flexShrink: 1,
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
