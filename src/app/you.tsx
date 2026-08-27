import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordCard, StatCard } from '@/components/cards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, BottomTabInset, CardShadow, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STATS = {
  total: 58,
  verified: 34,
  pending: 8,
  selfReported: 16,
};

const SAMPLE_RECORDS = [
  {
    organization: 'GreenFuture Coalition',
    hours: 3,
    date: 'Aug 24',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 12,
  },
  {
    organization: 'Northside Food Bank',
    hours: 4,
    date: 'Aug 20',
    status: 'verified' as const,
    hasPhoto: false,
    likes: 6,
  },
  {
    organization: 'Central Public Library',
    hours: 2,
    date: 'Aug 18',
    status: 'pending' as const,
    hasPhoto: false,
    likes: 2,
  },
  {
    organization: 'Riverside Youth Center',
    hours: 5,
    date: 'Aug 12',
    status: 'self-reported' as const,
    hasPhoto: true,
    likes: 9,
  },
  {
    organization: 'Coastal Guardians',
    hours: 3,
    date: 'Aug 6',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 15,
  },
  {
    organization: 'Maple Grove Senior Center',
    hours: 3,
    date: 'Jul 30',
    status: 'pending' as const,
    hasPhoto: false,
    likes: 1,
  },
  {
    organization: 'Blue Ridge Trail Alliance',
    hours: 4,
    date: 'Jul 22',
    status: 'self-reported' as const,
    hasPhoto: false,
    likes: 3,
  },
  {
    organization: 'Furry Friends Rescue',
    hours: 5,
    date: 'Jul 14',
    status: 'verified' as const,
    hasPhoto: true,
    likes: 18,
  },
];

const TIME_RANGES = ['All Time', 'This Year', 'This Month', 'This Week'];

function TimeRangeSelector() {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(TIME_RANGES[0]);
  const [showCustom, setShowCustom] = useState(false);
  const theme = useTheme();

  const close = () => {
    setExpanded(false);
    setShowCustom(false);
  };

  return (
    <View style={styles.rangeContainer}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={[styles.rangeButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="bodyBold">{selected}</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </Pressable>

      {expanded && (
        <ThemedView style={[CardShadow, styles.rangeOptions, { borderColor: theme.border }]}>
          {TIME_RANGES.map((range) => (
            <Pressable
              key={range}
              onPress={() => {
                setSelected(range);
                close();
              }}
              style={styles.rangeOption}>
              <ThemedText type="body" themeColor={range === selected ? 'primary' : 'text'}>
                {range}
              </ThemedText>
              {range === selected && <Ionicons name="checkmark" size={16} color={theme.primary} />}
            </Pressable>
          ))}

          <View style={[styles.rangeDivider, { backgroundColor: theme.border }]} />

          <Pressable onPress={() => setShowCustom((current) => !current)} style={styles.rangeOption}>
            <ThemedText type="body" themeColor={showCustom || selected === 'Custom Range' ? 'primary' : 'text'}>
              Custom Range
            </ThemedText>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={showCustom || selected === 'Custom Range' ? theme.primary : theme.textSecondary}
            />
          </Pressable>

          {showCustom && (
            <View style={styles.customRange}>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Start date
                </ThemedText>
              </View>
              <View style={[styles.customField, { borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textSecondary">
                  End date
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  setSelected('Custom Range');
                  close();
                }}
                style={[styles.applyButton, { backgroundColor: theme.primary }]}>
                <ThemedText type="bodyBold" themeColor="background">
                  Apply
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>
      )}
    </View>
  );
}

export default function YouScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedText type="h1" style={styles.pageTitle}>
          You
        </ThemedText>

        <ThemedView style={styles.statsSection}>
          <TimeRangeSelector />

          <StatCard
            label="Total Hours"
            value={STATS.total}
            icon="ribbon-outline"
            accentColor="primary"
            variant="headline"
          />
          <ThemedView style={styles.statGrid}>
            <StatCard label="Verified" value={STATS.verified} icon="checkmark-circle-outline" accentColor="success" />
            <StatCard label="Pending" value={STATS.pending} icon="hourglass-outline" accentColor="warning" />
            <StatCard
              label="Self-Reported"
              value={STATS.selfReported}
              icon="create-outline"
              accentColor="warning"
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <View style={styles.historyHeader}>
            <ThemedText type="h3">Your Volunteer History</ThemedText>
            <Pressable style={[styles.exportButton, { borderColor: theme.border }]}>
              <Ionicons name="download-outline" size={14} color={theme.text} />
              <ThemedText type="label">Export</ThemedText>
            </Pressable>
          </View>
          <ThemedView style={styles.recordList}>
            {SAMPLE_RECORDS.map((record) => (
              <RecordCard key={`${record.organization}-${record.date}`} {...record} />
            ))}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  pageTitle: {
    marginBottom: Spacing.one,
  },
  statsSection: {
    gap: Spacing.three,
    position: 'relative',
    zIndex: 20,
  },
  rangeContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    zIndex: 20,
  },
  rangeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
  rangeOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: Spacing.one,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    minWidth: 220,
    zIndex: 20,
    elevation: 8,
  },
  rangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  rangeDivider: {
    height: 1,
    marginVertical: Spacing.one,
    marginHorizontal: Spacing.three,
  },
  customRange: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  customField: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  applyButton: {
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  section: {
    gap: Spacing.three,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  recordList: {
    gap: Spacing.three,
  },
});
