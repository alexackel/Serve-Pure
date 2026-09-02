import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type VerificationStatus =
  | 'verified'
  | 'registered'
  | 'pending'
  | 'self-uploaded'
  | 'admin-approved'
  | 'no-show'
  | 'appealed'
  | 'cancelled'
  | 'warning';

export type VerificationBadgeProps = {
  status: VerificationStatus;
  label?: string;
  size?: 'sm' | 'md';
};

const defaultLabels: Record<VerificationStatus, string> = {
  verified: 'Verified',
  registered: 'Registered',
  pending: 'Pending',
  'self-uploaded': 'Self-Uploaded',
  'admin-approved': 'Admin Approved',
  'no-show': 'No-Show',
  appealed: 'Appealed',
  cancelled: 'Cancelled',
  warning: 'Warning',
};

export function VerificationBadge({ status, label, size = 'md' }: VerificationBadgeProps) {
  const theme = useTheme();

  const colorKey =
    status === 'verified' || status === 'registered' || status === 'admin-approved'
      ? 'success'
      : status === 'pending' || status === 'self-uploaded'
        ? 'warning'
        : 'error';
  const dotColor = theme[colorKey];
  const backgroundColor = theme[`${colorKey}Background`];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor },
      ]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <ThemedText type="label" style={{ color: dotColor }}>
        {label ?? defaultLabels[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
