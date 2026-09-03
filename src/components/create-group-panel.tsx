import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CreateGroupPanelProps = {
  onCreate: (name: string) => void;
  onCancel: () => void;
  nameLabel?: string;
  placeholder?: string;
  submitLabel?: string;
};

export function CreateGroupPanel({
  onCreate,
  onCancel,
  nameLabel = 'New group name',
  placeholder = 'e.g. Riverside Robotics Club',
  submitLabel = 'Create Group',
}: CreateGroupPanelProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Give your group a name.');
      return;
    }
    onCreate(name.trim());
  };

  return (
    <ThemedView type="backgroundElement" style={styles.createPanel}>
      <ThemedText type="label" themeColor="textSecondary">
        {nameLabel}
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      {error && (
        <ThemedText type="caption" themeColor="error">
          {error}
        </ThemedText>
      )}
      <ThemedView style={styles.createPanelActions}>
        <Pressable onPress={onCancel} style={[styles.actionButton, { borderColor: theme.border }]}>
          <ThemedText type="bodyBold">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          style={[styles.actionButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            {submitLabel}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  createPanel: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  createPanelActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
});
