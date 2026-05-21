import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import {
  getExerciseHistory,
  type ExerciseHistoryEntry,
  type ExerciseHistorySet,
} from "@/db/workoutsRepository";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { backOrReplace } from "@/utils/navigation";

export default function ExerciseHistoryScreen() {
  const params = useLocalSearchParams();
  const exerciseId = readParam(params.exerciseId);
  const exerciseName = readParam(params.exerciseName);
  const title = exerciseName.trim() || "Exercise History";

  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!exerciseId && !exerciseName.trim()) {
      setHistory([]);
      setIsLoading(false);
      setHasError(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setHasError(false);

    void getExerciseHistory({
      exerciseId,
      exerciseName,
      limit: 30,
    })
      .then((entries) => {
        if (!isMounted) return;
        setHistory(entries);
      })
      .catch((error) => {
        console.error("Failed to load exercise history", error);
        if (!isMounted) return;
        setHistory([]);
        setHasError(true);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseId, exerciseName]);

  const stateText = useMemo(() => {
    if (isLoading) return "Loading exercise history...";
    if (hasError) return "Could not load exercise history.";
    if (history.length === 0) {
      return "No completed history for this exercise yet.";
    }
    return null;
  }, [hasError, history.length, isLoading]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <AppHeader
          leftAction="back"
          onBackPress={() => backOrReplace("/")}
          title={title}
        />

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {stateText ? <Text style={styles.stateText}>{stateText}</Text> : null}

          {history.map((entry) => (
            <ExerciseHistoryCard entry={entry} key={entry.workoutExerciseId} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ExerciseHistoryCard({ entry }: { entry: ExerciseHistoryEntry }) {
  const exerciseNote = entry.exerciseNotes?.trim();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.entryDate}>
            {formatHistoryDate(entry.workoutDate)}
          </Text>
          <Text numberOfLines={2} style={styles.workoutName}>
            {entry.workoutName}
          </Text>
        </View>

        {entry.bodyweightKg !== null ? (
          <Text style={styles.bodyweight}>
            BW {formatNumber(entry.bodyweightKg)}kg
          </Text>
        ) : null}
      </View>

      {exerciseNote ? (
        <Text style={styles.exerciseNote}>Note: {exerciseNote}</Text>
      ) : null}

      <View style={styles.setList}>
        {entry.sets.length === 0 ? (
          <Text style={styles.emptySets}>No sets recorded.</Text>
        ) : (
          <HistorySets sets={entry.sets} />
        )}
      </View>
    </View>
  );
}

function HistorySets({ sets }: { sets: ExerciseHistorySet[] }) {
  let normalSetNumber = 0;

  return sets.map((set) => {
    if (set.setType === "normal") {
      normalSetNumber += 1;
    }

    const label =
      set.setType === "warmup"
        ? "W"
        : set.setType === "drop"
          ? "D"
          : String(normalSetNumber);
    const note = set.notes?.trim();

    return (
      <View key={set.id} style={styles.setRow}>
        <Text style={styles.setLabel}>{label}</Text>
        <View style={styles.setContent}>
          <Text style={styles.setValue}>{formatHistorySetValue(set)}</Text>
          {note ? <Text style={styles.setNote}>{note}</Text> : null}
        </View>
      </View>
    );
  });
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatHistorySetValue(set: ExerciseHistorySet) {
  const weight = hasNumber(set.kg) ? `${formatNumber(set.kg)}kg` : null;
  const reps = hasNumber(set.reps) ? formatNumber(set.reps) : null;
  const distance = hasNumber(set.distance)
    ? `${formatNumber(set.distance)}km`
    : null;
  const time = formatSetTime(set.minutes, set.seconds);

  if (weight && reps) return `${weight} x ${reps}`;
  if (weight && time) return `${weight} x ${time}`;
  if (distance && time) return `${distance} - ${time}`;
  if (reps) return `${reps} reps`;
  if (time) return time;
  if (weight) return weight;
  if (distance) return distance;
  if (set.notes?.trim()) return "Note only";
  return "--";
}

function formatSetTime(minutes: number | null, seconds: number | null) {
  const hasMinutes = hasNumber(minutes);
  const hasSeconds = hasNumber(seconds);
  if (!hasMinutes && !hasSeconds) return null;

  const totalSeconds = (minutes ?? 0) * 60 + (seconds ?? 0);
  if (!hasMinutes && totalSeconds < 60) return `${totalSeconds}s`;

  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;
  return `${displayMinutes}:${String(displaySeconds).padStart(2, "0")}`;
}

function formatHistoryDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const parsed =
    day && month && year ? new Date(year, month - 1, day) : new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function hasNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.card,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
  },
  loadingRow: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  stateText: {
    color: colors.textMuted,
    paddingTop: spacing.xxl,
    textAlign: "center",
    ...typography.exercise,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "space-between",
  },
  cardTitleGroup: {
    flex: 1,
    gap: spacing.sm,
  },
  entryDate: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
  },
  workoutName: {
    color: colors.textPrimary,
    ...typography.workoutTitle,
    lineHeight: 21,
  },
  bodyweight: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 15,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseNote: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  setList: {
    gap: spacing.md,
  },
  emptySets: {
    color: colors.textMuted,
    ...typography.exercise,
  },
  setRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: "center",
    width: 24,
  },
  setContent: {
    flex: 1,
    gap: spacing.xs,
  },
  setValue: {
    color: colors.textPrimary,
    ...typography.exercise,
    fontWeight: "700",
  },
  setNote: {
    color: colors.textMuted,
    ...typography.exercise,
  },
});
