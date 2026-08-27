import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function ActionIcon({
  icon,
  count,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.actionButton}>
      <Ionicons name={icon} size={19} color={theme.textSecondary} />
      {count !== undefined && (
        <ThemedText type="caption" themeColor="textSecondary">
          {count}
        </ThemedText>
      )}
    </Pressable>
  );
}

/** Like/comment/share row shared by ActivityPostCard and RecordCard. */
export function PostActions({ likes }: { likes?: number }) {
  return (
    <View style={styles.actions}>
      <ActionIcon icon="heart-outline" count={likes} accessibilityLabel={likes ? `Like, ${likes} likes` : 'Like'} />
      <ActionIcon icon="chatbubble-outline" accessibilityLabel="Comment" />
      <ActionIcon icon="share-outline" accessibilityLabel="Share" />
    </View>
  );
}

/** Placeholder photo tile shared by ActivityPostCard and RecordCard. */
export function PostPhoto() {
  const theme = useTheme();
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
    height: 160,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
