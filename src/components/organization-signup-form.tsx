import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AuthField, CheckRow } from '@/components/auth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useUsernameAvailability, usernameStatusMessage } from '@/hooks/use-username-availability';
import { useTheme } from '@/hooks/use-theme';
import { isAtLeastAge, parseBirthdate } from '@/utils/birthdate';
import { businessEmailMatchesWebsite, isFreeMailEmail, websiteDomain } from '@/utils/email';
import { formatUsPhone, normalizePhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/utils/phone';
import { normalizeUsername, usernameError } from '@/utils/username';

const ORGANIZATION_TYPES: { value: string; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'environment', label: 'Environment' },
  { value: 'youth', label: 'Youth' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'animals', label: 'Animals' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'disaster_relief', label: 'Disaster relief' },
  { value: 'other', label: 'Other' },
];

type Props = {
  // Called after the organization login is created and active.
  onDone: () => void;
};

export function OrganizationSignupForm({ onDone }: Props) {
  const theme = useTheme();
  const { signUpOrganization } = useSession();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [website, setWebsite] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [is501c3, setIs501c3] = useState(false);
  const [ein, setEin] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerTitle, setManagerTitle] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameStatus = useUsernameAvailability(username);

  const handleSubmit = async () => {
    setError(null);

    const normalizedUsername = normalizeUsername(username);
    const usernameProblem = usernameError(normalizedUsername);
    if (usernameProblem) return setError(usernameProblem);
    if (usernameStatus === 'taken') return setError('That username is taken. Try another.');

    if (!organizationName.trim()) return setError('Enter the organization name.');
    if (!organizationType) return setError('Choose the type of organization.');
    if (!managerName.trim()) return setError('Enter your name as the manager.');
    if (!managerTitle.trim()) return setError('Enter your title at the organization.');

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) return setError('Enter the business email address.');
    if (isFreeMailEmail(trimmedEmail)) {
      return setError('Organizations need a business email, not a personal one like Gmail or Yahoo.');
    }

    if (!websiteDomain(website)) return setError('Enter the organization website.');
    if (!businessEmailMatchesWebsite(trimmedEmail, website)) {
      return setError("The business email's domain must match the organization website.");
    }

    if (is501c3 && !/^\d{2}-?\d{7}$/.test(ein.trim())) {
      return setError('Enter the 9-digit EIN for a 501(c)(3), like 12-3456789.');
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return setError(PHONE_ERROR);

    const normalizedBirthdate = parseBirthdate(birthdate);
    if (!normalizedBirthdate) return setError('Enter your date of birth as YYYY-MM-DD.');
    if (!isAtLeastAge(normalizedBirthdate, 18)) {
      return setError('Organization accounts must be set up by someone 18 or older.');
    }

    if (password.length < 8) return setError('Use a password of at least 8 characters.');
    if (!acceptedTerms) return setError('Accept the terms to continue.');

    setIsSubmitting(true);
    const result = await signUpOrganization({
      email: trimmedEmail,
      password,
      username: normalizedUsername,
      phone: normalizedPhone,
      birthdate: normalizedBirthdate,
      organizationName: organizationName.trim(),
      organizationType,
      website: website.trim(),
      facebookUrl: facebookUrl.trim(),
      is501c3,
      ein: is501c3 ? ein.replace(/-/g, '').replace(/^(\d{2})(\d{7})$/, '$1-$2') : '',
      address: address.trim(),
      managerName: managerName.trim(),
      managerTitle: managerTitle.trim(),
      termsAcceptedAt: new Date().toISOString(),
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (result.needsEmailConfirmation) {
      setConfirmationSent(true);
    } else {
      onDone();
    }
  };

  return (
    <ThemedView style={styles.form}>
      <AuthField
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="riverside_food"
        autoCapitalize="none"
        autoCorrect={false}
        hint={usernameStatusMessage(usernameStatus)}
        error={usernameStatus === 'taken' ? 'That username is taken.' : null}
      />
      <ThemedText type="h3" style={styles.sectionHeading}>
        Organization Details
      </ThemedText>
      <AuthField
        label="Organization name"
        value={organizationName}
        onChangeText={setOrganizationName}
        placeholder="Riverside Food Pantry"
      />

      <ThemedView style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Type of organization
        </ThemedText>
        <ThemedView style={styles.chips}>
          {ORGANIZATION_TYPES.map((option) => {
            const selected = organizationType === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setOrganizationType(option.value)}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.background },
                ]}>
                <ThemedText type="caption" themeColor={selected ? 'background' : 'text'}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      <CheckRow
        checked={is501c3}
        onToggle={() => setIs501c3((value) => !value)}
        label="This organization is a 501(c)(3) nonprofit"
      />
      {is501c3 && (
        <AuthField
          label="EIN"
          value={ein}
          onChangeText={setEin}
          placeholder="12-3456789"
          keyboardType="number-pad"
          hint="Used later for the Get verified step."
        />
      )}

      <AuthField
        label="Website (required)"
        value={website}
        onChangeText={setWebsite}
        placeholder="https://riversidefood.org"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint="Its domain must match your business email."
      />
      <AuthField
        label="Facebook page (optional)"
        value={facebookUrl}
        onChangeText={setFacebookUrl}
        placeholder="https://facebook.com/riversidefood"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint="Shown on your profile. Not used for verification."
      />
      <AuthField label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St, Springfield" />

      <ThemedText type="h3" style={styles.sectionHeading}>
        Account
      </ThemedText>
      <AuthField
        label="Business email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@riversidefood.org"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
      />
      <ThemedText type="h3" style={styles.sectionHeading}>
        About You
      </ThemedText>
      <AuthField
        label="Mobile number (required, we'll text a code)"
        value={phone}
        onChangeText={(text) => setPhone(formatUsPhone(text))}
        placeholder={PHONE_PLACEHOLDER}
        maxLength={16}
        keyboardType="phone-pad"
        autoCorrect={false}
      />
      <AuthField
        label="Your name (manager)"
        value={managerName}
        onChangeText={setManagerName}
        placeholder="Jordan Ruiz"
        autoCapitalize="words"
      />
      <AuthField
        label="Your title"
        value={managerTitle}
        onChangeText={setManagerTitle}
        placeholder="Volunteer coordinator"
        autoCapitalize="words"
      />
      <AuthField
        label="Your date of birth (YYYY-MM-DD)"
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="1985-04-12"
        hint="You must be 18 or older to set up an organization."
      />

      <CheckRow
        checked={acceptedTerms}
        onToggle={() => setAcceptedTerms((value) => !value)}
        label="I agree to the terms of service and privacy policy, and I am authorized to act for this organization."
      />

      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}
      {confirmationSent && (
        <ThemedText type="caption" themeColor="success">
          Organization account created — check {email.trim()} for a confirmation link, then sign in to finish setup.
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
            Create organization account
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  sectionHeading: {
    marginTop: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.one,
  },
});
