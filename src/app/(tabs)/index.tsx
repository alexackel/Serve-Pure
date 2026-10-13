import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { ActivityPostCard, FriendSuggestionCard, PersonSearchRow } from '@/components/cards';
import { FriendEventFollowupModal } from '@/components/friend-event-followup-modal';
import { HomeHeader } from '@/components/home-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type FeedActivity, type SearchedPerson, type SuggestedPerson, useSocial } from '@/context/social-context';
import { useRegistrations } from '@/context/registrations-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDateInput, parseEventDateTime } from '@/utils/dates';
// `added` is set once Add succeeds and kept for the life of this screen, so the
// card reads "Added" until the app reloads.
type SuggestedRow = SuggestedPerson & { added?: boolean };

export default function HomeScreen() {
  const theme = useTheme();
  const { getActivityFeed, getSuggestedPeople, followUser, searchPeople, followingIds } = useSocial();
  const { pendingFriendFollowups, resolveFriendEventAttended, resolveFriendEventMissed } = useRegistrations();
  const [feed, setFeed] = useState<FeedActivity[]>([]);
  const [suggested, setSuggested] = useState<SuggestedRow[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedPerson[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const load = useCallback(async () => {
    const [feedResult, suggestedResult] = await Promise.all([getActivityFeed(), getSuggestedPeople()]);
    setFeed(feedResult);
    setSuggested((current) => {
      // The suggestions query drops anyone already followed, so re-attach the
      // people added this session rather than letting them vanish on refocus.
      const added = current.filter((person) => person.added);
      const fresh = suggestedResult.filter((person) => !added.some((a) => a.userId === person.userId));
      return [...added, ...fresh];
    });
  }, [getActivityFeed, getSuggestedPeople]);

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
    setSearchExpanded(false);
    handleSearchChange('');
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
      return;
    }
    setSuggested((current) => current.map((person) => (person.userId === userId ? { ...person, added: true } : person)));
  };

  const handleFriendEventAttended = async (registration: (typeof pendingFriendFollowups)[number], photoUrl?: string) => {
    await resolveFriendEventAttended(registration.id);
    const { event } = registration;
    const eventDate = parseEventDateTime(event.date, event.startTime, new Date());
    router.push({
      pathname: '/self-upload',
      params: {
        prefillTitle: event.title,
        prefillOrgName: event.organization,
        prefillOrgEmail: event.contactInfo ?? '',
        prefillDate: formatDateInput(eventDate),
        prefillHours: event.hours !== undefined ? String(event.hours) : '',
        prefillPhotoUrl: photoUrl ?? '',
      },
    });
  };

  return (
    <>
    <ScreenScrollView containerStyle={styles.container}>
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
                    added={person.added || followingIds.has(person.userId)}
                    onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: person.userId, fullName: person.fullName } })}
                    onAddPress={() => handleAddFriend(person.userId)}
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
    <FriendEventFollowupModal
      pending={pendingFriendFollowups}
      onAttended={handleFriendEventAttended}
      onMissed={(registration) => resolveFriendEventMissed(registration.id)}
    />
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
