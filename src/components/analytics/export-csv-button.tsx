import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { fetchOrgRoster, fetchOrgRosterExport } from '@/data/analytics';
import { useTheme } from '@/hooks/use-theme';
import type { RosterExportRow } from '@/types/analytics';
import { toCsv, type CsvColumn } from '@/utils/csv';
import { formatISODate } from '@/utils/dates';

const EXPORT_COLUMNS: CsvColumn<RosterExportRow>[] = [
  { header: 'Name', value: (row) => row.fullName },
  { header: 'Is minor', value: (row) => (row.isMinor ? 'Yes' : 'No') },
  { header: 'Contact email', value: (row) => row.contactEmail },
  { header: 'Contact phone', value: (row) => row.contactPhone },
  { header: 'Age bracket', value: (row) => row.ageBracket },
  { header: 'School/group (self-reported)', value: (row) => row.school },
  { header: 'Groups', value: (row) => row.groupNames.join('; ') },
  { header: 'First active', value: (row) => row.firstActiveDate },
  { header: 'Last active', value: (row) => row.lastActiveDate },
  { header: 'Verified hours', value: (row) => row.verifiedHours },
  { header: 'Pending hours', value: (row) => row.pendingHours },
  { header: 'Events attended', value: (row) => row.eventsAttended },
  { header: 'Reliability score', value: (row) => row.reliabilityScore },
  { header: 'Tags', value: (row) => row.tags.join('; ') },
];

function downloadOnWeb(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function shareOnNative(csv: string, filename: string) {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export volunteer roster' });
}

export function ExportCsvButton({ orgId, start, end, eventId }: { orgId: string; start: Date; end: Date; eventId: string | null }) {
  const theme = useTheme();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [note, setNote] = useState<string | null>(null);

  async function handlePress() {
    setState('loading');
    setNote(null);
    try {
      // The export RPC only ever returns consenting rows, so it can't supply
      // its own denominator — a tiny unfiltered page-1 roster call gets the
      // true total (independent of whatever search/tag filter the table
      // currently has applied) for the "N of M" note below.
      const [rows, totalRoster] = await Promise.all([
        fetchOrgRosterExport({ orgId, start, end, eventId }),
        fetchOrgRoster({ orgId, start, end, eventId, page: 0, pageSize: 1 }),
      ]);
      const csv = toCsv(rows, EXPORT_COLUMNS);
      const filename = `volunteer-roster-${formatISODate(start)}-to-${formatISODate(end)}.csv`;

      if (Platform.OS === 'web') {
        downloadOnWeb(csv, filename);
      } else {
        await shareOnNative(csv, filename);
      }

      setNote(`${rows.length} of ${totalRoster.totalCount} volunteers have shared contact info.`);
      setState('idle');
    } catch {
      setState('error');
      setNote('Could not export the roster. Try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={state === 'loading'}
        style={[styles.button, { borderColor: theme.border }]}
        accessibilityRole="button"
        accessibilityLabel="Export roster as CSV">
        {state === 'loading' ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="download-outline" size={16} color={theme.primary} />
        )}
        <ThemedText type="bodyBold" themeColor="primary">
          Export CSV
        </ThemedText>
      </Pressable>
      {note && (
        <ThemedText type="caption" themeColor={state === 'error' ? 'error' : 'textSecondary'}>
          {note}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
});
