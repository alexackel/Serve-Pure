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
import { useDiscovery } from '@/context/discovery-context';
import { useOrganization } from '@/context/organization-context';
import type { AiOrgCategory } from '@/data/ai-orgs';
import { geocodeAddress } from '@/data/events';
import { useTheme } from '@/hooks/use-theme';
import { AI_ORG_CATEGORY_OPTIONS } from '@/utils/ai-orgs';
import { loadLastAddress, saveLastAddress } from '@/utils/last-address';
import { ensureUrlScheme } from '@/utils/normalize-url';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

// Widened to `AiOrgCategory | ''` (matching self-upload.tsx's YesNo/
// WORKED_WITH_ORG_OPTIONS convention for an initially-unselected chip row)
// so CategoryChipRow's generic Key infers consistently across `chips` and
// `activeKey` — no chip actually has key '', it's just the required field's
// not-yet-answered state.
const CATEGORY_OPTIONS: readonly { key: AiOrgCategory | ''; label: string }[] = AI_ORG_CATEGORY_OPTIONS;

export default function DiscoveredPostScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { viewMode } = useOrganization();
  const { createUserPost } = useDiscovery();

  const lastAddress = loadLastAddress();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AiOrgCategory | ''>('');
  const [street, setStreet] = useState(lastAddress?.street ?? '');
  const [city, setCity] = useState(lastAddress?.city ?? '');
  const [state, setState] = useState(lastAddress?.state ?? '');
  const [zip, setZip] = useState(lastAddress?.zip ?? '');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);

  // Defense in depth — the FAB already hides this option outside personal
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
    setAddressWarning(null);

    if (!name.trim() || !category || !street.trim() || !city.trim() || !state.trim() || !zip.trim() || !website.trim()) {
      setError('Name, category, address, and website are required.');
      return;
    }

    const fullAddress = `${street.trim()}, ${city.trim()}, ${state.trim()} ${zip.trim()}`;

    setIsSubmitting(true);
    try {
      const geocoded = await geocodeAddress(fullAddress);
      if (!geocoded) {
        setAddressWarning("We couldn't verify this address — double check it, or continue anyway.");
      }

      const post = await createUserPost({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        address: geocoded?.formattedAddress ?? fullAddress,
        latitude: geocoded?.latitude,
        longitude: geocoded?.longitude,
        website: ensureUrlScheme(website),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        photoUrl,
      });
      saveLastAddress({ street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() });
      router.replace({ pathname: '/discovered/post/[id]', params: { id: post.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share this post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />

        <ThemedText type="h1">Share an Opportunity</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Know an organization off ServePure that&apos;s worth a look? Post it here so other volunteers can find it and
          sign up directly on their site.
        </ThemedText>

        <FormField label="Name" value={name} onChangeText={setName} placeholder="Riverside Food Pantry" required />
        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What do they do? What kind of help do they need?"
          multiline
        />

        <View style={styles.field}>
          <ThemedText type="label" themeColor="textSecondary">
            Category *
          </ThemedText>
          <CategoryChipRow chips={CATEGORY_OPTIONS} activeKey={category} onChange={setCategory} />
        </View>

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

        <FormField
          label="Website or signup link"
          value={website}
          onChangeText={setWebsite}
          placeholder="https://…"
          keyboardType="url"
          required
        />
        <FormField label="Contact email" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" />
        <FormField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

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
            {isSubmitting ? 'Posting…' : 'Share Opportunity'}
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
