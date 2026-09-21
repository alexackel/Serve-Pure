import type { EventDetail } from '@/data/mock-events';
import { addDays, endOfDay, parseEventDateTime, startOfDay } from '@/utils/dates';
import { MAX_EVENT_DISTANCE_MILES } from '@/utils/distance-limits';
import { getDistanceMiles } from '@/utils/geo';

// Shape-compatible with `UserLocation` from `use-user-location.tsx`, kept local
// so this file (pure filter/sort logic) doesn't depend on a hook module.
export type UserCoordinates = { latitude: number | null; longitude: number | null };

export const SORT_OPTIONS = [
  { key: 'distance', label: 'Distance' },
  { key: 'soonest', label: 'Soonest' },
  { key: 'most-spots', label: 'Most Spots' },
  { key: 'recently-posted', label: 'Recently Posted' },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]['key'];
// Doesn't depend on the user's location, so the first render (before
// useUserLocation resolves) still shows a sensible order.
export const DEFAULT_SORT: SortKey = 'soonest';

// Find never shows anything beyond MAX_EVENT_DISTANCE_MILES (see
// applyMaxRadius below) — a 50mi preset would be a dead no-op — hence only
// presets at or under that ceiling are offered here. '25' (the platform
// ceiling itself) is the default/selected preset rather than an 'any'
// option, since the two were functionally identical.
export const DISTANCE_OPTIONS = [
  { key: '5', label: 'Within 5 mi', miles: 5 },
  { key: '10', label: 'Within 10 mi', miles: 10 },
  { key: '25', label: 'Within 25 mi', miles: 25 },
] as const;
export type DistanceKey = (typeof DISTANCE_OPTIONS)[number]['key'];

