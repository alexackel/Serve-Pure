import { StyleSheet, View } from 'react-native';

import { InitialsAvatar } from '@/components/initials-avatar';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RosterRow } from '@/types/analytics';

export function RosterRowCard({ row }: { row: RosterRow }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <InitialsAvatar fullName={row.fullName} size={40} />
        <View style={styles.identity}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {row.fullName}
          </ThemedText>
          {(row.school || row.groupNames.length > 0) && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {[row.school, ...row.groupNames].filter(Boolean).join(' · ')}
            </ThemedText>
          )}
        </View>
      </View>

      {row.tags.length > 0 && (
        <View style={styles.tagRow}>
          {row.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="label" themeColor="textSecondary">
                {tag}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <Stat label="Verified" value={`${row.verifiedHours}h`} color="success" />
        <Stat label="Pending" value={`${row.pendingHours}h`} color="warning" />
        <Stat label="Events" value={String(row.eventsAttended)} />
        <Stat label="Reliability" value={row.reliabilityScore === null ? '—' : `${row.reliabilityScore}/5`} />
      </View>

      {row.lastActiveDate && <MetaRow icon="calendar-outline" text={`Last active ${row.lastActiveDate}`} />}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'success' | 'warning' }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="bodyBold" themeColor={color}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  identity: {
    flex: 1,
    gap: Spacing.half,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tag: {
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.half,
  },
});
