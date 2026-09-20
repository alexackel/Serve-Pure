import type { AiDiscoveredOrg } from '@/data/ai-orgs';
import type { EventDetail } from '@/data/mock-events';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';
import { getDistanceMiles } from '@/utils/geo';

export type MapPinKind = 'org-event' | 'individual-event' | 'ai-org';

const MAX_PIN_DISTANCE_MILES = 25;

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
};

function eventToPin(event: EventDetail): MapPin | null {
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

function aiOrgToPin(org: AiDiscoveredOrg): MapPin | null {
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

// Combines org events, individually-posted events, and AI-discovered orgs
// into one list sorted nearest-first. Anything without resolvable
// coordinates is dropped entirely (rather than kept unsorted) — the map
// surface can't place it, so the sheet list shouldn't list it either; every
// row here always has a matching pin on the map.
export function buildMapPins(
  events: readonly EventDetail[],
  aiOrgs: readonly AiDiscoveredOrg[],
  userLocation: { latitude: number | null; longitude: number | null },
): MapPin[] {
  const pins = [
    ...events.map(eventToPin),
    ...aiOrgs.map(aiOrgToPin),
  ].filter((pin): pin is MapPin => pin !== null);

  const { latitude, longitude } = userLocation;
  if (latitude == null || longitude == null) return pins;

  const withDistance = pins
    .map((pin) => ({
      ...pin,
      distanceMiles: getDistanceMiles(latitude, longitude, pin.latitude, pin.longitude),
    }))
    .filter((pin) => pin.distanceMiles <= MAX_PIN_DISTANCE_MILES);

  return withDistance.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
}
