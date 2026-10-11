import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { InitialsAvatar } from '@/components/initials-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { type MentionableUser, useSocial } from '@/context/social-context';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

// Finds the `@query` the cursor is currently inside of, if any — the text
// since the nearest preceding `@` that isn't already part of a finished
// `@[Name](id)` token and has no whitespace before the cursor.
function findActiveMentionQuery(text: string, cursor: number): { start: number; query: string } | null {
  const textBeforeCursor = text.slice(0, cursor);
  const atIndex = textBeforeCursor.lastIndexOf('@');
  if (atIndex === -1) return null;
  const query = textBeforeCursor.slice(atIndex + 1);
  if (/[\s[\]]/.test(query)) return null;
  return { start: atIndex, query };
}

// A plain TextInput plus an @mention typeahead that inserts a structured
// `@[Full Name](uuid)` token — the single source of truth parsed back out
// server-side (0044's fn_comments_before_insert, 0047's attendance_records
// equivalent) and client-side (mention-text.tsx), so there's no risk of the
// two drifting. Pass `recordId` when mentioning on an existing activity
// (comments); omit it when composing a new self-upload, where no record
// exists yet to scope the typeahead's visibility check against.
export function MentionInput({
  recordId,
  value,
  onChangeText,
  placeholder,
}: {
  recordId?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const { getMentionableUsers, getMentionableUsersForComposer } = useSocial();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [suggestions, setSuggestions] = useState<MentionableUser[]>([]);

  const active = findActiveMentionQuery(value, selection.end);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!active) {
        setSuggestions([]);
        return;
      }
      const result = recordId
        ? await getMentionableUsers(recordId, active.query)
        : await getMentionableUsersForComposer(active.query);
      if (!cancelled) setSuggestions(result);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, active?.query]);

  const insertMention = (user: MentionableUser) => {
    if (!active) return;
    const before = value.slice(0, active.start);
    const after = value.slice(selection.end);
    onChangeText(`${before}@[${user.fullName}](${user.userId}) ${after}`);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      {suggestions.length > 0 && (
        <ThemedView style={[styles.suggestions, cardShadow, { borderColor: theme.border }]}>
          {suggestions.map((user) => (
            <Pressable key={user.userId} onPress={() => insertMention(user)} style={styles.suggestionRow}>
              <InitialsAvatar fullName={user.fullName} size={28} />
              <ThemedText type="body">{user.fullName}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    maxHeight: 120,
  },
  suggestions: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: Spacing.one,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
