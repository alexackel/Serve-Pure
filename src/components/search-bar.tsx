import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = Omit<TextInputProps, 'placeholderTextColor' | 'style'> & {
  containerStyle?: StyleProp<ViewStyle>;
};

export function SearchBar({ containerStyle, ...rest }: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }, containerStyle]}>
      <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.searchInput, { color: theme.text }, webNoOutlineStyle]}
        {...rest}
      />
    </View>
  );
}

// `outlineStyle: 'none'` isn't in React Native's type union, but react-native-web
// needs it (outlineWidth: 0 alone still lets Chrome paint its default focus ring).
const webNoOutlineStyle: TextStyle | undefined =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

const styles = StyleSheet.create({
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    // Mobile browsers auto-zoom on focusing an input with a font size under 16px.
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
});
