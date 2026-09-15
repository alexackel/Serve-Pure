import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';

export type ActivityPostCardProps = {
  name: string;
  verified?: boolean;
  organization: string;
  hours: number;
  timeAgo: string;
  hasPhoto?: boolean;
  likes?: number;
  onPress?: () => void;
};

export function ActivityPostCard({
  name,
  verified,
  organization,
  hours,
  timeAgo,
  hasPhoto,
  likes,
  onPress,
}: ActivityPostCardProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.identity}>
            <Avatar icon="person" iconSize={18} />
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

        {hasPhoto && <PostPhoto />}

        <PostActions likes={likes} />
      </ThemedView>
    </Pressable>
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
