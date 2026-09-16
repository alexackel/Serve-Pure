import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useSession();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setConfirmationSent(false);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'sign-up' && !fullName.trim()) {
      setError('Enter your full name.');
      return;
    }

    setIsSubmitting(true);
    if (mode === 'sign-in') {
      const result = await signIn(email.trim(), password);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(email.trim(), password, fullName.trim(), birthdate.trim() || undefined);
      if (result.error) {
        setError(result.error);
      } else if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.six }]}>
        <ThemedText type="h1">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
          {mode === 'sign-in'
            ? 'Sign in to track your volunteer hours.'
            : 'Every account starts as a volunteer — you can administer organizations or groups later.'}
        </ThemedText>

        <ThemedView style={styles.form}>
          {mode === 'sign-up' && (
            <ThemedView style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Full name
              </ThemedText>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jordan Ruiz"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </ThemedView>
          )}

          <ThemedView style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Email
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Password
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
          </ThemedView>

          {mode === 'sign-up' && (
            <ThemedView style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Birthdate (optional, YYYY-MM-DD)
              </ThemedText>
              <TextInput
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="2009-04-12"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </ThemedView>
          )}

          {error && (
            <ThemedText type="caption" themeColor="error">
              {error}
            </ThemedText>
          )}
          {confirmationSent && (
            <ThemedText type="caption" themeColor="success">
              Account created — check {email.trim()} for a confirmation link before signing in.
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
                {mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            }}
            style={styles.toggleButton}>
            <ThemedText type="caption" themeColor="primary">
              {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.one,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
