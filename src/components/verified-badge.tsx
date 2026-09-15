import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

// A person-identity badge — distinct from VerificationBadge in
// components/cards/verification-badge.tsx, which represents a record/event's
// status (registered/pending/no-show/etc), not whether the person themselves
// is verified. Icon-only so it drops inline next to a name anywhere.
export function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const theme = useTheme();

  return (
    <Ionicons
      name="checkmark-circle"
      size={size === 'sm' ? 13 : 15}
      color={theme.success}
      accessibilityLabel="Verified"
    />
  );
}
