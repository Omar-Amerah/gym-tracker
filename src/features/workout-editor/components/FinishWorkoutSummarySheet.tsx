import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

import type { FinishedWorkoutSummary } from "../finishedWorkoutSummary";

type FinishWorkoutSummarySheetProps = {
  onDone: () => void;
  summary: FinishedWorkoutSummary | null;
  visible: boolean;
};

export function FinishWorkoutSummarySheet({
  onDone,
  summary,
  visible,
}: FinishWorkoutSummarySheetProps) {
  return (
    <BottomSheet
      closeOnBackdropPress={false}
      onClose={onDone}
      title="Workout complete"
      visible={visible}
    >
      {summary ? (
        <View style={styles.content}>
          <View>
            <Text style={styles.workoutName}>{summary.workoutName}</Text>
            <Text style={styles.dateText}>{summary.date}</Text>
          </View>

          <View style={styles.grid}>
            <SummaryTile
              label="Duration"
              value={
                summary.durationMinutes === null
                  ? "--"
                  : `${summary.durationMinutes} min`
              }
            />
            <SummaryTile label="Exercises" value={String(summary.exerciseCount)} />
            <SummaryTile label="Sets" value={String(summary.completedSetCount)} />
            <SummaryTile
              label="Volume"
              value={
                summary.totalVolumeKg === null
                  ? "--"
                  : `${Math.round(summary.totalVolumeKg).toLocaleString(
                      "en-GB",
                    )}kg`
              }
            />
          </View>

          {summary.bodyweightKg !== null ? (
            <Text style={styles.metaText}>BW {summary.bodyweightKg}kg</Text>
          ) : null}

          {summary.newRecords.length > 0 ? (
            <View style={styles.recordsBox}>
              <Text style={styles.recordsTitle}>New PRs</Text>
              {summary.newRecords.map((record) => (
                <Text key={record.id} style={styles.recordText}>
                  {record.exerciseName} - {formatRecordType(record.recordType)} -{" "}
                  {formatRecordValue(record.value, record.unit)}
                </Text>
              ))}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
            ]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function formatRecordType(recordType: string) {
  switch (recordType) {
    case "heaviest_weight":
      return "Heaviest";
    case "estimated_1rm":
      return "Est. 1RM";
    case "most_reps":
      return "Reps";
    case "longest_time":
      return "Time";
    case "best_distance":
      return "Distance";
    case "best_session_volume":
      return "Volume";
    default:
      return "PR";
  }
}

function formatRecordValue(value: number, unit: string) {
  if (unit === "sec") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${seconds}s`;
  }
  if (unit === "reps") return `${value} reps`;
  if (unit === "km") return `${value}km`;
  if (unit === "volume") return `${Math.round(value).toLocaleString("en-GB")}kg`;
  return `${value}kg`;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
  },
  workoutName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 25,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.card,
  },
  tile: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 72,
    padding: spacing.card,
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 15,
  },
  tileValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 25,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
  },
  recordsBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.card,
  },
  recordsTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 17,
  },
  recordText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 18,
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minHeight: 48,
    justifyContent: "center",
  },
  doneButtonPressed: {
    opacity: 0.86,
  },
  doneText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
