import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useCardShadow, useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const router = useRouter();
  const { session, signOut, activeAccountType } = useSession();

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">Settings</ThemedText>

      {activeAccountType === 'personal' && session && <ContactExportConsentRow userId={session.user.id} />}

      <ThemedView style={[styles.card, cardShadow, { borderColor: theme.border }]}>
        {activeAccountType === 'personal' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/organization-signup')}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Ionicons name="business-outline" size={18} color={theme.primary} />
            <ThemedText type="bodyBold" themeColor="primary">
              Set up organization account
            </ThemedText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => signOut()}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={18} color={theme.error} />
          <ThemedText type="bodyBold" themeColor="error">
            Sign Out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScreenScrollView>
  );
}

// Self-contained on purpose: auth-context's Profile type only carries
// accountType today, and this is the only screen that needs the consent
// flag, so it fetches/updates it directly rather than widening that type.
function ContactExportConsentRow({ userId }: { userId: string }) {
  const theme = useTheme();
  const cardShadow = useCardShadow();
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('contact_export_consent')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setConsent(data.contact_export_consent);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleToggle(next: boolean) {
    setConsent(next);
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ contact_export_consent: next }).eq('id', userId);
    if (error) {
      console.error('Failed to update contact_export_consent', error);
      setConsent(!next);
    }
    setSaving(false);
  }

  return (
    <ThemedView style={[styles.card, cardShadow, { borderColor: theme.border }]}>
      <View style={styles.consentRow}>
        <View style={styles.consentText}>
          <ThemedText type="bodyBold">Share my contact info with organizations</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Lets organizations you volunteer with include your contact info in their roster exports. Off by default.
          </ThemedText>
        </View>
        <Switch
          value={consent}
          onValueChange={handleToggle}
          disabled={saving}
          trackColor={{ false: theme.border, true: theme.primary }}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
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
  pressed: {
    opacity: 0.7,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  consentText: {
    flex: 1,
    gap: Spacing.half,
  },
});
