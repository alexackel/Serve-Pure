import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { KpiCard } from '@/components/analytics/kpi-card';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';
import type { AnalyticsKpis } from '@/types/analytics';
import { abbreviateNumber, formatCurrencyAbbreviated, formatPercent, formatSignedDelta } from '@/utils/format-number';

export function KpiRow({ kpis }: { kpis: AnalyticsKpis }) {
  const breakpoint = useBreakpoint();

  const totalHours = kpis.currentHoursVerified + kpis.currentHoursPending;
  const previousTotalHours = kpis.previousHoursVerified + kpis.previousHoursPending;
  const valueOfTime = kpis.currentHoursVerified * kpis.volunteerHourRate;
  const previousValueOfTime = kpis.previousHoursVerified * kpis.volunteerHourRate;
  const currentAttendanceRate = kpis.currentSignedUp === 0 ? null : (kpis.currentCheckedIn / kpis.currentSignedUp) * 100;
  const previousAttendanceRate = kpis.previousSignedUp === 0 ? null : (kpis.previousCheckedIn / kpis.previousSignedUp) * 100;

  const cards = [
    <KpiCard
      key="total-hours"
      label="Total hours"
      value={abbreviateNumber(totalHours)}
      icon="time-outline"
      delta={formatSignedDelta(totalHours, previousTotalHours)}
      breakdown={[
        { label: 'verified', value: abbreviateNumber(kpis.currentHoursVerified), color: 'success' },
        { label: 'pending', value: abbreviateNumber(kpis.currentHoursPending), color: 'warning' },
      ]}
    />,
    <KpiCard
      key="value-of-time"
      label="Value of time"
      value={formatCurrencyAbbreviated(valueOfTime)}
      icon="cash-outline"
      delta={formatSignedDelta(valueOfTime, previousValueOfTime)}
    />,
    <KpiCard
      key="active-volunteers"
      label="Active volunteers"
      value={abbreviateNumber(kpis.currentActiveVolunteers)}
      icon="people-outline"
      delta={formatSignedDelta(kpis.currentActiveVolunteers, kpis.previousActiveVolunteers)}
    />,
    <KpiCard
      key="retention-rate"
      label="Retention rate"
      value={formatPercent(kpis.retentionRate)}
      icon="repeat-outline"
    />,
    <KpiCard
      key="attendance-rate"
      label="Attendance rate"
      value={formatPercent(currentAttendanceRate)}
      icon="checkmark-circle-outline"
      delta={
        currentAttendanceRate !== null && previousAttendanceRate !== null
          ? formatSignedDelta(currentAttendanceRate, previousAttendanceRate)
          : undefined
      }
    />,
    <KpiCard
      key="pending-verifications"
      label="Pending verifications"
      value={abbreviateNumber(kpis.pendingVerificationsCount)}
      icon="hourglass-outline"
      goodDirection="down"
      onPress={() => router.push('/org-you')}
    />,
  ];

  if (breakpoint === 'phone') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phoneRow} decelerationRate="fast" snapToInterval={176}>
        {cards.map((card, index) => (
          <View key={index} style={styles.phoneCardSlot}>
            {card}
          </View>
        ))}
      </ScrollView>
    );
  }

  const columns = breakpoint === 'desktop' ? 4 : 2;
  const basisPercent = `${100 / columns}%` as const;

  return (
    <View style={styles.grid}>
      {cards.map((card, index) => (
        <View key={index} style={[styles.gridSlot, { flexBasis: basisPercent }]}>
          {card}
        </View>
      ))}
    </View>
  );
}

export function KpiRowSkeleton() {
  const breakpoint = useBreakpoint();
  const theme = useTheme();
  const columns = breakpoint === 'desktop' ? 4 : 2;
  const basisPercent = `${100 / columns}%` as const;

  return (
    <View style={styles.grid}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={[styles.gridSlot, { flexBasis: basisPercent }]}>
          <View style={[styles.skeletonCard, { backgroundColor: theme.backgroundElement }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridSlot: {
    flexGrow: 1,
    minWidth: 150,
  },
  phoneRow: {
    gap: Spacing.three,
    paddingRight: Spacing.three,
  },
  phoneCardSlot: {
    width: 168,
  },
  skeletonCard: {
    height: 112,
    borderRadius: BorderRadius.lg,
  },
});
