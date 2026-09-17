import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Matches AiOrgCard's card shell dimensions so a real card doesn't visually
// jump in once it replaces this. No shimmer/skeleton pattern existed
// anywhere else in the app to reuse — this is a minimal opacity pulse.
export function AiOrgCardSkeleton() {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const blockStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
      <View style={styles.header}>
        <Animated.View style={[styles.block, styles.avatar, { backgroundColor: theme.backgroundSelected }, blockStyle]} />
        <Animated.View style={[styles.block, styles.pill, { backgroundColor: theme.backgroundSelected }, blockStyle]} />
      </View>
      <Animated.View style={[styles.block, styles.titleLine, { backgroundColor: theme.backgroundSelected }, blockStyle]} />
      <Animated.View style={[styles.block, styles.metaLine, { backgroundColor: theme.backgroundSelected }, blockStyle]} />
      <Animated.View style={[styles.block, styles.metaLineShort, { backgroundColor: theme.backgroundSelected }, blockStyle]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  block: {
    borderRadius: BorderRadius.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
  },
  pill: {
    width: 72,
    height: 20,
    borderRadius: BorderRadius.pill,
  },
  titleLine: {
    width: '70%',
    height: 18,
  },
  metaLine: {
    width: '90%',
    height: 12,
  },
  metaLineShort: {
    width: '50%',
    height: 12,
  },
});
