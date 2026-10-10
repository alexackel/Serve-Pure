import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useSession } from '@/context/auth-context';
import { DiscoveryProvider } from '@/context/discovery-context';
import { GroupsProvider } from '@/context/groups-context';
import { HistoryProvider } from '@/context/history-context';
import { NotificationsProvider } from '@/context/notifications-context';
import { OrganizationProvider } from '@/context/organization-context';
import { OrgHistoryProvider } from '@/context/org-history-context';
import { RegistrationsProvider } from '@/context/registrations-context';
import { SocialProvider } from '@/context/social-context';
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
        <DiscoveryProvider>
          <RegistrationsProvider>
            <HistoryProvider>
              <OrgHistoryProvider>
                <GroupsProvider>
                  <SocialProvider>
                    <NotificationsProvider>
                      <AnimatedSplashOverlay />
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Protected guard={!!session}>
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="event/[id]" />
                          <Stack.Screen name="role/[id]" />
                          <Stack.Screen name="discovered/ai-org/[id]" />
                          <Stack.Screen name="discovered/post/[id]" />
                          <Stack.Screen name="group/[id]" />
                          <Stack.Screen name="group/[id]/subgroups" />
                          <Stack.Screen name="group/[id]/member/[memberId]" />
                          <Stack.Screen name="group/[id]/review/[reviewId]" />
                          <Stack.Screen name="org-group/[id]" />
                          <Stack.Screen name="profile/[userId]" />
                          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
                          <Stack.Screen name="settings" />
                          <Stack.Screen name="organization-signup" />
                          <Stack.Screen name="add-account" options={{ presentation: 'modal' }} />
                          <Stack.Screen name="connections" />
                          <Stack.Screen name="activity/[id]/comments" />
                          <Stack.Screen name="notifications" />
                        </Stack.Protected>
                        <Stack.Protected guard={!session}>
                          <Stack.Screen name="sign-in" />
                        </Stack.Protected>
                      </Stack>
                    </NotificationsProvider>
                  </SocialProvider>
                </GroupsProvider>
              </OrgHistoryProvider>
            </HistoryProvider>
          </RegistrationsProvider>
        </DiscoveryProvider>
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
