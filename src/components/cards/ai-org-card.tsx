import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { AiOrgCategory } from '@/data/ai-orgs';
import { useTheme } from '@/hooks/use-theme';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';

export type AiOrgCardProps = {
  name: string;
  address: string | null;
  category: AiOrgCategory;
  description: string | null;
  distanceMiles: number | null;
  onPress?: () => void;
};

export function AiOrgCard({ name, address, category, description, distanceMiles, onPress }: AiOrgCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <View style={styles.header}>
          <View style={styles.orgRow}>
            <Avatar icon="sparkles-outline" iconSize={18} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.orgText} numberOfLines={1}>
              AI Discovered
            </ThemedText>
          </View>
          {category !== 'other' && (
            <View style={[styles.categoryPill, { backgroundColor: theme.primaryTint }]}>
              <ThemedText type="label" themeColor="primary">
                {aiOrgCategoryLabel(category)}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="h3" style={styles.title}>
          {name}
        </ThemedText>

        <View style={styles.metaList}>
          <MetaRow icon="location-outline" text={address ?? 'Address unavailable'} />
          {distanceMiles !== null && <MetaRow icon="navigate-outline" text={`${distanceMiles.toFixed(1)} mi away`} />}
        </View>

        {description && (
          <ThemedText type="body" themeColor="textSecondary" numberOfLines={3} style={styles.description}>
            {description}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: Spacing.one,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  orgText: {
    flexShrink: 1,
  },
  categoryPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  title: {
    marginBottom: Spacing.one,
  },
  metaList: {
    gap: Spacing.one,
  },
  description: {
    marginTop: Spacing.one,
  },
});
