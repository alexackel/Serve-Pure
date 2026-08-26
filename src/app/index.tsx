import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="h1">Serve Pure</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Your volunteer impact at a glance
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.statGrid}>
          <StatCard label="Total Hours" value={58} icon="ribbon-outline" accentColor="primary" />
          <StatCard
            label="Verified Hours"
            value={42}
            icon="checkmark-circle-outline"
            accentColor="success"
          />
          <StatCard
            label="Pending Hours"
            value={16}
            icon="hourglass-outline"
            accentColor="warning"
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.six,
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.half,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
});
