import type { HistoryStatus } from '@/context/history-context';

export type OrgHistoryRecord = {
  id: string;
  // References a MOCK_USERS id (src/data/mock-users.ts) — look up
  // name/verified via getUser(volunteerId) rather than storing them here.
  volunteerId: string;
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
    volunteerId: 'm2',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'pending',
    hours: 3,
  },
  {
    id: 'oh2',
    volunteerId: 'm1',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'pending',
    hours: 3,
  },
  {
    id: 'oh3',
    volunteerId: 'm3',
    eventId: 'riverside-park-cleanup',
    eventTitle: 'Riverside Park Cleanup',
    date: 'Aug 5',
    status: 'self-uploaded',
    hours: 2,
    note: 'I helped out at the cleanup but forgot to check in on the app — Maya from your team saw me there.',
  },
  {
    id: 'oh4',
    volunteerId: 'm4',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'verified',
    hours: 3,
  },
  {
    id: 'oh5',
    volunteerId: 'm5',
    eventId: 'community-garden-planting',
    eventTitle: 'Community Garden Planting',
    date: 'Aug 12',
    status: 'no-show',
  },
  {
    id: 'oh6',
    volunteerId: 'm6',
    eventId: 'neighborhood-food-drive',
    eventTitle: 'Neighborhood Food Drive',
    date: 'Aug 3',
    status: 'self-uploaded',
    hours: 1,
    note: 'Ran a small food drive with a few neighbors on our own street — not one of your posted events, but wanted to log the hours.',
  },
];
