import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedTabsProps<Key extends string> = {
  tabs: readonly { key: Key; label: string }[];
  activeKey: Key;
  onChange: (key: Key) => void;
};

export function SegmentedTabs<Key extends string>({ tabs, activeKey, onChange }: SegmentedTabsProps<Key>) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.segment, isActive && { backgroundColor: theme.background }, isActive && CardShadow]}>
            <ThemedText type={isActive ? 'bodyBold' : 'body'} themeColor={isActive ? 'primary' : 'textSecondary'}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.pill,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
  },
});
