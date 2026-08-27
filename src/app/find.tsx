import { StyleSheet } from 'react-native';

import { EventCard } from '@/components/cards';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const SAMPLE_EVENTS = [
  {
    title: 'Riverside Park Cleanup',
    organization: 'GreenFuture Coalition',
    date: 'Sep 6',
    time: '9:00 AM',
    location: 'Riverside Park',
    hours: 3,
    volunteers: 11,
    maxVolunteers: 20,
    status: 'available' as const,
  },
  {
    title: 'Food Bank Sorting',
    organization: 'Northside Food Bank',
    date: 'Sep 2',
    time: '1:00 PM',
    location: 'Northside Food Bank',
    hours: 4,
    volunteers: 8,
    maxVolunteers: 8,
    status: 'full' as const,
  },
  {
    title: 'Animal Shelter Adoption Day',
    organization: 'Furry Friends Rescue',
    date: 'Aug 24',
    location: 'Furry Friends Rescue',
    hours: 5,
    volunteers: 4,
    maxVolunteers: 12,
    status: 'available' as const,
  },
  {
    title: 'Library Reading Buddies',
    organization: 'Central Public Library',
    date: 'Aug 18',
    location: 'Central Public Library',
    hours: 2,
    volunteers: 6,
    maxVolunteers: 6,
    status: 'full' as const,
  },
  {
    title: 'Trail Restoration Day',
    organization: 'Parks Conservancy',
    date: 'Aug 10',
    location: 'Blue Ridge Trailhead',
    hours: 2,
    volunteers: 11,
    maxVolunteers: 13,
    status: 'available' as const,
  },
  {
    title: 'Senior Center Tech Help',
    organization: 'Maple Grove Senior Center',
    date: 'Aug 3',
    location: 'Maple Grove Senior Center',
    hours: 3,
    volunteers: 3,
    maxVolunteers: 10,
    status: 'available' as const,
  },
  {
    title: 'Beach Cleanup',
    organization: 'Coastal Guardians',
    date: 'Jul 27',
    location: 'Sunset Beach',
    hours: 3,
    volunteers: 25,
    maxVolunteers: 25,
    status: 'full' as const,
  },
];

export default function FindScreen() {
  return (
    <ScreenScrollView>
      <ThemedText type="h1" style={styles.pageTitle}>
        Find
      </ThemedText>
      <ThemedView style={styles.list}>
        {SAMPLE_EVENTS.map((event) => (
          <EventCard key={event.title} {...event} />
        ))}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
});
