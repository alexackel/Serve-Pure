import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityPostCard, FriendSuggestionCard } from '@/components/cards';
import { HomeHeader } from '@/components/home-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SAMPLE_SUGGESTED_FRIENDS = [
  { name: 'Jordan Ruiz', mutualCount: 4, volunteeredWith: 'GreenFuture Coalition' },
  { name: 'Priya Nair', mutualCount: 2 },
  { name: 'Sam Okafor', mutualCount: 3, volunteeredWith: 'Northside Food Bank' },
  { name: 'Casey Lin', mutualCount: 6, volunteeredWith: 'Coastal Guardians' },
  { name: 'Morgan Diaz', mutualCount: 1 },
];

const SAMPLE_ACTIVITY = [
  { name: 'Jordan Ruiz', organization: 'GreenFuture Coalition', hours: 3, timeAgo: '2h ago', hasPhoto: true },
  { name: 'Priya Nair', organization: 'Northside Food Bank', hours: 4, timeAgo: '5h ago', hasPhoto: false },
  { name: 'Casey Lin', organization: 'Coastal Guardians', hours: 3, timeAgo: 'Yesterday', hasPhoto: true },
  { name: 'Morgan Diaz', organization: 'Central Public Library', hours: 2, timeAgo: '2d ago', hasPhoto: false },
];

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <HomeHeader />

        <ThemedView style={styles.section}>
          <ThemedText type="h3">Suggested Friends</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
            {SAMPLE_SUGGESTED_FRIENDS.map((friend) => (
              <FriendSuggestionCard key={friend.name} {...friend} />
            ))}
          </ScrollView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="h3">Friends Activity</ThemedText>
          <ThemedView style={styles.activityList}>
            {SAMPLE_ACTIVITY.map((post) => (
              <ActivityPostCard key={`${post.name}-${post.timeAgo}`} {...post} />
            ))}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  suggestedRow: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  activityList: {
    gap: Spacing.three,
  },
});
