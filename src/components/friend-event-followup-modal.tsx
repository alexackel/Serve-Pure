import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FriendEventUploadSheet } from '@/components/friend-event-upload-sheet';
import type { GroupMultiSelectOption } from '@/components/group-multi-select-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Overlay, Spacing } from '@/constants/theme';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

type Step = 'ask' | 'upload';

// A single finished "Volunteer with Friends" event awaiting a followup
// answer — either someone's registration for a friend's event, or the
// event's own creator (who never has a registration row for their own
// event, so their "resolved" flag lives on the event instead; see
// supabase/migrations/0057). The modal only needs the display title and
// these two callbacks — which data call each one makes is Home's concern.
export type FriendFollowupItem = {
  id: string;
  title: string;
  onMissed: () => void | Promise<void>;
  onResolve: (input: { photoUrl?: string; groupIds: string[] }) => void | Promise<void>;
};

export type FriendEventFollowupModalProps = {
  pending: FriendFollowupItem[];
  eligibleGroups: GroupMultiSelectOption[];
};

// Drill-down, one at a time, same spirit as the group-review queue: each
// finished "Volunteer with Friends" event gets asked (1) did you make it,
// and if so, (2) a half-screen sheet collects a photo + groups and posts the
// self-report directly — no detour through the full Self Upload screen.
export function FriendEventFollowupModal({ pending, eligibleGroups }: FriendEventFollowupModalProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const current = pending[0] ?? null;

  const [step, setStep] = useState<Step>('ask');

  // Reset the step for each newly-surfaced pending item during render
  // (React's documented pattern for "adjusting state when a prop changes"),
  // rather than in an effect, which would cause an extra render pass.
  const [lastId, setLastId] = useState(current?.id);
  if (current?.id !== lastId) {
    setLastId(current?.id);
    setStep('ask');
  }

  if (!current) {
    return null;
  }

  if (step === 'upload') {
    return (
      <FriendEventUploadSheet
        title={current.title}
        groups={eligibleGroups}
        onSubmit={current.onResolve}
        onDismiss={() => setStep('ask')}
      />
    );
  }

  return (
    <Modal transparent visible animationType="fade">
      <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
      <View style={styles.center}>
        <ThemedView style={[styles.card, cardShadow]}>
          <ThemedText type="h3">Did you make it to {current.title}?</ThemedText>
          <View style={styles.actions}>
            <Pressable
              onPress={current.onMissed}
              style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}>
              <ThemedText type="bodyBold">No, I couldn&apos;t make it</ThemedText>
            </Pressable>
            <Pressable onPress={() => setStep('upload')} style={[styles.button, { backgroundColor: theme.primary }]}>
              <ThemedText type="bodyBold" themeColor="background">
                Yes, I was there
              </ThemedText>
            </Pressable>
          </View>
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
