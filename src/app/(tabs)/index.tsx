import { ScrollView, StyleSheet } from 'react-native';

import { ActivityPostCard, FriendSuggestionCard } from '@/components/cards';
import { HomeHeader } from '@/components/home-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getUser } from '@/data/mock-users';

const SAMPLE_SUGGESTED_FRIENDS = [
  { userId: 'jordan-ruiz', mutualCount: 4, volunteeredWith: 'GreenFuture Coalition' },
  { userId: 'm3', mutualCount: 2 },
  { userId: 'sam-okafor', mutualCount: 3, volunteeredWith: 'Northside Food Bank' },
  { userId: 'casey-lin', mutualCount: 6, volunteeredWith: 'Coastal Guardians' },
  { userId: 'morgan-diaz', mutualCount: 1 },
];

const SAMPLE_ACTIVITY = [
  {
    userId: 'jordan-ruiz',
    organization: 'GreenFuture Coalition',
    hours: 3,
    timeAgo: '2h ago',
    hasPhoto: true,
    likes: 14,
  },
  {
    userId: 'm3',
    organization: 'Northside Food Bank',
    hours: 4,
    timeAgo: '5h ago',
    hasPhoto: false,
    likes: 5,
  },
  {
    userId: 'casey-lin',
    organization: 'Coastal Guardians',
    hours: 3,
    timeAgo: 'Yesterday',
    hasPhoto: true,
    likes: 21,
  },
  {
    userId: 'morgan-diaz',
    organization: 'Central Public Library',
    hours: 2,
    timeAgo: '2d ago',
    hasPhoto: false,
    likes: 3,
  },
];

export default function HomeScreen() {
  return (
    <ScreenScrollView containerStyle={styles.container}>
      <HomeHeader />

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Suggested Friends</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
          {SAMPLE_SUGGESTED_FRIENDS.map(({ userId, ...friend }) => {
            const user = getUser(userId);
            return (
              <FriendSuggestionCard
                key={userId}
                name={user?.name ?? 'Unknown'}
                verified={user?.verified}
                {...friend}
              />
            );
          })}
        </ScrollView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Friends Activity</ThemedText>
        <ThemedView style={styles.activityList}>
          {SAMPLE_ACTIVITY.map(({ userId, ...post }) => {
            const user = getUser(userId);
            return (
              <ActivityPostCard
                key={`${userId}-${post.timeAgo}`}
                name={user?.name ?? 'Unknown'}
                verified={user?.verified}
                {...post}
              />
            );
          })}
        </ThemedView>
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginHorizontal: -Spacing.four,
  },
});
