import { useTabTrigger } from 'expo-router/ui';

import { PillIconButton } from '@/components/pill-icon-button';
import { useOrganization } from '@/context/organization-context';

export function SwitchViewModeButton({ target }: { target: 'organization' | 'personal' }) {
  const { activeOrganization, organizations, switchToOrganization, switchToPersonal } = useOrganization();
  const { switchTab } = useTabTrigger(
    target === 'organization' ? { name: 'org-you', href: '/org-you' } : { name: 'you', href: '/you' },
  );

  // Nothing to switch into if the account doesn't admin any organizations
  // (there's no Create Organization flow yet).
  if (target === 'organization' && organizations.length === 0) {
    return null;
  }

  const handlePress = () => {
    if (target === 'organization') {
      if (!activeOrganization) return;
      switchToOrganization(activeOrganization.id);
      switchTab('org-you', {});
    } else {
      switchToPersonal();
      switchTab('you', {});
    }
  };

  return (
    <PillIconButton
      icon="swap-horizontal"
      label={target === 'organization' ? 'Organization' : 'Personal'}
      onPress={handlePress}
    />
  );
}
