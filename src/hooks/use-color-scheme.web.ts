import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * useSyncExternalStore lets the client snapshot differ from the server snapshot without an
 * effect + setState render pass (which react-hooks/set-state-in-effect flags).
 */
export function useColorScheme() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

function subscribe(onStoreChange: () => void) {
  const subscription = Appearance.addChangeListener(onStoreChange);
  return () => subscription.remove();
}

function getClientSnapshot() {
  return Appearance.getColorScheme();
}

function getServerSnapshot() {
  return 'light';
}
