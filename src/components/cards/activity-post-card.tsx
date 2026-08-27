import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
            <Ionicons name="person" size={18} color={theme.primary} />
          </View>
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentence: {},
});
