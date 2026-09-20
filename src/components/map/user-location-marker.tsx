import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const USER_LOCATION_MARKER_SIZE = 32;

// The user's own position — a plain circle with a person icon, simpler than
// MapPinMarker's pin-with-tail: nothing to tap, always exactly at the
// image's center (the map is always centered on the user), so no anchor
// math needed. Uses `primary` (not `individual-event`'s `warning` person
// icon in map-pin-marker.tsx) so the two are never confused.
export function UserLocationMarker({ size = USER_LOCATION_MARKER_SIZE }: { size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary, borderColor: theme.background },
      ]}>
      <Ionicons name="person" size={size * 0.6} color={theme.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
