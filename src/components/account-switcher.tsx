import { Ionicons } from '@expo/vector-icons';
import { useTabTrigger } from 'expo-router/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { PillIconButton } from '@/components/pill-icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useOrganization } from '@/context/organization-context';
import { useTheme } from '@/hooks/use-theme';
import type { DeviceAccount } from '@/lib/device-accounts';

import { SwitchViewModeButton } from '@/components/switch-view-mode-button';

// Shows the logins signed into on this device and switches between them.
// Falls back to the older personal/org toggle for admins who have only one
// login on the device (their org access comes from org_admins).
export function AccountSwitcher({ current }: { current: 'personal' | 'organization' }) {
  const theme = useTheme();
  const router = useRouter();
  const { deviceAccounts, activeUserId, switchAccount } = useSession();
  const { activeOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { switchTab } = useTabTrigger({ name: 'you', href: '/you' });

  if (deviceAccounts.length <= 1) {
    return <SwitchViewModeButton target={current === 'organization' ? 'personal' : 'organization'} />;
  }

  const activeAccount = deviceAccounts.find((account) => account.userId === activeUserId) ?? deviceAccounts[0];

  const handleSelect = async (account: DeviceAccount) => {
    setOpen(false);
    setError(null);
    const result = await switchAccount(account.userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    switchTab(account.accountType === 'organization' ? 'org-you' : 'you', {});
  };

  const labelFor = (account: DeviceAccount) =>
    account.accountType === 'organization'
      ? account.userId === activeUserId && activeOrganization
        ? activeOrganization.name
        : `Organization · ${account.email}`
      : 'Personal';

  return (
    <>
      <PillIconButton
        icon="swap-horizontal"
        label={labelFor(activeAccount)}
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => undefined}>
            <ThemedView style={[styles.menu, CardShadow, { borderColor: theme.border }]}>
              {deviceAccounts.map((account) => {
                const selected = account.userId === activeUserId;
                return (
                  <Pressable
                    key={account.userId}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelect(account)}
                    style={styles.row}>
                    <Ionicons
                      name={account.accountType === 'organization' ? 'business-outline' : 'person-outline'}
                      size={18}
                      color={theme.textSecondary}
                    />
                    <ThemedText type="body" style={styles.rowLabel}>
                      {labelFor(account)}
                    </ThemedText>
                    {selected && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => {
                  setOpen(false);
                  router.push('/add-account');
                }}
                style={styles.row}>
                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                <ThemedText type="body" themeColor="primary" style={styles.rowLabel}>
                  Sign in to another account
                </ThemedText>
              </Pressable>
              {error && (
                <ThemedText type="caption" themeColor="error" style={styles.error}>
                  {error}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingHorizontal: Spacing.four,
  },
  menu: {
    minWidth: 240,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
  error: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
