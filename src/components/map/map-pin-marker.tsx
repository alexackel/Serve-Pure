import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { MapPinKind } from '@/utils/map-pins';

const PIN_VISUALS: Record<MapPinKind, { icon: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'warning' | 'primary' }> = {
  'org-event': { icon: 'home', colorKey: 'success' },
  'individual-event': { icon: 'person', colorKey: 'warning' },
  'ai-org': { icon: 'sparkles', colorKey: 'primary' },
};

export type MapPinMarkerProps = {
  kind: MapPinKind;
  size?: number;
  // 'pin' (default) adds a pointer tail beneath the circle, for placement on
  // the map itself. 'badge' is just the circle, for the sheet's list rows.
  variant?: 'pin' | 'badge';
};

// A 'pin' variant's full rendered footprint for a given `size` — lets a
// caller anchor the marker so its tail tip (not its top-left corner) lands
// on a specific pixel, without duplicating this component's internal tail
// geometry.
export function getPinMarkerFootprint(size = 36): { width: number; height: number } {
  const tailSize = size * 0.28;
  return { width: size, height: size + tailSize - tailSize * 0.3 };
}

// The one place pin colors/icons are defined — reused unchanged by both the
// on-map marker and the sheet's compact list row, and by whatever real map
// surface eventually replaces map-static-surface.tsx (a real `<Marker>`'s
// custom child view would render this same component).
export function MapPinMarker({ kind, size = 36, variant = 'pin' }: MapPinMarkerProps) {
  const theme = useTheme();
  const { icon, colorKey } = PIN_VISUALS[kind];
  const color = theme[colorKey];
  const tailSize = size * 0.28;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderColor: theme.background },
        ]}>
        <Ionicons name={icon} size={size * 0.55} color={theme.background} />
      </View>
      {variant === 'pin' && (
        <View
          style={[
            styles.tail,
            {
              borderTopColor: color,
              borderLeftWidth: tailSize / 2,
              borderRightWidth: tailSize / 2,
              borderTopWidth: tailSize,
              marginTop: -tailSize * 0.3,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
});
