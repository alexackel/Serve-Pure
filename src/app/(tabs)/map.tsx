import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { MapSheet, MapStaticSurface } from '@/components/map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAiDiscovery } from '@/context/ai-discovery-context';
import { listEvents } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { excludePastEvents } from '@/utils/find-filters';
import { buildMapPins, type MapPin } from '@/utils/map-pins';

export default function MapScreen() {
  const theme = useTheme();
  const userLocation = useUserLocation();
  const { orgs: aiOrgs, reportedIds } = useAiDiscovery();

  const [events, setEvents] = useState<EventDetail[]>([]);

  const refetchEvents = useCallback(() => {
    listEvents()
      .then(setEvents)
      .catch((error) => console.error('Failed to load events for map', error));
  }, []);

  useEffect(() => {
    refetchEvents();
  }, [refetchEvents]);

  // Refetches on every return to this tab, same as Find, so a just-created
  // event or a since-cancelled one is reflected without a manual pull.
  useFocusEffect(
    useCallback(() => {
      refetchEvents();
    }, [refetchEvents]),
  );

  const now = useMemo(() => new Date(), []);
  const upcomingEvents = useMemo(() => excludePastEvents(events, now), [events, now]);
  // Same self-hide as Find's AI Discovered pane: an org the current user has
  // already reported drops out of the main list.
  const visibleAiOrgs = useMemo(() => aiOrgs.filter((org) => !reportedIds.has(org.id)), [aiOrgs, reportedIds]);

  const pins = useMemo(
    () => buildMapPins(upcomingEvents, visibleAiOrgs, userLocation),
    [upcomingEvents, visibleAiOrgs, userLocation],
  );

  const goToPin = (pin: MapPin) => {
    if (pin.kind === 'ai-org' && pin.aiOrg) {
      router.push({ pathname: '/ai-org/[id]', params: { id: pin.aiOrg.id } });
    } else if (pin.event) {
      router.push({ pathname: '/event/[id]', params: { id: pin.event.id } });
    }
  };

  if (userLocation.loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  // The map needs a center to render at all — unlike Find's list, which can
  // degrade to an unsorted list without location, there's nothing sensible
  // to show here without it.
  if (userLocation.latitude == null || userLocation.longitude == null) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="h3" style={styles.emptyText}>
          Location needed
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.emptyText}>
          Enable location access to see nearby volunteer events and organizations on the map.
        </ThemedText>
      </ThemedView>
    );
  }

  const userPoint = { latitude: userLocation.latitude, longitude: userLocation.longitude };

  return (
    <View style={styles.flex}>
      <MapStaticSurface userLocation={userPoint} pins={pins} onPressPin={goToPin} />
      <MapSheet pins={pins} onPressPin={goToPin} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
  },
});
