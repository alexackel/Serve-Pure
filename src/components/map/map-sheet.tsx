import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapPinRow } from '@/components/map/map-pin-row';
import { EXPANDED_RATIO, PEEK_HEIGHT } from '@/components/map/sheet-layout';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, BottomTabInset, CardShadow, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MapPin } from '@/utils/map-pins';

// Drives translateY via a continuous gesture-driven transform, never
// Reanimated's `entering`/`exiting` — this repo's other sheets
// (create-post-sheet.tsx, find/filter-sheet.tsx) explicitly avoid those APIs
// because of a documented web bug where mount/unmount keyframe animations
// get stuck at `visibility: hidden`. A plain transform driven by a shared
// value doesn't hit that bug and is exactly what a drag gesture needs anyway.
export function MapSheet({ pins, onPressPin }: { pins: MapPin[]; onPressPin: (pin: MapPin) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const expandedHeight = windowHeight * EXPANDED_RATIO;
  const tabBarOffset = BottomTabInset + insets.bottom;
  const maxTranslate = Math.max(expandedHeight - tabBarOffset - PEEK_HEIGHT, 0);

  // Starts peeked so the map itself is the first thing a user sees.
  const translateY = useSharedValue(maxTranslate);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      const next = translateY.value + event.changeY;
      translateY.value = Math.min(Math.max(next, 0), maxTranslate);
    })
    .onEnd((event) => {
      const shouldExpand = event.velocityY < -300 ? true : event.velocityY > 300 ? false : translateY.value < maxTranslate / 2;
      translateY.value = withSpring(shouldExpand ? 0 : maxTranslate, { damping: 18, stiffness: 180, overshootClamping: true });
    });

  const tap = Gesture.Tap().onEnd(() => {
    translateY.value = withSpring(translateY.value > 0 ? 0 : maxTranslate, { damping: 18, stiffness: 180, overshootClamping: true });
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle, { height: expandedHeight }]}>
      <View
        style={[
          styles.sheet,
          CardShadow,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        <GestureDetector gesture={Gesture.Race(panGesture, tap)}>
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <ThemedText type="bodyBold">
              {pins.length === 0 ? 'No nearby results' : `${pins.length} nearby`}
            </ThemedText>
          </View>
        </GestureDetector>

        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarOffset + Spacing.three }]}>
          {pins.map((pin) => (
            <MapPinRow key={pin.id} pin={pin} onPress={() => onPressPin(pin)} />
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Full-width positioning layer — a sibling of app-tabs.tsx's
  // tabListContainer/innerContainer split, for the same reason: an
  // absolutely-positioned element with left/right set ignores `alignSelf`,
  // so centering a maxWidth-capped child needs a plain flex `alignItems:
  // 'center'` wrapper instead, with the actual sheet as a normal child.
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    height: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    // Web-only: without this, dragging the handle also fires the browser's
    // native text-selection drag, which fights the pan gesture and leaves
    // the sheet stuck mid-animation instead of snapping cleanly.
    userSelect: 'none',
    touchAction: 'none',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: BorderRadius.pill,
  },
  list: {
    paddingHorizontal: Spacing.four,
  },
});
