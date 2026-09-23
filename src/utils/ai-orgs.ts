import type { AiDiscoveredOrg, AiOrgCategory } from '@/data/ai-orgs';
import { rankByTrustAndDistance } from '@/utils/discovery-rank';

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
  return rankByTrustAndDistance(orgs, userLocation, {
    getLatLng: (org) => [org.lat, org.lng],
    getFlaggedCount: (org) => org.flaggedCount,
    getCompleteness: completenessScore,
  });
}
