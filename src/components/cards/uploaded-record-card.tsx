import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { VerificationBadge } from '@/components/cards/verification-badge';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { GroupMemberRecord } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

export type UploadedRecordCardProps = {
  memberName: string;
  record: GroupMemberRecord;
  onApprove: () => void;
  onReject: () => void;
};

export function UploadedRecordCard({ memberName, record, onApprove, onReject }: UploadedRecordCardProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, CardShadow]}>
      <View style={styles.header}>
        <Avatar size={40} icon="person" iconSize={18} />
        <View style={styles.headerInfo}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {memberName}
          </ThemedText>
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

      <ConfirmCancelRow cancelLabel="Reject" confirmLabel="Approve" onCancel={onReject} onConfirm={onApprove} />
    </ThemedView>
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
