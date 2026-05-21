import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { DataBackupSheet } from "@/components/data-backup-sheet";
import {
  getActiveDraftWorkout,
  listCompletedWorkouts,
  type LoggedWorkout,
} from "@/db/workoutsRepository";
import { useRoutines } from "@/state/routines";
import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function LogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoutines } = useRoutines();

  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const dateRowRefs = useRef<Record<string, View | null>>({});

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jumpSheetOpen, setJumpSheetOpen] = useState(false);
  const [selectedJumpMonthKey, setSelectedJumpMonthKey] = useState<
    string | null
  >(null);
  const [activeDraft, setActiveDraft] = useState<LoggedWorkout | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);

  const visibleWorkouts = useMemo(
    () => (activeDraft ? [activeDraft, ...workouts] : workouts),
    [activeDraft, workouts],
  );
  const monthGroups = useMemo(
    () => buildLogMonthIndex(visibleWorkouts),
    [visibleWorkouts],
  );
  const workoutDateCounts = useMemo(
    () => buildWorkoutDateCounts(visibleWorkouts),
    [visibleWorkouts],
  );
  const selectedMonthIndex = monthGroups.findIndex(
    (group) => group.key === selectedJumpMonthKey,
  );
  const selectedMonth =
    selectedMonthIndex >= 0 ? monthGroups[selectedMonthIndex] : monthGroups[0];
  const selectedCalendarDays = selectedMonth
    ? buildCalendarDays(selectedMonth.key, workoutDateCounts)
    : [];

  useEffect(() => {
    dateRowRefs.current = {};
  }, [activeDraft?.id, workouts]);

  useEffect(() => {
    if (monthGroups.length === 0) {
      setSelectedJumpMonthKey(null);
      return;
    }

    if (
      !selectedJumpMonthKey ||
      !monthGroups.some((group) => group.key === selectedJumpMonthKey)
    ) {
      setSelectedJumpMonthKey(monthGroups[0].key);
    }
  }, [monthGroups, selectedJumpMonthKey]);

  const openWorkout = useCallback(
    (workout: LoggedWorkout) => {
      router.push({
        pathname: "/workout/[workoutId]",
        params: { workoutId: workout.id },
      });
    },
    [router],
  );

  const loadLogData = useCallback(async () => {
    const [savedWorkouts, draftWorkout] = await Promise.all([
      listCompletedWorkouts(),
      getActiveDraftWorkout(),
    ]);
    setWorkouts(savedWorkouts);
    setActiveDraft(draftWorkout);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      setIsLoading(true);
      setIsStartingWorkout(false);
      setError(null);
      loadLogData()
        .catch((loadError) => {
          console.error("Failed to load logged workouts", loadError);
          if (mounted) {
            setError("Could not load workouts.");
            setWorkouts([]);
            setActiveDraft(null);
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [loadLogData]),
  );

  const refreshAfterDataChange = useCallback(async () => {
    await Promise.all([loadLogData(), refreshRoutines()]);
  }, [loadLogData, refreshRoutines]);

  const scrollToDateKey = useCallback(
    (dateKey: string) => {
      const node = dateRowRefs.current[dateKey];
      setJumpSheetOpen(false);

      if (!node) {
        console.warn("No row ref for date", dateKey);
        return;
      }

      setTimeout(() => {
        node.measureInWindow((_x, y) => {
          const targetScreenY = insets.top + 100; // roughly below the header
          const delta = y - targetScreenY;
          const nextScrollY = Math.max(0, scrollYRef.current + delta);

          scrollViewRef.current?.scrollTo({
            y: nextScrollY,
            animated: true,
          });
        });
      }, animations.sheetDuration + 40);
    },
    [insets.top],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screenRoot}>
        <AppHeader
          onMenuPress={() => setMenuOpen(true)}
          rightAccessory={
            <Pressable
              accessibilityLabel="Jump to date"
              accessibilityRole="button"
              onPress={() => {
                setSelectedJumpMonthKey(
                  (current) => current ?? monthGroups[0]?.key ?? null,
                );
                setJumpSheetOpen(true);
              }}
              style={styles.headerIconButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="calendar-month-outline"
                size={23}
              />
            </Pressable>
          }
          title="Logged Workouts"
        />

        <ScrollView
          ref={scrollViewRef}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.stateText}>{error}</Text> : null}
          {!isLoading && !error && !activeDraft && workouts.length === 0 ? (
            <Text style={styles.stateText}>No logged workouts yet.</Text>
          ) : null}
          {visibleWorkouts.map((workout, index) => {
            const previousWorkout =
              index > 0 ? visibleWorkouts[index - 1] : null;
            const currentYear = getWorkoutYear(workout);
            const previousYear = previousWorkout
              ? getWorkoutYear(previousWorkout)
              : null;
            const dateKey = getWorkoutDateKey(workout);
            const previousDateKey = previousWorkout
              ? getWorkoutDateKey(previousWorkout)
              : null;
            const isFirstOfDate = dateKey !== previousDateKey;
            const showYearSeparator = index > 0 && currentYear !== previousYear;

            return (
              <View key={workout.id}>
                {showYearSeparator ? (
                  <View style={styles.yearSeparator}>
                    <View style={styles.yearLine} />
                    <Text style={styles.yearText}>{currentYear}</Text>
                    <View style={styles.yearLine} />
                  </View>
                ) : null}

                <View
                  collapsable={false}
                  ref={(node) => {
                    if (dateKey && isFirstOfDate) {
                      dateRowRefs.current[dateKey] = node;
                    }
                  }}
                  style={styles.entry}
                >
                  <View style={styles.dateColumn}>
                    <Text style={styles.weekday}>{workout.weekday}</Text>
                    <Text style={styles.day}>{workout.day}</Text>
                    <Text style={styles.month}>{workout.month}</Text>
                    {index < visibleWorkouts.length - 1 ? (
                      <View style={styles.timelineLine} />
                    ) : null}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openWorkout(workout)}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.workoutTitle}>{workout.name}</Text>
                      {workout.status === "draft" ? (
                        <Text style={styles.draftBadge}>In Progress</Text>
                      ) : (
                        <Text style={styles.duration}>
                          {workout.durationMinutes === null
                            ? "-- min"
                            : `${workout.durationMinutes} min`}
                        </Text>
                      )}
                    </View>

                    <View style={styles.exerciseList}>
                      {workout.exercises.map((exercise, exerciseIndex) => (
                        <Text
                          key={`${exercise}-${exerciseIndex}`}
                          style={styles.exerciseText}
                        >
                          {exercise}
                        </Text>
                      ))}
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {activeDraft ? (
          <Pressable
            accessibilityLabel="Resume workout"
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/workout/[workoutId]",
                params: { workoutId: activeDraft.id },
              })
            }
            style={({ pressed }) => [
              styles.resumePill,
              pressed && styles.resumePillPressed,
            ]}
          >
            <Text style={styles.resumeLabel}>Resume Workout</Text>
            <Text style={styles.resumeTitle}>{activeDraft.name}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Start workout"
            accessibilityRole="button"
            disabled={isStartingWorkout}
            onPress={async () => {
              if (isStartingWorkout) return;
              setIsStartingWorkout(true);
              try {
                const draftWorkout = await getActiveDraftWorkout();
                if (draftWorkout) {
                  openWorkout(draftWorkout);
                  return;
                }
                router.push("/workout/new");
              } catch (startError) {
                console.error("Failed to start workout", startError);
                setIsStartingWorkout(false);
              }
            }}
            style={({ pressed }) => [
              styles.floatingAddButton,
              isStartingWorkout && styles.disabledAction,
              pressed && styles.addButtonPressed,
            ]}
          >
            <View style={styles.plusIcon}>
              <View style={styles.plusVertical} />
              <View style={styles.plusHorizontal} />
            </View>
          </Pressable>
        )}

        <DataBackupSheet
          onClose={() => setMenuOpen(false)}
          onDataChanged={refreshAfterDataChange}
          visible={menuOpen}
        />

        <BottomSheet
          maxHeight="82%"
          onClose={() => setJumpSheetOpen(false)}
          title="Jump to Date"
          visible={jumpSheetOpen}
        >
          <ScrollView
            contentContainerStyle={[
              styles.jumpListContent,
              { paddingBottom: insets.bottom + spacing.xxxl },
            ]}
            showsVerticalScrollIndicator={false}
            style={styles.jumpList}
          >
            {!selectedMonth ? (
              <Text style={styles.jumpEmptyText}>No workouts to jump to.</Text>
            ) : null}
            {selectedMonth ? (
              <>
                <View style={styles.calendarHeader}>
                  <Pressable
                    accessibilityLabel="Older month"
                    accessibilityRole="button"
                    disabled={
                      selectedMonthIndex < 0 ||
                      selectedMonthIndex >= monthGroups.length - 1
                    }
                    onPress={() => {
                      const nextGroup = monthGroups[selectedMonthIndex + 1];
                      if (nextGroup) setSelectedJumpMonthKey(nextGroup.key);
                    }}
                    style={({ pressed }) => [
                      styles.calendarNavButton,
                      (selectedMonthIndex < 0 ||
                        selectedMonthIndex >= monthGroups.length - 1) &&
                        styles.calendarNavDisabled,
                      pressed && styles.sheetActionPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.accent}
                      name="chevron-left"
                      size={24}
                    />
                  </Pressable>

                  <View style={styles.calendarTitleGroup}>
                    <Text style={styles.calendarTitle}>
                      {selectedMonth.monthLabel} {selectedMonth.year}
                    </Text>
                    <Text style={styles.calendarSubtitle}>
                      {selectedMonth.workoutCount}{" "}
                      {selectedMonth.workoutCount === 1
                        ? "workout"
                        : "workouts"}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityLabel="Newer month"
                    accessibilityRole="button"
                    disabled={selectedMonthIndex <= 0}
                    onPress={() => {
                      const nextGroup = monthGroups[selectedMonthIndex - 1];
                      if (nextGroup) setSelectedJumpMonthKey(nextGroup.key);
                    }}
                    style={({ pressed }) => [
                      styles.calendarNavButton,
                      selectedMonthIndex <= 0 && styles.calendarNavDisabled,
                      pressed && styles.sheetActionPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.accent}
                      name="chevron-right"
                      size={24}
                    />
                  </Pressable>
                </View>

                <View style={styles.weekdayGrid}>
                  {WEEKDAY_LABELS.map((label, weekdayIndex) => (
                    <Text
                      key={`${label}-${weekdayIndex}`}
                      style={styles.calendarWeekday}
                    >
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {selectedCalendarDays.map((day) => (
                    <Pressable
                      accessibilityLabel={
                        day.hasWorkout
                          ? `Jump to ${day.label} ${selectedMonth.monthLabel}`
                          : undefined
                      }
                      accessibilityRole={day.hasWorkout ? "button" : undefined}
                      disabled={!day.hasWorkout}
                      key={day.key}
                      onPress={() => scrollToDateKey(day.key)}
                      style={({ pressed }) => [
                        styles.calendarDay,
                        !day.isInMonth && styles.calendarDayOutside,
                        day.hasWorkout && styles.calendarDayActive,
                        pressed && styles.sheetActionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !day.isInMonth && styles.calendarDayOutsideText,
                          day.hasWorkout && styles.calendarDayActiveText,
                        ]}
                      >
                        {day.label}
                      </Text>
                      {day.hasWorkout ? (
                        <View style={styles.calendarWorkoutDot} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.calendarHint}>
                  Dots mark days with workouts. Tap a marked date to jump.
                </Text>
              </>
            ) : null}
          </ScrollView>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

type WorkoutDateParts = {
  month: string;
  monthKey: string;
  monthNumber: string;
  year: string;
};

type LogMonthGroup = {
  key: string;
  monthLabel: string;
  workoutCount: number;
  year: string;
};

type CalendarDay = {
  hasWorkout: boolean;
  isInMonth: boolean;
  key: string;
  label: string;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildLogMonthIndex(workouts: LoggedWorkout[]): LogMonthGroup[] {
  const groups: LogMonthGroup[] = [];

  for (const workout of workouts) {
    const parts = getWorkoutDateParts(workout);
    const existingGroup = groups.find((group) => group.key === parts.monthKey);

    if (existingGroup) {
      existingGroup.workoutCount += 1;
      continue;
    }

    groups.push({
      key: parts.monthKey,
      year: parts.year,
      monthLabel: parts.month,
      workoutCount: 1,
    });
  }

  return groups;
}

function buildWorkoutDateCounts(workouts: LoggedWorkout[]) {
  const counts: Record<string, number> = {};

  for (const workout of workouts) {
    const dateKey = getWorkoutDateKey(workout);
    if (!dateKey) continue;
    counts[dateKey] = (counts[dateKey] ?? 0) + 1;
  }

  return counts;
}

function buildCalendarDays(
  monthKey: string,
  workoutDateCounts: Record<string, number>,
): CalendarDay[] {
  const [yearValue, monthValue] = monthKey.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  if (!year || !month) return [];

  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const days: CalendarDay[] = [];

  for (let index = 0; index < cells; index += 1) {
    const dayNumber = index - startOffset + 1;
    const date = new Date(year, month - 1, dayNumber);
    const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const key = formatDateKey(date);

    days.push({
      key,
      isInMonth,
      label: String(date.getDate()),
      hasWorkout: isInMonth && workoutDateCounts[key] > 0,
    });
  }

  return days;
}

function getWorkoutYear(workout: LoggedWorkout) {
  return getWorkoutDateParts(workout).year;
}

function getWorkoutDateKey(workout: LoggedWorkout) {
  const date = parseWorkoutDate(workout.date);
  if (!date) return null;

  return formatDateKey(date);
}

function getWorkoutDateParts(workout: LoggedWorkout): WorkoutDateParts {
  const date = parseWorkoutDate(workout.date);

  if (!date) {
    return {
      year: workout.year || "Unknown Year",
      month: workout.month || "Unknown",
      monthNumber: "unknown",
      monthKey: `${workout.year || "Unknown Year"}-unknown`,
    };
  }

  const year = date.getFullYear().toString();
  const monthNumber = date.getMonth() + 1;
  const month = date.toLocaleDateString("en-US", {
    month: "long",
  });
  const monthKey = `${year}-${String(monthNumber).padStart(2, "0")}`;

  return {
    year,
    month,
    monthNumber: String(monthNumber).padStart(2, "0"),
    monthKey,
  };
}

function parseWorkoutDate(value: string) {
  const trimmed = value.trim();
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 156,
    paddingTop: 0,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  yearSeparator: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    marginTop: -5,
  },
  yearLine: {
    backgroundColor: colors.borderMuted,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  yearText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  entry: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dateColumn: {
    alignItems: "center",
    marginTop: 7,
    marginRight: 12,
    marginLeft: 12,
    width: 31,
  },
  weekday: {
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: "uppercase",
    ...typography.dateWeekday,
  },
  day: {
    color: colors.textPrimary,
    letterSpacing: 0,
    ...typography.dateDay,
  },
  month: {
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: "uppercase",
    ...typography.dateMonth,
  },
  timelineLine: {
    backgroundColor: colors.borderMuted,
    flex: 1,
    marginTop: spacing.md,
    minHeight: 48,
    width: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 13,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    marginRight: 13,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: 6,
  },
  workoutTitle: {
    color: colors.textPrimary,
    flex: 1,
    ...typography.workoutTitle,
    fontSize: 16,
    lineHeight: 20,
  },
  duration: {
    color: colors.textSecondary,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 0,
    minWidth: 50,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textAlign: "center",
  },
  draftBadge: {
    color: colors.accent,
    backgroundColor: "rgba(91, 212, 224, 0.12)",
    borderColor: "rgba(91, 212, 224, 0.35)",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 0,
    minWidth: 80,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textAlign: "center",
  },
  exerciseList: {
    gap: 0,
  },
  exerciseText: {
    color: colors.textSecondary,
    ...typography.exercise,
    fontSize: 13,
  },
  floatingAddButton: {
    alignItems: "center",
    backgroundColor: colors.fabBackground,
    borderRadius: 16,
    bottom: 12,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    width: 60,
    zIndex: 20,
  },
  addButtonPressed: {
    opacity: animations.pressOpacity,
  },
  disabledAction: {
    opacity: 0.55,
  },
  resumePill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.fabBackground,
    borderRadius: radius.pill,
    bottom: 18,
    maxWidth: 520,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    width: "74%",
    zIndex: 20,
  },
  resumePillPressed: {
    opacity: animations.pressOpacity,
  },
  resumeLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
  },
  resumeTitle: {
    color: colors.background,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
    opacity: 0.72,
  },
  plusIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 22,
    position: "absolute",
    width: 2,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 2,
    position: "absolute",
    width: 22,
  },
  sheetActionPressed: {
    opacity: animations.pressOpacity,
  },
  jumpList: {
    maxHeight: 420,
  },
  jumpListContent: {
    gap: spacing.lg,
  },
  jumpEmptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.card,
    justifyContent: "space-between",
  },
  calendarNavButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.borderMuted,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  calendarNavDisabled: {
    opacity: 0.35,
  },
  calendarTitleGroup: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  calendarTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 24,
  },
  calendarSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
  weekdayGrid: {
    flexDirection: "row",
  },
  calendarWeekday: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 16,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: "14.285%",
  },
  calendarDayOutside: {
    opacity: 0.25,
  },
  calendarDayActive: {
    opacity: 1,
  },
  calendarDayText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
  },
  calendarDayOutsideText: {
    color: colors.textMuted,
  },
  calendarDayActiveText: {
    color: colors.textPrimary,
  },
  calendarWorkoutDot: {
    backgroundColor: colors.accent,
    borderRadius: radius.circle,
    height: 5,
    marginTop: spacing.xs,
    width: 5,
  },
  calendarHint: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: "center",
  },
});
