import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// No profile-photo upload exists in this app (see Avatar, which is an icon
// placeholder) — every person-facing avatar in the social feature set
// (facepile, likes list, comment rows, notifications, the profile screen)
// uses initials derived from full_name instead of a photo.
export function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function InitialsAvatar({
  fullName,
  size = 32,
  style,
}: {
  fullName: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: BorderRadius.pill,
          backgroundColor: theme.primaryTint,
        },
        style,
      ]}>
      <Text style={[styles.text, { color: theme.primary, fontSize: size * 0.4 }]}>{getInitials(fullName)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
