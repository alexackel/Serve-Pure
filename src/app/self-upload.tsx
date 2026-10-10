import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { CategoryChipRow } from '@/components/find';
import { FormField } from '@/components/form-field';
import { GroupMultiSelectList } from '@/components/group-multi-select-list';
import { MentionInput } from '@/components/mention-input';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useGroups } from '@/context/groups-context';
import { useOrganization } from '@/context/organization-context';
import { createSelfReport, getSelfReportForEdit, resubmitSelfReport, type SelfReportGroupStatus } from '@/data/self-reports';
import { useTheme } from '@/hooks/use-theme';
import { formatDateInput, parseDateInput } from '@/utils/dates';
import { pickAndUploadPhoto } from '@/utils/photo-upload';

type YesNo = 'yes' | 'no' | '';

const WORKED_WITH_ORG_OPTIONS: readonly { key: YesNo; label: string }[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
];

const GROUP_STATUS_LABEL: Record<SelfReportGroupStatus['status'], string> = {
  pending: 'Still reviewing',
  approved: 'Approved',
  awaiting_resubmission: 'Awaiting your update',
  denied_final: "Denied — won't see this update",
};

export default function SelfUploadScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { viewMode } = useOrganization();
  const { groups, myGroupIds, isAdmin } = useGroups();
  const {
    editRecordId,
    prefillTitle,
    prefillOrgName,
    prefillOrgEmail,
    prefillDate,
    prefillHours,
    prefillPhotoUrl,
  } = useLocalSearchParams<{
    editRecordId?: string;
    prefillTitle?: string;
    prefillOrgName?: string;
    prefillOrgEmail?: string;
    prefillDate?: string;
    prefillHours?: string;
    prefillPhotoUrl?: string;
  }>();
  const isEditMode = !!editRecordId;

  // Arriving from the "Volunteer with Friends" post-event prompt
  // (src/components/friend-event-followup-modal.tsx) seeds these from nav
  // params — read once as lazy initial state, since isEditMode/prefill* are
  // stable for the life of this screen and the edit-mode load effect below
  // overwrites them anyway once it resolves.
  const [activityTitle, setActivityTitle] = useState(() => (isEditMode ? '' : prefillTitle ?? ''));
  const [activityOrgName, setActivityOrgName] = useState(() => (isEditMode ? '' : prefillOrgName ?? ''));
  const [date, setDate] = useState(() => (isEditMode ? '' : prefillDate ?? ''));
  const [hours, setHours] = useState(() => (isEditMode ? '' : prefillHours ?? ''));
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(() => (isEditMode ? undefined : prefillPhotoUrl || undefined));
  const [workedThroughOrg, setWorkedThroughOrg] = useState<YesNo>(() => (!isEditMode && prefillOrgName ? 'yes' : ''));
  const [orgContactEmail, setOrgContactEmail] = useState(() => (isEditMode ? '' : prefillOrgEmail ?? ''));
  const [orgContactPhone, setOrgContactPhone] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [existingGroups, setExistingGroups] = useState<SelfReportGroupStatus[]>([]);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  const allMyGroups = useMemo(() => groups.filter((group) => myGroupIds.includes(group.id)), [groups, myGroupIds]);

  // A group you administer can never approve your own submission (the
  // review-time self-dealing block, 0035, would refuse it forever — in a
  // single-admin group, permanently), so it's not offered as a target here
  // in the first place. The same rule is enforced again at submit time by
  // the report_groups_insert_submitter RLS policy (0038) as a backstop.
  const eligibleGroups = useMemo(
    () => allMyGroups.filter((group) => !isAdmin(group.id)).map((group) => ({ id: group.id, name: group.name })),
    [allMyGroups, isAdmin],
  );

  // Defense in depth — the FAB already hides this option in organization
  // context, but a direct navigation shouldn't be trusted either.
  useEffect(() => {
    if (viewMode === 'organization') {
      router.replace('/find');
    }
  }, [viewMode]);

  useEffect(() => {
    if (!editRecordId) return;
    let cancelled = false;
    async function loadForEdit() {
      setIsLoadingEdit(true);
      try {
        const record = await getSelfReportForEdit(editRecordId!);
        if (cancelled || !record) return;
        setActivityTitle(record.activityTitle);
        setActivityOrgName(record.activityOrgName ?? '');
        setWorkedThroughOrg(record.activityOrgName ? 'yes' : 'no');
        setDate(formatDateInput(new Date(record.date)));
        setHours(String(record.hoursClaimed));
        setNotes(record.notes ?? '');
        setPhotoUrl(record.photoUrl ?? undefined);
        setOrgContactEmail(record.orgContactEmail ?? '');
        setOrgContactPhone(record.orgContactPhone ?? '');
        setExistingGroups(record.groups);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load this report.');
      } finally {
        if (!cancelled) setIsLoadingEdit(false);
      }
    }
    loadForEdit();
    return () => {
      cancelled = true;
    };
  }, [editRecordId]);

  if (viewMode === 'organization') {
    return null;
  }

  const handlePickPhoto = async () => {
    if (!session) return;
    setError(null);
    setIsUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto(session.user.id);
      if (url) setPhotoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setError(null);

    if (!activityTitle.trim() || !date.trim() || !hours.trim()) {
      setError('Title, date, and hours are required.');
      return;
    }

    if (workedThroughOrg === 'yes' && !activityOrgName.trim()) {
      setError('Enter the organization you worked with.');
      return;
    }

    const day = parseDateInput(date);
    if (!day) {
      setError('Enter a valid date as MM/DD/YYYY.');
      return;
    }

    const hoursClaimed = Number(hours);
    if (!Number.isFinite(hoursClaimed) || hoursClaimed <= 0) {
      setError('Enter a valid number of hours.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await resubmitSelfReport({
          recordId: editRecordId!,
          activityTitle: activityTitle.trim(),
          activityOrgName: workedThroughOrg === 'yes' ? activityOrgName.trim() : undefined,
          date: day.toISOString(),
          hoursClaimed,
          notes: notes.trim() || undefined,
          photoUrl,
          orgContactEmail: workedThroughOrg === 'yes' ? orgContactEmail.trim() || undefined : undefined,
          orgContactPhone: workedThroughOrg === 'yes' ? orgContactPhone.trim() || undefined : undefined,
        });
      } else {
        await createSelfReport(session.user.id, {
          activityTitle: activityTitle.trim(),
          activityOrgName: workedThroughOrg === 'yes' ? activityOrgName.trim() : undefined,
          date: day.toISOString(),
          hoursClaimed,
          notes: notes.trim() || undefined,
          photoUrl,
          orgContactEmail: workedThroughOrg === 'yes' ? orgContactEmail.trim() || undefined : undefined,
          orgContactPhone: workedThroughOrg === 'yes' ? orgContactPhone.trim() || undefined : undefined,
          groupIds: selectedGroupIds,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  const showOrgContactHint = workedThroughOrg === 'yes' && !orgContactEmail.trim() && !orgContactPhone.trim();

  if (isLoadingEdit) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/you" />
        <ThemedText type="h3">Loading…</ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/you" />

      <ThemedText type="h1">{isEditMode ? 'Update Activity' : 'Self Upload'}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        {isEditMode
          ? 'Fix what a reviewer flagged and resubmit. Groups that already made a decision won’t see this update.'
          : "Log a volunteer activity from outside the app. It'll show as pending until an organization or group admin verifies it."}
      </ThemedText>

      <FormField label="Activity title" value={activityTitle} onChangeText={setActivityTitle} placeholder="Beach cleanup" required />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Did you work through an organization?
        </ThemedText>
        <CategoryChipRow chips={WORKED_WITH_ORG_OPTIONS} activeKey={workedThroughOrg} onChange={setWorkedThroughOrg} />
      </View>

      {workedThroughOrg === 'yes' && (
        <>
          <FormField
            label="Organization"
            value={activityOrgName}
            onChangeText={setActivityOrgName}
            placeholder="Who did you volunteer with?"
            required
          />
          <FormField
            label="Organization contact email"
            value={orgContactEmail}
            onChangeText={setOrgContactEmail}
            placeholder="contact@org.org"
            keyboardType="email-address"
          />
          <FormField
            label="Organization contact phone"
            value={orgContactPhone}
            onChangeText={setOrgContactPhone}
            placeholder="(555) 555-5555"
            keyboardType="phone-pad"
          />
          {showOrgContactHint && (
            <ThemedText type="caption" themeColor="textSecondary">
              Adding the organization&apos;s contact info helps them verify your hours faster.
            </ThemedText>
          )}
        </>
      )}

      <View style={styles.row}>
        <View style={styles.rowField}>
          <FormField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="MM/DD/YYYY"
            keyboardType="numbers-and-punctuation"
            required
          />
        </View>
        <View style={styles.rowField}>
          <FormField label="Hours" value={hours} onChangeText={setHours} placeholder="3" keyboardType="decimal-pad" required />
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          What did you do?
        </ThemedText>
        <MentionInput value={notes} onChangeText={setNotes} placeholder="Describe what you did" />
      </View>

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          Proof photo
        </ThemedText>
        {photoUrl ? (
          <View>
            <Pressable onPress={handlePickPhoto} disabled={isUploadingPhoto}>
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} contentFit="cover" />
            </Pressable>
            <Pressable onPress={() => setPhotoUrl(undefined)} style={[styles.removePhoto, { backgroundColor: theme.background }]}>
              <Ionicons name="close" size={16} color={theme.text} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handlePickPhoto}
            disabled={isUploadingPhoto}
            style={[styles.photoButton, { borderColor: theme.border }]}>
            <Ionicons name="image-outline" size={20} color={theme.textSecondary} />
            <ThemedText type="body" themeColor="textSecondary">
              {isUploadingPhoto ? 'Uploading…' : 'Add a photo'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.field}>
        <ThemedText type="label" themeColor="textSecondary">
          {isEditMode ? 'Groups reviewing this' : 'Send to groups for review'}
        </ThemedText>
        {isEditMode ? (
          <ThemedView style={styles.groupStatusList}>
            {existingGroups.map((group) => (
              <View key={group.groupId} style={[styles.groupStatusRow, { borderColor: theme.border }]}>
                <ThemedText type="body" style={styles.name}>
                  {group.groupName}
                </ThemedText>
                <ThemedText
                  type="caption"
                  themeColor={group.status === 'denied_final' ? 'error' : 'textSecondary'}>
                  {GROUP_STATUS_LABEL[group.status]}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        ) : allMyGroups.length > 0 && eligibleGroups.length === 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            You administer all of your groups, so none of them can review this — it&apos;ll stay pending until an
            organization verifies it.
          </ThemedText>
        ) : (
          <GroupMultiSelectList groups={eligibleGroups} selectedIds={selectedGroupIds} onToggle={toggleGroup} />
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
          {isSubmitting ? 'Submitting…' : isEditMode ? 'Resubmit' : 'Submit'}
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
  name: {
    flex: 1,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.four,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
  },
  removePhoto: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: BorderRadius.pill,
    padding: Spacing.one,
  },
  groupStatusList: {
    gap: Spacing.one,
  },
  groupStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
