import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';

import { InitialsAvatar } from '@/components/initials-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PersonSearchRowProps = {
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  verified?: boolean;
  added?: boolean;
  onPress?: () => void;
  onAddPress?: () => void;
  onRemovePress?: () => void;
};

export function PersonSearchRow({
  fullName,
  username,
  avatarUrl,
  verified,
  added,
  onPress,
  onAddPress,
  onRemovePress,
}: PersonSearchRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.photo, { backgroundColor: theme.primaryTint }]} contentFit="cover" transition={150} />
        ) : (
          <InitialsAvatar fullName={fullName} size={44} />
        )}

        <View style={styles.nameColumn}>
          <View style={styles.nameRow}>
            <ThemedText type="bodyBold" numberOfLines={1} style={styles.nameText}>
              {fullName}
            </ThemedText>
            {verified && <VerifiedBadge size="sm" />}
          </View>
          {username && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              @{username}
            </ThemedText>
          )}
        </View>

        {added ? (
          <Pressable
            onPress={onRemovePress}
            disabled={!onRemovePress}
            style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="checkmark" size={13} color={theme.textSecondary} />
            <ThemedText type="label" themeColor="textSecondary">
              Added
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={onAddPress} style={[styles.addButton, { backgroundColor: theme.primaryTint }]}>
            <Ionicons name="person-add-outline" size={13} color={theme.primary} />
            <ThemedText type="label" themeColor="primary">
              Add
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nameColumn: {
    flex: 1,
    gap: Spacing.half,
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    maxWidth: '100%',
  },
  nameText: {
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
