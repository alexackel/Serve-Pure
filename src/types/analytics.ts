export type AnalyticsKpis = {
  currentHoursVerified: number;
  currentHoursPending: number;
  previousHoursVerified: number;
  previousHoursPending: number;
  volunteerHourRate: number;
  currentActiveVolunteers: number;
  previousActiveVolunteers: number;
  retentionRate: number | null;
  currentCheckedIn: number;
  currentSignedUp: number;
  previousCheckedIn: number;
  previousSignedUp: number;
  pendingVerificationsCount: number;
};

export type HoursTrendBucketGranularity = 'day' | 'week' | 'month';

export type HoursTrendPoint = {
  bucketStart: string; // ISO date (YYYY-MM-DD)
  bucketGranularity: HoursTrendBucketGranularity;
  verifiedHours: number;
  pendingHours: number;
};

export type RosterTag = 'Minor' | 'New' | 'Repeat' | 'Top 10%' | 'Lapsed 90+ days';

export type RosterSortBy = 'name' | 'hours' | 'last_active' | 'reliability';
export type RosterSortDir = 'asc' | 'desc';

export type RosterRow = {
  userId: string;
  fullName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  ageBracket: string | null;
  school: string | null;
  groupNames: string[];
  firstActiveDate: string | null;
  lastActiveDate: string | null;
  verifiedHours: number;
  pendingHours: number;
  eventsAttended: number;
  reliabilityScore: number | null;
  tags: RosterTag[];
};

export type RosterPage = {
  rows: RosterRow[];
  totalCount: number;
};

export type RosterExportRow = {
  fullName: string;
  isMinor: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  ageBracket: string | null;
  school: string | null;
  groupNames: string[];
  firstActiveDate: string | null;
  lastActiveDate: string | null;
  verifiedHours: number;
  pendingHours: number;
  eventsAttended: number;
  reliabilityScore: number | null;
  tags: RosterTag[];
};

export type AnalyticsEventOption = {
  id: string;
  title: string;
};
