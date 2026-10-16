import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { HoursTrendChart, HoursTrendEmptyState, HoursTrendSkeleton } from '@/components/analytics/hours-trend-chart';
import { KpiRow, KpiRowSkeleton } from '@/components/analytics/kpi-row';
import { RosterTable } from '@/components/analytics/roster-table';
import { SectionContainer } from '@/components/analytics/section-container';
import { StickyHeader } from '@/components/analytics/sticky-header';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { AnalyticsMaxContentWidth, Spacing } from '@/constants/theme';
import { useOrganization } from '@/context/organization-context';
import { useAnalyticsDateRange } from '@/hooks/use-analytics-date-range';
import { useOrgAnalyticsKpis } from '@/hooks/use-org-analytics-kpis';
import { useOrgEventOptions } from '@/hooks/use-org-event-options';
import { useOrgHoursTrend } from '@/hooks/use-org-hours-trend';

export default function OrgAnalyticsScreen() {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?.id ?? null;

  const { range, selectPreset, selectCustomRange } = useAnalyticsDateRange();
  const [eventId, setEventId] = useState<string | null>(null);

  const { data: events } = useOrgEventOptions(orgId);
  const kpisQuery = useOrgAnalyticsKpis(orgId, range.start, range.end, eventId);
  const hoursTrendQuery = useOrgHoursTrend(orgId, range.start, range.end, eventId);

  if (!activeOrganization) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          Analytics
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          You don&apos;t admin any organizations yet.
        </ThemedText>
      </ScreenScrollView>
    );
  }

  if (events && events.length === 0) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          Analytics
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Post your first event to see data here.
        </ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView containerStyle={[styles.container, { maxWidth: AnalyticsMaxContentWidth }]}>
      <ThemedText type="h1" style={styles.pageTitle}>
        Analytics
      </ThemedText>

      <StickyHeader
        orgId={activeOrganization.id}
        preset={range.preset}
        onSelectPreset={selectPreset}
        onSelectCustomRange={selectCustomRange}
        selectedEventId={eventId}
        onSelectEvent={setEventId}
      />

      <SectionContainer
        title="Overview"
        query={{ data: kpisQuery.data, isLoading: kpisQuery.isLoading, isError: kpisQuery.isError, refetch: kpisQuery.refetch }}
        skeleton={<KpiRowSkeleton />}>
        {(kpis) => <KpiRow kpis={kpis} />}
      </SectionContainer>

      <SectionContainer
        title="Hours over time"
        subtitle="Verified vs. pending hours for the selected range"
        query={{
          data: hoursTrendQuery.data,
          isLoading: hoursTrendQuery.isLoading,
          isError: hoursTrendQuery.isError,
          refetch: hoursTrendQuery.refetch,
        }}
        skeleton={<HoursTrendSkeleton />}
        isEmpty={(data) => data.length === 0 || data.every((point) => point.verifiedHours === 0 && point.pendingHours === 0)}
        emptyState={<HoursTrendEmptyState />}>
        {(data) => <HoursTrendChart data={data} />}
      </SectionContainer>

      <RosterTable orgId={activeOrganization.id} start={range.start} end={range.end} eventId={eventId} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.one,
  },
});
