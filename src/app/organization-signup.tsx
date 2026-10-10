import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { OrganizationSignupForm } from '@/components/organization-signup-form';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

// Reached from Settings. Creating the login keeps the current volunteer
// session on the device and makes the new organization login active.
export default function OrganizationSignupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.six }]}
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled">
      <BackButton fallbackHref="/settings" />
      <ThemedText type="h1">Set up an organization account</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        Organization accounts use a business email. The manager verifies a mobile number too.
      </ThemedText>
      <OrganizationSignupForm onDone={() => router.replace('/org-you')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
});
