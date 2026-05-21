import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { DataBackupSheet } from "@/components/data-backup-sheet";
import {
  getExerciseProgressOptions,
  getExerciseProgressStat,
  getExerciseTrend,
  getExerciseWeightTrend,
  getPersonalRecords,
  getStatsOverview,
  getTopExercises,
  getWeeklyTrainingSummary,
  type ExerciseProgressOption,
  type ExerciseProgressStat,
  type ExerciseTrendMetric,
  type ExerciseTrendPoint,
  type ExerciseWeightTrendPoint,
  type ExerciseWeightTrendRange,
  type PersonalRecord,
  type StatsOverview,
  type TopExerciseStat,
  type WeeklyTrainingSummary,
} from "@/db/statisticsRepository";
import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

import {
  formatDateShort,
  formatDistance,
  formatDurationSeconds,
  formatEstimatedOneRepMax,
  formatNumber,
  formatPace,
  formatRecordType,
  formatRecordValue,
  formatTrendMetricLabel,
  formatTrendValue,
  formatVolumeKg,
  formatWeight,
  pluralise,
} from "./statUtils";

export function StatisticsScreen() {
  const selectedKeyRef = useRef<string | null>(null);

  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [topExercises, setTopExercises] = useState<TopExerciseStat[]>([]);
  const [progressOptions, setProgressOptions] = useState<
    ExerciseProgressOption[]
  >([]);
  const [selectedOption, setSelectedOption] =
    useState<ExerciseProgressOption | null>(null);
  const [progressStat, setProgressStat] =
    useState<ExerciseProgressStat | null>(null);
  const [trendMetric, setTrendMetric] =
    useState<ExerciseTrendMetric>("estimated1RM");
  const [trendPoints, setTrendPoints] = useState<ExerciseTrendPoint[]>([]);
  const [weightTrendRange, setWeightTrendRange] =
    useState<ExerciseWeightTrendRange>("weekly");
  const [weightTrendPoints, setWeightTrendPoints] = useState<
    ExerciseWeightTrendPoint[]
  >([]);
  const [isWeightTrendLoading, setIsWeightTrendLoading] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyTrainingSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  const loadStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        nextOverview,
        nextTopExercises,
        nextOptions,
        nextWeeklySummary,
        nextPersonalRecords,
      ] = await Promise.all([
        getStatsOverview(),
        getTopExercises(5),
        getExerciseProgressOptions(),
        getWeeklyTrainingSummary(4),
        getPersonalRecords(),
      ]);

      const nextSelected =
        nextOptions.find(
          (option) => getExerciseOptionKey(option) === selectedKeyRef.current,
        ) ??
        nextOptions[0] ??
        null;
      const nextTrendMetric = getPreferredTrendMetric(
        nextSelected?.exerciseType,
      );
      const nextProgress = nextSelected
        ? await getExerciseProgressStat({
            exerciseId: nextSelected.exerciseId,
            exerciseName: nextSelected.exerciseName,
          })
        : null;
      const nextTrend = nextSelected
        ? await getExerciseTrend({
            exerciseId: nextSelected.exerciseId,
            exerciseName: nextSelected.exerciseName,
            metric: nextTrendMetric,
            limit: 20,
          })
        : [];

      selectedKeyRef.current = nextSelected
        ? getExerciseOptionKey(nextSelected)
        : null;
      setOverview(nextOverview);
      setTopExercises(nextTopExercises);
      setProgressOptions(nextOptions);
      setSelectedOption(nextSelected);
      setProgressStat(nextProgress);
      setTrendMetric(nextTrendMetric);
      setTrendPoints(nextTrend);
      setWeightTrendPoints([]);
      setWeeklySummary(nextWeeklySummary);
      setPersonalRecords(nextPersonalRecords);
    } catch (loadError) {
      console.error("Failed to load statistics", loadError);
      setOverview(null);
      setTopExercises([]);
      setProgressOptions([]);
      setSelectedOption(null);
      setProgressStat(null);
      setTrendPoints([]);
      setWeightTrendPoints([]);
      setWeeklySummary([]);
      setPersonalRecords([]);
      setError("Could not load statistics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatistics();
    }, [loadStatistics]),
  );

  const selectExercise = useCallback((option: ExerciseProgressOption) => {
    selectedKeyRef.current = getExerciseOptionKey(option);
    setSelectedOption(option);
    setIsProgressLoading(true);
    const nextTrendMetric = getPreferredTrendMetric(option.exerciseType);
    setTrendMetric(nextTrendMetric);

    void Promise.all([
      getExerciseProgressStat({
        exerciseId: option.exerciseId,
        exerciseName: option.exerciseName,
      }),
      getExerciseTrend({
        exerciseId: option.exerciseId,
        exerciseName: option.exerciseName,
        metric: nextTrendMetric,
        limit: 20,
      }),
      getExerciseWeightTrend({
        exerciseId: option.exerciseId,
        exerciseName: option.exerciseName,
        range: weightTrendRange,
      }),
    ])
      .then(([nextProgress, nextTrend, nextWeightTrend]) => {
        setProgressStat(nextProgress);
        setTrendPoints(nextTrend);
        setWeightTrendPoints(nextWeightTrend);
      })
      .catch((progressError) => {
        console.error("Failed to load exercise progress", progressError);
        setProgressStat(null);
        setTrendPoints([]);
        setWeightTrendPoints([]);
      })
      .finally(() => setIsProgressLoading(false));
  }, [weightTrendRange]);

  useEffect(() => {
    if (!selectedOption) {
      setWeightTrendPoints([]);
      return;
    }

    let mounted = true;
    setIsWeightTrendLoading(true);
    void getExerciseWeightTrend({
      exerciseId: selectedOption.exerciseId,
      exerciseName: selectedOption.exerciseName,
      range: weightTrendRange,
    })
      .then((nextPoints) => {
        if (mounted) setWeightTrendPoints(nextPoints);
      })
      .catch((trendError) => {
        console.error("Failed to load weight trend", trendError);
        if (mounted) setWeightTrendPoints([]);
      })
      .finally(() => {
        if (mounted) setIsWeightTrendLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedOption, weightTrendRange]);

  const hasCompletedWorkouts = (overview?.totalCompletedWorkouts ?? 0) > 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screenRoot}>
        <AppHeader
          onMenuPress={() => setDataMenuOpen(true)}
          title="Statistics"
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateText}>Loading statistics...</Text>
            </View>
          ) : null}

          {!isLoading && error ? (
            <Text style={styles.stateText}>{error}</Text>
          ) : null}

          {!isLoading && !error && overview ? (
            <>
              <Section title="Overview">
                <View style={styles.statGrid}>
                  <StatCard
                    label="Completed"
                    value={String(overview.totalCompletedWorkouts)}
                    detail="workouts"
                  />
                  <StatCard
                    label="This Week"
                    value={String(overview.workoutsThisWeek)}
                    detail="workouts"
                  />
                  <StatCard
                    label="This Month"
                    value={String(overview.workoutsThisMonth)}
                    detail="workouts"
                  />
                  <StatCard
                    label="Sets"
                    value={String(overview.totalCompletedSets)}
                    detail="completed"
                  />
                  <StatCard
                    label="Exercises"
                    value={String(overview.totalExercisesPerformed)}
                    detail="performed"
                  />
                  <StatCard
                    label="4 Week Avg"
                    value={formatNumber(
                      overview.averageWorkoutsPerWeekLast4Weeks,
                    )}
                    detail="/ week"
                  />
                  <StatCard
                    label="Last Completed"
                    value={overview.lastCompletedWorkoutName ?? "None"}
                    detail={
                      overview.lastCompletedWorkoutDate
                        ? formatDateShort(overview.lastCompletedWorkoutDate)
                        : "No completed workouts"
                    }
                    wide
                  />
                </View>
              </Section>

              {!hasCompletedWorkouts ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    Complete a workout to see statistics.
                  </Text>
                  <Text style={styles.emptyText}>
                    Draft workouts stay out of progress numbers until finished.
                  </Text>
                </View>
              ) : (
                <>
                  <Section title="Weekly Overview">
                    <View style={styles.summaryCard}>
                      <SummaryRow
                        label="Last 7 days"
                        value={pluralise(
                          overview.workoutsLast7Days,
                          "workout",
                        )}
                      />
                      <SummaryRow
                        label="Last 30 days"
                        value={pluralise(
                          overview.workoutsLast30Days,
                          "workout",
                        )}
                      />
                      <SummaryRow
                        label="4 week average"
                        value={`${formatNumber(
                          overview.averageWorkoutsPerWeekLast4Weeks,
                        )}/week`}
                      />
                    </View>
                    <WeeklyOverviewList weeks={weeklySummary} />
                  </Section>

                  <Section title="Exercise Progress">
                    <ExerciseSelector
                      options={progressOptions}
                      selectedOption={selectedOption}
                      onSelect={selectExercise}
                    />

                    {isProgressLoading ? (
                      <View style={styles.progressLoading}>
                        <ActivityIndicator color={colors.accent} />
                      </View>
                    ) : (
                      <ProgressCard stat={progressStat} />
                    )}
                    <WeightTrendCard
                      isLoading={isWeightTrendLoading}
                      onRangeChange={setWeightTrendRange}
                      points={weightTrendPoints}
                      range={weightTrendRange}
                    />
                    <TrendCard metric={trendMetric} points={trendPoints} />
                  </Section>

                  <Section title="Personal Records">
                    <PersonalRecordsCard records={personalRecords} />
                  </Section>

                  <Section title="Top Exercises">
                    <View style={styles.listCard}>
                      {topExercises.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No completed exercise data yet.
                        </Text>
                      ) : (
                        topExercises.map((exercise) => (
                          <TopExerciseRow
                            exercise={exercise}
                            key={getTopExerciseKey(exercise)}
                            onPress={() => {
                              const matchingOption = progressOptions.find(
                                (option) =>
                                  getExerciseOptionKey(option) ===
                                  getTopExerciseKey(exercise),
                              );
                              if (matchingOption) selectExercise(matchingOption);
                            }}
                          />
                        ))
                      )}
                    </View>
                  </Section>
                </>
              )}
            </>
          ) : null}
        </ScrollView>

        <DataBackupSheet
          onClose={() => setDataMenuOpen(false)}
          onDataChanged={loadStatistics}
          visible={dataMenuOpen}
        />
      </View>
    </SafeAreaView>
  );
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({
  detail,
  label,
  value,
  wide,
}: {
  detail: string;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.statDetail}>
        {detail}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function TopExerciseRow({
  exercise,
  onPress,
}: {
  exercise: TopExerciseStat;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.topExerciseRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topExerciseTextGroup}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {exercise.exerciseName}
        </Text>
        <Text style={styles.rowMeta}>
          {pluralise(exercise.completedWorkoutCount, "workout")} -{" "}
          {pluralise(exercise.completedSetCount, "set")}
        </Text>
      </View>
      <Text style={styles.rowDate}>
        Last: {formatDateShort(exercise.lastCompletedDate)}
      </Text>
    </Pressable>
  );
}

