import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  hasUnread?: boolean;
  onPress?: () => void;
};

function IconButton({ icon, hasUnread, onPress }: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
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
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
        <TextInput
          placeholder="Search friends"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.icons}>
        <IconButton icon="notifications-outline" hasUnread />
        <IconButton icon="chatbubble-outline" hasUnread />
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
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
