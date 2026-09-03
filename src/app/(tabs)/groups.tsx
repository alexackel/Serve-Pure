import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { GroupCard, RoleCard } from '@/components/cards';
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

function CreateGroupPanel({ onCreate, onCancel }: { onCreate: (name: string) => void; onCancel: () => void }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Give your group a name.');
      return;
    }
    onCreate(name.trim());
  };

  return (
    <ThemedView type="backgroundElement" style={styles.createPanel}>
      <ThemedText type="label" themeColor="textSecondary">
        New group name
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Riverside Robotics Club"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}
      <ThemedView style={styles.createPanelActions}>
        <Pressable onPress={onCancel} style={[styles.actionButton, { borderColor: theme.border }]}>
          <ThemedText type="bodyBold">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          style={[styles.actionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            Create Group
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

function GroupsTab() {
  const theme = useTheme();
  const { groups, myGroupIds, createGroup } = useGroups();
  const [isCreating, setIsCreating] = useState(false);

  const myGroups = myGroupIds
    .map((id) => groups.find((group) => group.id === id))
    .filter((group): group is NonNullable<typeof group> => Boolean(group));

  const handleCreate = (name: string) => {
    const id = createGroup(name);
    setIsCreating(false);
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
  createPanel: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  createPanelActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
});
