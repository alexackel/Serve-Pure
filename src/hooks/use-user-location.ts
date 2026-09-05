import { useEffect, useState } from 'react';

export type UserLocation = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
};

// Mocked "current location" — San Francisco. Shaped like an async GPS read
// (starts loading, resolves later) so every consumer already handles the
// loading/null states a real expo-location-backed version would have. This
// is the only place a device coordinate should ever be read from — swapping
// in Location.getCurrentPositionAsync() later only touches this file.
const MOCK_LATITUDE = 37.7749;
const MOCK_LONGITUDE = -122.4194;
const MOCK_RESOLVE_DELAY_MS = 400;

export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocation({ latitude: MOCK_LATITUDE, longitude: MOCK_LONGITUDE, loading: false, error: null });
    }, MOCK_RESOLVE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, []);

  return location;
}
