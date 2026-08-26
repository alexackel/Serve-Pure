/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1220',
    textSecondary: '#5B6472',
    background: '#FFFFFF',
    backgroundElement: '#F3F6FC',
    backgroundSelected: '#E3ECFC',
    border: '#E2E8F0',

    primary: '#2F6FEF',
    primaryTint: '#EAF1FE',

    success: '#1E9E5A',
    successBackground: '#E4F8ED',
    warning: '#C98A02',
    warningBackground: '#FFF4D6',
    error: '#D92D20',
    errorBackground: '#FDEAEA',
  },
  dark: {
    text: '#F5F7FA',
    textSecondary: '#9AA4B2',
    background: '#0B0F14',
    backgroundElement: '#171B21',
    backgroundSelected: '#232A33',
    border: '#2A313B',

    primary: '#5B9BFF',
    primaryTint: '#152238',

    success: '#3BC584',
    successBackground: '#123324',
    warning: '#E8B93B',
    warningBackground: '#3A2E0D',
    error: '#F26B5E',
    errorBackground: '#3A1613',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 100 }) ?? 0;
export const MaxContentWidth = 800;

export const Typography = {
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  statValue: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
} as const;

export const BorderRadius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const CardShadow = Platform.select({
  web: { boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.08)' },
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  default: { elevation: 2 },
});
