import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { VerificationBadge } from '@/components/cards/verification-badge';
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
    case 'registered':
      return (
        <View style={[styles.neutralPill, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Registered
          </ThemedText>
        </View>
      );
    case 'pending':
      return <VerificationBadge status="pending" label="Pending" />;
    case 'verified':
      return <VerificationBadge status="verified" />;
    case 'partial':
      return <VerificationBadge status="warning" label="Partial" />;
    case 'no-show':
      return <VerificationBadge status="warning" label="No-show" />;
    case 'appealed':
      return <VerificationBadge status="warning" label="Appealed" />;
  }
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={theme.textSecondary} />
      <ThemedText type="caption" themeColor="textSecondary">
        {text}
      </ThemedText>
    </View>
  );
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
            <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
              <Ionicons name="business-outline" size={18} color={theme.primary} />
            </View>
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  neutralPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
});
