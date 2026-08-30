import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { EventCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRegistrations } from '@/context/registrations-context';
import { MOCK_EVENTS } from '@/data/mock-events';

export default function FindScreen() {
  const [searchValue, setSearchValue] = useState('');
  const { isRegistered } = useRegistrations();

  useFocusEffect(
    useCallback(() => {
      return () => setSearchValue('');
    }, []),
  );

  return (
    <ScreenScrollView>
      <ThemedText type="h1" style={styles.pageTitle}>
        Find
      </ThemedText>
      <SearchBar
        placeholder="Search events"
        value={searchValue}
        onChangeText={setSearchValue}
        containerStyle={styles.searchBar}
      />
      <ThemedView style={styles.list}>
        {MOCK_EVENTS.map((event) => (
          <EventCard
            key={event.id}
            {...event}
            status={isRegistered(event.id) ? 'registered' : event.status}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
          />
        ))}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginBottom: Spacing.three,
  },
  searchBar: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
});
