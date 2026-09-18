import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { EventCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOrgHistory } from '@/context/org-history-context';
import { useOrganization } from '@/context/organization-context';
import type { EventDetail } from '@/data/mock-events';
import { parseEventDateTime } from '@/utils/dates';

export default function OrgEventsScreen() {
  const { activeOrganization } = useOrganization();
  const { getOrgEvents } = useOrgHistory();
  const [orgEvents, setOrgEvents] = useState<EventDetail[]>([]);

  const refetchEvents = useCallback(async () => {
    if (!activeOrganization) {
      setOrgEvents([]);
      return;
    }
    try {
      const events = await getOrgEvents(activeOrganization.id);
      setOrgEvents(events);
    } catch (error) {
      console.error('Failed to load org events', error);
    }
  }, [activeOrganization, getOrgEvents]);

  // Refetches on initial load and every return to this tab, so a volunteer registering/
  // unregistering elsewhere is reflected in registered_count/"Full" here
  // without a manual pull (same pattern as find.tsx).
  useFocusEffect(
    useCallback(() => {
      refetchEvents();
    }, [refetchEvents]),
  );

  const now = useMemo(() => new Date(), []);
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: EventDetail[] = [];
    const past: EventDetail[] = [];
    for (const event of orgEvents) {
      const target = parseEventDateTime(event.date, event.startTime, now) >= now ? upcoming : past;
      target.push(event);
    }
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [orgEvents, now]);

  if (!activeOrganization) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          Events
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          You don&apos;t admin any organizations yet.
        </ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <ThemedText type="h1" style={styles.pageTitle}>
        Events
      </ThemedText>

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Upcoming</ThemedText>
        {upcomingEvents.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary">
            No upcoming events posted yet.
          </ThemedText>
        ) : (
          <ThemedView style={styles.list}>
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                {...event}
                time={event.startTime}
                onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
              />
            ))}
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Past</ThemedText>
        {pastEvents.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary">
            No past events yet.
          </ThemedText>
        ) : (
          <ThemedView style={styles.list}>
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                {...event}
                time={event.startTime}
                status="completed"
                onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
              />
            ))}
          </ThemedView>
        )}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
});
