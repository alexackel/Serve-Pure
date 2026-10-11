import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { formatPostAge, formatPostMeta, PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { Facepile, type FacepilePerson } from '@/components/facepile';
import { InitialsAvatar } from '@/components/initials-avatar';
import { LikesListSheet } from '@/components/likes-list-sheet';
import { MentionText } from '@/components/mention-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';
import { useSocial } from '@/context/social-context';

export type ActivityPostCardProps = {
  recordId: string;
  name: string;
  verified?: boolean;
  // Org posts read "<name> volunteered at <org> for <hours>". Self-uploads have
  // no org, so they show activityTitle as the headline instead.
  organization: string | null;
  activityTitle: string | null;
  hours: number;
  description: string | null;
  city: string | null;
  createdAt: string;
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
  activityTitle,
  hours,
  description,
  city,
  createdAt,
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
    const message = organization
      ? `${name} volunteered at ${organization} for ${hours} hrs on ServePure.`
      : `${name}: ${activityTitle ?? 'an activity'} on ServePure.`;
    Share.share({ message }).catch((error) => console.error('Failed to open share sheet', error));
  };

  return (
    <>
      <Pressable onPress={onPress} disabled={!onPress}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.headline}>
            <InitialsAvatar fullName={name} size={40} />
            <View style={styles.headlineText}>
              {organization ? (
                <ThemedText type="body">
                  <ThemedText type="bodyBold">{name}</ThemedText> volunteered at{' '}
                  <ThemedText type="bodyBold">{organization}</ThemedText> for{' '}
                  <ThemedText type="bodyBold">
                    {hours} {hours === 1 ? 'hour' : 'hours'}
                  </ThemedText>
                </ThemedText>
              ) : (
                <>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {name}
                  </ThemedText>
                  <ThemedText type="h3">{activityTitle ?? 'An activity'}</ThemedText>
                </>
              )}
            </View>
            {verified && <VerifiedBadge size="sm" />}
          </View>

          {photoUrl && <PostPhoto uri={photoUrl} />}

          {description && <MentionText type="body" body={description} />}

          <ThemedText type="caption" themeColor="textSecondary">
            {formatPostMeta(city, formatPostAge(createdAt))}
          </ThemedText>

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
    gap: Spacing.three,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headlineText: {
    flex: 1,
    gap: Spacing.half,
    paddingTop: Spacing.one,
  },
});
