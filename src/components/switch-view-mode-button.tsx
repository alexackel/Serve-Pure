import { useTabTrigger } from 'expo-router/ui';

import { PillIconButton } from '@/components/pill-icon-button';
import { useOrganization } from '@/context/organization-context';

export function SwitchViewModeButton({ target }: { target: 'organization' | 'personal' }) {
  const { activeOrganization, switchToOrganization, switchToPersonal } = useOrganization();
  const { switchTab } = useTabTrigger(
    target === 'organization' ? { name: 'org-you', href: '/org-you' } : { name: 'you', href: '/you' },
  );

  const handlePress = () => {
    if (target === 'organization') {
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
