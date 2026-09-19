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

    chartSuccess: '#7FDDA8',
    chartWarning: '#FFCF66',
    chartPrimary: '#8FB4FF',
    chartError: '#F3A399',
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

    chartSuccess: '#5EDBA0',
    chartWarning: '#F4CE73',
    chartPrimary: '#8CB6FF',
    chartError: '#F5978A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// The floating pill tab bar's own rendered height (app-tabs.tsx's
// tabListContainer padding + innerContainer padding + button content),
// excluding safe-area inset — callers add safe-area bottom separately.
export const BottomTabInset = 100;
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
