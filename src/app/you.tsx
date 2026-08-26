import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function YouScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="h2">You</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.text}>
          Your permanent record is coming soon.
        </ThemedText>
        <ThemedView style={styles.statGrid}>
          <StatCard label="Total Hours" value={58} icon="ribbon-outline" accentColor="primary" />
          <StatCard label="Verified Hours" value={42} icon="checkmark-circle-outline" accentColor="success" />
          <StatCard label="Pending Hours" value={16} icon="hourglass-outline" accentColor="warning" />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  text: {
    textAlign: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: MaxContentWidth,
    marginTop: Spacing.three,
  },
});
