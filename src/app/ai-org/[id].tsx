import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { MetaRow } from '@/components/meta-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useAiDiscovery } from '@/context/ai-discovery-context';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';
import { getDistanceMiles } from '@/utils/geo';

function SectionDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="body" themeColor="textSecondary" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </View>
  );
}

function LinkRow({ icon, text, url }: { icon: keyof typeof Ionicons.glyphMap; text: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <ThemedText type="body" themeColor="primary" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </Pressable>
  );
}

export default function AiOrgDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { orgs, status, reportedIds, reportOrg } = useAiDiscovery();
  const userLocation = useUserLocation();
  const [reportError, setReportError] = useState<string | null>(null);

  const org = useMemo(() => orgs.find((candidate) => candidate.id === id), [orgs, id]);

  const distanceMiles =
    org && userLocation.latitude !== null && userLocation.longitude !== null && org.lat !== null && org.lng !== null
      ? getDistanceMiles(userLocation.latitude, userLocation.longitude, org.lat, org.lng)
      : null;

  if (!org) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />
        <ThemedText type="h3">{status === 'loading' ? 'Loading…' : 'Organization not found'}</ThemedText>
      </ScreenScrollView>
    );
  }

  const hasContactSection = Boolean(org.contactInfo) || Boolean(org.website) || Boolean(org.sourceUrl);
  const hasDetailsSection = Boolean(org.timeCommitment) || Boolean(org.eligibility);
  const reported = reportedIds.has(org.id);

  const handleReport = () => {
    setReportError(null);
    reportOrg(org.id).catch((error) => {
      console.error('Failed to report AI org', error);
      setReportError('Could not submit report. Try again.');
    });
  };

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/find" />

      <View style={styles.orgRow}>
        <Avatar size={40} icon="sparkles-outline" iconSize={22} />
        <ThemedText type="caption" themeColor="textSecondary">
          AI Discovered
        </ThemedText>
      </View>

      <View style={styles.titleBlock}>
        <ThemedText type="h1">{org.name}</ThemedText>
        {org.category !== 'other' && (
          <View style={[styles.categoryPill, { backgroundColor: theme.primaryTint }]}>
            <ThemedText type="label" themeColor="primary">
              {aiOrgCategoryLabel(org.category)}
            </ThemedText>
          </View>
        )}
      </View>

      <SectionDivider />

      {distanceMiles !== null && (
        <View style={styles.infoList}>
          <MetaRow icon="navigate-outline" text={`${distanceMiles.toFixed(1)} mi away`} />
        </View>
      )}

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Location</ThemedText>
        <InfoRow icon="location-outline" text={org.address ?? 'Address unavailable'} />
        {org.lat !== null && org.lng !== null && (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="map-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              Map view coming soon
            </ThemedText>
          </View>
        )}
      </ThemedView>

      {org.description && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">About this organization</ThemedText>
          <ThemedText type="body">{org.description}</ThemedText>
        </ThemedView>
      )}

      {hasDetailsSection && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Details</ThemedText>
          <View style={styles.infoList}>
            {org.timeCommitment && <InfoRow icon="hourglass-outline" text={org.timeCommitment} />}
            {org.eligibility && <InfoRow icon="person-outline" text={org.eligibility} />}
          </View>
        </ThemedView>
      )}

      {hasContactSection && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Contact</ThemedText>
          <View style={styles.infoList}>
            {org.contactInfo && <InfoRow icon="call-outline" text={org.contactInfo} />}
            {org.website && <LinkRow icon="globe-outline" text={org.website} url={org.website} />}
            {!org.signupUrl && org.sourceUrl && <LinkRow icon="open-outline" text="View source" url={org.sourceUrl} />}
          </View>
        </ThemedView>
      )}

      {org.signupUrl && (
        <Pressable onPress={() => Linking.openURL(org.signupUrl!)} style={[styles.cta, { backgroundColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            Sign Up
          </ThemedText>
        </Pressable>
      )}

      {reportError && (
        <View style={[styles.warningBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.warningText}>
            {reportError}
          </ThemedText>
        </View>
      )}

      <Pressable
        disabled={reported}
        onPress={handleReport}
        style={[styles.reportButton, { borderColor: reported ? theme.error : theme.border }]}>
        <Ionicons name={reported ? 'flag' : 'flag-outline'} size={16} color={reported ? theme.error : theme.textSecondary} />
        <ThemedText type="bodyBold" themeColor={reported ? 'error' : 'textSecondary'}>
          {reported ? 'Reported' : 'Report incorrect info'}
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleBlock: {
    gap: Spacing.two,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  divider: {
    height: 1,
  },
  infoList: {
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoRowText: {
    flex: 1,
  },
  section: {
    gap: Spacing.two,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    flex: 1,
  },
  cta: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  reportButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.three,
  },
});
