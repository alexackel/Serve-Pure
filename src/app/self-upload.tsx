import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { CategoryChipRow } from '@/components/find';
import { FormField } from '@/components/form-field';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useOrganization } from '@/context/organization-context';
import { createSelfReport } from '@/data/self-reports';
import { useTheme } from '@/hooks/use-theme';
import { parseDateInput } from '@/utils/dates';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

type YesNo = 'yes' | 'no' | '';

const WORKED_WITH_ORG_OPTIONS: readonly { key: YesNo; label: string }[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
];

export default function SelfUploadScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { viewMode } = useOrganization();

  const [activityTitle, setActivityTitle] = useState('');
  const [activityOrgName, setActivityOrgName] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [workedThroughOrg, setWorkedThroughOrg] = useState<YesNo>('');
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [orgContactPhone, setOrgContactPhone] = useState('');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Defense in depth — the FAB already hides this option in organization
  // context, but a direct navigation shouldn't be trusted either.
  useEffect(() => {
    if (viewMode === 'organization') {
      router.replace('/find');
    }
  }, [viewMode]);

  if (viewMode === 'organization') {
    return null;
  }

  const handlePickPhoto = async () => {
    if (!session) return;
    setError(null);
    setIsUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto(session.user.id);
      if (url) setPhotoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setError(null);

    if (!activityTitle.trim() || !date.trim() || !hours.trim()) {
      setError('Title, date, and hours are required.');
      return;
    }

    if (workedThroughOrg === 'yes' && !activityOrgName.trim()) {
      setError('Enter the organization you worked with.');
      return;
    }

    const day = parseDateInput(date);
    if (!day) {
      setError('Enter a valid date as MM/DD/YYYY.');
      return;
    }

    const hoursClaimed = Number(hours);
    if (!Number.isFinite(hoursClaimed) || hoursClaimed <= 0) {
      setError('Enter a valid number of hours.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSelfReport(session.user.id, {
        activityTitle: activityTitle.trim(),
        activityOrgName: workedThroughOrg === 'yes' ? activityOrgName.trim() : undefined,
        date: day.toISOString(),
        hoursClaimed,
        notes: notes.trim() || undefined,
        photoUrl,
        orgContactEmail: workedThroughOrg === 'yes' ? orgContactEmail.trim() || undefined : undefined,
        orgContactPhone: workedThroughOrg === 'yes' ? orgContactPhone.trim() || undefined : undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showOrgContactHint = workedThroughOrg === 'yes' && !orgContactEmail.trim() && !orgContactPhone.trim();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">Self Upload</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        Log a volunteer activity from outside the app. It&apos;ll show as pending until an organization or group
        admin verifies it.
      </ThemedText>

      <FormField label="Activity title" value={activityTitle} onChangeText={setActivityTitle} placeholder="Beach cleanup" required />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Did you work through an organization?
        </ThemedText>
        <CategoryChipRow chips={WORKED_WITH_ORG_OPTIONS} activeKey={workedThroughOrg} onChange={setWorkedThroughOrg} />
      </View>

      {workedThroughOrg === 'yes' && (
        <>
          <FormField
            label="Organization"
            value={activityOrgName}
            onChangeText={setActivityOrgName}
            placeholder="Who did you volunteer with?"
            required
          />
          <FormField
            label="Organization contact email"
            value={orgContactEmail}
            onChangeText={setOrgContactEmail}
            placeholder="contact@org.org"
            keyboardType="email-address"
          />
          <FormField
            label="Organization contact phone"
            value={orgContactPhone}
            onChangeText={setOrgContactPhone}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
          />
          {showOrgContactHint && (
            <ThemedText type="caption" themeColor="textSecondary">
              Adding the organization&apos;s contact info helps them verify your hours faster.
            </ThemedText>
          )}
        </>
      )}

      <View style={styles.row}>
        <View style={styles.rowField}>
          <FormField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="MM/DD/YYYY"
            keyboardType="numbers-and-punctuation"
            required
          />
        </View>
        <View style={styles.rowField}>
          <FormField label="Hours" value={hours} onChangeText={setHours} placeholder="3" keyboardType="decimal-pad" required />
        </View>
      </View>

      <FormField
        label="What did you do?"
        value={notes}
        onChangeText={setNotes}
        placeholder="Describe what you did"
        multiline
      />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Proof photo
        </ThemedText>
        {photoUrl ? (
          <View>
            <Pressable onPress={handlePickPhoto} disabled={isUploadingPhoto}>
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} contentFit="cover" />
            </Pressable>
            <Pressable onPress={() => setPhotoUrl(undefined)} style={[styles.removePhoto, { backgroundColor: theme.background }]}>
              <Ionicons name="close" size={16} color={theme.text} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handlePickPhoto}
            disabled={isUploadingPhoto}
            style={[styles.photoButton, { borderColor: theme.border }]}>
            <Ionicons name="image-outline" size={20} color={theme.textSecondary} />
            <ThemedText type="body" themeColor="textSecondary">
              {isUploadingPhoto ? 'Uploading…' : 'Add a photo'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.errorText}>
            {error}
          </ThemedText>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[styles.submit, { backgroundColor: theme.primary }]}>
        <ThemedText type="bodyBold" themeColor="background">
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowField: {
    flex: 1,
  },
  field: {
    gap: Spacing.one,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.four,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
  },
  removePhoto: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: BorderRadius.pill,
    padding: Spacing.one,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
  },
  submit: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
});
