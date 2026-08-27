import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useFocusEffect } from 'expo-router';

import { ActivityPostCard, FriendSuggestionCard } from '@/components/cards';
import { HomeHeader } from '@/components/home-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const SAMPLE_SUGGESTED_FRIENDS = [
  { name: 'Jordan Ruiz', mutualCount: 4, volunteeredWith: 'GreenFuture Coalition' },
  { name: 'Priya Nair', mutualCount: 2 },
  { name: 'Sam Okafor', mutualCount: 3, volunteeredWith: 'Northside Food Bank' },
  { name: 'Casey Lin', mutualCount: 6, volunteeredWith: 'Coastal Guardians' },
  { name: 'Morgan Diaz', mutualCount: 1 },
];

const SAMPLE_ACTIVITY = [
  {
    name: 'Jordan Ruiz',
    organization: 'GreenFuture Coalition',
    hours: 3,
    timeAgo: '2h ago',
    hasPhoto: true,
    likes: 14,
  },
  {
    name: 'Priya Nair',
    organization: 'Northside Food Bank',
    hours: 4,
    timeAgo: '5h ago',
    hasPhoto: false,
    likes: 5,
  },
  {
    name: 'Casey Lin',
    organization: 'Coastal Guardians',
    hours: 3,
    timeAgo: 'Yesterday',
    hasPhoto: true,
    likes: 21,
  },
  {
    name: 'Morgan Diaz',
    organization: 'Central Public Library',
    hours: 2,
    timeAgo: '2d ago',
    hasPhoto: false,
    likes: 3,
  },
];

export default function HomeScreen() {
  const [searchValue, setSearchValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      return () => setSearchValue('');
    }, []),
  );

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <HomeHeader searchValue={searchValue} onSearchChange={setSearchValue} />

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
  },
});