function ExerciseSelector({
  onSelect,
  options,
  selectedOption,
}: {
  onSelect: (option: ExerciseProgressOption) => void;
  options: ExerciseProgressOption[];
  selectedOption: ExerciseProgressOption | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const pickerMaxHeight = Math.min(520, windowHeight * 0.62);

  if (options.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No exercises to summarize yet.</Text>
      </View>
    );
  }

  const selectedKey = selectedOption
    ? getExerciseOptionKey(selectedOption)
    : null;
  const normalizedSearch = exerciseSearch.trim().toLowerCase();
  const filteredOptions = (() => {
    const selected = selectedKey
      ? options.find((option) => getExerciseOptionKey(option) === selectedKey)
      : null;
    const matches = normalizedSearch
      ? options.filter((option) =>
          option.exerciseName.toLowerCase().includes(normalizedSearch),
        )
      : options;

    if (!selected) return matches;

    return [
      selected,
      ...matches.filter(
        (option) => getExerciseOptionKey(option) !== selectedKey,
      ),
    ];
  })();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [
          styles.exercisePickerButton,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.exercisePickerTextGroup}>
          <Text style={styles.exercisePickerLabel}>Selected exercise</Text>
          <Text numberOfLines={1} style={styles.exercisePickerValue}>
            {selectedOption?.exerciseName ?? "Select exercise"}
          </Text>
        </View>
        <MaterialCommunityIcons
          color={colors.accent}
          name="chevron-down"
          size={23}
        />
      </Pressable>

      <BottomSheet
        maxHeight="82%"
        onClose={() => setPickerOpen(false)}
        title="Select Exercise"
        visible={pickerOpen}
      >
        <View style={styles.exerciseSearchWrap}>
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="magnify"
            size={20}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setExerciseSearch}
            placeholder="Search exercises"
            placeholderTextColor={colors.textMuted}
            style={styles.exerciseSearchInput}
            value={exerciseSearch}
          />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.exercisePickerListContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={[styles.exercisePickerList, { maxHeight: pickerMaxHeight }]}
        >
          {filteredOptions.length === 0 ? (
            <Text style={styles.emptyText}>No matching exercises.</Text>
          ) : null}

          {filteredOptions.map((option) => {
            const key = getExerciseOptionKey(option);
            const selected = key === selectedKey;

            return (
              <Pressable
                accessibilityRole="button"
                key={key}
                onPress={() => {
                  onSelect(option);
                  setPickerOpen(false);
                  setExerciseSearch("");
                }}
                style={({ pressed }) => [
                  styles.exercisePickerRow,
                  selected && styles.exercisePickerRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.exercisePickerRowText}>
                  <Text numberOfLines={1} style={styles.exercisePickerRowName}>
                    {option.exerciseName}
                  </Text>
                  <Text style={styles.exercisePickerRowMeta}>
                    Last: {formatDateShort(option.lastCompletedDate)}
                  </Text>
                </View>
                {selected ? (
                  <MaterialCommunityIcons
                    color={colors.accent}
                    name="check"
                    size={21}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

function WeeklyOverviewList({ weeks }: { weeks: WeeklyTrainingSummary[] }) {
  if (weeks.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No weekly training data yet.</Text>
      </View>
    );
  }

  const maxVolume = Math.max(
    1,
    ...weeks.map((week) => week.totalVolumeKg ?? 0),
  );

  return (
    <View style={styles.listCard}>
      {weeks.map((week) => {
        const volume = week.totalVolumeKg ?? 0;
        const widthPercent =
          `${Math.max(8, (volume / maxVolume) * 100)}%` as const;

        return (
          <View key={week.weekStart} style={styles.weekRow}>
            <View style={styles.weekTextGroup}>
              <Text style={styles.rowTitle}>{week.label}</Text>
              <Text style={styles.rowMeta}>
                {pluralise(week.workoutCount, "workout")} -{" "}
                {pluralise(week.completedSetCount, "set")} -{" "}
                {week.totalVolumeKg ? formatVolumeKg(week.totalVolumeKg) : "--"}
              </Text>
            </View>
            <View style={styles.weekBarTrack}>
              <View style={[styles.weekBarFill, { width: widthPercent }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TrendCard({
  metric,
  points,
}: {
  metric: ExerciseTrendMetric;
  points: ExerciseTrendPoint[];
}) {
  const summary = getTrendSummary(points, metric);

  return (
    <View style={styles.progressCard}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.progressTitle}>
          {formatTrendMetricLabel(metric)}
        </Text>
      </View>

      {points.length < 2 ? (
        <Text style={styles.emptyText}>
          Complete this exercise more times to see a trend.
        </Text>
      ) : (
        <>
          <View style={styles.trendSummaryGrid}>
            <TrendSummaryItem
              label="Latest"
              value={formatTrendValue(metric, summary.latestValue)}
            />
            <TrendSummaryItem
              label="Best"
              value={formatTrendValue(metric, summary.bestValue)}
            />
            <TrendSummaryItem
              label="Change"
              value={formatTrendChange(metric, summary.changeValue)}
            />
          </View>

          {summary.isFlat ? (
            <Text style={styles.flatTrendText}>Flat trend</Text>
          ) : null}

          <SimpleTrendChart metric={metric} points={points} summary={summary} />
        </>
      )}
    </View>
  );
}

function WeightTrendCard({
  isLoading,
  onRangeChange,
  points,
  range,
}: {
  isLoading: boolean;
  onRangeChange: (range: ExerciseWeightTrendRange) => void;
  points: ExerciseWeightTrendPoint[];
  range: ExerciseWeightTrendRange;
}) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const latestValue = values[values.length - 1] ?? null;
  const bestValue = values.length > 0 ? Math.max(...values) : null;
  const changeValue =
    values.length > 1 && latestValue !== null
      ? latestValue - values[0]
      : null;

  return (
    <View style={styles.progressCard}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.progressTitle}>Weight Trend</Text>
      </View>

      <View style={styles.segmentedControl}>
        {(["weekly", "monthly", "yearly"] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => onRangeChange(option)}
            style={({ pressed }) => [
              styles.segmentButton,
              range === option && styles.segmentButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                range === option && styles.segmentTextSelected,
              ]}
            >
              {option === "weekly"
                ? "Weekly"
                : option === "monthly"
                  ? "Monthly"
                  : "Yearly"}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : points.length === 0 ? (
        <Text style={styles.emptyText}>No weight data for this exercise.</Text>
      ) : points.length < 2 ? (
        <Text style={styles.emptyText}>
          Complete this exercise more times with weight to see a trend.
        </Text>
      ) : (
        <>
          <View style={styles.trendSummaryGrid}>
            <TrendSummaryItem label="Latest" value={formatWeight(latestValue)} />
            <TrendSummaryItem label="Best" value={formatWeight(bestValue)} />
            <TrendSummaryItem
              label="Change"
              value={
                changeValue === null
                  ? "--"
                  : `${changeValue > 0 ? "+" : ""}${formatWeight(changeValue)}`
              }
            />
          </View>

          <WeightTrendChart points={points} />
        </>
      )}
    </View>
  );
}

function TrendSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.trendSummaryItem}>
      <Text style={styles.trendSummaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.trendSummaryValue}>
        {value}
      </Text>
    </View>
  );
}

function WeightTrendChart({ points }: { points: ExerciseWeightTrendPoint[] }) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const isFlat = minValue === maxValue;
  const range = Math.max(1, maxValue - minValue);

  return (
    <View style={styles.chart}>
      <View style={styles.chartAxisRow}>
        <View style={styles.chartYAxis}>
          <Text style={styles.chartAxisLabel}>{formatWeight(maxValue)}</Text>
          <Text style={styles.chartAxisLabel}>{formatWeight(minValue)}</Text>
        </View>
        <View style={styles.chartPlot}>
          {points.map((point, index) => {
            const value = point.value ?? 0;
            const barHeight = isFlat
              ? 64
              : 18 + ((value - minValue) / range) * 92;
            const isLatest = index === points.length - 1;
            const isFirst = index === 0;

            return (
              <View key={point.key} style={styles.chartColumn}>
                {(isFirst || isLatest) && point.value !== null ? (
                  <Text numberOfLines={1} style={styles.chartPointLabel}>
                    {formatWeight(point.value)}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.chartBar,
                    isLatest && styles.chartBarLatest,
                    { height: barHeight },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.chartFooter}>
        <Text style={styles.chartLabel}>{points[0]?.label ?? ""}</Text>
        <Text style={styles.chartLabel}>
          {points[points.length - 1]?.label ?? ""}
        </Text>
      </View>
    </View>
  );
}

function SimpleTrendChart({
  metric,
  points,
  summary,
}: {
  metric: ExerciseTrendMetric;
  points: ExerciseTrendPoint[];
  summary: TrendSummary;
}) {
  const [width, setWidth] = useState(0);
  const range = Math.max(1, summary.maxValue - summary.minValue);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View onLayout={onLayout} style={styles.chart}>
      <View style={styles.chartAxisRow}>
        <View style={styles.chartYAxis}>
          <Text style={styles.chartAxisLabel}>
            {formatTrendValue(metric, summary.maxValue)}
          </Text>
          <Text style={styles.chartAxisLabel}>
            {formatTrendValue(metric, summary.minValue)}
          </Text>
        </View>

        <View style={styles.chartPlot}>
          {points.map((point, index) => {
            const barHeight = summary.isFlat
              ? 64
              : 18 + ((point.value - summary.minValue) / range) * 92;
            const isLatest = index === points.length - 1;
            const isFirst = index === 0;

            return (
              <View
                key={`${point.workoutId}-${index}`}
                style={styles.chartColumn}
              >
                {(isFirst || isLatest) && width > 0 ? (
                  <Text numberOfLines={1} style={styles.chartPointLabel}>
                    {formatTrendValue(metric, point.value)}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.chartBar,
                    isLatest && styles.chartBarLatest,
                    { height: barHeight },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.chartFooter}>
        <Text style={styles.chartLabel}>
          {formatDateShort(points[0]?.date ?? null)}
        </Text>
        <Text style={styles.chartLabel}>
          {width > 0
            ? formatDateShort(points[points.length - 1]?.date ?? null)
            : ""}
        </Text>
      </View>
    </View>
  );
}

function ProgressCard({ stat }: { stat: ExerciseProgressStat | null }) {
  if (!stat) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Select an exercise to see progress.</Text>
      </View>
    );
  }

  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressTitle}>{stat.exerciseName}</Text>
      <Text style={styles.progressMeta}>
        Last: {formatDateShort(stat.lastPerformedDate)}
        {stat.lastWorkoutName ? ` - ${stat.lastWorkoutName}` : ""}
      </Text>

      <View style={styles.progressSummaryBox}>
        <Text style={styles.progressSummaryLabel}>Last performance</Text>
        <Text style={styles.progressSummaryText}>
          {stat.lastSummary ?? "--"}
        </Text>
      </View>

      <View style={styles.metricRows}>
        {stat.bestSetSummary ? (
          <MetricRow label="Best set" value={stat.bestSetSummary} />
        ) : null}
        {stat.bestWeightKg !== null ? (
          <MetricRow
            label="Best weight"
            value={`${formatWeight(stat.bestWeightKg)}${
              stat.bestWeightReps ? ` x ${stat.bestWeightReps}` : ""
            }`}
          />
        ) : null}
        {stat.bestEstimatedOneRepMax !== null ? (
          <MetricRow
            label="Estimated 1RM"
            value={formatEstimatedOneRepMax(stat.bestEstimatedOneRepMax)}
          />
        ) : null}
        {stat.bestSessionVolumeKg !== null ? (
          <MetricRow
            label="Best volume session"
            value={formatVolumeKg(stat.bestSessionVolumeKg)}
          />
        ) : null}
        {stat.averageWorkingWeightKg !== null ? (
          <MetricRow
            label="Avg working weight"
            value={formatWeight(stat.averageWorkingWeightKg)}
          />
        ) : null}
        {stat.bestReps !== null ? (
          <MetricRow label="Best reps" value={`${stat.bestReps} reps`} />
        ) : null}
        {stat.bestTotalReps !== null ? (
          <MetricRow
            label="Best total reps"
            value={`${formatNumber(stat.bestTotalReps)} reps`}
          />
        ) : null}
        {stat.averageReps !== null ? (
          <MetricRow
            label="Avg reps per set"
            value={`${formatNumber(stat.averageReps)} reps`}
          />
        ) : null}
        {stat.longestTimeSeconds !== null ? (
          <MetricRow
            label="Best time"
            value={formatDurationSeconds(stat.longestTimeSeconds)}
          />
        ) : null}
        {stat.bestTotalTimeSeconds !== null ? (
          <MetricRow
            label="Best total time"
            value={formatDurationSeconds(stat.bestTotalTimeSeconds)}
          />
        ) : null}
        {stat.averageTimeSeconds !== null ? (
          <MetricRow
            label="Avg time per set"
            value={formatDurationSeconds(Math.round(stat.averageTimeSeconds))}
          />
        ) : null}
        {stat.bestDistance !== null ? (
          <MetricRow
            label="Best distance"
            value={formatDistance(stat.bestDistance)}
          />
        ) : null}
        {stat.bestPaceSecondsPerKm !== null ? (
          <MetricRow
            label="Best pace"
            value={formatPace(stat.bestPaceSecondsPerKm)}
          />
        ) : null}
        <MetricRow
          label="Times performed"
          value={String(stat.timesPerformed)}
        />
        <MetricRow label="Total sets" value={String(stat.totalSets)} />
      </View>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function PersonalRecordsCard({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          Complete more workouts to generate personal records.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {records.map((record) => (
        <View key={record.id} style={styles.recordRow}>
          <View style={styles.topExerciseTextGroup}>
            <Text numberOfLines={1} style={styles.rowTitle}>
              {record.exerciseName}
            </Text>
            <Text style={styles.rowMeta}>
              {formatRecordType(record.recordType)} - {record.workoutName} -{" "}
              {formatDateShort(record.date)}
            </Text>
            {record.setSummary ? (
              <Text style={styles.recordSet}>{record.setSummary}</Text>
            ) : null}
          </View>
          <Text style={styles.recordValue}>{formatRecordValue(record)}</Text>
        </View>
      ))}
    </View>
  );
}

type TrendSummary = {
  bestValue: number;
  changeValue: number;
  firstValue: number;
  isFlat: boolean;
  latestValue: number;
  maxValue: number;
  minValue: number;
};

function getTrendSummary(
  points: ExerciseTrendPoint[],
  metric: ExerciseTrendMetric,
): TrendSummary {
  const values = points.map((point) => point.value);
  const firstValue = values[0] ?? 0;
  const latestValue = values[values.length - 1] ?? 0;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const lowerIsBetter = metric === "pace";

  return {
    firstValue,
    latestValue,
    bestValue: lowerIsBetter ? minValue : maxValue,
    changeValue: latestValue - firstValue,
    minValue,
    maxValue,
    isFlat: minValue === maxValue,
  };
}

function formatTrendChange(metric: ExerciseTrendMetric, value: number) {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  if (metric === "bestTime" || metric === "pace") {
    return `${prefix}${formatTrendValue(metric, Math.abs(value))}`;
  }
  return `${prefix}${formatTrendValue(metric, value)}`;
}

function getExerciseOptionKey(option: ExerciseProgressOption) {
  return option.exerciseId
    ? `id:${option.exerciseId}`
    : `name:${option.exerciseName.trim().toLowerCase()}`;
}

function getTopExerciseKey(exercise: TopExerciseStat) {
  return exercise.exerciseId
    ? `id:${exercise.exerciseId}`
    : `name:${exercise.exerciseName.trim().toLowerCase()}`;
}

function getPreferredTrendMetric(
  exerciseType: string | null | undefined,
): ExerciseTrendMetric {
  switch (exerciseType) {
    case "Strength: Weight, Time":
    case "Bodyweight: Weight, Time":
      return "bestWeight";
    case "Bodyweight: Reps":
    case "Reps Only":
      return "bestReps";
    case "Bodyweight: Time":
    case "Cardio: Time":
    case "Time Only":
      return "bestTime";
    case "Cardio: Distance, Time":
      return "distance";
    case "Strength: Weight, Reps":
    case "Bodyweight: Weight, Reps":
    default:
      return "estimated1RM";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screenRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xxl,
    paddingBottom: 170,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
  },
  loadingState: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xxxl,
  },
  stateText: {
    color: colors.textMuted,
    textAlign: "center",
    ...typography.exercise,
  },
  section: {
    gap: spacing.card,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 23,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.card,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: "47%",
    gap: spacing.sm,
    minHeight: 96,
    padding: spacing.xxl,
  },
  statCardWide: {
    flexBasis: "100%",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 15,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 30,
  },
  statDetail: {
    color: colors.textSecondary,
    ...typography.exercise,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 22,
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  summaryRow: {
    alignItems: "center",
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 22,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  topExerciseRow: {
    alignItems: "center",
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 68,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: animations.pressOpacity,
  },
  topExerciseTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21,
  },
  rowMeta: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  rowDate: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
  },
  weekRow: {
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  weekTextGroup: {
    gap: spacing.xs,
  },
  weekBarTrack: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    height: 5,
    overflow: "hidden",
  },
  weekBarFill: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 5,
  },
  chipRow: {
    gap: spacing.md,
    paddingRight: spacing.xxl,
  },
  exercisePickerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  exercisePickerTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  exercisePickerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 14,
  },
  exercisePickerValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 21,
  },
  exerciseSearchWrap: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 46,
    paddingHorizontal: spacing.card,
  },
  exerciseSearchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    letterSpacing: 0,
    minHeight: 44,
    paddingVertical: 0,
  },
  exercisePickerList: {
    flexGrow: 0,
  },
  exercisePickerListContent: {
    paddingBottom: spacing.xxl,
  },
  exercisePickerRow: {
    alignItems: "center",
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  exercisePickerRowSelected: {
    backgroundColor: "rgba(91, 212, 224, 0.08)",
  },
  exercisePickerRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  exercisePickerRowName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
  },
  exercisePickerRowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 15,
  },
  exerciseChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 190,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  exerciseChipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  exerciseChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 17,
  },
  exerciseChipTextSelected: {
    color: colors.textPrimary,
  },
  progressLoading: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.xxxl,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  progressTitle: {
    color: colors.textPrimary,
    ...typography.workoutTitle,
    lineHeight: 22,
  },
  progressMeta: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  segmentedControl: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  segmentButtonSelected: {
    backgroundColor: "rgba(91, 212, 224, 0.14)",
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
  },
  segmentTextSelected: {
    color: colors.accent,
  },
  trendSummaryGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  trendSummaryItem: {
    backgroundColor: colors.background,
    borderColor: colors.borderMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 58,
    padding: spacing.md,
  },
  trendSummaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 13,
  },
  trendSummaryValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 17,
  },
  flatTrendText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
  },
  chart: {
    gap: spacing.md,
  },
  chartAxisRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  chartYAxis: {
    justifyContent: "space-between",
    paddingVertical: spacing.card,
    width: 62,
  },
  chartAxisLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 13,
    textAlign: "right",
  },
  chartPlot: {
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderColor: colors.borderMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 150,
    overflow: "hidden",
    padding: spacing.card,
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  chartPointLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 11,
    marginBottom: spacing.xs,
    maxWidth: 54,
    textAlign: "center",
  },
  chartBar: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minHeight: 4,
    opacity: 0.86,
    width: "62%",
  },
  chartBarLatest: {
    opacity: 1,
  },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 14,
  },
  progressSummaryBox: {
    backgroundColor: colors.background,
    borderColor: colors.borderMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.card,
  },
  progressSummaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 14,
  },
  progressSummaryText: {
    color: colors.textPrimary,
    ...typography.exercise,
  },
  metricRows: {
    gap: spacing.md,
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    flex: 1,
    ...typography.exercise,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: "right",
  },
  recordRow: {
    alignItems: "center",
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 76,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  recordSet: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 16,
  },
  recordValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: "right",
  },
});
