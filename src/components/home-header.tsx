import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { SearchBar } from './search-bar';

import { Spacing } from '@/constants/theme';
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

type HomeHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function HomeHeader({ searchValue, onSearchChange }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <SearchBar placeholder="Search friends" value={searchValue} onChangeText={onSearchChange} />

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
