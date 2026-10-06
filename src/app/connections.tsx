import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { InitialsAvatar } from '@/components/initials-avatar';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { type FollowListPerson, useSocial } from '@/context/social-context';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 20;

type Mode = 'followers' | 'following';

// Paged list of the people who follow a user, or whom they follow. Reached from
// the follower/following counts on the You page; each row opens that person's
// profile.
export default function ConnectionsScreen() {
  const { userId, mode } = useLocalSearchParams<{ userId: string; mode: Mode }>();
  const theme = useTheme();
  const { getFollowers, getFollowing } = useSocial();
  const [people, setPeople] = useState<FollowListPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const isFollowers = mode === 'followers';
  const title = isFollowers ? 'Followers' : 'Following';
  const emptyText = isFollowers ? 'No followers yet.' : 'Not following anyone yet.';

  const fetchPage = useCallback(
    (offset: number) => (isFollowers ? getFollowers : getFollowing)(userId, PAGE_SIZE, offset),
    [userId, isFollowers, getFollowers, getFollowing],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      const page = await fetchPage(0);
      if (cancelled) return;
      setPeople(page);
      setHasMore(page.length === PAGE_SIZE);
      setIsLoading(false);
    }
    loadFirstPage();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setIsLoading(true);
    const page = await fetchPage(people.length);
    setPeople((current) => [...current, ...page]);
    setHasMore(page.length === PAGE_SIZE);
    setIsLoading(false);
  };

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">{title}</ThemedText>

      <ThemedView style={styles.list}>
        {people.map((person) => (
          <Pressable
            key={person.userId}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/profile/[userId]', params: { userId: person.userId, fullName: person.fullName } })
            }
            style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed && styles.pressed]}>
            {person.avatarUrl ? (
              <Image
                source={{ uri: person.avatarUrl }}
                style={[styles.photo, { backgroundColor: theme.primaryTint }]}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <InitialsAvatar fullName={person.fullName} size={44} />
            )}
            <ThemedText type="bodyBold" numberOfLines={1} style={styles.name}>
              {person.fullName}
            </ThemedText>
            {person.identityVerified && <VerifiedBadge size="sm" />}
          </Pressable>
        ))}

        {isLoading && <ActivityIndicator style={styles.spinner} color={theme.primary} />}

        {!isLoading && hasMore && people.length > 0 && (
          <Pressable onPress={loadMore} style={styles.loadMore}>
            <ThemedText type="bodyBold" themeColor="primary">
              Load more
            </ThemedText>
          </Pressable>
        )}

        {!isLoading && people.length === 0 && (
          <ThemedText type="body" themeColor="textSecondary">
            {emptyText}
          </ThemedText>
        )}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  spinner: {
    marginVertical: Spacing.three,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
