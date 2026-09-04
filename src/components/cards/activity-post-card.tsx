import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type ActivityPostCardProps = {
  name: string;
  organization: string;
  hours: number;
  timeAgo: string;
  hasPhoto?: boolean;
  likes?: number;
  onPress?: () => void;
};

export function ActivityPostCard({
  name,
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
          <Avatar icon="person" iconSize={18} />
          <ThemedText type="caption" themeColor="textSecondary">
            {timeAgo}
          </ThemedText>
        </View>

        <ThemedText type="body" style={styles.sentence}>
          <ThemedText type="bodyBold">{name}</ThemedText> volunteered at{' '}
          <ThemedText type="bodyBold">{organization}</ThemedText> for {hours} hrs
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
  },
  sentence: {},
});
