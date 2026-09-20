import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AiDiscoveryProvider } from '@/context/ai-discovery-context';
import { AuthProvider, useSession } from '@/context/auth-context';
import { GroupsProvider } from '@/context/groups-context';
import { HistoryProvider } from '@/context/history-context';
import { OrganizationProvider } from '@/context/organization-context';
import { OrgHistoryProvider } from '@/context/org-history-context';
import { RegistrationsProvider } from '@/context/registrations-context';
import { UserLocationProvider } from '@/hooks/use-user-location';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  return (
    <OrganizationProvider>
      <UserLocationProvider>
        <AiDiscoveryProvider>
          <RegistrationsProvider>
            <HistoryProvider>
              <OrgHistoryProvider>
                <GroupsProvider>
                  <AnimatedSplashOverlay />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Protected guard={!!session}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="event/[id]" />
                      <Stack.Screen name="ai-org/[id]" />
                      <Stack.Screen name="group/[id]" />
                      <Stack.Screen name="group/[id]/subgroups" />
                      <Stack.Screen name="group/[id]/member/[memberId]" />
                      <Stack.Screen name="org-group/[id]" />
                    </Stack.Protected>
                    <Stack.Protected guard={!session}>
                      <Stack.Screen name="sign-in" />
                    </Stack.Protected>
                  </Stack>
                </GroupsProvider>
              </OrgHistoryProvider>
            </HistoryProvider>
          </RegistrationsProvider>
        </AiDiscoveryProvider>
      </UserLocationProvider>
    </OrganizationProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    // Required by react-native-gesture-handler for its gestures to work
    // correctly (notably on Android) — added for the Map tab's draggable
    // sheet, the app's first real gesture-driven interaction.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
