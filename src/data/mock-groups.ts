export type GroupMember = {
  id: string;
  name: string;
  hours: number;
};

export type MockGroup = {
  id: string;
  name: string;
  memberCount: number;
  members: GroupMember[];
  subgroupIds?: string[];
};

export const MOCK_GROUPS: MockGroup[] = [
  {
    id: 'riverside-high-key-club',
    name: 'Riverside High Key Club',
    memberCount: 42,
    subgroupIds: ['key-club-freshman', 'key-club-sophomore'],
    members: [
      { id: 'm1', name: 'Maya Torres', hours: 38 },
      { id: 'm2', name: 'Jordan Lee', hours: 31 },
      { id: 'm3', name: 'Priya Nair', hours: 27 },
      { id: 'm4', name: 'Ethan Brooks', hours: 24 },
      { id: 'm5', name: 'Sofia Ramirez', hours: 19 },
      { id: 'm6', name: 'Caleb Wright', hours: 15 },
      { id: 'm7', name: 'Ava Chen', hours: 11 },
      { id: 'm8', name: 'Noah Patel', hours: 6 },
    ],
  },
  {
    id: 'greenfuture-youth-corps',
    name: 'GreenFuture Youth Corps',
    memberCount: 18,
    members: [
      { id: 'm9', name: 'Lily Nguyen', hours: 29 },
      { id: 'm10', name: 'Owen Fisher', hours: 22 },
      { id: 'm11', name: 'Grace Kim', hours: 18 },
      { id: 'm12', name: 'Daniel Ortiz', hours: 14 },
      { id: 'm13', name: 'Zoe Bennett', hours: 9 },
      { id: 'm14', name: 'Mason Clarke', hours: 4 },
    ],
  },
  {
    id: 'key-club-freshman',
    name: 'Key Club — Freshman Chapter',
    memberCount: 15,
    members: [
      { id: 'm15', name: 'Isla Foster', hours: 12 },
      { id: 'm16', name: 'Liam Sanders', hours: 9 },
      { id: 'm17', name: 'Nora Ellis', hours: 7 },
      { id: 'm18', name: 'Miles Adams', hours: 3 },
    ],
  },
  {
    id: 'key-club-sophomore',
    name: 'Key Club — Sophomore Chapter',
    memberCount: 12,
    members: [
      { id: 'm19', name: 'Ruby Simmons', hours: 16 },
      { id: 'm20', name: 'Theo Marsh', hours: 13 },
      { id: 'm21', name: 'Ellie Dawson', hours: 8 },
    ],
  },
];
