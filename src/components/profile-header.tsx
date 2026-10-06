import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { InitialsAvatar } from '@/components/initials-avatar';
import { PillIconButton } from '@/components/pill-icon-button';
import { ThemedText } from '@/components/themed-text';
import { VerifiedBadge } from '@/components/verified-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AVATAR_SIZE = 72;

export type ProfileHeaderProps = {
  fullName: string;
  avatarUrl: string | null;
  identityVerified: boolean;
  followers: number;
  following: number;
  // Omit both on someone else's profile; the action row is then not rendered.
  onEditPress?: () => void;
  onSharePress?: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
};

export function ProfileHeader({
  fullName,
  avatarUrl,
  identityVerified,
  followers,
  following,
  onEditPress,
  onSharePress,
  onFollowersPress,
  onFollowingPress,
}: ProfileHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.identityRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.photo, { backgroundColor: theme.primaryTint }]}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <InitialsAvatar fullName={fullName} size={AVATAR_SIZE} />
        )}

        <View style={styles.nameRow}>
          <ThemedText type="h2" numberOfLines={1} style={styles.name}>
            {fullName}
          </ThemedText>
          {identityVerified && <VerifiedBadge />}
        </View>
      </View>

      <View style={styles.countsRow}>
        <Count value={followers} label="Followers" onPress={onFollowersPress} />
        <Count value={following} label="Following" onPress={onFollowingPress} />
      </View>

      {onEditPress && onSharePress && (
        <View style={styles.actionRow}>
          <PillIconButton icon="create-outline" label="Edit Profile" onPress={onEditPress} />
          <PillIconButton icon="share-outline" label="Share Profile" onPress={onSharePress} />
        </View>
      )}
    </View>
  );
}

function Count({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${value} ${label}`} onPress={onPress} style={styles.count}>
      <ThemedText type="bodyBold">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
    marginBottom: 0,
  },
  countsRow: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  count: {
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
