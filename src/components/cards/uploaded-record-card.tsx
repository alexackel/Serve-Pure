import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { VerificationBadge } from '@/components/cards/verification-badge';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { GroupMemberRecord } from '@/context/groups-context';
import { useTheme } from '@/hooks/use-theme';

export type UploadedRecordCardProps = {
  memberName: string;
  memberVerified?: boolean;
  record: GroupMemberRecord;
  onPress: () => void;
};

// No approve/reject buttons here — review is a drill-down-only action
// (group/[id]/review/[reviewId].tsx), so a queue never has a direct-approve
// button next to it (per the reviewer flow's design: open the item, then
// decide).
export function UploadedRecordCard({ memberName, memberVerified, record, onPress }: UploadedRecordCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={[styles.card, CardShadow]}>
        <View style={styles.header}>
          <Avatar size={40} icon="person" iconSize={18} />
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="bodyBold" numberOfLines={1}>
                {memberName}
              </ThemedText>
              {memberVerified && <VerifiedBadge size="sm" />}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {record.date}
              {record.hours !== undefined ? ` · ${record.hours} hrs` : ''}
            </ThemedText>
          </View>
          <VerificationBadge status={record.status} />
        </View>

        <View style={styles.eventDetails}>
          <ThemedText type="bodyBold">{record.eventTitle}</ThemedText>
          <View style={styles.metaList}>
            <MetaRow icon="calendar-outline" text={record.date} />
          </View>
          {record.note && (
            <View style={[styles.noteBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.textSecondary} />
              <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
                {record.note}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  eventDetails: {
    gap: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  noteText: {
    flex: 1,
  },
});
