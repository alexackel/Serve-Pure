import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { UploadedRecordCard } from '@/components/cards';
import { BarChart, type BarChartEntry } from '@/components/charts/bar-chart';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGroups } from '@/context/groups-context';
import type { HistoryStatus } from '@/context/history-context';
import { sumMemberHours } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABELS: Record<HistoryStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
  'self-uploaded': 'Self-Uploaded',
  'admin-approved': 'Admin Approved',
  'no-show': 'No-Show',
  appealed: 'Appealed',
  cancelled: 'Cancelled',
};

const MEMBER_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'uploaded', label: 'Uploaded' },
] as const;

type TabKey = (typeof MEMBER_TABS)[number]['key'];

function RemoveMemberButton({ groupId, memberId, memberName }: { groupId: string; memberId: string; memberName: string }) {
  const theme = useTheme();
  const { removeMember } = useGroups();
  const [confirming, setConfirming] = useState(false);

  const handleRemove = () => {
    removeMember(groupId, memberId);
    router.replace({ pathname: '/group/[id]', params: { id: groupId } });
  };

  if (confirming) {
    return (
      <ThemedView type="backgroundElement" style={styles.removeConfirm}>
        <ThemedText type="body">Remove {memberName} from this group?</ThemedText>
        <View style={styles.removeConfirmActions}>
          <Pressable
            onPress={() => setConfirming(false)}
            style={[styles.actionButton, { borderColor: theme.border }]}>
            <ThemedText type="bodyBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleRemove}
            style={[styles.actionButton, { backgroundColor: theme.error, borderColor: theme.error }]}>
            <ThemedText type="bodyBold" themeColor="background">
              Remove
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <Pressable onPress={() => setConfirming(true)} style={styles.removeButton} hitSlop={8}>
      <Ionicons name="person-remove-outline" size={14} color={theme.error} />
      <ThemedText type="label" themeColor="error">
        Remove from Group
      </ThemedText>
    </Pressable>
  );
}

function BackButton({ groupId }: { groupId: string }) {
  const theme = useTheme();
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/group/[id]', params: { id: groupId } });
    }
  };
  return (
    <Pressable onPress={handlePress} hitSlop={8} style={styles.backButton}>
      <Ionicons name="chevron-back" size={22} color={theme.text} />
      <ThemedText type="bodyBold">Back</ThemedText>
    </Pressable>
  );
}

export default function GroupMemberDetailScreen() {
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();
  const theme = useTheme();
  const { groups, isAdmin, approveMemberRecord, rejectMemberRecord } = useGroups();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const group = groups.find((item) => item.id === id);
  const member = group?.members.find((item) => item.id === memberId);

  if (!group || !member || !isAdmin(group.id)) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton groupId={id ?? ''} />
        <ThemedText type="h3">Member not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const statusCounts = member.records.reduce(
    (acc, record) => {
      acc[record.status] = (acc[record.status] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<HistoryStatus, number>>,
  );

  const chartColor: Record<HistoryStatus, string> = {
    verified: theme.chartSuccess,
    'admin-approved': theme.chartSuccess,
    pending: theme.chartWarning,
    'self-uploaded': theme.chartWarning,
    'no-show': theme.chartError,
    appealed: theme.chartError,
    cancelled: theme.chartError,
  };

  const barData: BarChartEntry[] = (Object.keys(statusCounts) as HistoryStatus[]).map((status) => ({
    label: STATUS_LABELS[status],
    value: statusCounts[status] ?? 0,
    color: chartColor[status],
  }));

  const uploaded = member.records.filter((record) => record.status === 'self-uploaded');

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton groupId={group.id} />

      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="person" size={22} color={theme.primary} />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText type="h2">{member.name}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {sumMemberHours(member)} hrs total
          </ThemedText>
        </View>
      </View>

      <RemoveMemberButton groupId={group.id} memberId={member.id} memberName={member.name} />

      <SegmentedTabs tabs={MEMBER_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Hours by State</ThemedText>
          <BarChart data={barData} />
        </ThemedView>
      )}

      {activeTab === 'uploaded' && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Self-Uploaded Hours</ThemedText>
          {uploaded.length === 0 ? (
            <ThemedText type="body" themeColor="textSecondary">
              No self-uploaded hours yet.
            </ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {uploaded.map((record) => (
                <UploadedRecordCard
                  key={record.id}
                  memberName={member.name}
                  record={record}
                  onApprove={() => approveMemberRecord(group.id, member.id, record.id)}
                  onReject={() => rejectMemberRecord(group.id, member.id, record.id)}
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  removeConfirm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  removeConfirmActions: {
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
