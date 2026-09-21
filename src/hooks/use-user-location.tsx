import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as Location from 'expo-location';

export type UserLocation = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
};

// The only place a device coordinate should ever be read from. A context
// (rather than a bare hook) so the app-launch AI-discovery preload and
// find.tsx's distance sort/filter share a single permission prompt and GPS
// read instead of racing two independent ones.
const UserLocationContext = createContext<UserLocation | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setLocation({ latitude: null, longitude: null, loading: false, error: 'Location permission denied' });
        return;
      }

      try {
        // Highest, not Balanced — this reading drives the "you are here"
        // pin on the event/org location maps, where a ~100m Balanced-tier
        // fix is visibly wrong at street-level zoom (looks like it's next
        // to the wrong building entirely). Distance sort/filter on Find
        // don't need this precision, but they share this single fetch by
        // design (see the comment on UserLocationContext above), so both
        // get the more precise fix.
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        if (cancelled) return;
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, loading: false, error: null });
      } catch {
        if (!cancelled) {
          setLocation({ latitude: null, longitude: null, loading: false, error: 'Could not determine location' });
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => location, [location]);

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation(): UserLocation {
  const context = useContext(UserLocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a UserLocationProvider');
  }
  return context;
}
