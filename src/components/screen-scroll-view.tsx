import { Platform, ScrollView, StyleSheet, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenScrollViewProps = Omit<ScrollViewProps, 'contentInset'> & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared page shell for the tab screens: applies safe-area insets (offset for the
 * floating bottom tab bar), the web/android content padding split, and the
 * centered max-width content column.
 */
export function ScreenScrollView({ children, style, contentContainerStyle, containerStyle, ...rest }: ScreenScrollViewProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const platformStyle = Platform.select({
    web: {
      paddingTop: Spacing.six,
      paddingBottom: insets.bottom,
    },
    default: {
      paddingTop: insets.top + Spacing.two,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }, style]}
      contentContainerStyle={[styles.contentContainer, platformStyle, contentContainerStyle]}
      {...rest}>
      <ThemedView style={[styles.container, containerStyle]}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
});
