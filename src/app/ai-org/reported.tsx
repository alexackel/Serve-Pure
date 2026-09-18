import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { AiOrgCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAiDiscovery } from '@/context/ai-discovery-context';
import { useUserLocation } from '@/hooks/use-user-location';
import { sortAiOrgsByDistance } from '@/utils/ai-orgs';

export default function ReportedAiOrgsScreen() {
  const { orgs, reportedIds } = useAiDiscovery();
  const userLocation = useUserLocation();

  const reportedOrgs = useMemo(
    () => sortAiOrgsByDistance(orgs.filter((org) => reportedIds.has(org.id)), userLocation),
    [orgs, reportedIds, userLocation],
  );

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/find" />
      <ThemedText type="h1">Reported Posts</ThemedText>

      <ThemedView style={styles.list}>
        {reportedOrgs.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
            You haven&apos;t reported any AI-discovered organizations.
          </ThemedText>
        ) : (
          reportedOrgs.map((org) => (
            <AiOrgCard
              key={org.id}
              name={org.name}
              address={org.address}
              category={org.category}
              description={org.description}
              distanceMiles={org.distanceMiles}
              onPress={() => router.push({ pathname: '/ai-org/[id]', params: { id: org.id } })}
            />
          ))
        )}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  emptyState: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
});
