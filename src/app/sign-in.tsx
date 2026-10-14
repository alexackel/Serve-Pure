import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthField, CheckRow } from '@/components/auth-field';
import { OrganizationSignupForm } from '@/components/organization-signup-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useUsernameAvailability, usernameStatusMessage } from '@/hooks/use-username-availability';
import { useTheme } from '@/hooks/use-theme';
import { parseBirthdate } from '@/utils/birthdate';
import { formatUsPhone, normalizePhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/utils/phone';
import { normalizeUsername, usernameError } from '@/utils/username';

type Mode = 'sign-in' | 'sign-up';
// Which sign-up path the user chose. "I'm here to help" = volunteer,
// "I need volunteers" = organization.
type SignUpPath = 'volunteer' | 'organization';

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUpPersonal } = useSession();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [path, setPath] = useState<SignUpPath | null>(null);

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [school, setSchool] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameStatus = useUsernameAvailability(username);

  const resetSignUp = () => {
    setPath(null);
    setError(null);
    setConfirmationSent(false);
  };

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    if (result.error) setError(result.error);
    setIsSubmitting(false);
  };

  const handleVolunteerSignUp = async () => {
    setError(null);
    setConfirmationSent(false);

    const normalizedUsername = normalizeUsername(username);
    const usernameProblem = usernameError(normalizedUsername);
    if (usernameProblem) return setError(usernameProblem);
    if (usernameStatus === 'taken') return setError('That username is taken. Try another.');

    if (!firstName.trim() || !lastName.trim()) return setError('Enter your first and last name.');
    if (!email.trim().includes('@')) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use a password of at least 8 characters.');

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return setError(PHONE_ERROR);

    const normalizedBirthdate = parseBirthdate(birthdate);
    if (!normalizedBirthdate) return setError('Enter your date of birth as YYYY-MM-DD.');

    if (!school.trim()) return setError('Enter your school.');
    if (!acceptedTerms) return setError('Accept the terms to continue.');

    setIsSubmitting(true);
    const result = await signUpPersonal({
      email: email.trim(),
      password,
      username: normalizedUsername,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      birthdate: normalizedBirthdate,
      school: school.trim(),
      termsAcceptedAt: new Date().toISOString(),
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.needsEmailConfirmation) {
      setConfirmationSent(true);
    }
    // With a session, the root layout moves on to the phone check by itself.
  };

  const title =
    mode === 'sign-in'
      ? 'Welcome back'
      : path === 'organization'
        ? 'Set up an organization'
        : path === 'volunteer'
          ? 'Create your account'
          : 'Get started';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.six }]}
        keyboardShouldPersistTaps="handled">
        <ThemedText type="h1">{title}</ThemedText>

        {mode === 'sign-in' && (
          <>
            <ThemedView style={[styles.form, styles.formTop]}>
              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
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
                onPress={handleSignIn}
                disabled={isSubmitting}
                style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText type="bodyBold" themeColor="background">
                    Sign In
                  </ThemedText>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setError(null);
                  setMode('sign-up');
                }}
                style={styles.toggleButton}>
                <ThemedText type="caption" themeColor="primary">
                  Don&apos;t have an account? Sign up
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        )}

        {mode === 'sign-up' && path === null && (
          <>
            <ThemedView style={[styles.form, styles.formTop]}>
              <Pressable onPress={() => setPath('volunteer')} style={[styles.pathCard, { borderColor: theme.border }]}>
                <ThemedText type="bodyBold">I&apos;m here to help</ThemedText>
              </Pressable>
              <Pressable onPress={() => setPath('organization')} style={[styles.pathCard, { borderColor: theme.border }]}>
                <ThemedText type="bodyBold">I need volunteers</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Needs a business email.
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setError(null);
                  setMode('sign-in');
                }}
                style={styles.toggleButton}>
                <ThemedText type="caption" themeColor="primary">
                  Already have an account? Sign in
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        )}

        {mode === 'sign-up' && path === 'volunteer' && (
          <>
            <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
              One account per person. We&apos;ll text a code to confirm your mobile number.
            </ThemedText>
            <ThemedView style={styles.form}>
              <AuthField
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="jordan_r"
                autoCapitalize="none"
                autoCorrect={false}
                hint={usernameStatusMessage(usernameStatus)}
                error={usernameStatus === 'taken' ? 'That username is taken.' : null}
              />
              <AuthField label="First name" value={firstName} onChangeText={setFirstName} placeholder="Jordan" autoCapitalize="words" />
              <AuthField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Ruiz" autoCapitalize="words" />
              <AuthField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <AuthField label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
              <AuthField
                label="Mobile number (required)"
                value={phone}
                onChangeText={(text) => setPhone(formatUsPhone(text))}
                placeholder={PHONE_PLACEHOLDER}
                maxLength={16}
                keyboardType="phone-pad"
                autoCorrect={false}
              />
              <AuthField
                label="Date of birth (YYYY-MM-DD)"
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="2009-04-12"
              />
              <AuthField label="School" value={school} onChangeText={setSchool} placeholder="Riverside High School" autoCapitalize="words" />
              <CheckRow
                checked={acceptedTerms}
                onToggle={() => setAcceptedTerms((value) => !value)}
                label="I agree to the terms of service and privacy policy."
              />

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
                onPress={handleVolunteerSignUp}
                disabled={isSubmitting}
                style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText type="bodyBold" themeColor="background">
                    Create account
                  </ThemedText>
                )}
              </Pressable>
              <Pressable onPress={resetSignUp} style={styles.toggleButton}>
                <ThemedText type="caption" themeColor="primary">
                  Back
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        )}

        {mode === 'sign-up' && path === 'organization' && (
          <>
            <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
              Organization accounts use a business email. The manager verifies a mobile number too.
            </ThemedText>
            <OrganizationSignupForm onDone={() => undefined} />
            <Pressable onPress={resetSignUp} style={styles.toggleButton}>
              <ThemedText type="caption" themeColor="primary">
                Back
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
  formTop: {
    marginTop: Spacing.five,
  },
  pathCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.one,
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
