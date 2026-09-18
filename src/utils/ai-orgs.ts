import type { AiDiscoveredOrg, AiOrgCategory } from '@/data/ai-orgs';
import { getDistanceMiles } from '@/utils/geo';

export const AI_ORG_CATEGORY_OPTIONS: readonly { key: AiOrgCategory; label: string }[] = [
  { key: 'food', label: 'Food' },
  { key: 'environment', label: 'Environment' },
  { key: 'youth', label: 'Youth' },
  { key: 'seniors', label: 'Seniors' },
  { key: 'animals', label: 'Animals' },
  { key: 'education', label: 'Education' },
  { key: 'health', label: 'Health' },
  { key: 'disaster_relief', label: 'Disaster Relief' },
  { key: 'other', label: 'Other' },
];

export function aiOrgCategoryLabel(category: AiOrgCategory): string {
  return AI_ORG_CATEGORY_OPTIONS.find((option) => option.key === category)?.label ?? category;
}

export type AiOrgWithDistance = AiDiscoveredOrg & { distanceMiles: number | null };

// How many of the optional detail fields an org actually has populated —
// used only to break ties between similarly-distant orgs, never to exclude
// anything (name/description/category are always present post-extraction,
// so they wouldn't differentiate anything).
function completenessScore(org: AiDiscoveredOrg): number {
  return [org.address, org.contactInfo, org.signupUrl, org.website, org.timeCommitment, org.eligibility].filter(
    (field) => field !== null,
  ).length;
}

// Orgs missing a geocoded lat/lng (a non-fatal Mapbox failure server-side)
// sort to the end rather than being excluded.
export function sortAiOrgsByDistance(
  orgs: readonly AiDiscoveredOrg[],
  userLocation: { latitude: number | null; longitude: number | null },
): AiOrgWithDistance[] {
  const { latitude, longitude } = userLocation;

  const withDistance = orgs.map((org) => ({
    ...org,
    distanceMiles:
      latitude !== null && longitude !== null && org.lat !== null && org.lng !== null
        ? getDistanceMiles(latitude, longitude, org.lat, org.lng)
        : null,
  }));

  return withDistance.sort((a, b) => {
    // Any report at all (from any user, not just the current viewer) drops
    // an org below every unreported one, before distance is even
    // considered — a soft "less trusted" ranking signal distinct from the
    // hard 5-report removal enforced server-side in discover-ai-orgs.
    const flaggedA = a.flaggedCount > 0 ? 1 : 0;
    const flaggedB = b.flaggedCount > 0 ? 1 : 0;
    if (flaggedA !== flaggedB) return flaggedA - flaggedB;

    if (a.distanceMiles === null && b.distanceMiles === null) return completenessScore(b) - completenessScore(a);
    if (a.distanceMiles === null) return 1;
    if (b.distanceMiles === null) return -1;

    // Group similarly-distant orgs (same nearest-mile bucket) and rank the
    // more complete listing first within that group, rather than sorting
    // on raw distance alone.
    const bucketA = Math.round(a.distanceMiles);
    const bucketB = Math.round(b.distanceMiles);
    if (bucketA !== bucketB) return bucketA - bucketB;

    const completenessDiff = completenessScore(b) - completenessScore(a);
    if (completenessDiff !== 0) return completenessDiff;

    return a.distanceMiles - b.distanceMiles;
  });
}