export const DATE_OPTIONS = [
  { key: 'any', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
] as const;
export type DateKey = (typeof DATE_OPTIONS)[number]['key'];

export const DURATION_OPTIONS = [
  { key: 'any', label: 'Any duration' },
  { key: 'under-2', label: 'Under 2 hrs' },
  { key: '2-to-4', label: '2-4 hrs' },
  { key: '4-plus', label: '4+ hrs' },
] as const;
export type DurationKey = (typeof DURATION_OPTIONS)[number]['key'];

export const AVAILABILITY_OPTIONS = [
  { key: 'any', label: 'Any' },
  { key: 'open', label: 'Open' },
  { key: 'full', label: 'Full' },
] as const;
export type AvailabilityKey = (typeof AVAILABILITY_OPTIONS)[number]['key'];

export const RECURRENCE_OPTIONS = [
  { key: 'any', label: 'Any' },
  { key: 'one-time', label: 'One-time' },
  { key: 'recurring', label: 'Recurring' },
] as const;
export type RecurrenceKey = (typeof RECURRENCE_OPTIONS)[number]['key'];

export type FindFilters = {
  distance: DistanceKey;
  date: DateKey;
  duration: DurationKey;
  categories: Set<string>;
  availability: AvailabilityKey;
  recurrence: RecurrenceKey;
};

export const DEFAULT_FIND_FILTERS: FindFilters = {
  distance: '25',
  date: 'any',
  duration: 'any',
  categories: new Set(),
  availability: 'any',
  recurrence: 'any',
};

export type FindFiltersState = { sort: SortKey; filters: FindFilters };

export const DEFAULT_FIND_FILTERS_STATE: FindFiltersState = {
  sort: DEFAULT_SORT,
  filters: DEFAULT_FIND_FILTERS,
};

// Derived from data, never hardcoded, so a real API's categories show up
// automatically. Reads from the full (unfiltered) list so a category the
// volunteer already checked can't disappear from the sheet while other
// filters narrow the list.
export function getCategoryOptions(events: EventDetail[]): string[] {
  return Array.from(new Set(events.map((event) => event.category).filter((category): category is string => Boolean(category)))).sort();
}

// Find only ever shows things you can still register for — an event whose
// date has already passed doesn't belong here regardless of sort order, even
// if its mock `status` is still 'available'. Same upcoming/past comparison
// `org-events.tsx` uses to split an organization's own event list.
export function excludePastEvents(events: EventDetail[], now: Date): EventDetail[] {
  return events.filter((event) => parseEventDateTime(event.date, event.startTime, now) >= now);
}

// Always-on ceiling, independent of the user-adjustable Distance pill below
// — mirrors buildMapPins' identical hard cap on the Map tab (same shared
// constant), so Find never lists something the user could never find
// plotted on the map. Runs first inside applyFindFilters so it's
// non-bypassable by construction, not just an opt-in filter step.
export function applyMaxRadius(events: EventDetail[], userLocation: UserCoordinates): EventDetail[] {
  const { latitude, longitude } = userLocation;
  if (latitude == null || longitude == null) {
    return events;
  }

  return events.filter(
    (event) =>
      event.latitude !== undefined &&
      event.longitude !== undefined &&
      getDistanceMiles(latitude, longitude, event.latitude, event.longitude) <= MAX_EVENT_DISTANCE_MILES,
  );
}

export function filterByDistance(events: EventDetail[], key: DistanceKey, userLocation: UserCoordinates): EventDetail[] {
  if (userLocation.latitude == null || userLocation.longitude == null) {
    return events;
  }

  const preset = DISTANCE_OPTIONS.find((option) => option.key === key);
  if (!preset?.miles) {
    return events;
  }

  const { latitude, longitude } = userLocation;
  return events.filter(
    (event) =>
      event.latitude !== undefined &&
      event.longitude !== undefined &&
      getDistanceMiles(latitude, longitude, event.latitude, event.longitude) <= preset.miles,
  );
}

export function filterByDate(events: EventDetail[], key: DateKey, now: Date = new Date()): EventDetail[] {
  if (key === 'any') {
    return events;
  }

  const rangeEnd = key === 'today' ? endOfDay(now) : key === 'this-week' ? addDays(now, 7) : addDays(now, 30);
  const rangeStart = key === 'today' ? startOfDay(now) : now;

  return events.filter((event) => {
    const eventDate = parseEventDateTime(event.date, event.startTime, now);
    return eventDate >= rangeStart && eventDate <= rangeEnd;
  });
}

export function filterByDuration(events: EventDetail[], key: DurationKey): EventDetail[] {
  if (key === 'any') {
    return events;
  }

  return events.filter((event) => {
    if (event.hours === undefined) {
      return false;
    }
    if (key === 'under-2') return event.hours < 2;
    if (key === '2-to-4') return event.hours >= 2 && event.hours <= 4;
    return event.hours > 4;
  });
}

export function filterByCategories(events: EventDetail[], categories: Set<string>): EventDetail[] {
  if (categories.size === 0) {
    return events;
  }

  return events.filter((event) => event.category !== undefined && categories.has(event.category));
}

export function filterByAvailability(events: EventDetail[], key: AvailabilityKey): EventDetail[] {
  if (key === 'any') {
    return events;
  }

  // Reads the event's own status (capacity-driven), not the per-volunteer
  // registration-override status the card displays.
  return events.filter((event) => (key === 'open' ? event.status === 'available' : event.status === 'full'));
}

export function filterByRecurrence(events: EventDetail[], key: RecurrenceKey): EventDetail[] {
  if (key === 'any') {
    return events;
  }

  return events.filter((event) => (key === 'recurring' ? event.recurring : !event.recurring));
}

export function applyFindFilters(events: EventDetail[], filters: FindFilters, userLocation: UserCoordinates, now?: Date): EventDetail[] {
  let result = applyMaxRadius(events, userLocation);
  result = filterByDistance(result, filters.distance, userLocation);
  result = filterByDate(result, filters.date, now);
  result = filterByDuration(result, filters.duration);
  result = filterByCategories(result, filters.categories);
  result = filterByAvailability(result, filters.availability);
  result = filterByRecurrence(result, filters.recurrence);
  return result;
}

function distanceFrom(latitude: number, longitude: number, event: EventDetail): number {
  return event.latitude !== undefined && event.longitude !== undefined
    ? getDistanceMiles(latitude, longitude, event.latitude, event.longitude)
    : Infinity;
}

export function sortEvents(events: EventDetail[], sort: SortKey, userLocation: UserCoordinates, now: Date = new Date()): EventDetail[] {
  const sorted = [...events];

  if (sort === 'distance') {
    if (userLocation.latitude == null || userLocation.longitude == null) {
      return sorted;
    }
    const { latitude, longitude } = userLocation;
    return sorted.sort(
      (a, b) => distanceFrom(latitude, longitude, a) - distanceFrom(latitude, longitude, b),
    );
  }

  if (sort === 'soonest') {
    return sorted.sort(
      (a, b) => parseEventDateTime(a.date, a.startTime, now).getTime() - parseEventDateTime(b.date, b.startTime, now).getTime(),
    );
  }

  if (sort === 'most-spots') {
    const remainingSpots = (event: EventDetail) =>
      event.maxVolunteers !== undefined && event.volunteers !== undefined ? event.maxVolunteers - event.volunteers : -Infinity;
    return sorted.sort((a, b) => remainingSpots(b) - remainingSpots(a));
  }

  const postedAtMs = (event: EventDetail) => (event.postedAt ? new Date(event.postedAt).getTime() : -Infinity);
  return sorted.sort((a, b) => postedAtMs(b) - postedAtMs(a));
}

export type FindPillKey = 'sort' | 'distance' | 'date' | 'duration' | 'category' | 'availability' | 'recurring';

export type FindPillDescriptor = {
  key: FindPillKey;
  label: string;
  active: boolean;
  valueHint?: string;
};

function findLabel<T extends string>(options: readonly { key: T; label: string }[], key: T) {
  return options.find((option) => option.key === key)?.label;
}

export function buildFindPillDescriptors(state: FindFiltersState): FindPillDescriptor[] {
  const { sort, filters } = state;

  const categoryActive = filters.categories.size > 0;
  const categoryHint =
    filters.categories.size === 1 ? Array.from(filters.categories)[0] : filters.categories.size > 1 ? `${filters.categories.size} selected` : undefined;

  return [
    { key: 'sort', label: 'Sort', active: sort !== DEFAULT_SORT, valueHint: sort !== DEFAULT_SORT ? findLabel(SORT_OPTIONS, sort) : undefined },
    {
      key: 'distance',
      label: 'Distance',
      active: filters.distance !== DEFAULT_FIND_FILTERS.distance,
      valueHint: filters.distance !== DEFAULT_FIND_FILTERS.distance ? findLabel(DISTANCE_OPTIONS, filters.distance) : undefined,
    },
    { key: 'date', label: 'Date', active: filters.date !== 'any', valueHint: filters.date !== 'any' ? findLabel(DATE_OPTIONS, filters.date) : undefined },
    {
      key: 'duration',
      label: 'Duration',
      active: filters.duration !== 'any',
      valueHint: filters.duration !== 'any' ? findLabel(DURATION_OPTIONS, filters.duration) : undefined,
    },
    { key: 'category', label: 'Category', active: categoryActive, valueHint: categoryHint },
    {
      key: 'availability',
      label: 'Availability',
      active: filters.availability !== 'any',
      valueHint: filters.availability !== 'any' ? findLabel(AVAILABILITY_OPTIONS, filters.availability) : undefined,
    },
    {
      key: 'recurring',
      label: 'Recurring',
      active: filters.recurrence !== 'any',
      valueHint: filters.recurrence !== 'any' ? findLabel(RECURRENCE_OPTIONS, filters.recurrence) : undefined,
    },
  ];
}

export function isFindFiltersDefault(state: FindFiltersState): boolean {
  const { sort, filters } = state;
  return (
    sort === DEFAULT_SORT &&
    filters.distance === DEFAULT_FIND_FILTERS.distance &&
    filters.date === 'any' &&
    filters.duration === 'any' &&
    filters.categories.size === 0 &&
    filters.availability === 'any' &&
    filters.recurrence === 'any'
  );
}
