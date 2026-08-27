import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { VerificationBadge, VerificationStatus } from '@/components/cards/verification-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const statusLabels: Record<VerificationStatus, string> = {
  verified: 'Verified',
  pending: 'Pending Verification',
  'self-reported': 'Self-Reported',
  warning: 'Warning',
};

export type RecordCardProps = {
  organization: string;
  hours: number;
  date: string;
  status: VerificationStatus;
  hasPhoto?: boolean;
  likes?: number;
  onPress?: () => void;
};

function ActionIcon({ icon, count }: { icon: keyof typeof Ionicons.glyphMap; count?: number }) {
  const theme = useTheme();
  return (
    <Pressable style={styles.actionButton}>
      <Ionicons name={icon} size={19} color={theme.textSecondary} />
      {count !== undefined && (
        <ThemedText type="caption" themeColor="textSecondary">
          {count}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function RecordCard({ organization, hours, date, status, hasPhoto, likes, onPress }: RecordCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
              <Ionicons name="person" size={18} color={theme.primary} />
            </View>
            <VerificationBadge status={status} label={statusLabels[status]} size="sm" />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {date}
          </ThemedText>
        </View>

        <ThemedText type="body" style={styles.sentence}>
          You volunteered at <ThemedText type="bodyBold">{organization}</ThemedText> for {hours} hrs
        </ThemedText>

        {hasPhoto && (
          <View style={[styles.photo, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
          </View>
        )}

        <View style={styles.actions}>
          <ActionIcon icon="heart-outline" count={likes} />
          <ActionIcon icon="chatbubble-outline" />
          <ActionIcon icon="share-outline" />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentence: {},
  photo: {
    height: 160,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
