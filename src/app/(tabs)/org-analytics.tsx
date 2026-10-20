import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ActiveNewTrendChart, ActiveNewTrendEmptyState, ActiveNewTrendSkeleton } from '@/components/analytics/active-new-trend-chart';
import { AvgTimeToVerifySkeleton, AvgTimeToVerifyStat } from '@/components/analytics/avg-time-to-verify-stat';
import { FillNoShowChart, FillNoShowEmptyState, FillNoShowSkeleton } from '@/components/analytics/fill-noshow-chart';
import { HoursTrendChart, HoursTrendEmptyState, HoursTrendSkeleton } from '@/components/analytics/hours-trend-chart';
import { KpiRow, KpiRowSkeleton } from '@/components/analytics/kpi-row';
import { NewReturningDonut, NewReturningEmptyState, NewReturningSkeleton } from '@/components/analytics/new-returning-donut';
import { RecruitmentFunnelChart, RecruitmentFunnelEmptyState, RecruitmentFunnelSkeleton } from '@/components/analytics/recruitment-funnel-chart';
import { RosterTable } from '@/components/analytics/roster-table';
import { SectionContainer } from '@/components/analytics/section-container';
import { StickyHeader } from '@/components/analytics/sticky-header';
import { TopEventsChart, TopEventsEmptyState, TopEventsSkeleton } from '@/components/analytics/top-events-chart';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { AnalyticsMaxContentWidth, Spacing } from '@/constants/theme';
import { useOrganization } from '@/context/organization-context';
import { useAnalyticsDateRange } from '@/hooks/use-analytics-date-range';
import { useOrgActiveNewTrend } from '@/hooks/use-org-active-new-trend';
import { useOrgAnalyticsKpis } from '@/hooks/use-org-analytics-kpis';
import { useOrgAvgTimeToVerify } from '@/hooks/use-org-avg-time-to-verify';
import { useOrgEventOptions } from '@/hooks/use-org-event-options';
import { useOrgFillNoShowRates } from '@/hooks/use-org-fill-noshow-rates';
import { useOrgHoursTrend } from '@/hooks/use-org-hours-trend';
import { useOrgNewReturningSplit } from '@/hooks/use-org-new-returning-split';
import { useOrgRecruitmentFunnel } from '@/hooks/use-org-recruitment-funnel';
import { useOrgTopEvents } from '@/hooks/use-org-top-events';

export default function OrgAnalyticsScreen() {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?.id ?? null;

  const { range, selectPreset, selectCustomRange } = useAnalyticsDateRange();
  const [eventId, setEventId] = useState<string | null>(null);

  const { data: events } = useOrgEventOptions(orgId);
  const kpisQuery = useOrgAnalyticsKpis(orgId, range.start, range.end, eventId);
  const hoursTrendQuery = useOrgHoursTrend(orgId, range.start, range.end, eventId);
  const activeNewTrendQuery = useOrgActiveNewTrend(orgId, range.start, range.end, eventId);
  const newReturningSplitQuery = useOrgNewReturningSplit(orgId, range.start, range.end, eventId);
  const recruitmentFunnelQuery = useOrgRecruitmentFunnel(orgId, range.start, range.end, eventId);
  const topEventsQuery = useOrgTopEvents(orgId, range.start, range.end, eventId);
  const fillNoShowQuery = useOrgFillNoShowRates(orgId, range.start, range.end, eventId);
  const avgTimeToVerifyQuery = useOrgAvgTimeToVerify(orgId, range.start, range.end, eventId);

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
        title="Active vs. new volunteers"
        query={{
          data: activeNewTrendQuery.data,
          isLoading: activeNewTrendQuery.isLoading,
          isError: activeNewTrendQuery.isError,
          refetch: activeNewTrendQuery.refetch,
        }}
        skeleton={<ActiveNewTrendSkeleton />}
        isEmpty={(data) => data.length === 0 || data.every((point) => point.newVolunteers === 0 && point.returningVolunteers === 0)}
        emptyState={<ActiveNewTrendEmptyState />}>
        {(data) => <ActiveNewTrendChart data={data} />}
      </SectionContainer>

      <SectionContainer
        title="New vs. returning"
        query={{
          data: newReturningSplitQuery.data,
          isLoading: newReturningSplitQuery.isLoading,
          isError: newReturningSplitQuery.isError,
          refetch: newReturningSplitQuery.refetch,
        }}
        skeleton={<NewReturningSkeleton />}
        isEmpty={(data) => data.newVolunteers === 0 && data.returningVolunteers === 0}
        emptyState={<NewReturningEmptyState />}>
        {(split) => <NewReturningDonut split={split} />}
      </SectionContainer>

      <SectionContainer
        title="Recruitment funnel"
        subtitle="Signups this range, tracked through to verified hours"
        query={{
          data: recruitmentFunnelQuery.data,
          isLoading: recruitmentFunnelQuery.isLoading,
          isError: recruitmentFunnelQuery.isError,
          refetch: recruitmentFunnelQuery.refetch,
        }}
        skeleton={<RecruitmentFunnelSkeleton />}
        isEmpty={(data) => data.every((stage) => stage.volunteerCount === 0)}
        emptyState={<RecruitmentFunnelEmptyState />}>
        {(stages) => <RecruitmentFunnelChart stages={stages} />}
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

      <SectionContainer
        title="Top events"
        subtitle="Ranked by verified hours for the selected range"
        query={{
          data: topEventsQuery.data,
          isLoading: topEventsQuery.isLoading,
          isError: topEventsQuery.isError,
          refetch: topEventsQuery.refetch,
        }}
        skeleton={<TopEventsSkeleton />}
        isEmpty={(data) => data.length === 0}
        emptyState={<TopEventsEmptyState />}>
        {(events) => <TopEventsChart events={events} />}
      </SectionContainer>

      <SectionContainer
        title="Fill / no-show rate"
        query={{
          data: fillNoShowQuery.data,
          isLoading: fillNoShowQuery.isLoading,
          isError: fillNoShowQuery.isError,
          refetch: fillNoShowQuery.refetch,
        }}
        skeleton={<FillNoShowSkeleton />}
        isEmpty={(data) => data.fillRate === null && data.noShowRate === null}
        emptyState={<FillNoShowEmptyState />}>
        {(rates) => <FillNoShowChart rates={rates} />}
      </SectionContainer>

      <SectionContainer
        title="Avg. time to verify"
        query={{
          data: avgTimeToVerifyQuery.data,
          isLoading: avgTimeToVerifyQuery.isLoading,
          isError: avgTimeToVerifyQuery.isError,
          refetch: avgTimeToVerifyQuery.refetch,
        }}
        skeleton={<AvgTimeToVerifySkeleton />}>
        {(stat) => <AvgTimeToVerifyStat stat={stat} />}
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
