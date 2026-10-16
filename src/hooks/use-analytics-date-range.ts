import { useMemo, useState } from 'react';

import { addDays, addMonths, startOfDay } from '@/utils/dates';

export type DateRangePreset = '7d' | '30d' | '90d' | '12m' | 'custom';

export const DATE_RANGE_PRESETS: readonly { key: DateRangePreset; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '12m', label: '12M' },
  { key: 'custom', label: 'Custom' },
];

export type AnalyticsDateRange = {
  preset: DateRangePreset;
  start: Date;
  end: Date;
};

function resolvePresetRange(preset: DateRangePreset, now: Date): { start: Date; end: Date } {
  const end = startOfDay(now);
  switch (preset) {
    case '7d':
      return { start: addDays(end, -6), end };
    case '30d':
      return { start: addDays(end, -29), end };
    case '90d':
      return { start: addDays(end, -89), end };
    case '12m':
      return { start: addMonths(end, -12), end };
    case 'custom':
      return { start: end, end };
  }
}

export function useAnalyticsDateRange(initialPreset: DateRangePreset = '30d') {
  const [preset, setPreset] = useState<DateRangePreset>(initialPreset);
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  const range: AnalyticsDateRange = useMemo(() => {
    if (preset === 'custom' && customRange) {
      return { preset, start: customRange.start, end: customRange.end };
    }
    const { start, end } = resolvePresetRange(preset, new Date());
    return { preset, start, end };
  }, [preset, customRange]);

  function selectPreset(next: DateRangePreset) {
    setPreset(next);
  }

  function selectCustomRange(start: Date, end: Date) {
    setCustomRange({ start: startOfDay(start), end: startOfDay(end) });
    setPreset('custom');
  }

  return { range, selectPreset, selectCustomRange };
}
