import type { HistoryStatus } from '@/context/history-context';

export type OrgHistoryRecord = {
  id: string;
  volunteerName: string;
  eventId: string;
  eventTitle: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
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
    eventId: 'riverside-park-cleanup',
    eventTitle: 'Riverside Park Cleanup',
    date: 'Aug 5',
    status: 'self-uploaded',
    hours: 1,
  },
];
