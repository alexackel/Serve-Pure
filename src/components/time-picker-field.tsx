import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  PERIOD_OPTIONS,
  composeTimeLabel,
  generateHourOptions,
  generateMinuteOptions,
  parseTimeLabel,
  timeLabelToMinutes,
  type Period,
} from '@/utils/dates';

export type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  required?: boolean;
  // When set (the End Time field passes the current Start Time), the sheet
  // disables Done and shows an inline warning for any pending selection at
  // or before this time — the earliest, most-visible place to stop a
  // negative-duration event, ahead of the submit-time backstop check.
  minTime?: string;
};

const HOURS = generateHourOptions();
const MINUTES = generateMinuteOptions();

// Three independent scrollable columns — hour / minute / AM-PM — rather
// than one long flat list of every 15-minute slot, which took too much
// scrolling to reach later times. A "Done" button confirms the combination
// since, unlike the old flat list, no single tap fully determines a time.
export function TimePickerField({ label, value, onChange, placeholder = 'Select a time', required, minTime }: TimePickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
        {required ? ' *' : ''}
      </ThemedText>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, { borderColor: theme.border }]}>
        <ThemedText
          type="body"
          themeColor={value ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={styles.valueText}>
          {value || placeholder}
        </ThemedText>
        <Ionicons name="time-outline" size={18} color={theme.textSecondary} style={styles.icon} />
      </Pressable>

      {open && (
        <TimePickerSheet
          label={label}
          value={value}
          minTime={minTime}
          onDone={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}

function TimePickerSheet({
  label,
  value,
  minTime,
  onDone,
  onDismiss,
}: {
  label: string;
  value: string;
  minTime?: string;
  onDone: (time: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const seed = useMemo(() => parseTimeLabel(value), [value]);

  const [hour, setHour] = useState(seed?.hour ?? 9);
  const [minute, setMinute] = useState(seed?.minute ?? '00');
  const [period, setPeriod] = useState<Period>(seed?.period ?? 'AM');

  const pendingLabel = composeTimeLabel(hour, minute, period);
  const minMinutes = minTime ? timeLabelToMinutes(minTime) : null;
  const isTooEarly = minMinutes !== null && (timeLabelToMinutes(pendingLabel) ?? 0) <= minMinutes;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </View>
      <View
        style={[
          styles.sheet,
          CardShadow,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="h3" style={styles.title}>
          {label}
        </ThemedText>

        <View style={styles.columns}>
          <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
            {HOURS.map((option) => (
              <PickerOption key={option} active={option === hour} label={String(option)} onPress={() => setHour(option)} />
            ))}
          </ScrollView>
          <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
            {MINUTES.map((option) => (
              <PickerOption key={option} active={option === minute} label={option} onPress={() => setMinute(option)} />
            ))}
          </ScrollView>
          <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
            {PERIOD_OPTIONS.map((option) => (
              <PickerOption key={option} active={option === period} label={option} onPress={() => setPeriod(option)} />
            ))}
          </ScrollView>
        </View>

        {isTooEarly && (
          <ThemedText type="caption" themeColor="error" style={styles.warning}>
            End time must be after start time.
          </ThemedText>
        )}

        <Pressable
          onPress={() => onDone(pendingLabel)}
          disabled={isTooEarly}
          style={[styles.doneButton, { backgroundColor: theme.primary, opacity: isTooEarly ? 0.5 : 1 }]}>
          <ThemedText type="bodyBold" themeColor="background">
            Done
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

function PickerOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.optionRow, active && { backgroundColor: theme.primaryTint }]}>
      <ThemedText type="body" themeColor={active ? 'primary' : 'text'} style={styles.optionText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  valueText: {
    flexShrink: 1,
  },
  icon: {
    flexShrink: 0,
    marginLeft: Spacing.one,
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
  },
  title: {
    marginBottom: Spacing.three,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.two,
    height: 220,
  },
  column: {
    flex: 1,
  },
  optionRow: {
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    textAlign: 'center',
  },
  warning: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  doneButton: {
    marginTop: Spacing.three,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
