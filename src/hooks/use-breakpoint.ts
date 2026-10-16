import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

const TABLET_MIN_WIDTH = 640;
const DESKTOP_MIN_WIDTH = 1024;

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= DESKTOP_MIN_WIDTH) return 'desktop';
  if (width >= TABLET_MIN_WIDTH) return 'tablet';
  return 'phone';
}
