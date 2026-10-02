import { Fragment } from 'react';

import { router } from 'expo-router';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

// Renders a comment body that may contain `@[Full Name](uuid)` tokens
// (written by MentionInput) as plain text with tappable name spans —
// the same token format 0044's fn_comments_before_insert parses server-side.
export function MentionText({ body, ...textProps }: { body: string } & Omit<ThemedTextProps, 'children'>) {
  const parts: { text: string; userId?: string }[] = [];
  let lastIndex = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const [full, name, userId] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: body.slice(lastIndex, index) });
    parts.push({ text: `@${name}`, userId });
    lastIndex = index + full.length;
  }
  if (lastIndex < body.length) parts.push({ text: body.slice(lastIndex) });

  return (
    <ThemedText {...textProps}>
      {parts.map((part, index) =>
        part.userId ? (
          <ThemedText
            key={index}
            type={textProps.type}
            themeColor="primary"
            onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: part.userId!, fullName: part.text.slice(1) } })}>
            {part.text}
          </ThemedText>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </ThemedText>
  );
}
