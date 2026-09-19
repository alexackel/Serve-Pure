import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A stronger shadow than the standard CardShadow (used for flat cards) so
// the FAB reads as a floating, prominent control rather than a flush tile.
const FabShadow = Platform.select({
  web: { boxShadow: '0px 6px 16px rgba(15, 23, 42, 0.28)' },
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 8 },
});

// Floats above the pill-shaped bottom tab bar (same BottomTabInset offset
// ScreenScrollView already reserves), raised an extra step higher than that
// baseline so it clears the tab bar with visible breathing room.
export function CreateFab({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create a post"
      style={[
        styles.fab,
        FabShadow,
        { backgroundColor: theme.primary, bottom: insets.bottom + BottomTabInset + Spacing.four },
      ]}>
      <Ionicons name="add" size={28} color={theme.background} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
