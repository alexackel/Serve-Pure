import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { HistoryProvider } from '@/context/history-context';
import { OrganizationProvider } from '@/context/organization-context';
import { RegistrationsProvider } from '@/context/registrations-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OrganizationProvider>
        <RegistrationsProvider>
          <HistoryProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="group/[id]" />
              <Stack.Screen name="group/[id]/subgroups" />
              <Stack.Screen name="org-group/[id]" />
            </Stack>
          </HistoryProvider>
        </RegistrationsProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
