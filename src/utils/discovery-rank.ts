import { getDistanceMiles } from '@/utils/geo';

// Shared ranking rule for anything shown on the Discovered tab (AI-found
// orgs, community-submitted posts): items missing a geocoded lat/lng sort to
// the end rather than being excluded, any report at all (from any user) drops
// an item below every unreported one before distance is even considered (a
// soft "less trusted" signal, distinct from the hard 5-report hide enforced
// elsewhere), then items are grouped into same-nearest-mile buckets and the
// more complete listing within a bucket ranks first. Extracted out of what
// was originally ai-orgs.ts's sortAiOrgsByDistance so discovered-posts.ts can
// rank with the exact same rule instead of re-implementing it.
export function rankByTrustAndDistance<T>(
  items: readonly T[],
  userLocation: { latitude: number | null; longitude: number | null },
  opts: {
    getLatLng: (item: T) => readonly [number | null, number | null];
    getFlaggedCount: (item: T) => number;
    getCompleteness: (item: T) => number;
  },
): (T & { distanceMiles: number | null })[] {
  const { latitude, longitude } = userLocation;
  const { getLatLng, getFlaggedCount, getCompleteness } = opts;

  const withDistance = items.map((item) => {
    const [itemLat, itemLng] = getLatLng(item);
    return {
      ...item,
      distanceMiles:
        latitude !== null && longitude !== null && itemLat !== null && itemLng !== null
          ? getDistanceMiles(latitude, longitude, itemLat, itemLng)
          : null,
    };
  });

  return withDistance.sort((a, b) => {
    const flaggedA = getFlaggedCount(a) > 0 ? 1 : 0;
    const flaggedB = getFlaggedCount(b) > 0 ? 1 : 0;
    if (flaggedA !== flaggedB) return flaggedA - flaggedB;

    if (a.distanceMiles === null && b.distanceMiles === null) return getCompleteness(b) - getCompleteness(a);
    if (a.distanceMiles === null) return 1;
    if (b.distanceMiles === null) return -1;

    const bucketA = Math.round(a.distanceMiles);
    const bucketB = Math.round(b.distanceMiles);
    if (bucketA !== bucketB) return bucketA - bucketB;

    const completenessDiff = getCompleteness(b) - getCompleteness(a);
    if (completenessDiff !== 0) return completenessDiff;

    return a.distanceMiles - b.distanceMiles;
  });
}
