import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SAMPLE_EVENTS = [
  {
    title: 'Riverside Park Cleanup',
    organization: 'GreenFuture Coalition',
    date: 'Sep 6',
    time: '9:00 AM',
    location: 'Riverside Park',
    hours: 3,
    status: 'available' as const,
  },
  {
    title: 'Food Bank Sorting',
    organization: 'Northside Food Bank',
    date: 'Sep 2',
    time: '1:00 PM',
    location: 'Northside Food Bank',
    hours: 4,
    status: 'registered' as const,
  },
  {
    title: 'Animal Shelter Adoption Day',
    organization: 'Furry Friends Rescue',
    date: 'Aug 24',
    location: 'Furry Friends Rescue',
    hours: 5,
    status: 'pending' as const,
  },
  {
    title: 'Library Reading Buddies',
    organization: 'Central Public Library',
    date: 'Aug 18',
    location: 'Central Public Library',
    hours: 2,
    status: 'verified' as const,
  },
  {
    title: 'Trail Restoration Day',
    organization: 'Parks Conservancy',
    date: 'Aug 10',
    location: 'Blue Ridge Trailhead',
    hours: 2,
    status: 'partial' as const,
  },
  {
    title: 'Senior Center Tech Help',
    organization: 'Maple Grove Senior Center',
    date: 'Aug 3',
    location: 'Maple Grove Senior Center',
    hours: 3,
    status: 'no-show' as const,
  },
  {
    title: 'Beach Cleanup',
    organization: 'Coastal Guardians',
    date: 'Jul 27',
    location: 'Sunset Beach',
    hours: 3,
    status: 'appealed' as const,
  },
];

export default function FindScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          Find
        </ThemedText>
        <ThemedView style={styles.list}>
          {SAMPLE_EVENTS.map((event) => (
            <EventCard key={event.title} {...event} />
          ))}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
});
