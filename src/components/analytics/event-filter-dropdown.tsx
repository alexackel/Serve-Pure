import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Overlay, Spacing } from '@/constants/theme';
import { useOrgEventOptions } from '@/hooks/use-org-event-options';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

export type EventFilterDropdownProps = {
  orgId: string;
  selectedEventId: string | null;
  onSelect: (eventId: string | null) => void;
};

export function EventFilterDropdown({ orgId, selectedEventId, onSelect }: EventFilterDropdownProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const { data: events } = useOrgEventOptions(orgId);
  const [open, setOpen] = useState(false);

  const selectedTitle = selectedEventId ? events?.find((event) => event.id === selectedEventId)?.title ?? 'All events' : 'All events';

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.trigger, { borderColor: theme.border }]} accessibilityRole="button">
        <ThemedText type="body" numberOfLines={1} style={styles.triggerLabel}>
          {selectedTitle}
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>

      {open && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          </View>
          <View style={styles.centerWrap}>
            <View style={[styles.card, cardShadow, { backgroundColor: theme.background }]}>
              <ThemedText type="h3">Filter by event</ThemedText>
              <ScrollView style={styles.list}>
                <Pressable
                  onPress={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  style={styles.row}>
                  <ThemedText type={selectedEventId === null ? 'bodyBold' : 'body'} themeColor={selectedEventId === null ? 'primary' : 'text'}>
                    All events
                  </ThemedText>
                </Pressable>
                {(events ?? []).map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => {
                      onSelect(event.id);
                      setOpen(false);
                    }}
                    style={styles.row}>
                    <ThemedText
                      type={selectedEventId === event.id ? 'bodyBold' : 'body'}
                      themeColor={selectedEventId === event.id ? 'primary' : 'text'}
                      numberOfLines={1}>
                      {event.title}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  triggerLabel: {
    flexShrink: 1,
  },
  backdrop: {
    backgroundColor: Overlay.backdrop,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: 360,
    maxWidth: '100%',
    maxHeight: '70%',
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
});
