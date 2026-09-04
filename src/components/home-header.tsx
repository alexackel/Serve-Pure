import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  hasUnread?: boolean;
  onPress?: () => void;
};

function IconButton({ icon, accessibilityLabel, hasUnread, onPress }: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `${accessibilityLabel}, unread` : accessibilityLabel}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={theme.text} />
      {hasUnread && (
        <View style={[styles.unreadDot, { backgroundColor: theme.primary, borderColor: theme.background }]} />
      )}
    </Pressable>
  );
}

export function HomeHeader() {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.icons}>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={styles.avatarButton}>
          <Avatar icon="person" iconSize={18} />
        </Pressable>
        <IconButton icon="search-outline" accessibilityLabel="Search" />
      </View>

      <View style={styles.upgradeSlot}>
        <Pressable style={({ pressed }) => [styles.upgradeButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
          <ThemedText type="bodyBold" themeColor="background">
            Upgrade
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.icons}>
        <IconButton icon="notifications-outline" accessibilityLabel="Notifications" hasUnread />
        <IconButton icon="chatbubble-outline" accessibilityLabel="Messages" hasUnread />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeSlot: {
    flex: 1,
    alignItems: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
