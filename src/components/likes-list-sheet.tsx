import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { InitialsAvatar } from '@/components/initials-avatar';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { type ActivityLiker, useSocial } from '@/context/social-context';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 20;

// Same hand-rolled Modal+backdrop+bottom-sheet shape as find/filter-sheet.tsx
// (plain mount/unmount, no Reanimated enter/exit — see that file's comment
// for why), but for a paginated list with a per-row action instead of a
// select-options list.
export function LikesListSheet({
  visible,
  recordId,
  onDismiss,
}: {
  visible: boolean;
  recordId: string;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { getActivityLikers, followUser, unfollowUser } = useSocial();
  const [likers, setLikers] = useState<ActivityLiker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wasVisible, setWasVisible] = useState(visible);

  const loadPage = async (offset: number) => {
    setIsLoading(true);
    const page = await getActivityLikers(recordId, PAGE_SIZE, offset);
    setLikers((current) => (offset === 0 ? page : [...current, ...page]));
    setHasMore(page.length === PAGE_SIZE);
    setIsLoading(false);
  };

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setLikers([]);
      setHasMore(true);
      loadPage(0);
    }
  }

  const handleToggleFollow = async (liker: ActivityLiker) => {
    setLikers((current) => current.map((item) => (item.userId === liker.userId ? { ...item, isFollowing: !item.isFollowing } : item)));
    const { error } = liker.isFollowing ? await unfollowUser(liker.userId) : await followUser(liker.userId);
    if (error) {
      setLikers((current) => current.map((item) => (item.userId === liker.userId ? { ...item, isFollowing: liker.isFollowing } : item)));
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>
      <View
        style={[
          styles.sheet,
          CardShadow,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="h3" style={styles.title}>
          Likes
        </ThemedText>

        <ScrollView style={styles.list}>
          {likers.map((liker) => (
            <Pressable
              key={liker.userId}
              style={styles.row}
              onPress={() => {
                onDismiss();
                router.push({ pathname: '/profile/[userId]', params: { userId: liker.userId, fullName: liker.fullName } });
              }}>
              <View style={styles.identity}>
                <InitialsAvatar fullName={liker.fullName} size={36} />
                <ThemedText type="bodyBold" numberOfLines={1} style={styles.name}>
                  {liker.fullName}
                </ThemedText>
              </View>
              {liker.userId !== session?.user.id && (
                <Pressable
                  onPress={() => handleToggleFollow(liker)}
                  style={[
                    styles.followButton,
                    { backgroundColor: liker.isFollowing ? theme.backgroundSelected : theme.primaryTint },
                  ]}>
                  <ThemedText type="label" themeColor={liker.isFollowing ? 'text' : 'primary'}>
                    {liker.isFollowing ? 'Following' : 'Follow'}
                  </ThemedText>
                </Pressable>
              )}
            </Pressable>
          ))}

          {isLoading && <ActivityIndicator style={styles.spinner} color={theme.primary} />}

          {!isLoading && hasMore && likers.length > 0 && (
            <Pressable onPress={() => loadPage(likers.length)} style={styles.loadMore}>
              <ThemedText type="bodyBold" themeColor="primary">
                Load more
              </ThemedText>
            </Pressable>
          )}

          {!isLoading && likers.length === 0 && (
            <ThemedText type="body" themeColor="textSecondary" style={styles.empty}>
              No likes yet.
            </ThemedText>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    maxHeight: '70%',
  },
  title: {
    marginBottom: Spacing.three,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
  },
  followButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
  },
  spinner: {
    marginVertical: Spacing.three,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
