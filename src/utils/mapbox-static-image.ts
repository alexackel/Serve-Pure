import type { ColorSchemeName } from 'react-native';

// Mapbox's Static Images API caps requested width/height at 1280px each
// (the @2x retina modifier scales the *output* pixels, not the requested
// size, so it's safe to always request @2x on top of this cap).
export const MAX_REQUEST_SIZE = 1280;
// z9 ~= metro scale (a safety floor, rarely hit since buildMapPins already
// caps pins at MAX_EVENT_DISTANCE_MILES), z16 ~= street scale ceiling, z14
// is the fallback used when there's nothing to fit a view around.
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 16;
export const FALLBACK_ZOOM = 14;

export type MapboxStaticImageParams = {
  center: { latitude: number; longitude: number };
  zoom: number;
  size: { width: number; height: number };
  colorScheme: ColorSchemeName;
};

// The actual image Mapbox will render is capped at MAX_REQUEST_SIZE per
// side, regardless of how large the surface measuring it is (e.g. a
// full-screen web modal on a wide desktop window can easily exceed 1280
// logical px). Callers MUST use this same clamped size for every
// projectToPixel call too, not just the image request — otherwise pins get
// placed as if the image filled the full unclamped surface, while the
// actual (smaller, then stretched-to-fill) image doesn't, offsetting every
// marker from where it should sit. How far off depends on how much the
// surface exceeds the cap and on the current zoom, which is why the
// mismatch can look different on every screen instead of a fixed offset.
export function clampToMaxRequestSize(size: { width: number; height: number }): { width: number; height: number } {
  return {
    width: Math.min(Math.round(size.width), MAX_REQUEST_SIZE),
    height: Math.min(Math.round(size.height), MAX_REQUEST_SIZE),
  };
}

// Shared by every static-map surface in the app (the Map tab and the event
// detail page's location map) so they all build the exact same kind of URL
// from one place. Returns null if EXPO_PUBLIC_MAPBOX_TOKEN isn't configured.
export function getMapboxStaticImageUrl({ center, zoom, size, colorScheme }: MapboxStaticImageParams): string | null {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const styleId = colorScheme === 'dark' ? 'dark-v11' : 'streets-v12';
  const width = Math.min(Math.round(size.width), MAX_REQUEST_SIZE);
  const height = Math.min(Math.round(size.height), MAX_REQUEST_SIZE);

  return (
    `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/` +
    `${center.longitude},${center.latitude},${zoom}/${width}x${height}@2x` +
    `?access_token=${token}`
  );
}
