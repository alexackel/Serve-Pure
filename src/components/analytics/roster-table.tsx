import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExportCsvButton } from '@/components/analytics/export-csv-button';
import { RosterRowCard } from '@/components/analytics/roster-row-card';
import { SectionContainer } from '@/components/analytics/section-container';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOrgRoster } from '@/hooks/use-org-roster';
import { useTheme } from '@/hooks/use-theme';
import type { RosterPage, RosterRow, RosterSortBy, RosterTag } from '@/types/analytics';

const ALL_TAGS: RosterTag[] = ['New', 'Repeat', 'Top 10%', 'Lapsed 90+ days', 'Minor'];
const PAGE_SIZE = 25;

export type RosterTableProps = {
  orgId: string;
  start: Date;
  end: Date;
  eventId: string | null;
};

export function RosterTable({ orgId, start, end, eventId }: RosterTableProps) {
  const breakpoint = useBreakpoint();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<RosterTag | null>(null);
  const [sortBy, setSortBy] = useState<RosterSortBy>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const query = useOrgRoster({ orgId, start, end, eventId, search, tagFilter, sortBy, sortDir, page, pageSize: PAGE_SIZE });

  function toggleSort(column: RosterSortBy) {
    setPage(0);
    if (sortBy === column) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, breakpoint === 'phone' && styles.toolbarPhone]}>
        <SearchBar
          placeholder="Search by name or school"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(0);
          }}
          containerStyle={styles.searchBar}
        />
        <ExportCsvButton orgId={orgId} start={start} end={end} eventId={eventId} />
      </View>

      <View style={styles.tagRow}>
        <TagChip label="All" active={tagFilter === null} onPress={() => setTagFilter(null)} />
        {ALL_TAGS.map((tag) => (
          <TagChip key={tag} label={tag} active={tagFilter === tag} onPress={() => setTagFilter(tag)} />
        ))}
      </View>

      <SectionContainer
        title="Volunteer roster"
        query={{ data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }}
        skeleton={<RosterSkeleton />}
        isEmpty={(data) => data.rows.length === 0}
        emptyState={<RosterEmptyState hasFilters={search.length > 0 || tagFilter !== null} />}>
        {(data: RosterPage) =>
          breakpoint === 'phone' ? (
            <View style={styles.cardList}>
              {data.rows.map((row) => (
                <RosterRowCard key={row.userId} row={row} />
              ))}
            </View>
          ) : (
            <RosterDesktopTable rows={data.rows} sortBy={sortBy} sortDir={sortDir} onToggleSort={toggleSort} />
          )
        }
      </SectionContainer>

      {query.data && query.data.totalCount > PAGE_SIZE && (
        <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={query.data.totalCount} onPageChange={setPage} />
      )}
    </View>
  );
}

function TagChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? theme.primary : theme.border }, active && { backgroundColor: theme.primaryTint }]}>
      <ThemedText type="label" themeColor={active ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const SORT_COLUMNS: { key: RosterSortBy; label: string; flex: number }[] = [
  { key: 'name', label: 'Name', flex: 2 },
  { key: 'hours', label: 'Verified hrs', flex: 1 },
  { key: 'last_active', label: 'Last active', flex: 1 },
  { key: 'reliability', label: 'Reliability', flex: 1 },
];

function RosterDesktopTable({
  rows,
  sortBy,
  sortDir,
  onToggleSort,
}: {
  rows: RosterRow[];
  sortBy: RosterSortBy;
  sortDir: 'asc' | 'desc';
  onToggleSort: (column: RosterSortBy) => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: theme.border }]}>
          {SORT_COLUMNS.map((column) => (
            <Pressable key={column.key} onPress={() => onToggleSort(column.key)} style={[styles.tableCell, { flex: column.flex, minWidth: 140 }]}>
              <View style={styles.sortableHeader}>
                <ThemedText type="label" themeColor="textSecondary">
                  {column.label}
                </ThemedText>
                {sortBy === column.key && (
                  <Ionicons name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textSecondary} />
                )}
              </View>
            </Pressable>
          ))}
          <View style={[styles.tableCell, { flex: 2, minWidth: 180 }]}>
            <ThemedText type="label" themeColor="textSecondary">
              Tags
            </ThemedText>
          </View>
        </View>

        {rows.map((row) => (
          <View key={row.userId} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.tableCell, { flex: 2, minWidth: 140 }]}>
              <ThemedText type="bodyBold" numberOfLines={1}>
                {row.fullName}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {[row.ageBracket, row.school, ...row.groupNames].filter(Boolean).join(' · ') || '—'}
              </ThemedText>
            </View>
            <View style={[styles.tableCell, { flex: 1, minWidth: 140 }]}>
              <ThemedText type="body" themeColor="success">
                {row.verifiedHours}h
              </ThemedText>
              <ThemedText type="caption" themeColor="warning">
                {row.pendingHours}h pending
              </ThemedText>
            </View>
            <View style={[styles.tableCell, { flex: 1, minWidth: 140 }]}>
              <ThemedText type="body">{row.lastActiveDate ?? '—'}</ThemedText>
            </View>
            <View style={[styles.tableCell, { flex: 1, minWidth: 140 }]}>
              <ThemedText type="body">{row.reliabilityScore === null ? '—' : `${row.reliabilityScore}/5`}</ThemedText>
            </View>
            <View style={[styles.tableCell, styles.tagCell, { flex: 2, minWidth: 180 }]}>
              {row.tags.map((tag) => (
                <View key={tag} style={[styles.miniTag, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="label" themeColor="textSecondary">
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const theme = useTheme();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <View style={styles.pagination}>
      <Pressable onPress={() => onPageChange(page - 1)} disabled={page === 0} style={styles.pageButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={page === 0 ? theme.border : theme.primary} />
      </Pressable>
      <ThemedText type="caption" themeColor="textSecondary">
        Page {page + 1} of {totalPages}
      </ThemedText>
      <Pressable onPress={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages} style={styles.pageButton} hitSlop={8}>
        <Ionicons name="chevron-forward" size={18} color={page + 1 >= totalPages ? theme.border : theme.primary} />
      </Pressable>
    </View>
  );
}

function RosterSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.skeletonRow, { backgroundColor: theme.backgroundElement }]} />
      ))}
    </View>
  );
}

function RosterEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="body" themeColor="textSecondary">
        {hasFilters ? 'No volunteers match this search or filter.' : 'No volunteers have logged activity for this range yet.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  toolbarPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchBar: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  cardList: {
    gap: Spacing.two,
  },
  table: {
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    paddingBottom: Spacing.one,
  },
  tableCell: {
    paddingVertical: Spacing.two,
    paddingRight: Spacing.two,
    gap: Spacing.half,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  tagCell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  miniTag: {
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  pageButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonList: {
    gap: Spacing.two,
  },
  skeletonRow: {
    height: 48,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
});
