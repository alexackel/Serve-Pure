import { CURRENT_USER } from '@/data/current-user';

export type MockUser = {
  id: string;
  name: string;
  verified?: boolean;
};

// The single source of truth for "who is this person" across the app —
// group members, org-reported volunteers, feed posters, and event
// registrants all reference these ids rather than carrying their own
// name/verified copies, so a person's identity can't drift between screens.
const NAMED_USERS: MockUser[] = [
  CURRENT_USER,
  { id: 'm1', name: 'Maya Torres', verified: true },
  { id: 'm2', name: 'Jordan Lee', verified: false },
  { id: 'm3', name: 'Priya Nair', verified: true },
  { id: 'm4', name: 'Ethan Brooks', verified: false },
  { id: 'm5', name: 'Sofia Ramirez', verified: false },
  { id: 'm6', name: 'Caleb Wright', verified: true },
  { id: 'm7', name: 'Ava Chen', verified: false },
  { id: 'm8', name: 'Noah Patel', verified: false },
  { id: 'm9', name: 'Lily Nguyen', verified: true },
  { id: 'm10', name: 'Owen Fisher', verified: false },
  { id: 'm11', name: 'Grace Kim', verified: true },
  { id: 'm12', name: 'Daniel Ortiz', verified: false },
  { id: 'm13', name: 'Zoe Bennett', verified: false },
  { id: 'm14', name: 'Mason Clarke', verified: false },
  { id: 'm15', name: 'Isla Foster', verified: true },
  { id: 'm16', name: 'Liam Sanders', verified: false },
  { id: 'm17', name: 'Nora Ellis', verified: false },
  { id: 'm18', name: 'Miles Adams', verified: false },
  { id: 'm19', name: 'Ruby Simmons', verified: true },
  { id: 'm20', name: 'Theo Marsh', verified: false },
  { id: 'm21', name: 'Ellie Dawson', verified: false },
  { id: 'jordan-ruiz', name: 'Jordan Ruiz', verified: true },
  { id: 'sam-okafor', name: 'Sam Okafor', verified: false },
  { id: 'casey-lin', name: 'Casey Lin', verified: true },
  { id: 'morgan-diaz', name: 'Morgan Diaz', verified: false },
];

const FIRST_NAMES = ['Alex', 'Jamie', 'Taylor', 'Riley', 'Skyler', 'Rowan', 'Emerson', 'Hayden', 'Kendall', 'Quinn'];
const LAST_NAMES = ['Bailey', 'Reed', 'Hayes', 'Coleman', 'Barrett', 'Nolan', 'Pierce', 'Sutton', 'Vance', 'Griffin'];

// Event registrant rosters can run into the dozens — this generic pool means
// we don't have to hand-author a name for every seat at a 25-person cleanup.
function generateVolunteerPool(count: number): MockUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `vol-${i + 1}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
    verified: i % 3 === 0,
  }));
}

export const MOCK_USERS: MockUser[] = [...NAMED_USERS, ...generateVolunteerPool(30)];

export function getUser(id: string): MockUser | undefined {
  return MOCK_USERS.find((user) => user.id === id);
}
