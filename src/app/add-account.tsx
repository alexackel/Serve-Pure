import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

// Adds an existing login (personal or organization) to this device.
export default function AddAccountScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addAccount } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter the email and password for that account.');
      return;
    }
    setIsSubmitting(true);
    const result = await addAccount(email.trim(), password);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.six }]}
      style={{ backgroundColor: theme.background }}>
      <BackButton fallbackHref="/you" />
      <ThemedText type="h1">Sign in to another account</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        It will stay on this device so you can switch back to it.
      </ThemedText>

      <ThemedView style={styles.form}>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="org@example.org"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <AuthField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
        {error && (
          <ThemedText type="caption" themeColor="error">
            {error}
          </ThemedText>
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText type="bodyBold" themeColor="background">
              Sign in
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.one,
  },
});
