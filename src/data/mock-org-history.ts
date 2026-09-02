import type { HistoryStatus } from '@/context/history-context';

export type OrgHistoryRecord = {
  id: string;
  volunteerName: string;
  eventId: string;
  eventTitle: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  // Only meaningful for 'self-uploaded' records — the volunteer's own
  // description of what they did, shown to the org during review.
  note?: string;
};

export const MOCK_ORG_HISTORY: OrgHistoryRecord[] = [
  {
    id: 'oh1',
    volunteerName: 'Jordan Lee',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'pending',
    hours: 3,
  },
  {
    id: 'oh2',
    volunteerName: 'Maya Torres',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'pending',
    hours: 3,
  },
  {
    id: 'oh3',
    volunteerName: 'Priya Nair',
    eventId: 'riverside-park-cleanup',
    eventTitle: 'Riverside Park Cleanup',
    date: 'Aug 5',
    status: 'self-uploaded',
    hours: 2,
    note: 'I helped out at the cleanup but forgot to check in on the app — Maya from your team saw me there.',
  },
  {
    id: 'oh4',
    volunteerName: 'Ethan Brooks',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'verified',
    hours: 3,
  },
  {
    id: 'oh5',
    volunteerName: 'Sofia Ramirez',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'no-show',
  },
  {
    id: 'oh6',
    volunteerName: 'Caleb Wright',
    eventId: 'neighborhood-food-drive',
    eventTitle: 'Neighborhood Food Drive',
    date: 'Aug 3',
    status: 'self-uploaded',
    hours: 1,
    note: 'Ran a small food drive with a few neighbors on our own street — not one of your posted events, but wanted to log the hours.',
  },
];
