import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const router = useRouter();
  const { signOut, activeAccountType } = useSession();

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">Settings</ThemedText>

      <ThemedView style={[styles.card, cardShadow, { borderColor: theme.border }]}>
        {activeAccountType === 'personal' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/organization-signup')}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Ionicons name="business-outline" size={18} color={theme.primary} />
            <ThemedText type="bodyBold" themeColor="primary">
              Set up organization account
            </ThemedText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => signOut()}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={18} color={theme.error} />
          <ThemedText type="bodyBold" themeColor="error">
            Sign Out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
