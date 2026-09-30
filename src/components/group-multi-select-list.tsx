import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GroupMultiSelectOption = { id: string; name: string };

// Lets a volunteer choose which of their groups a self-report should be
// routed to for independent review (0035's attendance_report_groups) —
// selection is optional; picking none behaves exactly as self-reporting did
// before this feature (pending until an org verifies it).
export function GroupMultiSelectList({
  groups,
  selectedIds,
  onToggle,
}: {
  groups: GroupMultiSelectOption[];
  selectedIds: string[];
  onToggle: (groupId: string) => void;
}) {
  const theme = useTheme();

  if (groups.length === 0) {
    return (
      <ThemedText type="caption" themeColor="textSecondary">
        You&apos;re not in any groups yet — this will stay pending until an organization verifies it.
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {groups.map((group) => {
        const selected = selectedIds.includes(group.id);
        return (
          <Pressable key={group.id} onPress={() => onToggle(group.id)}>
            <ThemedView
              type="backgroundElement"
              style={[styles.row, selected && { borderColor: theme.primary, borderWidth: 1 }]}>
              <ThemedText type="body" style={styles.name} numberOfLines={1}>
                {group.name}
              </ThemedText>
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? theme.primary : theme.textSecondary}
              />
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
});
