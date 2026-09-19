import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { CategoryChipRow } from '@/components/find';
import { DatePickerField } from '@/components/date-picker-field';
import { FormField } from '@/components/form-field';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { TimePickerField } from '@/components/time-picker-field';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useOrganization } from '@/context/organization-context';
import { useSession } from '@/context/auth-context';
import { createEvent, geocodeAddress } from '@/data/events';
import { useTheme } from '@/hooks/use-theme';
import { loadLastAddress, saveLastAddress } from '@/utils/last-address';
import { parseTimeInput } from '@/utils/dates';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

type PhysicalLevel = 'Light' | 'Moderate' | 'Hard' | '';

const PHYSICAL_OPTIONS: readonly { key: PhysicalLevel; label: string }[] = [
  { key: 'Light', label: 'Light' },
  { key: 'Moderate', label: 'Moderate' },
  { key: 'Hard', label: 'Hard' },
];

// Capitalizes each word of a comma-separated entry (e.g. "trash bags" ->
// "Trash Bags") so Skills/What to bring read consistently regardless of
// how the volunteer typed them in.
function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export default function CreateEventScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { viewMode, activeOrganization } = useOrganization();
  const isOrgPost = viewMode === 'organization' && activeOrganization !== null;

  const lastAddress = loadLastAddress();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState(lastAddress?.street ?? '');
  const [city, setCity] = useState(lastAddress?.city ?? '');
  const [state, setState] = useState(lastAddress?.state ?? '');
  const [zip, setZip] = useState(lastAddress?.zip ?? '');
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [minAge, setMinAge] = useState('');
  const [skills, setSkills] = useState('');
  const [physical, setPhysical] = useState<PhysicalLevel>('');
  const [whatToBring, setWhatToBring] = useState('');
  const [contactEmail, setContactEmail] = useState(session?.user.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);

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
    setAddressWarning(null);

    if (
      !title.trim() ||
      !street.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zip.trim() ||
      !contactEmail.trim() ||
      !date ||
      !startTime.trim() ||
      !endTime.trim()
    ) {
      setError('Title, address, contact email, date, and start/end time are required.');
      return;
    }

    const start = parseTimeInput(date, startTime);
    const end = parseTimeInput(date, endTime);
    if (!start || !end) {
      setError('Enter valid start/end times.');
      return;
    }
    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }

    const skillsList = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toTitleCase);
    const whatToBringList = whatToBring
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toTitleCase);
    const hasRequirements = skillsList.length > 0 || physical || whatToBringList.length > 0;

    const fullAddress = `${street.trim()}, ${city.trim()}, ${state.trim()} ${zip.trim()}`;

    setIsSubmitting(true);
    try {
      const geocoded = await geocodeAddress(fullAddress);
      if (!geocoded) {
        setAddressWarning("We couldn't verify this address — double check it, or continue anyway.");
      }

      const event = await createEvent(session.user.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        address: geocoded?.formattedAddress ?? fullAddress,
        latitude: geocoded?.latitude,
        longitude: geocoded?.longitude,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        capacity: capacity.trim() ? Number(capacity) : undefined,
        minAge: minAge.trim() ? Number(minAge) : undefined,
        requirements: hasRequirements
          ? {
              skills: skillsList.length > 0 ? skillsList : undefined,
              physical: physical || undefined,
              whatToBring: whatToBringList.length > 0 ? whatToBringList : undefined,
            }
          : undefined,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        photoUrl,
        orgId: isOrgPost ? activeOrganization!.id : null,
      });
      saveLastAddress({ street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() });
      router.replace({ pathname: '/event/[id]', params: { id: event.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />

      <ThemedText type="h1">Create Event</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        {isOrgPost ? `Posting as ${activeOrganization!.name}` : 'Posting as yourself (Individual)'}
      </ThemedText>

      <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Riverside Park Cleanup" required />
      <FormField label="Category" value={category} onChangeText={setCategory} placeholder="Environment" />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What will volunteers be doing?"
        multiline
      />

      <FormField label="Street address" value={street} onChangeText={setStreet} placeholder="400 River Rd" required />
      <View style={styles.row}>
        <View style={[styles.rowField, { flex: 2 }]}>
          <FormField label="City" value={city} onChangeText={setCity} placeholder="San Francisco" required />
        </View>
        <View style={styles.rowField}>
          <FormField label="State" value={state} onChangeText={setState} placeholder="CA" required />
        </View>
        <View style={styles.rowField}>
          <FormField label="Zip" value={zip} onChangeText={setZip} placeholder="94110" keyboardType="number-pad" required />
        </View>
      </View>
      {addressWarning && (
        <View style={[styles.errorBanner, { backgroundColor: theme.warningBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.warning} />
          <ThemedText type="body" themeColor="warning" style={styles.errorText}>
            {addressWarning}
          </ThemedText>
        </View>
      )}

      <DatePickerField label="Date" value={date} onChange={setDate} required />
      <View style={styles.row}>
        <View style={styles.rowField}>
          <TimePickerField label="Start time" value={startTime} onChange={setStartTime} required />
        </View>
        <View style={styles.rowField}>
          <TimePickerField label="End time" value={endTime} onChange={setEndTime} minTime={startTime || undefined} required />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowField}>
          <FormField
            label="Capacity"
            value={capacity}
            onChangeText={setCapacity}
            placeholder="20"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.rowField}>
          <FormField label="Min age" value={minAge} onChangeText={setMinAge} placeholder="12" keyboardType="number-pad" />
        </View>
      </View>

      <FormField label="Skills needed" value={skills} onChangeText={setSkills} placeholder="Comma-separated" />
      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Physical demands
        </ThemedText>
        <CategoryChipRow chips={PHYSICAL_OPTIONS} activeKey={physical} onChange={setPhysical} />
      </View>
      <FormField label="What to bring" value={whatToBring} onChangeText={setWhatToBring} placeholder="Comma-separated" />

      <FormField label="Contact email" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" required />
      <FormField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
      <FormField label="Website" value={website} onChangeText={setWebsite} placeholder="https://…" keyboardType="url" />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Photo
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
          {isSubmitting ? 'Posting…' : 'Post Event'}
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
