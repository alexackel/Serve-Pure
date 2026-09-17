import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { MemberRow, RecordCard, UploadedRecordCard } from '@/components/cards';
import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { PieChart } from '@/components/charts/pie-chart';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { sumHoursByStatusMap, sumMemberHours, useGroups, type Group, type GroupMember } from '@/context/groups-context';
import { useHistory } from '@/context/history-context';
import { useTheme } from '@/hooks/use-theme';

const GROUP_TABS = [
  { key: 'members', label: 'Members' },
  { key: 'reported', label: 'Uploaded' },
  { key: 'analytics', label: 'Analytics' },
] as const;

type TabKey = (typeof GROUP_TABS)[number]['key'];

function MembersTab({ groupId, members, isAdmin }: { groupId: string; members: GroupMember[]; isAdmin: boolean }) {
  const theme = useTheme();
  const ranked = useMemo(
    () =>
      members
        .map((member) => ({ member, hours: sumMemberHours(member) }))
        .sort((a, b) => b.hours - a.hours),
    [members],
  );

  return (
    <ThemedView style={styles.section}>
      <View style={styles.membersHeader}>
        <ThemedText type="h3">Members</ThemedText>
        <Pressable
          onPress={() => router.push({ pathname: '/group/[id]/subgroups', params: { id: groupId } })}
          style={[styles.subgroupsButton, { borderColor: theme.border }]}>
          <ThemedText type="label">Subgroups</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={theme.text} />
        </Pressable>
      </View>

      <ThemedView style={styles.list}>
        {ranked.map(({ member, hours }, index) => (
          <MemberRow
            key={member.id}
            rank={index + 1}
            name={member.fullName}
            verified={member.verified}
            hours={hours}
            isAdmin={member.isAdmin}
            onPress={
              isAdmin
                ? () =>
                    router.push({
                      pathname: '/group/[id]/member/[memberId]',
                      params: { id: groupId, memberId: member.id },
                    })
                : undefined
            }
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function ReportedHoursTab({
  groupId,
  members,
  isAdmin,
  onMutated,
}: {
  groupId: string;
  members: GroupMember[];
  isAdmin: boolean;
  onMutated: () => void;
}) {
  const { records } = useHistory();
  const { approveMemberRecord, rejectMemberRecord } = useGroups();

  if (isAdmin) {
    const uploaded = members.flatMap((member) =>
      member.records
        .filter((record) => record.status === 'self-uploaded')
        .map((record) => ({ member, record })),
    );

    return (
      <ThemedView style={styles.section}>
        <ThemedText type="h3">Self-Uploaded Hours</ThemedText>
        {uploaded.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary">
            No self-uploaded hours yet.
          </ThemedText>
        ) : (
          <ThemedView style={styles.list}>
            {uploaded.map(({ member, record }) => (
              <UploadedRecordCard
                key={record.id}
                memberName={member.fullName}
                memberVerified={member.verified}
                record={record}
                onApprove={async () => {
                  await approveMemberRecord(groupId, member.id, record.id);
                  onMutated();
                }}
                onReject={async () => {
                  await rejectMemberRecord(groupId, member.id, record.id);
                  onMutated();
                }}
              />
            ))}
          </ThemedView>
        )}
      </ThemedView>
    );
  }

  const selfUploaded = records.filter((record) => record.status === 'self-uploaded');

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Self-Uploaded Hours</ThemedText>
      {selfUploaded.length === 0 ? (
        <ThemedText type="body" themeColor="textSecondary">
          No self-uploaded hours yet.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {selfUploaded.map(({ id, ...record }) => (
            <RecordCard key={id} {...record} />
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

function DeleteGroupButton({ groupId }: { groupId: string }) {
  const theme = useTheme();
  const { deleteGroup } = useGroups();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    const { error } = await deleteGroup(groupId);
    if (error) {
      console.error('Failed to delete group', error);
      return;
    }
    router.replace('/groups');
  };

  if (confirming) {
    return (
      <ThemedView type="backgroundElement" style={styles.deleteConfirm}>
        <ThemedText type="body">Delete this group? This can&apos;t be undone.</ThemedText>
        <ConfirmCancelRow
          confirmLabel="Delete Permanently"
          confirmColor="error"
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      </ThemedView>
    );
  }

  return (
    <Pressable onPress={() => setConfirming(true)} style={styles.deleteButton} hitSlop={8}>
      <Ionicons name="trash-outline" size={14} color={theme.error} />
      <ThemedText type="label" themeColor="error">
        Delete Group
      </ThemedText>
    </Pressable>
  );
}

function AnalyticsTab({ members }: { members: GroupMember[] }) {
  const theme = useTheme();

  const hoursByStatus = useMemo(
    () => sumHoursByStatusMap(members.flatMap((member) => member.records)),
    [members],
  );

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Hours Breakdown</ThemedText>
      <PieChart
        data={[
          { label: 'Self-Uploaded', value: hoursByStatus['self-uploaded'] ?? 0, color: theme.chartWarning },
          { label: 'Verified', value: hoursByStatus.verified ?? 0, color: theme.chartSuccess },
          { label: 'Admin Approved', value: hoursByStatus['admin-approved'] ?? 0, color: theme.chartPrimary },
        ]}
      />
    </ThemedView>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, isAdmin: checkIsAdmin } = useGroups();
  const group = groups.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [members, setMembers] = useState<GroupMember[]>([]);

  const { getGroupMembers } = useGroups();

  const loadMembers = useCallback(async () => {
    if (!group) return;
    const result = await getGroupMembers(group.id);
    setMembers(result);
  }, [group, getGroupMembers]);

  useEffect(() => {
    // loadMembers is async — its setState runs after the await, not
    // synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers();
  }, [loadMembers]);

  if (!group) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/groups" />
        <ThemedText type="h3">Group not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const isAdmin = checkIsAdmin(group.id);

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/groups" />

      <GroupHeader group={group} isAdmin={isAdmin} />

      <SegmentedTabs tabs={GROUP_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'members' && (
        <>
          <MembersTab groupId={group.id} members={members} isAdmin={isAdmin} />
          {isAdmin && <DeleteGroupButton groupId={group.id} />}
        </>
      )}
      {activeTab === 'reported' && (
        <ReportedHoursTab groupId={group.id} members={members} isAdmin={isAdmin} onMutated={loadMembers} />
      )}
      {activeTab === 'analytics' && <AnalyticsTab members={members} />}
    </ScreenScrollView>
  );
}

function GroupHeader({ group, isAdmin }: { group: Group; isAdmin: boolean }) {
  const theme = useTheme();
  return (
    <>
      <View style={styles.headerRow}>
        <Avatar size={48} icon="people" iconSize={22} />
        <View style={styles.headerInfo}>
          <ThemedText type="h2">{group.name}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
          </ThemedText>
        </View>
      </View>

      {isAdmin && (
        <View style={[styles.adminBadge, { backgroundColor: theme.primaryTint }]}>
          <ThemedText type="label" themeColor="primary">
            Admin
          </ThemedText>
        </View>
      )}
    </>
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
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  section: {
    gap: Spacing.three,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subgroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  list: {
    gap: Spacing.two,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  deleteConfirm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
