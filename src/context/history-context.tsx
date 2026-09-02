import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { formatShortDate } from '@/utils/dates';

export type HistoryStatus =
  | 'verified'
  | 'pending'
  | 'self-uploaded'
  | 'admin-approved'
  | 'no-show'
  | 'appealed'
  | 'cancelled';

export type HistoryRecord = {
  id: string;
  organization: string;
  date: string;
  status: HistoryStatus;
  hours?: number;
  hasPhoto?: boolean;
  likes?: number;
  note?: string;
};

// Kept most-recent-first: the seed list is authored newest-to-oldest, and new
// cancellations are always "now" so they're safe to prepend. The reliability
// score's "last 10" window relies on this ordering.
const SEED_HISTORY_RECORDS: HistoryRecord[] = [
  {
    id: 'h1',
    organization: 'GreenFuture Coalition',
    hours: 3,
    date: 'Aug 24',
    status: 'verified',
    hasPhoto: true,
    likes: 12,
  },
  {
    id: 'h2',
    organization: 'Northside Food Bank',
    hours: 4,
    date: 'Aug 20',
    status: 'verified',
    hasPhoto: false,
    likes: 6,
  },
  {
    id: 'h3',
    organization: 'Central Public Library',
    hours: 2,
    date: 'Aug 18',
    status: 'pending',
    hasPhoto: false,
    likes: 2,
  },
  {
    id: 'h4',
    organization: 'Riverside Youth Center',
    hours: 5,
    date: 'Aug 12',
    status: 'self-uploaded',
    hasPhoto: true,
    likes: 9,
  },
  {
    id: 'h5',
    organization: 'Coastal Guardians',
    hours: 3,
    date: 'Aug 6',
    status: 'verified',
    hasPhoto: true,
    likes: 15,
  },
  {
    id: 'h6',
    organization: 'Maple Grove Senior Center',
    hours: 3,
    date: 'Jul 30',
    status: 'pending',
    hasPhoto: false,
    likes: 1,
  },
  {
    id: 'h7',
    organization: 'Blue Ridge Trail Alliance',
    hours: 4,
    date: 'Jul 22',
    status: 'self-uploaded',
    hasPhoto: false,
    likes: 3,
  },
  {
    id: 'h8',
    organization: 'Furry Friends Rescue',
    hours: 5,
    date: 'Jul 14',
    status: 'verified',
    hasPhoto: true,
    likes: 18,
  },
  {
    id: 'h9',
    organization: 'Riverside Youth Center',
    date: 'Jul 5',
    status: 'no-show',
  },
  {
    id: 'h10',
    organization: 'Central Public Library',
    date: 'Jun 28',
    status: 'appealed',
  },
];

const RELIABILITY_WINDOW = 10;
const ZERO_POINT_STATUSES = new Set<HistoryStatus>(['no-show', 'appealed', 'cancelled']);

function computeReliabilityScore(records: HistoryRecord[]) {
  if (records.length === 0) {
    return 5;
  }

  const recent = records.slice(0, RELIABILITY_WINDOW);
  const points = recent.reduce((sum, record) => sum + (ZERO_POINT_STATUSES.has(record.status) ? 0 : 1), 0);

  return (points / recent.length) * 5;
}

type HistoryContextValue = {
  records: HistoryRecord[];
  addCancellationRecord: (organization: string, timeLabel: string) => void;
  reliabilityScore: number;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<HistoryRecord[]>(SEED_HISTORY_RECORDS);

  const addCancellationRecord = useCallback((organization: string, timeLabel: string) => {
    setRecords((current) => [
      {
        id: `cancelled-${Date.now()}`,
        organization,
        date: formatShortDate(new Date()),
        status: 'cancelled',
        note: `You cancelled your registration for ${organization} at ${timeLabel}`,
      },
      ...current,
    ]);
  }, []);

  const reliabilityScore = useMemo(() => computeReliabilityScore(records), [records]);

  const value = useMemo(
    () => ({ records, addCancellationRecord, reliabilityScore }),
    [records, addCancellationRecord, reliabilityScore],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
