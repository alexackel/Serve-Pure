import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MapPinMarker } from '@/components/map/map-pin-marker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MapPin } from '@/utils/map-pins';

// Compact single-line row for the sheet's list — EventCard/AiOrgCard are
// full list-page cards (multi-line meta, padding for a scannable page) and
// too tall for a dense, draggable sheet list.
export function MapPinRow({ pin, onPress }: { pin: MapPin; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <MapPinMarker kind={pin.kind} size={32} variant="badge" />
      <View style={styles.text}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {pin.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {pin.subtitle}
        </ThemedText>
      </View>
      {pin.distanceMiles !== null && (
        <ThemedText type="caption" themeColor="textSecondary">
          {pin.distanceMiles.toFixed(1)} mi
        </ThemedText>
      )}
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
