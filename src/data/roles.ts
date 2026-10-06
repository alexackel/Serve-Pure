export type Role = {
  id: string;
  title: string;
  organization: string;
  location: string;
  hoursPerWeek: number;
  paid?: boolean;
  description?: string;
};

// Sample data until roles have a backing table (see plan: no migration yet).
export const SAMPLE_ROLES: Role[] = [
  {
    id: 'weekly-food-pantry-assistant',
    title: 'Weekly Food Pantry Assistant',
    organization: 'Northside Food Bank',
    location: 'Northside Food Bank',
    hoursPerWeek: 3,
    description: 'Sort and stock donations, and help families check out on distribution days.',
  },
  {
    id: 'peer-tutoring-coordinator',
    title: 'Peer Tutoring Coordinator',
    organization: 'Central Public Library',
    location: 'Central Public Library',
    hoursPerWeek: 4,
    paid: true,
    description: 'Schedule student tutors, match them with learners, and keep session records.',
  },
  {
    id: 'trail-maintenance-crew-lead',
    title: 'Trail Maintenance Crew Lead',
    organization: 'Parks Conservancy',
    location: 'Blue Ridge Trailhead',
    hoursPerWeek: 5,
    paid: true,
    description: 'Lead weekend crews clearing brush, repairing drainage, and marking trail sections.',
  },
  {
    id: 'animal-shelter-regular-volunteer',
    title: 'Animal Shelter Regular Volunteer',
    organization: 'Furry Friends Rescue',
    location: 'Furry Friends Rescue',
    hoursPerWeek: 2,
    description: 'Walk dogs, clean kennels, and socialize cats during open shelter hours.',
  },
];

export function getRole(id: string): Role | undefined {
  return SAMPLE_ROLES.find((role) => role.id === id);
}
