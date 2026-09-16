import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { GroupCard, RoleCard } from '@/components/cards';
import { CreateGroupPanel } from '@/components/create-group-panel';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SearchBar } from '@/components/search-bar';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGroups } from '@/context/groups-context';
import { useTheme } from '@/hooks/use-theme';

type Role = {
  title: string;
  organization: string;
  location: string;
  hoursPerWeek: number;
  paid?: boolean;
};

const SAMPLE_ROLES: Role[] = [
  {
    title: 'Weekly Food Pantry Assistant',
    organization: 'Northside Food Bank',
    location: 'Northside Food Bank',
    hoursPerWeek: 3,
  },
  {
    title: 'Peer Tutoring Coordinator',
    organization: 'Central Public Library',
    location: 'Central Public Library',
    hoursPerWeek: 4,
    paid: true,
  },
  {
    title: 'Trail Maintenance Crew Lead',
    organization: 'Parks Conservancy',
    location: 'Blue Ridge Trailhead',
    hoursPerWeek: 5,
    paid: true,
  },
  {
    title: 'Animal Shelter Regular Volunteer',
    organization: 'Furry Friends Rescue',
    location: 'Furry Friends Rescue',
    hoursPerWeek: 2,
  },
];

const GROUPS_TABS = [
  { key: 'groups', label: 'Groups' },
  { key: 'roles', label: 'Roles' },
] as const;

type TabKey = (typeof GROUPS_TABS)[number]['key'];

function JoinGroupButton() {
  const theme = useTheme();

  return (
    <Pressable style={[styles.joinButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name="add-circle-outline" size={16} color={theme.text} />
      <ThemedText type="bodyBold">Join Group</ThemedText>
    </Pressable>
  );
}

function GroupsTab() {
  const theme = useTheme();
  const { groups, myGroupIds, createGroup } = useGroups();
  const [isCreating, setIsCreating] = useState(false);

  const groupsById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const myGroups = useMemo(
    () =>
      myGroupIds
        .map((id) => groupsById.get(id))
        .filter((group): group is NonNullable<typeof group> => Boolean(group)),
    [myGroupIds, groupsById],
  );

  const handleCreate = async (name: string) => {
    const { id, error } = await createGroup(name);
    setIsCreating(false);
    if (error || !id) {
      console.error('Failed to create group', error);
      return;
    }
    router.push({ pathname: '/group/[id]', params: { id } });
  };

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="h3">My Groups</ThemedText>

      {myGroups.length > 0 && (
        <ThemedView style={styles.list}>
          {myGroups.map((group) => (
            <GroupCard
              key={group.id}
              name={group.name}
              memberCount={group.memberCount}
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
            />
          ))}
        </ThemedView>
      )}

      {isCreating ? (
        <CreateGroupPanel onCreate={handleCreate} onCancel={() => setIsCreating(false)} />
      ) : (
        <Pressable
          onPress={() => setIsCreating(true)}
          style={[styles.joinButton, { backgroundColor: theme.primary }]}>
          <Ionicons name="add-circle-outline" size={16} color={theme.background} />
          <ThemedText type="bodyBold" themeColor="background">
            Create Group
          </ThemedText>
        </Pressable>
      )}

      <JoinGroupButton />
    </ThemedView>
  );
}

function RolesTab() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <ThemedView style={styles.section}>
      <SearchBar placeholder="Search roles" value={searchValue} onChangeText={setSearchValue} />
      <ThemedView style={styles.list}>
        {SAMPLE_ROLES.map((role) => (
          <RoleCard key={role.title} {...role} />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('groups');

  useFocusEffect(
    useCallback(() => {
      return () => setActiveTab('groups');
    }, []),
  );

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <ThemedText type="h1" style={styles.pageTitle}>
        Groups
      </ThemedText>

      <SegmentedTabs tabs={GROUPS_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'groups' ? <GroupsTab /> : <RolesTab />}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
});
