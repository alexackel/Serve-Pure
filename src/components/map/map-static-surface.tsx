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
import { clampToMaxRequestSize, FALLBACK_ZOOM, getMapboxStaticImageUrl, MAX_ZOOM, MIN_ZOOM } from '@/utils/mapbox-static-image';
import type { MapPin } from '@/utils/map-pins';
import { computeFit, projectToPixel } from '@/utils/map-projection';

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

  // The measured container can be wider/taller than Mapbox's Static Images
  // API will ever render (MAX_REQUEST_SIZE per side — easily exceeded by
  // this full-bleed tab on a wide desktop browser window). Every
  // projectToPixel call below uses this clamped size, matching the actual
  // requested/rendered image exactly, and the image is rendered at this
  // size (centered within the measured container) rather than stretched to
  // fill it — otherwise pins land where they'd be on the *unclamped*
  // container while the real image underneath is smaller and stretched,
  // offsetting every marker by an amount that depends on zoom.
  const requestSize = size ? clampToMaxRequestSize(size) : null;

  // As tight a zoom as fits every current pin clear of the edges, with a
  // cushion on the bottom matching the sheet's own peeked height (see
  // sheet-layout.ts) so pins never sit under it. Deliberately NOT anchored
  // to the user's location — fitting around wherever the pins actually are
  // gets a tighter zoom than forcing the user to stay dead center, which
  // otherwise leaves pins bunched to one side with empty map on the other.
  // The user's location only matters here as the fallback center when
  // there's nothing nearby to fit around.
  const fit = useMemo(() => {
    if (!requestSize) return { center: { latitude: userLocation.latitude, longitude: userLocation.longitude }, zoom: FALLBACK_ZOOM };
    const padding = {
      left: Spacing.four + footprint.width / 2,
      right: Spacing.four + footprint.width / 2,
      top: insets.top + Spacing.three + footprint.height,
      bottom: BottomTabInset + insets.bottom + PEEK_HEIGHT + Spacing.three,
    };
    const result = computeFit(
      pins,
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      requestSize,
      padding,
      { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, fallbackZoom: FALLBACK_ZOOM },
    );
    return { center: result.center, zoom: Math.round(result.zoom * 100) / 100 };
  }, [pins, userLocation.latitude, userLocation.longitude, requestSize, insets.top, insets.bottom, footprint.width, footprint.height]);

  const imageUrl = useMemo(() => {
    if (!requestSize) return null;
    return getMapboxStaticImageUrl({ center: fit.center, zoom: fit.zoom, size: requestSize, colorScheme });
  }, [requestSize, colorScheme, fit]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {imageUrl && requestSize && (
        <View style={[styles.mapSurface, { width: requestSize.width, height: requestSize.height }]}>
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {pins.map((pin) => {
            const { x, y } = projectToPixel(pin, fit.center, fit.zoom, requestSize);
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
            const { x, y } = projectToPixel(userLocation, fit.center, fit.zoom, requestSize);
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
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sized exactly to the clamped request dimensions (see
  // clampToMaxRequestSize) and centered within `container` by its own
  // alignItems/justifyContent — never stretched to fill a larger surface,
  // which is what kept pin overlays misaligned with the actual map image.
  mapSurface: {
    position: 'relative',
    overflow: 'hidden',
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
