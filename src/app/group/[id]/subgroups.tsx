import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { GroupCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MOCK_GROUPS } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

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

export default function SubgroupsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = MOCK_GROUPS.find((item) => item.id === id);
  const subgroups = group?.subgroupIds
    ? group.subgroupIds
        .map((subgroupId) => MOCK_GROUPS.find((item) => item.id === subgroupId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

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
  pageTitle: {
    marginBottom: 0,
  },
  list: {
    gap: Spacing.three,
  },
});
