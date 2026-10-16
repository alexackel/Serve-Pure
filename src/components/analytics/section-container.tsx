import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

export type SectionQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export type SectionContainerProps<T> = {
  title: string;
  subtitle?: string;
  query: SectionQueryResult<T>;
  skeleton: ReactNode;
  // Rendered when the query succeeded but produced no rows (e.g. a brand-new
  // org with zero events) instead of an empty chart/table.
  isEmpty?: (data: T) => boolean;
  emptyState?: ReactNode;
  children: (data: T) => ReactNode;
};

// Generic hook-result -> skeleton/error+retry/empty/content wrapper, so one
// failing section's query never breaks the rest of the page.
export function SectionContainer<T>({ title, subtitle, query, skeleton, isEmpty, emptyState, children }: SectionContainerProps<T>) {
  const theme = useTheme();
  const cardShadow = useCardShadow();

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.background }, cardShadow]}>
      <View style={styles.header}>
        <ThemedText type="h3">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>

      {query.isLoading && skeleton}

      {!query.isLoading && query.isError && (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.error} />
          <ThemedText type="body" themeColor="textSecondary" style={styles.errorText}>
            Couldn&apos;t load this section.
          </ThemedText>
          <Pressable onPress={query.refetch} style={styles.retryButton} hitSlop={8}>
            <ThemedText type="bodyBold" themeColor="primary">
              Retry
            </ThemedText>
          </Pressable>
        </View>
      )}

      {!query.isLoading && !query.isError && query.data !== undefined && (isEmpty?.(query.data) ? emptyState : children(query.data))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.half,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
