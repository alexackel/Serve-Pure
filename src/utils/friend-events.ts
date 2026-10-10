import type { EventDetail } from '@/data/mock-events';
import { formatDaysUntil, parseEventDateTime } from '@/utils/dates';

// The card headline for a "Volunteer with Friends" post — first-person,
// since the card's own header row already names the poster (see find.tsx),
// so this reads as their own caption rather than a third-person description.
export function buildFriendEventHeadline(event: EventDetail, now: Date = new Date()): string {
  const start = parseEventDateTime(event.date, event.startTime, now);
  return `I'm volunteering with ${event.organization} ${formatDaysUntil(start, now)}. Come join me!`;
}
