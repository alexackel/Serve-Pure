import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type OverflowMenuAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

// A "3 dots" trigger + small anchored dropdown, for a menu too short to
// warrant a full bottom sheet. Positioned the same way you.tsx's
// TimeRangeSelector dropdown already is — an absolutely-positioned box
// inside a relatively-positioned wrapper around the trigger, no
// measurement/portal needed — rather than FilterSheet's Modal pattern.
export function OverflowMenu({ actions }: { actions: OverflowMenuAction[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<OverflowMenuAction | null>(null);

  const close = () => {
    setOpen(false);
    setConfirming(null);
  };

  const handlePress = (action: OverflowMenuAction) => {
    if (action.destructive) {
      setConfirming(action);
      return;
    }
    action.onPress();
    close();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
        style={styles.trigger}>
        <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
      </Pressable>

      {open && (
        <ThemedView style={[CardShadow, styles.menu, { borderColor: theme.border }]}>
          {confirming ? (
            <View style={styles.confirm}>
              <ThemedText type="body">Are you sure?</ThemedText>
              <ConfirmCancelRow
                confirmLabel={confirming.label}
                confirmColor="error"
                onCancel={() => setConfirming(null)}
                onConfirm={() => {
                  confirming.onPress();
                  close();
                }}
                style={styles.confirmActions}
              />
            </View>
          ) : (
            actions.map((action) => (
              <Pressable key={action.label} onPress={() => handlePress(action)} style={styles.menuRow}>
                <ThemedText type="body" themeColor={action.destructive ? 'error' : 'text'}>
                  {action.label}
                </ThemedText>
              </Pressable>
            ))
          )}
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  trigger: {
    padding: Spacing.one,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: Spacing.one,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 180,
    zIndex: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  menuRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  confirm: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // The dropdown is much narrower than ConfirmCancelRow's usual full-width
  // contexts — stacking the two buttons instead of splitting the width in
  // half keeps longer labels (e.g. "Cancel Event") from wrapping/overflowing.
  confirmActions: {
    flexDirection: 'column',
  },
});
