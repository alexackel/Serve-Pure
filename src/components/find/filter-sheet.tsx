import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FilterSheetOption<V extends string> = { key: V; label: string };

export type FilterSheetProps<V extends string> = {
  visible: boolean;
  title: string;
  options: readonly FilterSheetOption<V>[];
  mode: 'single' | 'multi';
  selected: V | Set<V>;
  defaultValue: V | Set<V>;
  onApply: (selected: V | Set<V>) => void;
  onDismiss: () => void;
};

// The one reusable bottom sheet for every Find-tab filter/sort pill.
//
// `<Modal>` itself is mounted/unmounted by React based on `visible` — on web,
// react-native-web's `Modal` only reacts to its `visible` prop at mount time
// and ignores later changes to it, so toggling `visible={visible}` on an
// always-rendered `<Modal>` silently leaves it showing forever after the
// first open. An always-mounted Modal with an invisible full-screen child
// was also tried and rejected: RN's `Modal` portal intercepts pointer events
// for as long as it's mounted regardless of what's inside it, which silently
// swallowed every click on the page underneath.
//
// No Reanimated `entering`/`exiting` here either: this repo's only other
// Reanimated usage (`animated-icon.web.tsx`) already disables its animation
// entirely on web, and the same layout-animation-stuck-at-`visibility:
// hidden` issue reproduces here. Plain mount/unmount (no slide/fade) is the
// trade-off for the sheet actually being visible on every platform.
export function FilterSheet<V extends string>({
  visible,
  title,
  options,
  mode,
  selected,
  defaultValue,
  onApply,
  onDismiss,
}: FilterSheetProps<V>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<V | Set<V>>(selected);
  // Re-seed the draft every time the sheet transitions to open, discarding
  // whatever was left over from a prior open-without-applying. This same
  // `FilterSheet` instance is reused across every pill, so a single- and a
  // multi-select pill can follow one another — `setDraft` here only takes
  // effect on the *next* render, so `currentDraft` (not the stale `draft`
  // const) is what the rest of this render must read, or a multi-select
  // pill opened right after a single-select one would crash calling `.has`
  // on a leftover string.
  const [wasVisible, setWasVisible] = useState(visible);
  let currentDraft = draft;
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(selected);
      currentDraft = selected;
    }
  }

  const isSelected = (key: V) => (mode === 'single' ? currentDraft === key : (currentDraft as Set<V>).has(key));

  const toggle = (key: V) => {
    if (mode === 'single') {
      setDraft(key);
      return;
    }
    setDraft((current) => {
      const next = new Set(current as Set<V>);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>
      <View
        style={[
          styles.sheet,
          CardShadow,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>

        <ScrollView style={styles.optionsList}>
          {options.map((option) => {
            const active = isSelected(option.key);
            return (
              <Pressable key={option.key} onPress={() => toggle(option.key)} style={styles.optionRow}>
                <ThemedText type="body" themeColor={active ? 'primary' : 'text'}>
                  {option.label}
                </ThemedText>
                <Ionicons
                  name={
                    mode === 'single'
                      ? active
                        ? 'radio-button-on'
                        : 'radio-button-off'
                      : active
                        ? 'checkbox'
                        : 'square-outline'
                  }
                  size={20}
                  color={active ? theme.primary : theme.textSecondary}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable onPress={() => setDraft(defaultValue)} style={[styles.actionButton, { borderColor: theme.border }]}>
            <ThemedText type="bodyBold">Reset</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="bodyBold" themeColor="background">
              Apply
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    maxHeight: '70%',
  },
  title: {
    marginBottom: Spacing.three,
  },
  optionsList: {
    flexGrow: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
