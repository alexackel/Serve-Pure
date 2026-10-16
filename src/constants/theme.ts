/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C2421',
    textSecondary: '#5E6B62',
    background: '#F7F5F0',
    backgroundElement: '#E3E8E1',
    backgroundSelected: '#CFDAD9',
    border: '#C7D1C2',

    primary: '#2B5B7E',
    primaryTint: '#DCE6E4',

    success: '#4A7A52',
    successBackground: '#E1EADF',
    warning: '#7D6929',
    warningBackground: '#EDE8D2',
    error: '#9C5A52',
    errorBackground: '#EDDAD6',

    chartSuccess: '#9CC2A0',
    chartWarning: '#D6C27A',
    chartPrimary: '#8DAAB8',
    chartError: '#C99892',
  },
  dark: {
    text: '#F0F4F1',
    textSecondary: '#9DAAA3',
    background: '#121714',
    backgroundElement: '#242B27',
    backgroundSelected: '#2B3A3F',
    border: '#36413B',

    primary: '#5C8AAB',
    primaryTint: '#223942',

    success: '#7FAE87',
    successBackground: '#23302A',
    warning: '#C2AE6C',
    warningBackground: '#332E1E',
    error: '#BC8079',
    errorBackground: '#332420',

    chartSuccess: '#8FC093',
    chartWarning: '#D4C184',
    chartPrimary: '#8FB2C4',
    chartError: '#CB9A93',
  },
} as const;

export const Overlay = {
  backdrop: 'rgba(28, 36, 33, 0.45)',
  scrim: 'rgba(20, 26, 24, 0.92)',
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

// The bottom tab bar's own rendered height (app-tabs.tsx's tabListContainer
// top padding + button content), excluding safe-area inset — callers add
// safe-area bottom separately.
export const BottomTabInset = 60;
export const MaxContentWidth = 800;
// The org Analytics dashboard's multi-column KPI/chart grid needs more room
// than the app's standard centered-column pages.
export const AnalyticsMaxContentWidth = 1200;

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

export const BorderRadius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

// Shadow color/opacity is scheme-aware: the old static #0F172A tint read as
// cold slate in light mode and was nearly invisible against dark
// backgrounds, so each scheme gets its own tuning (same approach as
// create-fab.tsx's getFabShadow).
export function getCardShadow(scheme: 'light' | 'dark') {
  const isDark = scheme === 'dark';
  return Platform.select({
    web: {
      boxShadow: isDark ? '0px 1px 3px rgba(0, 0, 0, 0.3)' : '0px 1px 3px rgba(28, 36, 33, 0.06)',
    },
    ios: {
      shadowColor: isDark ? '#000000' : '#1C2421',
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    default: { elevation: 2 },
  });
}

// Negative/upward offset since this bar sits flush against the bottom edge —
// the shadow needs to read on its top edge, not underneath it, to separate
// it from content scrolling behind it.
export function getBottomBarShadow(scheme: 'light' | 'dark') {
  const isDark = scheme === 'dark';
  return Platform.select({
    web: {
      boxShadow: isDark ? '0px -2px 6px rgba(0, 0, 0, 0.4)' : '0px -2px 6px rgba(28, 36, 33, 0.1)',
    },
    ios: {
      shadowColor: isDark ? '#000000' : '#1C2421',
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: -2 },
    },
    default: { elevation: 8 },
  });
}
