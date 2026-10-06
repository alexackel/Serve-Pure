import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ActivityPostCard } from '@/components/cards';
import { BackButton } from '@/components/back-button';
import { OverflowMenu, type OverflowMenuAction } from '@/components/overflow-menu';
import { ProfileHeader } from '@/components/profile-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { type FeedActivity, type FollowCounts, type UserProfile, useSocial } from '@/context/social-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

export default function ProfileScreen() {
  const { userId, fullName } = useLocalSearchParams<{ userId: string; fullName?: string }>();
  const { session } = useSession();
  const theme = useTheme();
  const {
    followingIds,
    followUser,
    unfollowUser,
    blockUser,
    unblockUser,
    getUserProfile,
    getUserActivity,
    getFollowCounts,
  } = useSocial();
  const [isBlocked, setIsBlocked] = useState(false);
  // undefined = still loading, null = unavailable (missing, or blocked either way).
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [posts, setPosts] = useState<FeedActivity[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!session || !userId) return;
    let cancelled = false;
    supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', session.user.id)
      .eq('blocked_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load block status', error);
          return;
        }
        setIsBlocked(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [session, userId]);

  // Reloaded on focus so a follow, unfollow, or block made elsewhere shows up on return.
  const load = useCallback(async () => {
    if (!userId) return;
    const [profileResult, countsResult, postsResult] = await Promise.all([
      getUserProfile(userId),
      getFollowCounts(userId),
      getUserActivity(userId, PAGE_SIZE, 0),
    ]);
    setProfile(profileResult);
    setCounts(countsResult);
    setPosts(postsResult);
    setHasMore(postsResult.length === PAGE_SIZE);
  }, [userId, getUserProfile, getFollowCounts, getUserActivity]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!userId || isLoadingMore) return;
    setIsLoadingMore(true);
    const page = await getUserActivity(userId, PAGE_SIZE, posts.length);
    setPosts((current) => [...current, ...page]);
    setHasMore(page.length === PAGE_SIZE);
    setIsLoadingMore(false);
  };

  if (!userId) return null;

  const isOwnProfile = session?.user.id === userId;
  const isFollowing = followingIds.has(userId);
  const name = profile?.fullName ?? fullName ?? 'Unknown';

  const refreshCounts = async () => setCounts(await getFollowCounts(userId));

  const handleFollowToggle = async () => {
    const { error } = isFollowing ? await unfollowUser(userId) : await followUser(userId);
    if (error) {
      console.error('Failed to change follow status', error);
      return;
    }
    refreshCounts();
  };

  const menuActions: OverflowMenuAction[] = [
    isBlocked
      ? {
          label: 'Unblock',
          onPress: async () => {
            const { error } = await unblockUser(userId);
            if (!error) {
              setIsBlocked(false);
              load();
            }
          },
        }
      : {
          label: 'Block',
          destructive: true,
          onPress: async () => {
            const { error } = await blockUser(userId);
            if (!error) {
              setIsBlocked(true);
              load();
            }
          },
        },
  ];

  const showPosts = profile !== null && profile !== undefined && !isBlocked;

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.headerRow}>
        <BackButton fallbackHref="/" />
        {!isOwnProfile && <OverflowMenu actions={menuActions} />}
      </View>

      {profile !== null && (
        <ProfileHeader
          fullName={name}
          avatarUrl={profile?.avatarUrl ?? null}
          identityVerified={profile?.identityVerified ?? false}
          followers={counts.followers}
          following={counts.following}
          onFollowersPress={() => router.push({ pathname: '/connections', params: { userId, mode: 'followers' } })}
          onFollowingPress={() => router.push({ pathname: '/connections', params: { userId, mode: 'following' } })}
        />
      )}

      {!isOwnProfile && !isBlocked && profile && (
        <Pressable
          accessibilityRole="button"
          onPress={handleFollowToggle}
          style={[styles.followButton, { backgroundColor: isFollowing ? theme.backgroundSelected : theme.primary }]}>
          <ThemedText type="bodyBold" themeColor={isFollowing ? 'text' : 'background'}>
            {isFollowing ? 'Following' : 'Follow'}
          </ThemedText>
        </Pressable>
      )}

      {profile === null && (
        <ThemedText type="body" themeColor="textSecondary">
          This profile isn’t available.
        </ThemedText>
      )}

      {showPosts && (
        <View style={styles.section}>
          <ThemedText type="h3">Posts</ThemedText>
          {posts.length === 0 ? (
            <ThemedText type="body" themeColor="textSecondary">
              No posts yet.
            </ThemedText>
          ) : (
            <View style={styles.postList}>
              {posts.map((activity) => (
                <ActivityPostCard
                  key={activity.recordId}
                  recordId={activity.recordId}
                  name={activity.fullName}
                  verified={activity.identityVerified}
                  organization={activity.activityOrgName}
                  activityTitle={activity.activityTitle}
                  hours={activity.hours ?? 0}
                  description={activity.notes}
                  city={activity.city}
                  createdAt={activity.createdAt}
                  photoUrl={activity.photoUrl ?? undefined}
                  likeCount={activity.likeCount}
                  commentCount={activity.commentCount}
                  likedByMe={activity.likedByMe}
                  onPress={() => router.push({ pathname: '/activity/[id]/comments', params: { id: activity.recordId } })}
                />
              ))}
            </View>
          )}
          {hasMore && (
            <Pressable
              accessibilityRole="button"
              onPress={loadMore}
              disabled={isLoadingMore}
              style={[styles.loadMore, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="bodyBold" themeColor={isLoadingMore ? 'textSecondary' : 'primary'}>
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {isBlocked && (
        <ThemedText type="body" themeColor="textSecondary">
          You’ve blocked this person, so their posts are hidden.
        </ThemedText>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
    minWidth: 100,
  },
  section: {
    gap: Spacing.three,
  },
  postList: {
    gap: Spacing.three,
    marginHorizontal: -Spacing.four,
  },
  loadMore: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
});
