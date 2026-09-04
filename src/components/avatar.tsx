import { Ionicons } from '@expo/vector-icons';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Avatar({
  size = 32,
  icon,
  iconSize,
  style,
}: {
  size?: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: BorderRadius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.primaryTint,
        },
        style,
      ]}>
      <Ionicons name={icon} size={iconSize} color={theme.primary} />
    </View>
  );
}
