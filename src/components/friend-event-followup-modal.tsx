import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Overlay, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import type { RegistrationWithEvent } from '@/context/registrations-context';
import { useCardShadow, useTheme } from '@/hooks/use-theme';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

type Step = 'ask' | 'photo';

export type FriendEventFollowupModalProps = {
  pending: RegistrationWithEvent[];
  onAttended: (registration: RegistrationWithEvent, photoUrl?: string) => void;
  onMissed: (registration: RegistrationWithEvent) => void;
};

// Drill-down, one at a time, same spirit as the group-review queue — each
// "Volunteer with Friends" registration whose event has passed gets asked
// (1) did you make it, and if so, (2) got a photo, before handing off to
// Self Upload pre-filled with everything already known.
export function FriendEventFollowupModal({ pending, onAttended, onMissed }: FriendEventFollowupModalProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const { session } = useSession();
  const current = pending[0] ?? null;

  const [step, setStep] = useState<Step>('ask');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the step/error for each newly-surfaced pending item during render
  // (React's documented pattern for "adjusting state when a prop changes"),
  // rather than in an effect, which would cause an extra render pass.
  const [lastId, setLastId] = useState(current?.id);
  if (current?.id !== lastId) {
    setLastId(current?.id);
    setStep('ask');
    setError(null);
  }

  if (!current) {
    return null;
  }

  const title = current.event.title;

  const handleMissed = () => onMissed(current);

  const handleAddPhoto = async () => {
    if (!session) return;
    setError(null);
    setIsUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto(session.user.id);
      onAttended(current, url ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSkipPhoto = () => onAttended(current);

  return (
    <Modal transparent visible animationType="fade">
      <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
      <View style={styles.center}>
        <ThemedView style={[styles.card, cardShadow]}>
          {step === 'ask' ? (
            <>
              <ThemedText type="h3">Did you make it to {title}?</ThemedText>
              <View style={styles.actions}>
                <Pressable
                  onPress={handleMissed}
                  style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText type="bodyBold">No, I couldn&apos;t make it</ThemedText>
                </Pressable>
                <Pressable onPress={() => setStep('photo')} style={[styles.button, { backgroundColor: theme.primary }]}>
                  <ThemedText type="bodyBold" themeColor="background">
                    Yes, I was there
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText type="h3">Got a photo from {title}?</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                You can add one now, or do it later from Self Upload.
              </ThemedText>
              {error && (
                <ThemedText type="body" themeColor="error">
                  {error}
                </ThemedText>
              )}
              <View style={styles.actions}>
                <Pressable
                  onPress={handleSkipPhoto}
                  disabled={isUploadingPhoto}
                  style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText type="bodyBold">Skip</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleAddPhoto}
                  disabled={isUploadingPhoto}
                  style={[styles.button, { backgroundColor: theme.primary }]}>
                  <ThemedText type="bodyBold" themeColor="background">
                    {isUploadingPhoto ? 'Uploading…' : 'Add Photo'}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: Overlay.backdrop,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  button: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
});
