import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPinMarkerFootprint, MapPinMarker } from '@/components/map/map-pin-marker';
import { PEEK_HEIGHT } from '@/components/map/sheet-layout';
import { USER_LOCATION_MARKER_SIZE, UserLocationMarker } from '@/components/map/user-location-marker';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MapPin } from '@/utils/map-pins';
import { computeFit, projectToPixel } from '@/utils/map-projection';

// Mapbox's Static Images API caps requested width/height at 1280px each
// (the @2x retina modifier scales the *output* pixels, not the requested
// size, so it's safe to always request @2x on top of this cap).
const MAX_REQUEST_SIZE = 1280;
// z9 ~= metro scale (a safety floor, rarely hit since buildMapPins already
// caps pins at 25mi), z16 ~= street scale ceiling, z14 is the fallback used
// when there are no nearby pins to fit around.
const MIN_ZOOM = 9;
const MAX_ZOOM = 16;
const FALLBACK_ZOOM = 14;

export type MapStaticSurfaceProps = {
  userLocation: { latitude: number; longitude: number };
  pins: MapPin[];
  onPressPin: (pin: MapPin) => void;
};

// The one piece of this feature that's specific to rendering a *static*
// Mapbox image — everything else (pin data, pin visuals, the sheet) is
// written to be reused unchanged by a real interactive map surface later.
// Swapping to one means writing a replacement for just this file.
export function MapStaticSurface({ userLocation, pins, onPressPin }: MapStaticSurfaceProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const footprint = getPinMarkerFootprint();

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width: Math.round(width), height: Math.round(height) });
  };

  // As tight a zoom as fits every current pin clear of the edges, with a
  // cushion on the bottom matching the sheet's own peeked height (see
  // sheet-layout.ts) so pins never sit under it. Deliberately NOT anchored
  // to the user's location — fitting around wherever the pins actually are
  // gets a tighter zoom than forcing the user to stay dead center, which
  // otherwise leaves pins bunched to one side with empty map on the other.
  // The user's location only matters here as the fallback center when
  // there's nothing nearby to fit around.
  const fit = useMemo(() => {
    if (!size) return { center: { latitude: userLocation.latitude, longitude: userLocation.longitude }, zoom: FALLBACK_ZOOM };
    const padding = {
      left: Spacing.four + footprint.width / 2,
      right: Spacing.four + footprint.width / 2,
      top: insets.top + Spacing.three + footprint.height,
      bottom: BottomTabInset + insets.bottom + PEEK_HEIGHT + Spacing.three,
    };
    const result = computeFit(
      pins,
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      size,
      padding,
      { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, fallbackZoom: FALLBACK_ZOOM },
    );
    return { center: result.center, zoom: Math.round(result.zoom * 100) / 100 };
  }, [pins, userLocation.latitude, userLocation.longitude, size, insets.top, insets.bottom, footprint.width, footprint.height]);

  const imageUrl = useMemo(() => {
    if (!size) return null;
    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;

    const styleId = colorScheme === 'dark' ? 'dark-v11' : 'streets-v12';
    const width = Math.min(size.width, MAX_REQUEST_SIZE);
    const height = Math.min(size.height, MAX_REQUEST_SIZE);

    return (
      `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/` +
      `${fit.center.longitude},${fit.center.latitude},${fit.zoom}/${width}x${height}@2x` +
      `?access_token=${token}`
    );
  }, [size, colorScheme, fit]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {imageUrl && size && (
        <>
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {pins.map((pin) => {
            const { x, y } = projectToPixel(pin, fit.center, fit.zoom, size);
            return (
              <Pressable
                key={pin.id}
                onPress={() => onPressPin(pin)}
                style={[styles.pinAnchor, { left: x - footprint.width / 2, top: y - footprint.height }]}>
                <MapPinMarker kind={pin.kind} />
              </Pressable>
            );
          })}
          {(() => {
            const { x, y } = projectToPixel(userLocation, fit.center, fit.zoom, size);
            return (
              <View
                pointerEvents="none"
                style={[
                  styles.pinAnchor,
                  { left: x - USER_LOCATION_MARKER_SIZE / 2, top: y - USER_LOCATION_MARKER_SIZE / 2 },
                ]}>
                <UserLocationMarker />
              </View>
            );
          })()}
        </>
      )}

      {size && !process.env.EXPO_PUBLIC_MAPBOX_TOKEN && (
        <View style={[StyleSheet.absoluteFill, styles.missingTokenNotice]}>
          <ThemedText type="body" themeColor="textSecondary" style={styles.missingTokenText}>
            Map unavailable — EXPO_PUBLIC_MAPBOX_TOKEN isn&apos;t configured.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinAnchor: {
    position: 'absolute',
  },
  missingTokenNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  missingTokenText: {
    textAlign: 'center',
  },
});
