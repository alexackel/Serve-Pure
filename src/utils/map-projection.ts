// Pure Web Mercator projection, used only to place pin overlays on top of a
// static Mapbox image (a static image has no concept of a marker — every
// pin's screen position has to be computed by hand from its lat/lng). This
// file is specific to the static-image map surface: a real interactive map
// positions its own markers natively, so this whole file goes away, unused,
// the moment map-static-surface.tsx is replaced by a real map SDK.

const TILE_SIZE = 256;

function project(latitude: number, longitude: number): { x: number; y: number } {
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const x = TILE_SIZE * (0.5 + longitude / 360);
  const y = TILE_SIZE * (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI));
  return { x, y };
}

// Inverse of project() — standard Bing/Web Mercator tile-pixel-to-latlng.
function unproject(x: number, y: number): { latitude: number; longitude: number } {
  const normalizedX = x / TILE_SIZE - 0.5;
  const normalizedY = 0.5 - y / TILE_SIZE;
  return {
    longitude: 360 * normalizedX,
    latitude: 90 - (360 * Math.atan(Math.exp(-normalizedY * 2 * Math.PI))) / Math.PI,
  };
}

// Returns the pixel offset of `point` relative to the top-left corner of an
// image of `imageSize`, centered on `center` at `zoom`.
export function projectToPixel(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  zoom: number,
  imageSize: { width: number; height: number },
): { x: number; y: number } {
  const scale = 2 ** zoom;
  const centerPixel = project(center.latitude, center.longitude);
  const pointPixel = project(point.latitude, point.longitude);

  return {
    x: (pointPixel.x - centerPixel.x) * scale + imageSize.width / 2,
    y: (pointPixel.y - centerPixel.y) * scale + imageSize.height / 2,
  };
}

export type FitPadding = { left: number; right: number; top: number; bottom: number };
export type FitResult = { center: { latitude: number; longitude: number }; zoom: number };

// Finds the center and zoom that fit every point within `padding` of the
// image edges, using as much zoom as the tightest axis allows — the
// standard "fit bounds" approach, which maximizes zoom rather than
// anchoring the view on any single point (e.g. the user's own location),
// since a fixed anchor can leave the actual pins bunched off to one side
// with the rest of the image empty.
//
// Padding may be asymmetric per edge (e.g. extra room reserved at the
// bottom for a floating sheet). The chosen center compensates by shifting
// toward whichever edge has less padding, rather than sitting at the
// points' plain geometric midpoint — otherwise the padded-out edge would
// eat into the fit and force a looser zoom than necessary.
export function computeFit(
  points: readonly { latitude: number; longitude: number }[],
  fallbackCenter: { latitude: number; longitude: number },
  imageSize: { width: number; height: number },
  padding: FitPadding,
  options: { minZoom: number; maxZoom: number; fallbackZoom: number },
): FitResult {
  if (points.length === 0) {
    return { center: fallbackCenter, zoom: Math.max(options.minZoom, Math.min(options.maxZoom, options.fallbackZoom)) };
  }

  const pixels = points.map((point) => project(point.latitude, point.longitude));
  const minX = Math.min(...pixels.map((p) => p.x));
  const maxX = Math.max(...pixels.map((p) => p.x));
  const minY = Math.min(...pixels.map((p) => p.y));
  const maxY = Math.max(...pixels.map((p) => p.y));

  const availableWidth = Math.max(imageSize.width - padding.left - padding.right, 1);
  const availableHeight = Math.max(imageSize.height - padding.top - padding.bottom, 1);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const zoomForWidth = rangeX > 0 ? Math.log2(availableWidth / rangeX) : options.maxZoom;
  const zoomForHeight = rangeY > 0 ? Math.log2(availableHeight / rangeY) : options.maxZoom;
  const zoom = Math.max(options.minZoom, Math.min(options.maxZoom, Math.min(zoomForWidth, zoomForHeight)));

  // Shift the bounding box's plain midpoint toward the smaller-padding edge
  // on each axis, by half the padding imbalance (in world pixels, at the
  // zoom just computed) — see the function comment above.
  const scale = 2 ** zoom;
  const centerPixelX = (minX + maxX) / 2 + (padding.right - padding.left) / (2 * scale);
  const centerPixelY = (minY + maxY) / 2 + (padding.bottom - padding.top) / (2 * scale);

  return { center: unproject(centerPixelX, centerPixelY), zoom };
}
