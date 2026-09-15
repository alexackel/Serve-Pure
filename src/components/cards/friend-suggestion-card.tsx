import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FriendSuggestionCardProps = {
  name: string;
  verified?: boolean;
  mutualCount?: number;
  volunteeredWith?: string;
  onPress?: () => void;
  onAddPress?: () => void;
};

export function FriendSuggestionCard({
  name,
  verified,
  mutualCount,
  volunteeredWith,
  onPress,
  onAddPress,
}: FriendSuggestionCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <Avatar size={56} icon="person" iconSize={26} style={styles.avatarSpacing} />

        <View style={styles.nameRow}>
          <ThemedText type="bodyBold" numberOfLines={1} style={styles.name}>
            {name}
          </ThemedText>
          {verified && <VerifiedBadge size="sm" />}
        </View>

        <View style={styles.reasons}>
          {mutualCount !== undefined && mutualCount > 0 && (
            <View style={styles.reasonRow}>
              <Ionicons name="people-outline" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {mutualCount} mutual{mutualCount === 1 ? '' : 's'}
              </ThemedText>
            </View>
          )}
          {volunteeredWith && (
            <View style={styles.reasonRow}>
              <Ionicons name="heart-outline" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.reasonText}>
                Collaborated
              </ThemedText>
            </View>
          )}
        </View>

        <Pressable onPress={onAddPress} style={[styles.addButton, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="person-add-outline" size={13} color={theme.primary} />
          <ThemedText type="label" themeColor="primary">
            Add
          </ThemedText>
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatarSpacing: {
    marginBottom: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    maxWidth: '100%',
  },
  name: {
    textAlign: 'center',
    flexShrink: 1,
  },
  reasons: {
    width: '100%',
    minHeight: 38,
    gap: Spacing.half,
    alignItems: 'center',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    maxWidth: '100%',
  },
  reasonText: {
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
});
