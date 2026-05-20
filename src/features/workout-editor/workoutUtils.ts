import type { ExerciseRecord } from "@/db/schema";
import type {
  PreviousExercisePerformance,
  SavedWorkout,
  WorkoutInput,
} from "@/db/workoutsRepository";
import type { Routine } from "@/state/routines";

import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
} from "./types";
import {
  formatTimeValue,
  getSetFieldPlan,
  normaliseExerciseType,
  parseTimeValue,
} from "./workoutFieldRules";

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateField(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTimeField(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseDateField(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return new Date();

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function parseTimeField(value: string) {
  const [rawHour, rawMinute] = value.split(":").map(Number);
  const hour = Number.isFinite(rawHour)
    ? Math.max(0, Math.min(23, rawHour))
    : 0;
  const minute = Number.isFinite(rawMinute)
    ? Math.max(0, Math.min(59, rawMinute))
    : 0;

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOptionalInteger(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSetPayload(exerciseType: string, set: ActiveWorkoutSet) {
  const visibleFields = new Set(
    getSetFieldPlan(exerciseType).map((fieldPlan) => fieldPlan.field),
  );
  const compactTime = visibleFields.has("time")
    ? parseTimeValue(set.time)
    : null;

  return {
    distance: visibleFields.has("distance")
      ? parseOptionalNumber(set.distance)
      : null,
    id: set.id,
    kg: visibleFields.has("kg") ? parseOptionalNumber(set.kg) : null,
    minutes: compactTime
      ? parseOptionalInteger(compactTime.minutes)
      : visibleFields.has("minutes")
        ? parseOptionalInteger(set.minutes)
        : null,
    notes: set.notes,
    reps: visibleFields.has("reps") ? parseOptionalInteger(set.reps) : null,
    seconds: compactTime
      ? parseOptionalInteger(compactTime.seconds)
      : visibleFields.has("seconds")
        ? parseOptionalInteger(set.seconds)
        : null,
    type: set.type,
  };
}

export function calculateDurationMinutes(
  date: string,
  startTime: string,
  endTime: string,
) {
  if (!startTime || !endTime) return null;

  const [day, month, year] = date.split("/").map(Number);
  const start = parseTimeField(startTime);
  const end = parseTimeField(endTime);
  if (!day || !month || !year) return null;

  const startDate = new Date(
    year,
    month - 1,
    day,
    Number(start.hour),
    Number(start.minute),
  );
  const endDate = new Date(
    year,
    month - 1,
    day,
    Number(end.hour),
    Number(end.minute),
  );

  if (endDate.getTime() < startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  return Number.isFinite(diff) ? diff : null;
}

export function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const visibleCellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return Array.from({ length: visibleCellCount }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

export function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getPreviousSetForCurrent(
  set: ActiveWorkoutSet,
  currentSets: ActiveWorkoutSet[],
  performance: PreviousExercisePerformance | undefined,
) {
  if (!performance) return null;

  const currentTypeIndex = currentSets
    .filter((item) => item.type === set.type)
    .findIndex((item) => item.id === set.id);
  if (currentTypeIndex < 0) return null;

  return (
    performance.sets
      .filter((previousSet) => previousSet.setType === set.type)
      .sort((a, b) => a.setOrder - b.setOrder)[currentTypeIndex] ?? null
  );
}

export function buildWorkout(routine: Routine): ActiveWorkout {
  const now = new Date();

  return {
    routineId: routine.id,
    mode: "fromRoutine",
    name: routine.name,
    bodyweightKg: "",
    date: formatDateField(now),
    startTime: formatTimeField(now),
    endTime: "",
    notes: "",
    status: "draft",
    exercises: routine.exercises.map((exercise) => {
      const totalSets = exercise.warmUpSets + exercise.workingSets;
      const sets = Array.from({ length: totalSets }, (_, index) => ({
        distance: "",
        id: createId(`${exercise.id}-set-${index + 1}`),
        type:
          index < exercise.warmUpSets
            ? ("warmup" as const)
            : ("normal" as const),
        kg: "",
        reps: "",
        minutes: "",
        seconds: "",
        time: "",
        notes: "",
      }));

      return {
        id: createId(exercise.id),
        exerciseId: exercise.exerciseId,
        exerciseType: normaliseExerciseType(exercise.exerciseType),
        routineExerciseId: exercise.id,
        name: exercise.name,
        notes: "",
        isStarred: false,
        inputMode: "weightReps",
        sets,
      };
    }),
  };
}

export function buildWorkoutFromSaved(
  savedWorkout: SavedWorkout,
): ActiveWorkout {
  return {
    id: savedWorkout.id,
    routineId: savedWorkout.routineId ?? "",
    mode: "editSaved",
    name: savedWorkout.name,
    bodyweightKg:
      savedWorkout.bodyweightKg === null ? "" : String(savedWorkout.bodyweightKg),
    date: savedWorkout.date,
    startTime: savedWorkout.startTime,
    endTime: savedWorkout.endTime,
    notes: savedWorkout.notes,
    status: savedWorkout.status,
    exercises: savedWorkout.exercises.map((exercise) => ({
      id: exercise.id,
      routineExerciseId: exercise.routineExerciseId ?? "",
      exerciseId: exercise.exerciseId,
      exerciseType: normaliseExerciseType(exercise.exerciseType),
      name: exercise.name,
      notes: exercise.notes,
      isStarred: exercise.isStarred,
      inputMode: "weightReps",
      sets: exercise.sets.map((set) => ({
        distance: set.distance === null ? "" : String(set.distance),
        id: set.id,
        type: set.type,
        kg: set.kg === null ? "" : String(set.kg),
        reps: set.reps === null ? "" : String(set.reps),
        minutes: set.minutes === null ? "" : String(set.minutes),
        seconds: set.seconds === null ? "" : String(set.seconds),
        time: formatTimeValue(
          set.minutes === null ? "" : String(set.minutes),
          set.seconds === null ? "" : String(set.seconds),
        ),
        notes: set.notes,
      })),
    })),
  };
}

export function buildEmptyWorkout(): ActiveWorkout {
  const now = new Date();

  return {
    routineId: "",
    mode: "new",
    name: "",
    bodyweightKg: "",
    date: formatDateField(now),
    startTime: formatTimeField(now),
    endTime: "",
    notes: "",
    status: "draft",
    exercises: [],
  };
}

export function createClearedReplacementSets(
  exercise: ActiveWorkoutExercise,
  replacementExerciseId: string,
) {
  return exercise.sets.map((set, index) => ({
    distance: "",
    id: createId(`${replacementExerciseId}-set-${index + 1}`),
    type: set.type,
    kg: "",
    reps: "",
    minutes: "",
    seconds: "",
    time: "",
    notes: "",
  }));
}

export function createDefaultExerciseFromRecord(
  exercise: ExerciseRecord,
): ActiveWorkoutExercise {
  return {
    id: createId(`workout-${exercise.id}`),
    exerciseId: exercise.id,
    exerciseType: normaliseExerciseType(exercise.exerciseType),
    routineExerciseId: "",
    name: exercise.name,
    notes: "",
    isStarred: false,
    inputMode: "weightReps",
    sets: Array.from({ length: 3 }, (_, index) => ({
      distance: "",
      id: createId(`${exercise.id}-set-${index + 1}`),
      type: "normal" as const,
      kg: "",
      reps: "",
      minutes: "",
      seconds: "",
      time: "",
      notes: "",
    })),
  };
}

export function getSetLabel(
  set: ActiveWorkoutSet,
  sets: ActiveWorkoutSet[],
) {
  if (set.type === "warmup") return "W";

  if (set.type === "drop") return "D";

  return String(
    sets
      .filter((item) => item.type === "normal")
      .findIndex((item) => item.id === set.id) + 1,
  );
}

export function getSetTypeLabel(type: ActiveWorkoutSet["type"]) {
  if (type === "warmup") return "Warm up";
  if (type === "drop") return "Drop set";
  return "Normal";
}

export function buildWorkoutPayload(candidate: ActiveWorkout): WorkoutInput {
  return {
    bodyweightKg: parseOptionalNumber(candidate.bodyweightKg),
    date: candidate.date,
    durationMinutes: calculateDurationMinutes(
      candidate.date,
      candidate.startTime,
      candidate.endTime,
    ),
    endTime: candidate.endTime,
    exercises: candidate.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId ?? null,
      exerciseType: exercise.exerciseType,
      id: exercise.id,
      isStarred: exercise.isStarred,
      name: exercise.name,
      notes: exercise.notes,
      routineExerciseId: exercise.routineExerciseId,
      sets: exercise.sets.map((set) =>
        buildSetPayload(exercise.exerciseType, set),
      ),
    })),
    name: candidate.name,
    notes: candidate.notes,
    routineId: candidate.routineId || null,
    status: candidate.status,
    startTime: candidate.startTime,
  };
}
