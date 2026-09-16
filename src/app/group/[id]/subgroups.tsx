import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { GroupCard } from '@/components/cards';
import { BackButton } from '@/components/back-button';
import { CreateGroupPanel } from '@/components/create-group-panel';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGroups } from '@/context/groups-context';
import { useTheme } from '@/hooks/use-theme';

export default function SubgroupsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { groups, isAdmin, createSubgroup } = useGroups();
  const [isCreating, setIsCreating] = useState(false);

  const group = groups.find((item) => item.id === id);
  const subgroups = useMemo(() => groups.filter((item) => item.parentGroupId === id), [groups, id]);

  if (!group) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/groups" />
        <ThemedText type="h3">Group not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const canCreate = isAdmin(group.id);

  const handleCreate = async (name: string) => {
    const { id: subgroupId, error } = await createSubgroup(group.id, name);
    setIsCreating(false);
    if (error || !subgroupId) {
      console.error('Failed to create subgroup', error);
      return;
    }
    router.push({ pathname: '/group/[id]', params: { id: subgroupId } });
  };

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/groups" />

      <ThemedText type="h1" style={styles.pageTitle}>
        Subgroups
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        Subgroups of {group.name}
      </ThemedText>

      {subgroups.length === 0 ? (
        <ThemedText type="body" themeColor="textSecondary">
          No subgroups yet.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {subgroups.map((subgroup) => (
            <GroupCard
              key={subgroup.id}
              name={subgroup.name}
              memberCount={subgroup.memberCount}
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: subgroup.id } })}
            />
          ))}
        </ThemedView>
      )}

      {canCreate &&
        (isCreating ? (
          <CreateGroupPanel
            nameLabel="New subgroup name"
            submitLabel="Create Subgroup"
            onCreate={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        ) : (
          <Pressable
            onPress={() => setIsCreating(true)}
            style={[styles.createButton, { backgroundColor: theme.primary }]}>
            <Ionicons name="add-circle-outline" size={16} color={theme.background} />
            <ThemedText type="bodyBold" themeColor="background">
              Create Subgroup
            </ThemedText>
          </Pressable>
        ))}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: 0,
  },
  list: {
    gap: Spacing.three,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
  },
});
