import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { VerificationBadge } from '@/components/cards/verification-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { GroupMemberRecord } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

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
        <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="person" size={18} color={theme.primary} />
        </View>
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

      <View style={styles.actions}>
        <Pressable onPress={onReject} style={[styles.actionButton, { borderColor: theme.border }]}>
          <ThemedText type="bodyBold">Reject</ThemedText>
        </Pressable>
        <Pressable
          onPress={onApprove}
          style={[styles.actionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            Approve
          </ThemedText>
        </Pressable>
      </View>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    gap: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
});
