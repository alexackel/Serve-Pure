import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CreatePostSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  showSelfUpload: boolean;
  showDiscoveredPost: boolean;
};

// Same Modal pattern as FilterSheet (see that file's comment): conditionally
// mounted rather than toggling `visible`, since RN Web ignores `visible`
// prop changes on an already-mounted Modal.
export function CreatePostSheet({ visible, onDismiss, showSelfUpload, showDiscoveredPost }: CreatePostSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  const go = (pathname: '/create-event' | '/self-upload' | '/discovered-post') => {
    onDismiss();
    router.push(pathname);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>
      <View
        style={[
          styles.sheet,
          CardShadow,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <Pressable
          onPress={() => go('/create-event')}
          style={[styles.option, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          <View style={styles.optionText}>
            <ThemedText type="bodyBold">Create Event</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Post a volunteer event for others to join
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </Pressable>

        {showSelfUpload && (
          <Pressable
            onPress={() => go('/self-upload')}
            style={[styles.option, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="create-outline" size={22} color={theme.primary} />
            <View style={styles.optionText}>
              <ThemedText type="bodyBold">Self Upload</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Log volunteer hours from outside the app
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
        )}

        {showDiscoveredPost && (
          <Pressable
            onPress={() => go('/discovered-post')}
            style={[styles.option, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="link-outline" size={22} color={theme.primary} />
            <View style={styles.optionText}>
              <ThemedText type="bodyBold">Share a Discovered Opportunity</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Point volunteers to an org you know of
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  optionText: {
    flex: 1,
    gap: Spacing.half,
  },
});
