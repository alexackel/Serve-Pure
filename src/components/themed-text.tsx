import { Text, type TextProps } from 'react-native';

import { ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'caption' | 'label' | 'statValue';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && Typography.body,
        type === 'h1' && Typography.h1,
        type === 'h2' && Typography.h2,
        type === 'h3' && Typography.h3,
        type === 'body' && Typography.body,
        type === 'bodyBold' && Typography.bodyBold,
        type === 'caption' && Typography.caption,
        type === 'label' && Typography.label,
        type === 'statValue' && Typography.statValue,
        style,
      ]}
      {...rest}
    />
  );
}
