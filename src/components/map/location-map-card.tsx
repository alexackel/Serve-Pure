import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, LayoutChangeEvent, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPinMarkerFootprint, MapPinMarker } from '@/components/map/map-pin-marker';
import { USER_LOCATION_MARKER_SIZE, UserLocationMarker } from '@/components/map/user-location-marker';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import type { MapPin } from '@/utils/map-pins';
import { clampToMaxRequestSize, FALLBACK_ZOOM, getMapboxStaticImageUrl, MAX_ZOOM, MIN_ZOOM } from '@/utils/mapbox-static-image';
import { computeFit, projectToPixel } from '@/utils/map-projection';

// Fixed zoom for the collapsed preview — tight enough to show the pin's
// immediate streets (short of the Map tab's MAX_ZOOM=16 "street ceiling",
// which is too tight for this card's small on-screen size).
const PREVIEW_ZOOM = 15;
const CLOSE_BUTTON_SIZE = 40;

// A single-pin location preview, reused by any detail screen with a
// resolvable MapPin (event detail, AI-discovered org detail): a small card
// centered/zoomed on that pin alone, which taps open into a full view with
// that pin and the user together, reusing the Map tab's pin visuals and
// cushioned fit-to-bounds algorithm (computeFit) — see map-static-surface.tsx.
export function LocationMapCard({ pin }: { pin: MapPin | null }) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const userLocation = useUserLocation();
  const [expanded, setExpanded] = useState(false);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [expandedSize, setExpandedSize] = useState<{ width: number; height: number } | null>(null);

  const onPreviewLayout = (layoutEvent: LayoutChangeEvent) => {
    const { width, height } = layoutEvent.nativeEvent.layout;
    setPreviewSize({ width: Math.round(width), height: Math.round(height) });
  };

  const onExpandedLayout = (layoutEvent: LayoutChangeEvent) => {
    const { width, height } = layoutEvent.nativeEvent.layout;
    setExpandedSize({ width: Math.round(width), height: Math.round(height) });
  };

  const footprint = getPinMarkerFootprint();

  // The surface a caller measures (the preview card, or this full-screen
  // modal) can be wider/taller than Mapbox's Static Images API will ever
  // render (MAX_REQUEST_SIZE per side — easily exceeded by the expanded
  // modal on a wide desktop browser window). Every projectToPixel call below
  // uses this clamped size, matching the actual requested/rendered image
  // exactly, and the image itself is rendered at this size (centered within
  // the measured surface) rather than stretched to fill it — otherwise pins
  // land where they'd be on the *unclamped* surface while the real image
  // underneath is smaller and stretched, offsetting every marker by an
  // amount that depends on zoom, which made it look different per pin/post.
  const previewRequestSize = previewSize ? clampToMaxRequestSize(previewSize) : null;
  const expandedRequestSize = expandedSize ? clampToMaxRequestSize(expandedSize) : null;

  // Plain computations, not wrapped in useMemo — this project has React
  // Compiler enabled, which auto-memoizes these itself; a manual useMemo
  // whose dependency array optional-chains off a nullable value like `pin`
  // can't always be reconciled with what the compiler infers, which disables
  // its optimization for the whole component. Letting it infer memoization
  // here still keeps center/zoom stable across re-renders when the
  // underlying coordinates haven't changed, so the generated Mapbox URLs
  // below stay byte-identical across repeated opens of the same pin's modal
  // and expo-image's URI-keyed cache serves them locally instead of
  // re-hitting Mapbox's (billed) Static Images API every toggle.
  const previewCenter = pin?.latitude == null || pin?.longitude == null ? null : { latitude: pin.latitude, longitude: pin.longitude };

  const previewImageUrl =
    previewCenter && previewRequestSize
      ? getMapboxStaticImageUrl({ center: previewCenter, zoom: PREVIEW_ZOOM, size: previewRequestSize, colorScheme })
      : null;

  const userPoint =
    userLocation.latitude != null && userLocation.longitude != null
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null;

  // Waits for userLocation.loading to settle before computing anything, the
  // same gate the Map tab applies before ever mounting MapStaticSurface (see
  // map.tsx). Without this, the modal would fit/fetch an image around the
  // pin alone the instant it opens, then — once the (now Highest-accuracy,
  // so slower) GPS fix resolves a moment later — recompute a second fit that
  // also includes the user's point and swap the image URL. If that first
  // image is still on screen (or mid-fetch) when the swap happens, the pin
  // overlays already reflect the new fit while the visible tile is still the
  // old one, so the user marker lands nowhere near its real position even
  // though every computed value is individually correct.
  const expandedFit = (() => {
    if (userLocation.loading || pin?.latitude == null || pin?.longitude == null || !expandedRequestSize) return null;
    const pinPoint = { latitude: pin.latitude, longitude: pin.longitude };
    const points = userPoint ? [pinPoint, userPoint] : [pinPoint];
    const padding = {
      left: Spacing.four + footprint.width / 2,
      right: Spacing.four + footprint.width / 2,
      top: insets.top + Spacing.three + CLOSE_BUTTON_SIZE + Spacing.two + footprint.height,
      bottom: insets.bottom + Spacing.three,
    };
    const result = computeFit(points, pinPoint, expandedRequestSize, padding, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, fallbackZoom: FALLBACK_ZOOM });
    return { center: result.center, zoom: Math.round(result.zoom * 100) / 100 };
  })();

  const expandedImageUrl =
    expandedFit && expandedRequestSize
      ? getMapboxStaticImageUrl({ center: expandedFit.center, zoom: expandedFit.zoom, size: expandedRequestSize, colorScheme })
      : null;

  // No resolvable coordinates (common for AI-discovered orgs scraped from
  // the web without a clean address) — nothing sensible to show, so the
  // whole card is omitted rather than a "coming soon" placeholder. The
  // caller's own address text (shown above this card) still renders.
  if (!pin) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setExpanded(true)}
        onLayout={onPreviewLayout}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open location map"
        style={styles.preview}>
        {previewImageUrl && previewRequestSize && previewCenter && (
          <View style={[styles.mapSurface, { width: previewRequestSize.width, height: previewRequestSize.height }]}>
            <Image source={{ uri: previewImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            {(() => {
              const { x, y } = projectToPixel(pin, previewCenter, PREVIEW_ZOOM, previewRequestSize);
              return (
                <View style={[styles.pinAnchor, { left: x - footprint.width / 2, top: y - footprint.height }]}>
                  <MapPinMarker kind={pin.kind} />
                </View>
              );
            })()}
          </View>
        )}
        {previewSize && !previewImageUrl && (
          <View style={[StyleSheet.absoluteFill, styles.missingTokenNotice]}>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.centeredText}>
              Map unavailable — EXPO_PUBLIC_MAPBOX_TOKEN isn&apos;t configured.
            </ThemedText>
          </View>
        )}
      </Pressable>

      {expanded && (
        <Modal animationType="fade" onRequestClose={() => setExpanded(false)}>
          <View style={[styles.expandedContainer, { backgroundColor: theme.background }]} onLayout={onExpandedLayout}>
            {expandedImageUrl && expandedFit && expandedRequestSize && (
              <View style={[styles.mapSurface, { width: expandedRequestSize.width, height: expandedRequestSize.height }]}>
                <Image source={{ uri: expandedImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {(() => {
                  const { x, y } = projectToPixel(pin, expandedFit.center, expandedFit.zoom, expandedRequestSize);
                  return (
                    <View pointerEvents="none" style={[styles.pinAnchor, { left: x - footprint.width / 2, top: y - footprint.height }]}>
                      <MapPinMarker kind={pin.kind} />
                    </View>
                  );
                })()}
                {userPoint &&
                  (() => {
                    const { x, y } = projectToPixel(userPoint, expandedFit.center, expandedFit.zoom, expandedRequestSize);
                    return (
                      <View
                        pointerEvents="none"
                        style={[styles.pinAnchor, { left: x - USER_LOCATION_MARKER_SIZE / 2, top: y - USER_LOCATION_MARKER_SIZE / 2 }]}>
                        <UserLocationMarker />
                      </View>
                    );
                  })()}
              </View>
            )}
            {expandedSize && userLocation.loading && (
              <View style={[StyleSheet.absoluteFill, styles.missingTokenNotice]}>
                <ActivityIndicator color={theme.primary} />
              </View>
            )}
            {expandedSize && !userLocation.loading && !expandedImageUrl && (
              <View style={[StyleSheet.absoluteFill, styles.missingTokenNotice]}>
                <ThemedText type="body" themeColor="textSecondary" style={styles.centeredText}>
                  Map unavailable — EXPO_PUBLIC_MAPBOX_TOKEN isn&apos;t configured.
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              style={[
                styles.closeButton,
                { top: insets.top + Spacing.two, backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 140,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sized exactly to the clamped request dimensions (see
  // clampToMaxRequestSize) and centered within its parent by that parent's
  // own alignItems/justifyContent — never stretched to fill a larger
  // surface, which is what kept pin overlays misaligned with the actual
  // map image underneath.
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
  centeredText: {
    textAlign: 'center',
  },
  expandedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.three,
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
