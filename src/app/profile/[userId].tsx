import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { InitialsAvatar } from '@/components/initials-avatar';
import { OverflowMenu, type OverflowMenuAction } from '@/components/overflow-menu';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useSocial } from '@/context/social-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { userId, fullName } = useLocalSearchParams<{ userId: string; fullName?: string }>();
  const { session } = useSession();
  const theme = useTheme();
  const { followingIds, followUser, unfollowUser, blockUser, unblockUser } = useSocial();
  const [isBlocked, setIsBlocked] = useState(false);

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

  if (!userId) return null;

  const isOwnProfile = session?.user.id === userId;
  const isFollowing = followingIds.has(userId);
  const name = fullName ?? 'Unknown';

  const menuActions: OverflowMenuAction[] = [
    isBlocked
      ? {
          label: 'Unblock',
          onPress: async () => {
            const { error } = await unblockUser(userId);
            if (!error) setIsBlocked(false);
          },
        }
      : {
          label: 'Block',
          destructive: true,
          onPress: async () => {
            const { error } = await blockUser(userId);
            if (!error) setIsBlocked(true);
          },
        },
  ];

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.headerRow}>
        <BackButton fallbackHref="/" />
        {!isOwnProfile && <OverflowMenu actions={menuActions} />}
      </View>

      <View style={styles.identity}>
        <InitialsAvatar fullName={name} size={72} />
        <ThemedText type="h2">{name}</ThemedText>
      </View>

      {!isOwnProfile && !isBlocked && (
        <ThemedText
          type="bodyBold"
          themeColor={isFollowing ? 'text' : 'background'}
          onPress={() => (isFollowing ? unfollowUser(userId) : followUser(userId))}
          style={[styles.followButton, { backgroundColor: isFollowing ? theme.backgroundSelected : theme.primary }]}>
          {isFollowing ? 'Following' : 'Follow'}
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
  identity: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  followButton: {
    alignSelf: 'center',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    minWidth: 140,
  },
});
