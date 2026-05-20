import type { PreviousExercisePerformance } from "@/db/workoutsRepository";

import type { SetFieldPlan, SetMetricField } from "./types";

export function getDefaultExerciseType() {
  return "Strength: Weight, Reps";
}

export function normaliseExerciseType(exerciseType?: string | null) {
  return exerciseType?.trim() || getDefaultExerciseType();
}

export function getWorkoutSetFields(
  exerciseType?: string | null,
): SetFieldPlan[] {
  switch (normaliseExerciseType(exerciseType)) {
    case "Strength: Weight, Time":
    case "Bodyweight: Weight, Time":
      return [
        { field: "kg", label: "Kg", keyboardType: "decimal-pad" },
        { field: "seconds", label: "Sec", keyboardType: "number-pad" },
      ];
    case "Bodyweight: Reps":
    case "Reps Only":
      return [{ field: "reps", label: "Reps", keyboardType: "number-pad" }];
    case "Bodyweight: Time":
    case "Cardio: Time":
    case "Time Only":
      return [
        { field: "minutes", label: "Min", keyboardType: "number-pad" },
        { field: "seconds", label: "Sec", keyboardType: "number-pad" },
      ];
    case "Cardio: Distance, Time":
      return [
        {
          field: "distance",
          label: "Distance",
          keyboardType: "decimal-pad",
          width: 74,
        },
        { field: "time", label: "Time", keyboardType: "default", width: 68 },
      ];
    case "Strength: Weight, Reps":
    case "Bodyweight: Weight, Reps":
    default:
      return [
        { field: "kg", label: "Kg", keyboardType: "decimal-pad" },
        { field: "reps", label: "Reps", keyboardType: "number-pad" },
      ];
  }
}

export const getSetFieldPlan = getWorkoutSetFields;

export function isTimeOnlyExercise(exerciseType?: string | null) {
  const fields = getWorkoutSetFields(exerciseType).map((field) => field.field);
  return (
    fields.length === 2 && fields.includes("minutes") && fields.includes("seconds")
  );
}

export function formatTimeValue(minutes?: string, seconds?: string) {
  const trimmedMinutes = minutes?.trim() ?? "";
  const trimmedSeconds = seconds?.trim() ?? "";
  if (!trimmedMinutes && !trimmedSeconds) return "";
  if (!trimmedSeconds) return trimmedMinutes;
  return `${trimmedMinutes || "0"}:${trimmedSeconds.padStart(2, "0")}`;
}

export function parseTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { minutes: "", seconds: "" };

  if (!trimmed.includes(":")) {
    return { minutes: trimmed, seconds: "" };
  }

  const [minutes = "", seconds = ""] = trimmed.split(":");
  return { minutes: minutes.trim(), seconds: seconds.trim() };
}

function previousValue(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value}` : "0";
}

function previousTimeValue(
  minutes: number | null | undefined,
  seconds: number | null | undefined,
) {
  if (minutes === null && seconds === null) return "0";
  if (minutes === undefined && seconds === undefined) return "0";

  const minValue = minutes ?? 0;
  const secValue = seconds ?? 0;
  return `${minValue}:${String(secValue).padStart(2, "0")}`;
}

export function formatPreviousValueForField(
  field: SetMetricField,
  previousSet: PreviousExercisePerformance["sets"][number] | null,
) {
  if (!previousSet) return "0";
  if (field === "distance") return previousValue(previousSet.distance);
  if (field === "kg") return previousValue(previousSet.kg);
  if (field === "reps") return previousValue(previousSet.reps);
  if (field === "minutes") return previousValue(previousSet.minutes);
  if (field === "seconds") return previousValue(previousSet.seconds);
  return previousTimeValue(previousSet.minutes, previousSet.seconds);
}

export const getPreviousPlaceholder = formatPreviousValueForField;

export function formatPreviousSetSummary(
  exerciseType: string | null | undefined,
  previousSet: PreviousExercisePerformance["sets"][number] | null,
) {
  if (!previousSet) return "";

  const fieldText = getWorkoutSetFields(exerciseType)
    .map((field) => formatPreviousValueForField(field.field, previousSet))
    .filter(Boolean)
    .join(" x ");
  const notes = previousSet.notes?.trim();

  if (!fieldText) return notes ? `Last: ${notes}` : "";
  return notes ? `Last: ${fieldText} · ${notes}` : `Last: ${fieldText}`;
}
