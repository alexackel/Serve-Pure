import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { VerificationBadge, VerificationStatus } from '@/components/cards/verification-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';

export type RecordCardProps = {
  organization: string;
  hours?: number;
  date: string;
  status: VerificationStatus;
  hasPhoto?: boolean;
  likes?: number;
  note?: string;
  onPress?: () => void;
};

export function RecordCard({ organization, hours, date, status, hasPhoto, likes, note, onPress }: RecordCardProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar icon="person" iconSize={18} />
            <VerificationBadge status={status} size="sm" />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {date}
          </ThemedText>
        </View>

        {status === 'no-show' ? (
          <ThemedText type="body" style={styles.sentence}>
            You did not check in at <ThemedText type="bodyBold">{organization}</ThemedText>
          </ThemedText>
        ) : status === 'appealed' ? (
          <ThemedText type="body" style={styles.sentence}>
            Your attendance at <ThemedText type="bodyBold">{organization}</ThemedText> is under appeal
          </ThemedText>
        ) : status === 'cancelled' ? (
          <ThemedText type="body" style={styles.sentence}>
            {note}
          </ThemedText>
        ) : (
          <ThemedText type="body" style={styles.sentence}>
            You volunteered at <ThemedText type="bodyBold">{organization}</ThemedText>
            {hours !== undefined ? ` for ${hours} hrs` : ''}
          </ThemedText>
        )}

        {hasPhoto && <PostPhoto />}

        <PostActions likes={likes} />
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
  sentence: {},
});
