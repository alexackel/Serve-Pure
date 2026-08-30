import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabDef = {
  name: string;
  // The home tab's '/' resolves to the (tabs) group's pathless index route;
  // expo-router's typed-routes generator doesn't always include that bare-'/'
  // alias, so this field uses the broader Href type instead of a route literal.
  href: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'home', href: '/' as Href, label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'find', href: '/find', label: 'Find', icon: 'search-outline', activeIcon: 'search' },
  { name: 'map', href: '/map', label: 'Map', icon: 'map-outline', activeIcon: 'map' },
  { name: 'groups', href: '/groups', label: 'Groups', icon: 'people-outline', activeIcon: 'people' },
  {
    name: 'you',
    href: '/you',
    label: 'You',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle',
  },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} activeIcon={tab.activeIcon} label={tab.label} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export function TabButton({ isFocused, icon, activeIcon, label, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.tabButtonView}>
        <Ionicons name={isFocused ? activeIcon : icon} size={22} color={color} />
        <ThemedText type="label" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
