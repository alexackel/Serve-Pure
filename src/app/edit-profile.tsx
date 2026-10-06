import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { AvatarCropper } from '@/components/avatar-cropper';
import { BackButton } from '@/components/back-button';
import { InitialsAvatar } from '@/components/initials-avatar';
import { PillIconButton } from '@/components/pill-icon-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { setAvatarUrl } from '@/data/profile';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { cropSquare, pickPhoto, type PickedPhoto, type SquareCrop, uploadPhoto } from '@/utils/photo-upload';

const AVATAR_SIZE = 96;

export default function EditProfileScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const [fullName, setFullName] = useState('');
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  // A raw pick waiting for the volunteer to choose the crop circle…
  const [draft, setDraft] = useState<PickedPhoto | null>(null);
  // …and the cropped square that Save will upload.
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load profile', error);
          setError('Failed to load your profile.');
        } else if (data) {
          setFullName(data.full_name);
          setSavedAvatarUrl(data.avatar_url);
        }
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handlePickPhoto = async () => {
    setError(null);
    try {
      const picked = await pickPhoto();
      if (picked) setDraft(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pick a photo.');
    }
  };

  const handleCropConfirm = async (crop: SquareCrop) => {
    if (!draft) return;
    setError(null);
    try {
      setPhoto(await cropSquare(draft, crop));
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to crop the photo.');
    }
  };

  const handleSave = async () => {
    if (!session || !photo) return;
    setError(null);
    setIsSaving(true);
    try {
      const url = await uploadPhoto(session.user.id, photo);
      await setAvatarUrl(session.user.id, url);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save your photo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (draft) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <AvatarCropper photo={draft} onConfirm={handleCropConfirm} onCancel={() => setDraft(null)} />
        {error && (
          <ThemedText type="caption" themeColor="error">
            {error}
          </ThemedText>
        )}
      </ScreenScrollView>
    );
  }

  const previewUri = photo?.uri ?? savedAvatarUrl;
  const canSave = !!photo && !isSaving && !isLoading;

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">Edit Profile</ThemedText>

      <View style={styles.photoSection}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={[styles.photo, { backgroundColor: theme.primaryTint }]} contentFit="cover" />
        ) : (
          <InitialsAvatar fullName={fullName || '?'} size={AVATAR_SIZE} />
        )}
        <PillIconButton icon="image-outline" label="Change Photo" onPress={handlePickPhoto} />
      </View>

      <View style={[styles.nameBlock, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="caption" themeColor="textSecondary">
          Name
        </ThemedText>
        <ThemedText type="bodyBold">{fullName || '—'}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Your name is tied to identity verification and to your volunteer records, so it cannot be changed here.
        </ThemedText>
      </View>

      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={[styles.saveButton, { backgroundColor: canSave ? theme.primary : theme.backgroundSelected }]}>
        <ThemedText type="bodyBold" themeColor={canSave ? 'background' : 'textSecondary'}>
          {isSaving ? 'Saving…' : 'Save'}
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  photoSection: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  photo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  nameBlock: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.pill,
  },
});
