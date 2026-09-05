import type { EventStatus } from '@/components/cards/event-card';

export type EventRequirements = {
  age?: string;
  skills?: string;
  physical?: string;
  whatToBring?: string;
};

export type EventDetail = {
  id: string;
  title: string;
  organization: string;
  organizationId?: string;
  organizationVerified?: boolean;
  category?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  location: string;
  description?: string;
  requirements?: EventRequirements;
  contactInfo?: string;
  website?: string;
  volunteers?: number;
  maxVolunteers?: number;
  status: EventStatus;
  // Optional: every Find-tab mock event has these populated, but events
  // created ad hoc elsewhere (e.g. org-history-context's self-report flow)
  // may not have coordinates/a recurrence yet. Filter/sort logic treats a
  // missing value as "unknown" rather than crashing.
  latitude?: number;
  longitude?: number;
  postedAt?: string;
  recurring?: boolean;
};

export const MOCK_EVENTS: EventDetail[] = [
  {
    id: 'riverside-park-cleanup',
    title: 'Riverside Park Cleanup',
    organization: 'GreenFuture Coalition',
    organizationId: 'greenfuture-coalition',
    organizationVerified: true,
    category: 'Environment',
    date: 'Sep 6',
    startTime: '9:00 AM',
    endTime: '12:00 PM',
    hours: 3,
    location: 'Riverside Park, 400 River Rd',
    description:
      'Join us for a community cleanup along the riverside trail. We\'ll be picking up litter, clearing invasive plants, and helping keep the park beautiful for everyone. Great for first-time volunteers!',
    requirements: {
      age: '12+ (under 16 must be accompanied by a guardian)',
      physical: 'Light — walking and bending required',
      whatToBring: 'Water bottle, closed-toe shoes, sun protection',
    },
    contactInfo: 'volunteer@greenfuturecoalition.org',
    website: 'https://greenfuturecoalition.org',
    volunteers: 11,
    maxVolunteers: 20,
    status: 'available',
    latitude: 37.7694,
    longitude: -122.4862,
    postedAt: '2026-08-30T14:00:00Z',
    recurring: false,
  },
  {
    id: 'community-garden-planting',
    title: 'Community Garden Planting',
    organization: 'GreenFuture Coalition',
    organizationId: 'greenfuture-coalition',
    organizationVerified: true,
    category: 'Environment',
    date: 'Sep 20',
    startTime: '9:00 AM',
    endTime: '12:00 PM',
    hours: 3,
    location: 'Riverside Park, 400 River Rd',
    description: 'Planted native species and set up raised beds for the new community garden plot.',
    contactInfo: 'volunteer@greenfuturecoalition.org',
    website: 'https://greenfuturecoalition.org',
    volunteers: 14,
    maxVolunteers: 14,
    status: 'full',
    latitude: 37.7694,
    longitude: -122.4862,
    postedAt: '2026-07-20T10:00:00Z',
    recurring: true,
  },
  {
    id: 'food-bank-sorting',
    title: 'Food Bank Sorting',
    organization: 'Northside Food Bank',
    organizationVerified: true,
    category: 'Community',
    date: 'Sep 12',
    startTime: '1:00 PM',
    endTime: '5:00 PM',
    hours: 4,
    location: 'Northside Food Bank, 88 Warehouse Ave',
    description:
      'Help sort and pack donated food items for distribution to families across the county. Indoor work in our main warehouse.',
    requirements: {
      age: '14+',
      skills: 'None required — training provided on arrival',
      whatToBring: 'Closed-toe shoes',
    },
    contactInfo: '(555) 201-4488',
    website: 'https://northsidefoodbank.org',
    volunteers: 8,
    maxVolunteers: 8,
    status: 'full',
    latitude: 37.7849,
    longitude: -122.4094,
    postedAt: '2026-09-01T09:00:00Z',
    recurring: true,
  },
  {
    id: 'animal-shelter-adoption-day',
    title: 'Animal Shelter Adoption Day',
    organization: 'Furry Friends Rescue',
    category: 'Animals',
    date: 'Sep 27',
    hours: 5,
    location: 'Furry Friends Rescue',
    description:
      'Support our monthly adoption event — greet visitors, walk dogs for meet-and-greets, and help with setup and cleanup.',
    volunteers: 4,
    maxVolunteers: 12,
    status: 'available',
    latitude: 37.7295,
    longitude: -122.39,
    postedAt: '2026-08-15T12:00:00Z',
    recurring: true,
  },
  {
    id: 'library-reading-buddies',
    title: 'Library Reading Buddies',
    organization: 'Central Public Library',
    organizationVerified: true,
    category: 'Education',
    date: 'Sep 15',
    startTime: '3:30 PM',
    endTime: '5:30 PM',
    hours: 2,
    location: 'Central Public Library, Children\'s Wing',
    description: 'Read one-on-one with young kids to build their confidence and love of reading.',
    requirements: {
      age: '16+',
      skills: 'Comfortable reading aloud to children',
    },
    contactInfo: 'programs@centralpubliclibrary.org',
    volunteers: 6,
    maxVolunteers: 6,
    status: 'full',
    latitude: 37.7793,
    longitude: -122.4193,
    postedAt: '2026-08-25T16:00:00Z',
    recurring: true,
  },
  {
    id: 'trail-restoration-day',
    title: 'Trail Restoration Day',
    organization: 'Parks Conservancy',
    category: 'Environment',
    date: 'Oct 3',
    hours: 2,
    location: 'Blue Ridge Trailhead',
    volunteers: 11,
    maxVolunteers: 13,
    status: 'available',
    latitude: 37.8199,
    longitude: -122.5606,
    postedAt: '2026-07-28T08:00:00Z',
    recurring: false,
  },
  {
    id: 'senior-center-tech-help',
    title: 'Senior Center Tech Help',
    organization: 'Maple Grove Senior Center',
    organizationVerified: true,
    category: 'Seniors',
    date: 'Sep 22',
    startTime: '10:00 AM',
    endTime: '1:00 PM',
    hours: 3,
    location: 'Maple Grove Senior Center',
    description: 'Help residents with smartphones, tablets, and video calls with family.',
    requirements: {
      skills: 'Patience and basic tech familiarity',
      physical: 'Minimal — mostly seated',
    },
    contactInfo: 'volunteers@maplegroveseniors.org',
    website: 'https://maplegroveseniors.org',
    volunteers: 3,
    maxVolunteers: 10,
    status: 'available',
    latitude: 37.7599,
    longitude: -122.4148,
    postedAt: '2026-08-05T11:00:00Z',
    recurring: true,
  },
  {
    id: 'beach-cleanup',
    title: 'Beach Cleanup',
    organization: 'Coastal Guardians',
    category: 'Environment',
    date: 'Oct 10',
    hours: 3,
    location: 'Sunset Beach',
    volunteers: 25,
    maxVolunteers: 25,
    status: 'full',
    latitude: 37.7594,
    longitude: -122.5107,
    postedAt: '2026-07-10T13:00:00Z',
    recurring: false,
  },
];
