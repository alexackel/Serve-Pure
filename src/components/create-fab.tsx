import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, BottomTabInset, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// A stronger shadow than the standard CardShadow (used for flat cards) so
// the FAB reads as a floating, prominent control rather than a flush tile.
// Dark mode needs its own tuning: a shadowColor this close to the dark
// background (#0B0F14) would be invisible, so dark uses pure black at a
// higher opacity/radius to actually read as a shadow against a dark surface.
function getFabShadow(scheme: string | null | undefined) {
  const isDark = scheme === 'dark';
  return Platform.select({
    web: {
      boxShadow: isDark ? '0px 6px 16px rgba(0, 0, 0, 0.55)' : '0px 4px 10px rgba(15, 23, 42, 0.2)',
    },
    ios: {
      shadowColor: isDark ? '#000000' : '#0F172A',
      shadowOpacity: isDark ? 0.55 : 0.2,
      shadowRadius: isDark ? 12 : 8,
      shadowOffset: { width: 0, height: 4 },
    },
    default: { elevation: 8 },
  });
}

// Floats above the pill-shaped bottom tab bar (same BottomTabInset offset
// ScreenScrollView already reserves), with just enough extra clearance to
// sit clear of it rather than floating a full step higher.
export function CreateFab({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create a post"
      style={[
        styles.fab,
        getFabShadow(scheme),
        { backgroundColor: theme.primary, bottom: insets.bottom + BottomTabInset + Spacing.two },
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
