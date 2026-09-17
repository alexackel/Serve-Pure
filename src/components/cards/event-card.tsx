import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { VerificationBadge } from '@/components/cards/verification-badge';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// 'available'/'full' describe open-registration events (used on Find, driven by
// volunteer capacity). The remaining states describe a specific volunteer's
// personal record for an event they've already engaged with (reused later on
// the You page) — same component/look, different status set.
export type EventStatus =
  | 'available'
  | 'full'
  | 'completed'
  | 'registered'
  | 'pending'
  | 'verified'
  | 'partial'
  | 'no-show'
  | 'appealed';

export type EventCardProps = {
  title: string;
  organization: string;
  date: string;
  time?: string;
  location: string;
  hours?: number;
  volunteers?: number;
  maxVolunteers?: number;
  status: EventStatus;
  onPress?: () => void;
};

function StatusIndicator({ status }: { status: EventStatus }) {
  const theme = useTheme();

  switch (status) {
    case 'available':
      return (
        <View style={[styles.neutralPill, { backgroundColor: theme.primaryTint }]}>
          <ThemedText type="label" themeColor="primary">
            Available
          </ThemedText>
        </View>
      );
    case 'full':
      return (
        <View style={[styles.neutralPill, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Full
          </ThemedText>
        </View>
      );
    case 'completed':
      return (
        <View style={[styles.neutralPill, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Completed
          </ThemedText>
        </View>
      );
    case 'registered':
      return <VerificationBadge status="registered" />;
    case 'pending':
      return <VerificationBadge status="pending" label="Pending" />;
    case 'verified':
      return <VerificationBadge status="verified" />;
    case 'partial':
      return <VerificationBadge status="warning" label="Partial" />;
    case 'no-show':
      return <VerificationBadge status="no-show" />;
    case 'appealed':
      return <VerificationBadge status="appealed" />;
  }
}

export function EventCard({
  title,
  organization,
  date,
  time,
  location,
  hours,
  volunteers,
  maxVolunteers,
  status,
  onPress,
}: EventCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <View style={styles.header}>
          <View style={styles.orgRow}>
            <Avatar icon="business-outline" iconSize={18} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.orgText} numberOfLines={1}>
              {organization}
            </ThemedText>
          </View>
          <StatusIndicator status={status} />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>

        <View style={styles.metaList}>
          <MetaRow icon="calendar-outline" text={time ? `${date} · ${time}` : date} />
          <MetaRow icon="location-outline" text={location} />
          {hours !== undefined && <MetaRow icon="time-outline" text={`${hours} hrs`} />}
          {volunteers !== undefined && maxVolunteers !== undefined && (
            <MetaRow icon="people-outline" text={`${volunteers}/${maxVolunteers} volunteers`} />
          )}
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
