import { StyleSheet } from 'react-native';

import { router } from 'expo-router';

import { GroupCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGroups } from '@/context/groups-context';

export default function OrgGroupsScreen() {
  const { groups } = useGroups();

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <ThemedText type="h1" style={styles.pageTitle}>
        Groups
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        Groups in your area
      </ThemedText>

      <ThemedView style={styles.list}>
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            name={group.name}
            memberCount={group.memberCount}
            onPress={() => router.push({ pathname: '/org-group/[id]', params: { id: group.id } })}
          />
        ))}
      </ThemedView>
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
  list: {
    gap: Spacing.three,
  },
});
