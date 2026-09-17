import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export function AccountAvatarButton({ size = 32 }: { size?: number }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const { signOut } = useSession();
  const theme = useTheme();

  const handleSignOut = () => {
    setMenuVisible(false);
    signOut();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        style={styles.avatarButton}
        onPress={() => setMenuVisible(true)}>
        <Avatar size={size} icon="person" iconSize={Math.round(size * 0.55)} />
      </Pressable>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={18} color={theme.error} />
              <ThemedText type="bodyBold" themeColor="error">
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menu: {
    position: 'absolute',
    top: 60,
    left: Spacing.four,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    minWidth: 160,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
