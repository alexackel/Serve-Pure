import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PillIconButton } from '@/components/pill-icon-button';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PickedPhoto, SquareCrop } from '@/utils/photo-upload';

const MAX_FRAME = 320;
const SCREEN_GUTTER = Spacing.four * 2;

// Shows the whole photo inside a square frame with a circle the volunteer drags
// over it. The circle is the largest that fits inside the photo, so the crop
// never runs past an edge. onConfirm gets that circle's bounding square in the
// photo's own pixel space.
export function AvatarCropper({
  photo,
  onConfirm,
  onCancel,
}: {
  photo: PickedPhoto;
  onConfirm: (crop: SquareCrop) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const frame = Math.min(MAX_FRAME, Dimensions.get('window').width - SCREEN_GUTTER);

  // Photo laid out inside the frame, scaled to fit (letterboxed on the short side).
  const scale = frame / Math.max(photo.width, photo.height);
  const imageWidth = photo.width * scale;
  const imageHeight = photo.height * scale;
  const imageLeft = (frame - imageWidth) / 2;
  const imageTop = (frame - imageHeight) / 2;

  // Circle diameter, in frame px, and the range its top-left corner may travel.
  const circle = Math.min(imageWidth, imageHeight);
  const minX = imageLeft;
  const maxX = imageLeft + imageWidth - circle;
  const minY = imageTop;
  const maxY = imageTop + imageHeight - circle;
  const startX = (minX + maxX) / 2;
  const startY = (minY + maxY) / 2;

  const [position, setPosition] = useState({ x: startX, y: startY });
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const dragStartX = useSharedValue(startX);
  const dragStartY = useSharedValue(startY);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStartX.value = x.value;
      dragStartY.value = y.value;
    })
    .onUpdate((event) => {
      x.value = Math.min(maxX, Math.max(minX, dragStartX.value + event.translationX));
      y.value = Math.min(maxY, Math.max(minY, dragStartY.value + event.translationY));
    })
    .onEnd(() => {
      runOnJS(setPosition)({ x: x.value, y: y.value });
    });

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  const handleConfirm = () => {
    // Frame px → photo px: undo the letterbox offset, then the display scale.
    onConfirm({
      originX: (position.x - imageLeft) / scale,
      originY: (position.y - imageTop) / scale,
      size: circle / scale,
    });
  };

  return (
    <View style={styles.container}>
      <ThemedText type="bodyBold">Move the circle to choose what shows</ThemedText>

      <View style={[styles.frame, { width: frame, height: frame, backgroundColor: theme.backgroundElement }]}>
        <Image
          source={{ uri: photo.uri }}
          style={{ position: 'absolute', left: imageLeft, top: imageTop, width: imageWidth, height: imageHeight }}
          contentFit="fill"
        />

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.circle,
              { width: circle, height: circle, borderRadius: circle / 2, borderColor: theme.primary },
              circleStyle,
            ]}
          />
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <PillIconButton icon="close-outline" label="Cancel" onPress={onCancel} />
        <PillIconButton icon="checkmark-outline" label="Use Photo" onPress={handleConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  frame: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
