import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { MemberRow, RecordCard } from '@/components/cards';
import { PieChart } from '@/components/charts/pie-chart';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useHistory } from '@/context/history-context';
import { MOCK_GROUPS } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

// No records can carry the 'admin-approved' status yet (that approval flow
// isn't built), so this is a fixed stand-in until a real admin view exists.
const MOCK_ADMIN_APPROVED_HOURS = 6;

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

function MembersTab({ groupId, members }: { groupId: string; members: { id: string; name: string; hours: number }[] }) {
  const theme = useTheme();
  const ranked = [...members].sort((a, b) => b.hours - a.hours);

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
          <MemberRow key={member.id} rank={index + 1} name={member.name} hours={member.hours} />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

function ReportedHoursTab() {
  const { records } = useHistory();
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

function AnalyticsTab() {
  const { records } = useHistory();
  const theme = useTheme();

  const selfUploadedHours = records
    .filter((record) => record.status === 'self-uploaded')
    .reduce((sum, record) => sum + (record.hours ?? 0), 0);
  const verifiedHours = records
    .filter((record) => record.status === 'verified')
    .reduce((sum, record) => sum + (record.hours ?? 0), 0);

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">Hours Breakdown</ThemedText>
      <PieChart
        data={[
          { label: 'Self-Uploaded', value: selfUploadedHours, color: theme.chartWarning },
          { label: 'Verified', value: verifiedHours, color: theme.chartSuccess },
          { label: 'Admin Approved', value: MOCK_ADMIN_APPROVED_HOURS, color: theme.chartPrimary },
        ]}
      />
    </ThemedView>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const group = MOCK_GROUPS.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<TabKey>('members');

  if (!group) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton />
        <ThemedText type="h3">Group not found</ThemedText>
      </ScreenScrollView>
    );
  }

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

      <SegmentedTabs tabs={GROUP_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'members' && <MembersTab groupId={group.id} members={group.members} />}
      {activeTab === 'reported' && <ReportedHoursTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
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
});
