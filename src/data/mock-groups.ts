import type { HistoryStatus } from '@/context/history-context';

export type GroupMemberRecord = {
  id: string;
  eventTitle: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  // Only meaningful for 'self-uploaded' records — the volunteer's own
  // description of what they did, shown to a group admin during review.
  note?: string;
};

export type GroupMember = {
  id: string;
  name: string;
  records: GroupMemberRecord[];
};

export type MockGroup = {
  id: string;
  name: string;
  memberCount: number;
  members: GroupMember[];
  subgroupIds?: string[];
  adminIds?: string[];
};

// A member's total hours is always derived from their records — never stored
// separately — so the leaderboard/detail totals can't drift out of sync with
// the itemized data that backs them.
export function sumMemberHours(member: GroupMember): number {
  return member.records.reduce((sum, record) => sum + (record.hours ?? 0), 0);
}

export const MOCK_GROUPS: MockGroup[] = [
  {
    id: 'riverside-high-key-club',
    name: 'Riverside High Key Club',
    memberCount: 43,
    adminIds: ['me'],
    subgroupIds: ['key-club-freshman', 'key-club-sophomore'],
    members: [
      {
        id: 'me',
        name: 'You',
        records: [
          { id: 'me-r1', eventTitle: 'Community Garden Planting', date: 'Aug 12', status: 'verified', hours: 3 },
          { id: 'me-r2', eventTitle: 'Riverside Park Cleanup', date: 'Jul 20', status: 'verified', hours: 4 },
          {
            id: 'me-r3',
            eventTitle: 'Trail Restoration',
            date: 'Jun 9',
            status: 'self-uploaded',
            hours: 2,
            note: 'Cleared brush along the river trail with a couple of club members.',
          },
        ],
      },
      {
        id: 'm1',
        name: 'Maya Torres',
        records: [
          { id: 'm1-r1', eventTitle: 'Community Garden Planting', date: 'Aug 12', status: 'verified', hours: 3 },
          { id: 'm1-r2', eventTitle: 'Riverside Park Cleanup', date: 'Jul 20', status: 'verified', hours: 4 },
          {
            id: 'm1-r3',
            eventTitle: 'Neighborhood Bake Sale',
            date: 'Jun 2',
            status: 'self-uploaded',
            hours: 2,
            note: 'Helped organize a bake sale fundraiser with two friends.',
          },
        ],
      },
      {
        id: 'm2',
        name: 'Jordan Lee',
        records: [
          { id: 'm2-r1', eventTitle: 'Community Garden Planting', date: 'Aug 12', status: 'pending', hours: 3 },
          { id: 'm2-r2', eventTitle: 'Riverside Park Cleanup', date: 'Jul 20', status: 'verified', hours: 4 },
          { id: 'm2-r3', eventTitle: 'Library Book Drive', date: 'Jun 15', status: 'verified', hours: 2 },
        ],
      },
      {
        id: 'm3',
        name: 'Priya Nair',
        records: [
          {
            id: 'm3-r1',
            eventTitle: 'Riverside Park Cleanup',
            date: 'Aug 5',
            status: 'self-uploaded',
            hours: 2,
            note: 'I helped out at the cleanup but forgot to check in on the app — Maya from your team saw me there.',
          },
          { id: 'm3-r2', eventTitle: 'Community Garden Planting', date: 'Jul 12', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm4',
        name: 'Ethan Brooks',
        records: [
          { id: 'm4-r1', eventTitle: 'Community Garden Planting', date: 'Aug 12', status: 'verified', hours: 3 },
          { id: 'm4-r2', eventTitle: 'Riverside Park Cleanup', date: 'Jul 20', status: 'no-show' },
          { id: 'm4-r3', eventTitle: 'Food Pantry Sort', date: 'Jun 8', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm5',
        name: 'Sofia Ramirez',
        records: [
          { id: 'm5-r1', eventTitle: 'Community Garden Planting', date: 'Aug 12', status: 'no-show' },
          { id: 'm5-r2', eventTitle: 'Riverside Park Cleanup', date: 'Jul 20', status: 'appealed' },
          { id: 'm5-r3', eventTitle: 'Library Book Drive', date: 'Jun 15', status: 'verified', hours: 2 },
        ],
      },
      {
        id: 'm6',
        name: 'Caleb Wright',
        records: [
          {
            id: 'm6-r1',
            eventTitle: 'Neighborhood Food Drive',
            date: 'Aug 3',
            status: 'self-uploaded',
            hours: 1,
            note: 'Ran a small food drive with a few neighbors on our own street — not one of your posted events, but wanted to log the hours.',
          },
          { id: 'm6-r2', eventTitle: 'Community Garden Planting', date: 'Jul 12', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm7',
        name: 'Ava Chen',
        records: [
          { id: 'm7-r1', eventTitle: 'Library Book Drive', date: 'Aug 15', status: 'pending', hours: 2 },
          { id: 'm7-r2', eventTitle: 'Community Garden Planting', date: 'Jul 12', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm8',
        name: 'Noah Patel',
        records: [
          {
            id: 'm8-r1',
            eventTitle: 'Trail Restoration',
            date: 'Aug 9',
            status: 'self-uploaded',
            hours: 2,
            note: 'Spent a Saturday clearing brush along the river trail with my cousin.',
          },
        ],
      },
    ],
  },
  {
    id: 'greenfuture-youth-corps',
    name: 'GreenFuture Youth Corps',
    memberCount: 18,
    members: [
      {
        id: 'm9',
        name: 'Lily Nguyen',
        records: [
          { id: 'm9-r1', eventTitle: 'Beach Cleanup Day', date: 'Aug 10', status: 'verified', hours: 4 },
          { id: 'm9-r2', eventTitle: 'Tree Planting', date: 'Jul 22', status: 'verified', hours: 3 },
          {
            id: 'm9-r3',
            eventTitle: 'Recycling Awareness Fair',
            date: 'Jun 4',
            status: 'self-uploaded',
            hours: 2,
            note: 'Volunteered at a recycling awareness table set up by our chapter.',
          },
        ],
      },
      {
        id: 'm10',
        name: 'Owen Fisher',
        records: [
          { id: 'm10-r1', eventTitle: 'Beach Cleanup Day', date: 'Aug 10', status: 'verified', hours: 4 },
          { id: 'm10-r2', eventTitle: 'Tree Planting', date: 'Jul 22', status: 'pending', hours: 3 },
        ],
      },
      {
        id: 'm11',
        name: 'Grace Kim',
        records: [
          { id: 'm11-r1', eventTitle: 'Beach Cleanup Day', date: 'Aug 10', status: 'no-show' },
          { id: 'm11-r2', eventTitle: 'Tree Planting', date: 'Jul 22', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm12',
        name: 'Daniel Ortiz',
        records: [
          {
            id: 'm12-r1',
            eventTitle: 'Community Garden Bed',
            date: 'Aug 1',
            status: 'self-uploaded',
            hours: 2,
            note: 'Helped a neighbor plant a small community garden bed.',
          },
          { id: 'm12-r2', eventTitle: 'Beach Cleanup Day', date: 'Jul 10', status: 'verified', hours: 4 },
        ],
      },
      {
        id: 'm13',
        name: 'Zoe Bennett',
        records: [
          { id: 'm13-r1', eventTitle: 'Beach Cleanup Day', date: 'Aug 10', status: 'appealed' },
          { id: 'm13-r2', eventTitle: 'Tree Planting', date: 'Jun 22', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm14',
        name: 'Mason Clarke',
        records: [{ id: 'm14-r1', eventTitle: 'Tree Planting', date: 'Aug 22', status: 'pending', hours: 3 }],
      },
    ],
  },
  {
    id: 'key-club-freshman',
    name: 'Key Club — Freshman Chapter',
    memberCount: 15,
    members: [
      {
        id: 'm15',
        name: 'Isla Foster',
        records: [
          { id: 'm15-r1', eventTitle: 'Winter Coat Drive', date: 'Aug 6', status: 'verified', hours: 3 },
          {
            id: 'm15-r2',
            eventTitle: 'Senior Center Visit',
            date: 'Jul 14',
            status: 'self-uploaded',
            hours: 2,
            note: 'Visited the senior center with a small group to help with an afternoon activity.',
          },
        ],
      },
      {
        id: 'm16',
        name: 'Liam Sanders',
        records: [
          { id: 'm16-r1', eventTitle: 'Winter Coat Drive', date: 'Aug 6', status: 'verified', hours: 3 },
          { id: 'm16-r2', eventTitle: 'Senior Center Visit', date: 'Jul 14', status: 'pending', hours: 2 },
        ],
      },
      {
        id: 'm17',
        name: 'Nora Ellis',
        records: [
          { id: 'm17-r1', eventTitle: 'Winter Coat Drive', date: 'Aug 6', status: 'no-show' },
          { id: 'm17-r2', eventTitle: 'Senior Center Visit', date: 'Jun 14', status: 'verified', hours: 2 },
        ],
      },
      {
        id: 'm18',
        name: 'Miles Adams',
        records: [{ id: 'm18-r1', eventTitle: 'Winter Coat Drive', date: 'Aug 6', status: 'pending', hours: 3 }],
      },
    ],
  },
  {
    id: 'key-club-sophomore',
    name: 'Key Club — Sophomore Chapter',
    memberCount: 12,
    members: [
      {
        id: 'm19',
        name: 'Ruby Simmons',
        records: [
          { id: 'm19-r1', eventTitle: 'Blood Drive Support', date: 'Aug 8', status: 'verified', hours: 4 },
          { id: 'm19-r2', eventTitle: 'Food Pantry Sort', date: 'Jul 18', status: 'verified', hours: 3 },
        ],
      },
      {
        id: 'm20',
        name: 'Theo Marsh',
        records: [
          {
            id: 'm20-r1',
            eventTitle: 'Blood Drive Support',
            date: 'Aug 8',
            status: 'self-uploaded',
            hours: 4,
            note: "Helped with the registration table at the blood drive — wasn't checked in on the app.",
          },
          { id: 'm20-r2', eventTitle: 'Food Pantry Sort', date: 'Jul 18', status: 'pending', hours: 3 },
        ],
      },
      {
        id: 'm21',
        name: 'Ellie Dawson',
        records: [
          { id: 'm21-r1', eventTitle: 'Blood Drive Support', date: 'Aug 8', status: 'appealed' },
          { id: 'm21-r2', eventTitle: 'Food Pantry Sort', date: 'Jun 18', status: 'verified', hours: 3 },
        ],
      },
    ],
  },
];
