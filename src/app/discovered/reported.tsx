import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { AiOrgCard, DiscoveredPostCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDiscovery } from '@/context/discovery-context';
import { useUserLocation } from '@/hooks/use-user-location';
import { sortAiOrgsByDistance } from '@/utils/ai-orgs';
import { mergeDiscoveredItems, sortDiscoveredPostsByDistance } from '@/utils/discovered';

export default function ReportedDiscoveredScreen() {
  const { aiOrgs, reportedAiOrgIds, userPosts, reportedUserPostIds } = useDiscovery();
  const userLocation = useUserLocation();

  const reportedItems = useMemo(() => {
    const reportedOrgs = sortAiOrgsByDistance(
      aiOrgs.filter((org) => reportedAiOrgIds.has(org.id)),
      userLocation,
    );
    const reportedPosts = sortDiscoveredPostsByDistance(
      userPosts.filter((post) => reportedUserPostIds.has(post.id)),
      userLocation,
    );
    return mergeDiscoveredItems(reportedPosts, reportedOrgs);
  }, [aiOrgs, reportedAiOrgIds, userPosts, reportedUserPostIds, userLocation]);

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/find" />
      <ThemedText type="h1">Reported Posts</ThemedText>

      <ThemedView style={styles.list}>
        {reportedItems.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyState}>
            You haven&apos;t reported anything on Discovered yet.
          </ThemedText>
        ) : (
          reportedItems.map((item) =>
            item.source === 'user' ? (
              <DiscoveredPostCard
                key={item.id}
                name={item.post.name}
                address={item.post.address}
                category={item.post.category}
                description={item.post.description}
                distanceMiles={item.post.distanceMiles}
                onPress={() => router.push({ pathname: '/discovered/post/[id]', params: { id: item.post.id } })}
              />
            ) : (
              <AiOrgCard
                key={item.id}
                name={item.org.name}
                address={item.org.address}
                category={item.org.category}
                description={item.org.description}
                distanceMiles={item.org.distanceMiles}
                onPress={() => router.push({ pathname: '/discovered/ai-org/[id]', params: { id: item.org.id } })}
              />
            ),
          )
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
