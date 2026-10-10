import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { DatePickerField } from '@/components/date-picker-field';
import { FormField } from '@/components/form-field';
import { GroupMultiSelectList } from '@/components/group-multi-select-list';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { TimePickerField } from '@/components/time-picker-field';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useGroups } from '@/context/groups-context';
import { createFriendEvent, geocodeAddress } from '@/data/events';
import { useTheme } from '@/hooks/use-theme';
import { parseTimeInput } from '@/utils/dates';
import { loadLastAddress, saveLastAddress } from '@/utils/last-address';

export default function CreateFriendEventScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { groups, myGroupIds } = useGroups();

  const lastAddress = loadLastAddress();

  const [activityTitle, setActivityTitle] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState(lastAddress?.street ?? '');
  const [city, setCity] = useState(lastAddress?.city ?? '');
  const [state, setState] = useState(lastAddress?.state ?? '');
  const [zip, setZip] = useState(lastAddress?.zip ?? '');
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);

  const myGroups = useMemo(
    () => groups.filter((group) => myGroupIds.includes(group.id)).map((group) => ({ id: group.id, name: group.name })),
    [groups, myGroupIds],
  );

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  const handleSubmit = async () => {
    if (!session) return;
    setError(null);
    setAddressWarning(null);

    if (!activityTitle.trim() || !orgName.trim() || !date || !startTime.trim() || !hours.trim()) {
      setError('Title, organization, date, start time, and length are required.');
      return;
    }

    const hasAnyAddressField = street.trim() || city.trim() || state.trim() || zip.trim();
    const hasFullAddress = street.trim() && city.trim() && state.trim() && zip.trim();
    if (hasAnyAddressField && !hasFullAddress) {
      setError('Enter a full address (street, city, state, and zip), or leave location blank.');
      return;
    }

    const start = parseTimeInput(date, startTime);
    if (!start) {
      setError('Enter a valid start time.');
      return;
    }
    if (start <= new Date()) {
      setError('Pick a date and time in the future.');
      return;
    }

    const hoursNumber = Number(hours);
    if (!Number.isFinite(hoursNumber) || hoursNumber <= 0) {
      setError('Enter a valid number of hours.');
      return;
    }

    const end = new Date(start.getTime() + hoursNumber * 60 * 60 * 1000);

    setIsSubmitting(true);
    try {
      let address: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (hasFullAddress) {
        const fullAddress = `${street.trim()}, ${city.trim()}, ${state.trim()} ${zip.trim()}`;
        const geocoded = await geocodeAddress(fullAddress);
        if (!geocoded) {
          setAddressWarning("We couldn't verify this address — double check it, or continue anyway.");
        }
        address = geocoded?.formattedAddress ?? fullAddress;
        latitude = geocoded?.latitude;
        longitude = geocoded?.longitude;
      }

      const event = await createFriendEvent(session.user.id, {
        activityTitle: activityTitle.trim(),
        orgName: orgName.trim(),
        orgContactEmail: orgContactEmail.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        address,
        latitude,
        longitude,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        sharedGroupIds: selectedGroupIds,
      });
      if (hasFullAddress) {
        saveLastAddress({ street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() });
      }
      router.replace({ pathname: '/event/[id]', params: { id: event.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />

        <ThemedText type="h1">Volunteer with Friends</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Invite your friends to join you at an organization. No proof photo needed up front — everyone who joins
          confirms afterward.
        </ThemedText>

        <FormField label="Activity title" value={activityTitle} onChangeText={setActivityTitle} placeholder="Beach cleanup" required />

        <FormField
          label="Organization"
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Who are you volunteering with?"
          required
        />
        <FormField
          label="Organization contact email"
          value={orgContactEmail}
          onChangeText={setOrgContactEmail}
          placeholder="contact@org.org"
          keyboardType="email-address"
        />
        <FormField label="Organization website" value={website} onChangeText={setWebsite} placeholder="https://…" keyboardType="url" />

        <FormField label="Street address" value={street} onChangeText={setStreet} placeholder="400 River Rd (optional)" />
        <View style={styles.row}>
          <View style={[styles.rowField, { flex: 2 }]}>
            <FormField label="City" value={city} onChangeText={setCity} placeholder="San Francisco" />
          </View>
          <View style={styles.rowField}>
            <FormField label="State" value={state} onChangeText={setState} placeholder="CA" />
          </View>
          <View style={styles.rowField}>
            <FormField label="Zip" value={zip} onChangeText={setZip} placeholder="94110" keyboardType="number-pad" />
          </View>
        </View>
        {addressWarning && (
          <View style={[styles.errorBanner, { backgroundColor: theme.warningBackground }]}>
            <Ionicons name="warning-outline" size={16} color={theme.warning} />
            <ThemedText type="body" themeColor="warning" style={styles.errorText}>
              {addressWarning}
            </ThemedText>
          </View>
        )}

        <DatePickerField label="Date" value={date} onChange={setDate} required />
        <View style={styles.row}>
          <View style={styles.rowField}>
            <TimePickerField label="Start time" value={startTime} onChange={setStartTime} required />
          </View>
          <View style={styles.rowField}>
            <FormField label="Length (hours)" value={hours} onChangeText={setHours} placeholder="3" keyboardType="decimal-pad" required />
          </View>
        </View>

        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What will you be doing?"
          multiline
        />

        <View style={styles.field}>
          <ThemedText type="label" themeColor="textSecondary">
            Share with groups
          </ThemedText>
          {myGroups.length > 0 ? (
            <GroupMultiSelectList groups={myGroups} selectedIds={selectedGroupIds} onToggle={toggleGroup} />
          ) : (
            <ThemedText type="caption" themeColor="textSecondary">
              You&apos;re not in any groups yet — this will only be visible to your friends.
            </ThemedText>
          )}
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.errorBackground }]}>
            <Ionicons name="warning-outline" size={16} color={theme.error} />
            <ThemedText type="body" themeColor="error" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submit, { backgroundColor: theme.primary }]}>
          <ThemedText type="bodyBold" themeColor="background">
            {isSubmitting ? 'Posting…' : 'Post'}
          </ThemedText>
        </Pressable>
      </ScreenScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowField: {
    flex: 1,
  },
  field: {
    gap: Spacing.one,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
  },
  submit: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
});
