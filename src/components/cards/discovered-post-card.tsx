import { Pressable, StyleSheet, View } from 'react-native';

import { DiscoverySourceTag } from '@/components/discovery-source-tag';
import { MetaRow } from '@/components/meta-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { AiOrgCategory } from '@/data/ai-orgs';
import { useTheme } from '@/hooks/use-theme';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';

export type DiscoveredPostCardProps = {
  name: string;
  address: string;
  category: AiOrgCategory;
  description: string | null;
  distanceMiles: number | null;
  onPress?: () => void;
};

export function DiscoveredPostCard({ name, address, category, description, distanceMiles, onPress }: DiscoveredPostCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <View style={styles.header}>
          <DiscoverySourceTag source="community" />
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
          <MetaRow icon="location-outline" text={address} />
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
