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
        <ThemedView style={styles.statRow}>
          <StatCard label="Verified Hours" value={42} icon="checkmark-circle-outline" accentColor="success" />
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
  statRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    marginTop: Spacing.three,
  },
});
