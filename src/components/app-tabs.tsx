import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useOrganization, type ViewMode } from '@/context/organization-context';
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
  // 'shared' is visible in both view modes; the rest are visible in only one.
  mode: ViewMode | 'shared';
};

// Every tab across both view modes is registered here, and every one of them
// stays mounted at all times (see AppTabs below) — only visibility toggles
// with the mode. Letting the TabTrigger set itself change shape between
// renders confused expo-router/ui's headless Tabs internal route bookkeeping
// (an in-flight router.replace would get silently overridden back to the
// first tab), so a stable, always-mounted trigger set is load-bearing here.
const ALL_TABS: TabDef[] = [
  { name: 'home', href: '/' as Href, label: 'Home', icon: 'home-outline', activeIcon: 'home', mode: 'shared' },
  {
    name: 'find',
    href: '/find',
    label: 'Find',
    icon: 'search-outline',
    activeIcon: 'search',
    mode: 'personal',
  },
  {
    name: 'org-events',
    href: '/org-events',
    label: 'Events',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    mode: 'organization',
  },
  { name: 'map', href: '/map', label: 'Map', icon: 'map-outline', activeIcon: 'map', mode: 'personal' },
  {
    name: 'org-analytics',
    href: '/org-analytics',
    label: 'Analytics',
    icon: 'bar-chart-outline',
    activeIcon: 'bar-chart',
    mode: 'organization',
  },
  {
    name: 'groups',
    href: '/groups',
    label: 'Groups',
    icon: 'people-outline',
    activeIcon: 'people',
    mode: 'personal',
  },
  {
    name: 'org-groups',
    href: '/org-groups',
    label: 'Groups',
    icon: 'people-outline',
    activeIcon: 'people',
    mode: 'organization',
  },
  {
    name: 'you',
    href: '/you',
    label: 'You',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle',
    mode: 'personal',
  },
  {
    name: 'org-you',
    href: '/org-you',
    label: 'You',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle',
    mode: 'organization',
  },
];

export default function AppTabs() {
  const { viewMode } = useOrganization();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {ALL_TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton
                icon={tab.icon}
                activeIcon={tab.activeIcon}
                label={tab.label}
                hidden={tab.mode !== 'shared' && tab.mode !== viewMode}
              />
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
  hidden?: boolean;
};

export function TabButton({ isFocused, icon, activeIcon, label, hidden, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  if (hidden) {
    return <Pressable {...props} style={styles.hidden} pointerEvents="none" />;
  }

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
  hidden: {
    width: 0,
    height: 0,
  },
  tabButtonView: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
