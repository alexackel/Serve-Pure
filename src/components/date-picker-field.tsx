import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { startOfDay } from '@/utils/dates';

export type DatePickerFieldProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  required?: boolean;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// A month-grid calendar in a centered Modal (not bottom-pinned like
// FilterSheet/TimePickerField — a fixed-size grid isn't a scrollable list).
// Same conditionally-mounted Modal convention as the rest of this codebase's
// sheets: mounted only while open, `visible` never toggled after mount.
export function DatePickerField({ label, value, onChange, placeholder = 'Select a date', required }: DatePickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const weeks = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const displayValue = value ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
        {required ? ' *' : ''}
      </ThemedText>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, { borderColor: theme.border }]}>
        <ThemedText
          type="body"
          themeColor={displayValue ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={styles.valueText}>
          {displayValue || placeholder}
        </ThemedText>
        <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} style={styles.icon} />
      </Pressable>

      {open && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          </View>
          <View style={styles.centerWrap}>
            <View style={[styles.card, CardShadow, { backgroundColor: theme.background }]}>
              <View style={styles.monthRow}>
                <Pressable
                  onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  hitSlop={8}>
                  <Ionicons name="chevron-back" size={20} color={theme.text} />
                </Pressable>
                <ThemedText type="bodyBold">{monthLabel}</ThemedText>
                <Pressable
                  onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  hitSlop={8}>
                  <Ionicons name="chevron-forward" size={20} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label2, i) => (
                  <ThemedText key={i} type="caption" themeColor="textSecondary" style={styles.cell}>
                    {label2}
                  </ThemedText>
                ))}
              </View>

              {weeks.map((week, i) => (
                <View key={i} style={styles.weekRow}>
                  {week.map((day, j) => {
                    if (!day) return <View key={j} style={styles.cell} />;
                    const disabled = day < today;
                    const selected = value !== null && isSameDay(day, value);
                    return (
                      <Pressable
                        key={j}
                        disabled={disabled}
                        onPress={() => {
                          onChange(day);
                          setOpen(false);
                        }}
                        style={[
                          styles.cell,
                          styles.dayCell,
                          selected && { backgroundColor: theme.primary, borderRadius: BorderRadius.pill },
                        ]}>
                        <ThemedText
                          type="body"
                          themeColor={selected ? 'background' : disabled ? 'textSecondary' : 'text'}>
                          {day.getDate()}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: 320,
    maxWidth: '100%',
    gap: Spacing.three,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  dayCell: {
    aspectRatio: 1,
  },
});
