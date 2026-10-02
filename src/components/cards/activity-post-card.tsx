import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { Facepile, type FacepilePerson } from '@/components/facepile';
import { InitialsAvatar } from '@/components/initials-avatar';
import { LikesListSheet } from '@/components/likes-list-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';
import { useSocial } from '@/context/social-context';

export type ActivityPostCardProps = {
  recordId: string;
  name: string;
  verified?: boolean;
  organization: string;
  hours: number;
  timeAgo: string;
  photoUrl?: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  onPress?: () => void;
};

export function ActivityPostCard({
  recordId,
  name,
  verified,
  organization,
  hours,
  timeAgo,
  photoUrl,
  likeCount: initialLikeCount,
  commentCount,
  likedByMe: initialLikedByMe,
  onPress,
}: ActivityPostCardProps) {
  const { toggleLike, getActivityLikers } = useSocial();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [likers, setLikers] = useState<FacepilePerson[]>([]);
  const [likesSheetVisible, setLikesSheetVisible] = useState(false);

  const loadLikers = async () => {
    const result = await getActivityLikers(recordId, 3);
    setLikers(result.map((liker) => ({ userId: liker.userId, fullName: liker.fullName })));
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await loadLikers();
    }
    if (!cancelled) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const handleLike = async () => {
    const wasLiked = likedByMe;
    setLikedByMe(!wasLiked);
    setLikeCount((count) => count + (wasLiked ? -1 : 1));
    const { liked, error } = await toggleLike(recordId);
    if (error || liked === null) {
      console.error('Failed to toggle like', error);
      setLikedByMe(wasLiked);
      setLikeCount((count) => count + (wasLiked ? 1 : -1));
      return;
    }
    loadLikers();
  };

  const handleShare = () => {
    Share.share({ message: `${name} volunteered at ${organization} for ${hours} hrs on ServePure.` }).catch((error) =>
      console.error('Failed to open share sheet', error),
    );
  };

  return (
    <>
      <Pressable onPress={onPress} disabled={!onPress}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <InitialsAvatar fullName={name} />
              <View style={styles.nameRow}>
                <ThemedText type="bodyBold" numberOfLines={1} style={styles.nameText}>
                  {name}
                </ThemedText>
                {verified && <VerifiedBadge size="sm" />}
              </View>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {timeAgo}
            </ThemedText>
          </View>

          <ThemedText type="body" style={styles.sentence}>
            Volunteered at <ThemedText type="bodyBold">{organization}</ThemedText> for {hours} hrs
          </ThemedText>

          {photoUrl && <PostPhoto uri={photoUrl} />}

          {likers.length > 0 && <Facepile people={likers} totalCount={likeCount} />}

          <PostActions
            likeCount={likeCount}
            commentCount={commentCount}
            likedByMe={likedByMe}
            onLikePress={handleLike}
            onLikeCountPress={() => setLikesSheetVisible(true)}
            onCommentPress={() => router.push({ pathname: '/activity/[id]/comments', params: { id: recordId } })}
            onSharePress={handleShare}
          />
        </ThemedView>
      </Pressable>

      <LikesListSheet visible={likesSheetVisible} recordId={recordId} onDismiss={() => setLikesSheetVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  nameText: {
    flexShrink: 1,
  },
  sentence: {},
});
