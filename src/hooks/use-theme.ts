/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, getBottomBarShadow, getCardShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function useResolvedScheme() {
  const scheme = useColorScheme();
  return scheme === 'unspecified' ? 'light' : scheme;
}

export function useTheme() {
  return Colors[useResolvedScheme()];
}

export function useCardShadow() {
  return getCardShadow(useResolvedScheme());
}

export function useBottomBarShadow() {
  return getBottomBarShadow(useResolvedScheme());
}
