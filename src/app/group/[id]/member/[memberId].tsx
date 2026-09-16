import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { UploadedRecordCard } from '@/components/cards';
import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { BarChart, type BarChartEntry } from '@/components/charts/bar-chart';
import { defaultLabels } from '@/components/cards/verification-badge';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { sumHoursByStatusMap, sumMemberHours, useGroups, type GroupMember } from '@/context/groups-context';
import type { HistoryStatus } from '@/context/history-context';
import { useTheme } from '@/hooks/use-theme';

const MEMBER_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'uploaded', label: 'Uploaded' },
] as const;

type TabKey = (typeof MEMBER_TABS)[number]['key'];

function RemoveMemberButton({ groupId, memberId, memberName }: { groupId: string; memberId: string; memberName: string }) {
  const theme = useTheme();
  const { removeMember } = useGroups();
  const [confirming, setConfirming] = useState(false);

  const handleRemove = async () => {
    const { error } = await removeMember(groupId, memberId);
    if (error) {
      console.error('Failed to remove member', error);
      return;
    }
    router.replace({ pathname: '/group/[id]', params: { id: groupId } });
  };

  if (confirming) {
    return (
      <ThemedView type="backgroundElement" style={styles.removeConfirm}>
        <ThemedText type="body">Remove {memberName} from this group?</ThemedText>
        <ConfirmCancelRow
          confirmLabel="Remove"
          confirmColor="error"
          onCancel={() => setConfirming(false)}
          onConfirm={handleRemove}
        />
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

export default function GroupMemberDetailScreen() {
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();
  const theme = useTheme();
  const { groups, isAdmin, getGroupMembers, approveMemberRecord, rejectMemberRecord } = useGroups();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [member, setMember] = useState<GroupMember | null | undefined>(undefined);

  const group = groups.find((item) => item.id === id);

  const loadMember = useCallback(async () => {
    if (!group) {
      setMember(null);
      return;
    }
    const members = await getGroupMembers(group.id);
    setMember(members.find((item) => item.id === memberId) ?? null);
  }, [group, getGroupMembers, memberId]);

  useEffect(() => {
    // loadMember is async — its setState runs after the await, not
    // synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMember();
  }, [loadMember]);

  if (!group || !isAdmin(group.id) || member === null) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: id ?? '' } }} />
        <ThemedText type="h3">Member not found</ThemedText>
      </ScreenScrollView>
    );
  }

  if (member === undefined) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: group.id } }} />
        <ThemedText type="h3">Loading…</ThemedText>
      </ScreenScrollView>
    );
  }

  const hoursByStatus = sumHoursByStatusMap(member.records);

  const chartColor: Record<HistoryStatus, string> = {
    verified: theme.chartSuccess,
    'admin-approved': theme.chartSuccess,
    pending: theme.chartWarning,
    'self-uploaded': theme.chartWarning,
    'no-show': theme.chartError,
    appealed: theme.chartError,
    cancelled: theme.chartError,
  };

  const barData: BarChartEntry[] = (Object.keys(hoursByStatus) as HistoryStatus[]).map((status) => ({
    label: defaultLabels[status],
    value: hoursByStatus[status] ?? 0,
    color: chartColor[status],
  }));

  const uploaded = member.records.filter((record) => record.status === 'self-uploaded');

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: group.id } }} />

      <View style={styles.headerRow}>
        <Avatar size={48} icon="person" iconSize={22} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="h2">{member.fullName}</ThemedText>
            {member.verified && <VerifiedBadge />}
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {sumMemberHours(member)} hrs total
          </ThemedText>
        </View>
      </View>

      <SegmentedTabs tabs={MEMBER_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Hours Breakdown</ThemedText>
          <BarChart data={barData} />
          <RemoveMemberButton groupId={group.id} memberId={member.id} memberName={member.fullName} />
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
                  memberName={member.fullName}
                  memberVerified={member.verified}
                  record={record}
                  onApprove={async () => {
                    await approveMemberRecord(group.id, member.id, record.id);
                    loadMember();
                  }}
                  onReject={async () => {
                    await rejectMemberRecord(group.id, member.id, record.id);
                    loadMember();
                  }}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
});
