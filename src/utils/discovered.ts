import type { AiOrgWithDistance } from '@/utils/ai-orgs';
import type { AiOrgCategory } from '@/data/ai-orgs';
import type { DiscoveredPost } from '@/data/discovered-posts';
import { rankByTrustAndDistance } from '@/utils/discovery-rank';

export type DiscoveredPostWithDistance = DiscoveredPost & { distanceMiles: number | null };

// How many of the optional detail fields a post actually has populated —
// used only to break ties between similarly-distant posts. address/website
// are always present (both required on submit), so they wouldn't
// differentiate anything and are left out, unlike ai-orgs.ts's
// completenessScore where address is itself optional.
function completenessScore(post: DiscoveredPost): number {
  return [post.description, post.contactEmail, post.contactPhone, post.photoUrl].filter((field) => field !== null)
    .length;
}

export function sortDiscoveredPostsByDistance(
  posts: readonly DiscoveredPost[],
  userLocation: { latitude: number | null; longitude: number | null },
): DiscoveredPostWithDistance[] {
  return rankByTrustAndDistance(posts, userLocation, {
    getLatLng: (post) => [post.latitude, post.longitude],
    getFlaggedCount: (post) => post.flaggedCount,
    getCompleteness: completenessScore,
  });
}

export type DiscoveredListItem =
  | { source: 'user'; id: string; post: DiscoveredPostWithDistance }
  | { source: 'ai'; id: string; org: AiOrgWithDistance };

// Every community post outranks every AI-found org, as a group — each group
// is expected to already be internally ranked (via sortDiscoveredPostsByDistance
// / sortAiOrgsByDistance) before being passed in here.
export function mergeDiscoveredItems(
  posts: readonly DiscoveredPostWithDistance[],
  orgs: readonly AiOrgWithDistance[],
): DiscoveredListItem[] {
  return [
    ...posts.map((post): DiscoveredListItem => ({ source: 'user', id: post.id, post })),
    ...orgs.map((org): DiscoveredListItem => ({ source: 'ai', id: org.id, org })),
  ];
}

export function discoveredItemCategory(item: DiscoveredListItem): AiOrgCategory {
  return item.source === 'user' ? item.post.category : item.org.category;
}
