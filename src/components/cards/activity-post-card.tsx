import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

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
  onPress?: () => void;
};

function ActionIcon({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme();
  return (
    <Pressable style={styles.actionButton}>
      <Ionicons name={icon} size={19} color={theme.textSecondary} />
    </Pressable>
  );
}

export function ActivityPostCard({ name, organization, hours, timeAgo, hasPhoto, onPress }: ActivityPostCardProps) {
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

        {hasPhoto && (
          <View style={[styles.photo, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
          </View>
        )}

        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          <ActionIcon icon="heart-outline" />
          <ActionIcon icon="chatbubble-outline" />
          <ActionIcon icon="share-outline" />
        </View>
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
  photo: {
    height: 160,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
