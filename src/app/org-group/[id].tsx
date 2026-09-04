import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { MOCK_GROUPS } from '@/data/mock-groups';
import { useTheme } from '@/hooks/use-theme';

function ContactRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <ThemedText type="body" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export default function OrgGroupContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const group = MOCK_GROUPS.find((item) => item.id === id);

  if (!group) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/org-groups" />
        <ThemedText type="h3">Group not found</ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/org-groups" />

      <View style={styles.headerRow}>
        <Avatar size={48} icon="people" iconSize={22} />
        <View style={styles.headerInfo}>
          <ThemedText type="h2">{group.name}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
          </ThemedText>
        </View>
      </View>

      <ThemedView style={[styles.contactCard, { borderColor: theme.border }]}>
        <ThemedText type="h3">Contact</ThemedText>
        <ContactRow icon="mail-outline" label="Contact email not available yet" />
        <ContactRow icon="call-outline" label="Contact phone not available yet" />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.comingSoon}>
          Full contact directory coming soon.
        </ThemedText>
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerInfo: {
    gap: Spacing.half,
  },
  contactCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  comingSoon: {
    marginTop: Spacing.one,
  },
});
