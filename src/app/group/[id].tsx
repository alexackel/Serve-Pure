import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { MemberRow, RecordCard, UploadedRecordCard } from '@/components/cards';
import { PieChart } from '@/components/charts/pie-chart';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGroups } from '@/context/groups-context';
import { useHistory } from '@/context/history-context';
import { sumHoursByStatus, sumMemberHours, type GroupMember, type MockGroup } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

const GROUP_TABS = [
  { key: 'members', label: 'Members' },
  { key: 'reported', label: 'Uploaded' },
  { key: 'analytics', label: 'Analytics' },
] as const;

type TabKey = (typeof GROUP_TABS)[number]['key'];

function BackButton() {
  const theme = useTheme();
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/groups');
    }
  };
  return (
    <Pressable onPress={handlePress} hitSlop={8} style={styles.backButton}>
      <Ionicons name="chevron-back" size={22} color={theme.text} />
      <ThemedText type="bodyBold">Back</ThemedText>
    </Pressable>
  );
}

function MembersTab({
  groupId,
  members,
  adminIds,
  isAdmin,
}: {
  groupId: string;
  members: GroupMember[];
  adminIds: string[];
  isAdmin: boolean;
}) {
  const theme = useTheme();
  const ranked = [...members].sort((a, b) => sumMemberHours(b) - sumMemberHours(a));

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
        {ranked.map((member, index) => (
          <MemberRow
            key={member.id}
            rank={index + 1}
            name={member.name}
            hours={sumMemberHours(member)}
            isAdmin={adminIds.includes(member.id)}
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

function ReportedHoursTab({ group, isAdmin }: { group: MockGroup; isAdmin: boolean }) {
  const { records } = useHistory();
  const { approveMemberRecord, rejectMemberRecord } = useGroups();

  if (isAdmin) {
    const uploaded = group.members.flatMap((member) =>
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
                memberName={member.name}
                record={record}
                onApprove={() => approveMemberRecord(group.id, member.id, record.id)}
                onReject={() => rejectMemberRecord(group.id, member.id, record.id)}
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

  const handleDelete = () => {
    deleteGroup(groupId);
    router.replace('/groups');
  };

  if (confirming) {
    return (
      <ThemedView type="backgroundElement" style={styles.deleteConfirm}>
        <ThemedText type="body">Delete this group? This can't be undone.</ThemedText>
        <View style={styles.deleteConfirmActions}>
          <Pressable
            onPress={() => setConfirming(false)}
            style={[styles.actionButton, { borderColor: theme.border }]}>
            <ThemedText type="bodyBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: theme.error, borderColor: theme.error }]}>
            <ThemedText type="bodyBold" themeColor="background">
              Delete Permanently
            </ThemedText>
          </Pressable>
        </View>
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

function AnalyticsTab({ group }: { group: MockGroup }) {
  const theme = useTheme();

  const hoursByStatus = sumHoursByStatus(group.members.flatMap((member) => member.records));

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
  const theme = useTheme();
  const { groups, isAdmin: checkIsAdmin } = useGroups();
  const group = groups.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<TabKey>('members');

  if (!group) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton />
        <ThemedText type="h3">Group not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const isAdmin = checkIsAdmin(group.id);

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton />

      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="people" size={22} color={theme.primary} />
        </View>
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

      <SegmentedTabs tabs={GROUP_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'members' && (
        <>
          <MembersTab groupId={group.id} members={group.members} adminIds={group.adminIds ?? []} isAdmin={isAdmin} />
          {isAdmin && <DeleteGroupButton groupId={group.id} />}
        </>
      )}
      {activeTab === 'reported' && <ReportedHoursTab group={group} isAdmin={isAdmin} />}
      {activeTab === 'analytics' && <AnalyticsTab group={group} />}
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
  deleteConfirmActions: {
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
