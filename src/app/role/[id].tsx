import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getRole } from '@/data/roles';
import { useTheme } from '@/hooks/use-theme';

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

export default function RoleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const role = getRole(id);

  if (!role) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/groups" />
        <ThemedText type="h3">Role not found</ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/groups" />

      <View style={styles.orgRow}>
        <Avatar size={40} icon="business-outline" iconSize={22} />
        <ThemedText type="bodyBold">{role.organization}</ThemedText>
      </View>

      <View style={styles.titleBlock}>
        <ThemedText type="h1">{role.title}</ThemedText>
        <View style={[styles.statusPill, { backgroundColor: theme.primaryTint }]}>
          <ThemedText type="label" themeColor="primary">
            {role.paid ? 'Paid' : 'Available'}
          </ThemedText>
        </View>
      </View>

      <SectionDivider />

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Schedule</ThemedText>
        <View style={styles.infoList}>
          <InfoRow icon="time-outline" text={`Ongoing · ${role.hoursPerWeek} hrs/week`} />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Location</ThemedText>
        <InfoRow icon="location-outline" text={role.location} />
      </ThemedView>

      {role.description && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">About this role</ThemedText>
          <ThemedText type="body">{role.description}</ThemedText>
        </ThemedView>
      )}
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
  statusPill: {
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
});
