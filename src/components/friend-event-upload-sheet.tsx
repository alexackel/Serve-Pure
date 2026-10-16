import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupMultiSelectList, type GroupMultiSelectOption } from '@/components/group-multi-select-list';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Overlay, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useCardShadow, useTheme } from '@/hooks/use-theme';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

export type FriendEventUploadSheetProps = {
  title: string;
  groups: GroupMultiSelectOption[];
  onSubmit: (input: { photoUrl?: string; groupIds: string[] }) => void | Promise<void>;
  onDismiss: () => void;
};

// The post-"yes I was there" step of FriendEventFollowupModal — a half-screen
// bottom sheet (same Modal + bottom-pinned View pattern as create-post-sheet)
// instead of a second centered dialog, so photo + group selection happen in
// one place and submit straight to a self-report with no detour through the
// full Self Upload screen.
export function FriendEventUploadSheet({ title, groups, onSubmit, onDismiss }: FriendEventUploadSheetProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

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

  const handlePost = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ photoUrl, groupIds: selectedGroupIds });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>
      <View
        style={[
          styles.sheet,
          cardShadow,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="h3">{title}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Add a photo and pick which groups should review this — both are optional.
        </ThemedText>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Send to groups for review
            </ThemedText>
            <GroupMultiSelectList groups={groups} selectedIds={selectedGroupIds} onToggle={toggleGroup} />
          </View>
        </ScrollView>

        {error && (
          <ThemedText type="body" themeColor="error">
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handlePost}
          disabled={isSubmitting || isUploadingPhoto}
          style={[styles.submit, { backgroundColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            {isSubmitting ? 'Posting…' : 'Post'}
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: Overlay.backdrop,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    maxHeight: '80%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: Spacing.three,
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
    aspectRatio: 2,
    borderRadius: BorderRadius.lg,
  },
  removePhoto: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: BorderRadius.pill,
    padding: Spacing.one,
  },
  submit: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
