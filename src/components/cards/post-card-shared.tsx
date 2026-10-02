import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExpandablePhoto } from '@/components/expandable-photo';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function ActionIcon({
  icon,
  count,
  accessibilityLabel,
  color,
  onPress,
  onCountPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
  accessibilityLabel: string;
  color?: string;
  onPress?: () => void;
  onCountPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.actionButton}>
      <Ionicons name={icon} size={19} color={color ?? theme.textSecondary} />
      {count !== undefined && count > 0 && (
        <Pressable onPress={onCountPress} disabled={!onCountPress} hitSlop={6}>
          <ThemedText type="caption" themeColor="textSecondary">
            {count}
          </ThemedText>
        </Pressable>
      )}
    </Pressable>
  );
}

export type PostActionsProps = {
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  onLikePress?: () => void;
  onLikeCountPress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
};

/** Like/comment/share row shared by ActivityPostCard and RecordCard. */
export function PostActions({
  likeCount,
  commentCount,
  likedByMe,
  onLikePress,
  onLikeCountPress,
  onCommentPress,
  onSharePress,
}: PostActionsProps) {
  const theme = useTheme();
  return (
    <View style={styles.actions}>
      <ActionIcon
        icon={likedByMe ? 'heart' : 'heart-outline'}
        count={likeCount}
        color={likedByMe ? theme.error : undefined}
        accessibilityLabel={likeCount ? `Like, ${likeCount} likes` : 'Like'}
        onPress={onLikePress}
        onCountPress={onLikeCountPress}
      />
      <ActionIcon icon="chatbubble-outline" count={commentCount} accessibilityLabel="Comment" onPress={onCommentPress} />
      <ActionIcon icon="share-outline" accessibilityLabel="Share" onPress={onSharePress} />
    </View>
  );
}

/** Photo tile shared by ActivityPostCard and RecordCard — renders `uri` when given, else a placeholder. */
export function PostPhoto({ uri }: { uri?: string }) {
  const theme = useTheme();
  if (uri) {
    return <ExpandablePhoto uri={uri} style={styles.photo} />;
  }
  return (
    <View style={[styles.photo, { backgroundColor: theme.backgroundSelected }]}>
      <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
