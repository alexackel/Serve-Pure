import type { AiDiscoveredOrg } from '@/data/ai-orgs';
import type { DiscoveredPost } from '@/data/discovered-posts';
import type { EventDetail } from '@/data/mock-events';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';
import { MAX_EVENT_DISTANCE_MILES } from '@/utils/distance-limits';
import { getDistanceMiles } from '@/utils/geo';

export type MapPinKind = 'org-event' | 'individual-event' | 'ai-org' | 'discovered-post';

export type MapPin = {
  id: string;
  kind: MapPinKind;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  distanceMiles: number | null;
  event?: EventDetail;
  aiOrg?: AiDiscoveredOrg;
  post?: DiscoveredPost;
};

export function eventToPin(event: EventDetail): MapPin | null {
  if (event.latitude == null || event.longitude == null) return null;

  const isIndividual = event.organizationId == null;
  return {
    id: `event:${event.id}`,
    kind: isIndividual ? 'individual-event' : 'org-event',
    title: event.title,
    subtitle: isIndividual ? (event.creatorName ? `Posted by ${event.creatorName}` : 'Individually posted') : event.organization,
    latitude: event.latitude,
    longitude: event.longitude,
    distanceMiles: null,
    event,
  };
}

export function aiOrgToPin(org: AiDiscoveredOrg): MapPin | null {
  if (org.lat == null || org.lng == null) return null;

  return {
    id: `ai-org:${org.id}`,
    kind: 'ai-org',
    title: org.name,
    subtitle: aiOrgCategoryLabel(org.category),
    latitude: org.lat,
    longitude: org.lng,
    distanceMiles: null,
    aiOrg: org,
  };
}

export function discoveredPostToPin(post: DiscoveredPost): MapPin | null {
  if (post.latitude == null || post.longitude == null) return null;

  return {
    id: `post:${post.id}`,
    kind: 'discovered-post',
    title: post.name,
    subtitle: aiOrgCategoryLabel(post.category),
    latitude: post.latitude,
    longitude: post.longitude,
    distanceMiles: null,
    post,
  };
}

// Combines org events, individually-posted events, AI-discovered orgs, and
// community-submitted Discovered posts into one list sorted nearest-first.
// Anything without resolvable coordinates is dropped entirely (rather than
// kept unsorted) — the map surface can't place it, so the sheet list
// shouldn't list it either; every row here always has a matching pin on the
// map.
export function buildMapPins(
  events: readonly EventDetail[],
  aiOrgs: readonly AiDiscoveredOrg[],
  discoveredPosts: readonly DiscoveredPost[],
  userLocation: { latitude: number | null; longitude: number | null },
): MapPin[] {
  const pins = [
    ...events.map(eventToPin),
    ...aiOrgs.map(aiOrgToPin),
    ...discoveredPosts.map(discoveredPostToPin),
  ].filter((pin): pin is MapPin => pin !== null);

  const { latitude, longitude } = userLocation;
  if (latitude == null || longitude == null) return pins;

  const withDistance = pins
    .map((pin) => ({
      ...pin,
      distanceMiles: getDistanceMiles(latitude, longitude, pin.latitude, pin.longitude),
    }))
    .filter((pin) => pin.distanceMiles <= MAX_EVENT_DISTANCE_MILES);

  return withDistance.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
}
