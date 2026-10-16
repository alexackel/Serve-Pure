import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { ActivityPostCard, FriendSuggestionCard, PersonSearchRow } from '@/components/cards';
import { FriendEventFollowupModal, type FriendFollowupItem } from '@/components/friend-event-followup-modal';
import { HomeHeader } from '@/components/home-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useGroups } from '@/context/groups-context';
import { type FeedActivity, type SearchedPerson, type SuggestedPerson, useSocial } from '@/context/social-context';
import { useRegistrations } from '@/context/registrations-context';
import { listMyIndividualEvents, resolveCreatorFollowup } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { createSelfReport } from '@/data/self-reports';
import { useTheme } from '@/hooks/use-theme';
import { parseEventDateTime } from '@/utils/dates';

export default function HomeScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { getActivityFeed, getSuggestedPeople, followUser, unfollowUser, searchPeople, followingIds } = useSocial();
  const { pendingFriendFollowups, resolveFriendEventAttended, resolveFriendEventMissed } = useRegistrations();
  const { groups, myGroupIds, isAdmin } = useGroups();
  const [feed, setFeed] = useState<FeedActivity[]>([]);
  const [suggested, setSuggested] = useState<SuggestedPerson[]>([]);
  const [createdEvents, setCreatedEvents] = useState<EventDetail[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedPerson[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const load = useCallback(async () => {
    const [feedResult, suggestedResult, createdEventsResult] = await Promise.all([
      getActivityFeed(),
      getSuggestedPeople(),
      session ? listMyIndividualEvents(session.user.id) : Promise.resolve([]),
    ]);
    setFeed(feedResult);
    setSuggested((current) => {
      // The suggestions query drops anyone already followed, so re-attach the
      // still-followed people rather than letting them vanish on refocus.
      const stillFollowed = current.filter((person) => followingIds.has(person.userId));
      const fresh = suggestedResult.filter((person) => !stillFollowed.some((a) => a.userId === person.userId));
      return [...stillFollowed, ...fresh];
    });
    setCreatedEvents(createdEventsResult);
  }, [getActivityFeed, getSuggestedPeople, followingIds, session]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        setSearchExpanded(false);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
      };
    }, [load]),
  );

  // Clearing the box is a direct event, not an effect, so the reset happens
  // right here instead of as a synchronous setState at the top of the
  // effect below (which the debounce effect reserves for the actual fetch).
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSearchCancel = () => {
    handleSearchChange('');
    Keyboard.dismiss();
    setSearchExpanded(false);
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPeople(query);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchPeople]);

  const handleAddFriend = async (userId: string) => {
    const { error } = await followUser(userId);
    if (error) {
      console.error('Failed to follow user', error);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    const { error } = await unfollowUser(userId);
    if (error) {
      console.error('Failed to unfollow user', error);
    }
  };

  const eligibleGroups = useMemo(
    () =>
      groups.filter((group) => myGroupIds.includes(group.id) && !isAdmin(group.id)).map((group) => ({ id: group.id, name: group.name })),
    [groups, myGroupIds, isAdmin],
  );

  const pendingCreatorFollowups = useMemo(() => {
    const now = new Date();
    return createdEvents.filter((event) => {
      if (!event.isFriendEvent) return false;
      if (event.status === 'cancelled') return false;
      if (event.creatorFollowupResolvedAt) return false;
      const end = parseEventDateTime(event.date, event.endTime ?? event.startTime, now);
      return end < now;
    });
  }, [createdEvents]);

  // Logs the hours directly from whatever the new photo+groups sheet
  // collected — no detour through the full Self Upload screen, since title/
  // org/date/hours are already known from the event itself.
  const submitSelfReportForEvent = useCallback(async (event: EventDetail, input: { photoUrl?: string; groupIds: string[] }) => {
    if (!session) return;
    const eventDate = parseEventDateTime(event.date, event.endTime ?? event.startTime, new Date());
    await createSelfReport(session.user.id, {
      activityTitle: event.title,
      activityOrgName: event.organization,
      date: eventDate.toISOString(),
      hoursClaimed: event.hours ?? 0,
      photoUrl: input.photoUrl,
      orgContactEmail: event.contactInfo,
      groupIds: input.groupIds,
    });
  }, [session]);

  const followupItems = useMemo<FriendFollowupItem[]>(() => {
    const now = new Date();
    const eventEnd = (event: EventDetail) => parseEventDateTime(event.date, event.endTime ?? event.startTime, now).getTime();

    const fromRegistrations = pendingFriendFollowups.map((registration) => ({
      endAt: eventEnd(registration.event),
      item: {
        id: `registration:${registration.id}`,
        title: registration.event.title,
        onMissed: async () => {
          await resolveFriendEventMissed(registration.id);
        },
        onResolve: async (input: { photoUrl?: string; groupIds: string[] }) => {
          await resolveFriendEventAttended(registration.id);
          await submitSelfReportForEvent(registration.event, input);
        },
      } satisfies FriendFollowupItem,
    }));
    const fromCreatedEvents = pendingCreatorFollowups.map((event) => ({
      endAt: eventEnd(event),
      item: {
        id: `event:${event.id}`,
        title: event.title,
        onMissed: async () => {
          await resolveCreatorFollowup(event.id);
          setCreatedEvents((current) => current.filter((e) => e.id !== event.id));
        },
        onResolve: async (input: { photoUrl?: string; groupIds: string[] }) => {
          await resolveCreatorFollowup(event.id);
          await submitSelfReportForEvent(event, input);
          setCreatedEvents((current) => current.filter((e) => e.id !== event.id));
        },
      } satisfies FriendFollowupItem,
    }));

    return [...fromRegistrations, ...fromCreatedEvents].sort((a, b) => a.endAt - b.endAt).map(({ item }) => item);
  }, [pendingFriendFollowups, pendingCreatorFollowups, resolveFriendEventMissed, resolveFriendEventAttended, submitSelfReportForEvent]);

  return (
    <>
    <ScreenScrollView containerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <HomeHeader
        searchExpanded={searchExpanded}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchPress={() => setSearchExpanded(true)}
        onSearchCancel={handleSearchCancel}
      />

      {searchQuery.trim() ? (
        <ThemedView style={styles.section}>
          {isSearching ? (
            <ActivityIndicator color={theme.primary} style={styles.searchSpinner} />
          ) : searchResults.length === 0 ? (
            <ThemedText type="body" themeColor="textSecondary">
              No people found.
            </ThemedText>
          ) : (
            <ThemedView style={styles.searchResults}>
              {searchResults.map((person) => (
                <PersonSearchRow
                  key={person.userId}
                  fullName={person.fullName}
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  verified={person.identityVerified}
                  added={followingIds.has(person.userId)}
                  onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: person.userId, fullName: person.fullName } })}
                  onAddPress={() => followUser(person.userId)}
                  onRemovePress={() => unfollowUser(person.userId)}
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>
      ) : (
        <>
          {suggested.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="h3">Suggested Friends</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
                {suggested.map((person) => (
                  <FriendSuggestionCard
                    key={person.userId}
                    name={person.fullName}
                    verified={person.identityVerified}
                    added={followingIds.has(person.userId)}
                    onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: person.userId, fullName: person.fullName } })}
                    onAddPress={() => handleAddFriend(person.userId)}
                    onRemovePress={() => handleRemoveFriend(person.userId)}
                  />
                ))}
              </ScrollView>
            </ThemedView>
          )}

          <ThemedView style={styles.section}>
            <ThemedText type="h3">Friends Activity</ThemedText>
            {feed.length === 0 ? (
              <ThemedText type="body" themeColor="textSecondary">
                Follow some friends to see their volunteer activity here.
              </ThemedText>
            ) : (
              <ThemedView style={styles.activityList}>
                {feed.map((activity) => (
                  <ActivityPostCard
                    key={activity.recordId}
                    recordId={activity.recordId}
                    name={activity.fullName}
                    verified={activity.identityVerified}
                    organization={activity.activityOrgName}
                    activityTitle={activity.activityTitle}
                    hours={activity.hours ?? 0}
                    description={activity.notes}
                    city={activity.city}
                    createdAt={activity.createdAt}
                    photoUrl={activity.photoUrl ?? undefined}
                    likeCount={activity.likeCount}
                    commentCount={activity.commentCount}
                    likedByMe={activity.likedByMe}
                    onPress={() => router.push({ pathname: '/activity/[id]/comments', params: { id: activity.recordId } })}
                  />
                ))}
              </ThemedView>
            )}
          </ThemedView>
        </>
      )}
    </ScreenScrollView>
    <FriendEventFollowupModal pending={followupItems} eligibleGroups={eligibleGroups} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  searchResults: {
    gap: Spacing.two,
  },
  searchSpinner: {
    marginVertical: Spacing.three,
  },
  suggestedRow: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  activityList: {
    gap: Spacing.two,
    marginHorizontal: -Spacing.four,
  },
});
