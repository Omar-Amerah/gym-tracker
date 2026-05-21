import {
  getPersonalRecords,
  type PersonalRecord,
} from "@/db/statisticsRepository";

import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
} from "./types";
import { calculateDurationMinutes } from "./workoutUtils";

export type FinishedWorkoutSummary = {
  bodyweightKg: number | null;
  completedSetCount: number;
  date: string;
  durationMinutes: number | null;
  exerciseCount: number;
  newRecords: PersonalRecord[];
  totalVolumeKg: number | null;
  workoutId: string;
  workoutName: string;
};

export async function buildFinishedWorkoutSummary(
  workout: ActiveWorkout,
): Promise<FinishedWorkoutSummary> {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = sets.filter(isMeaningfulSet);
  const totalVolume = completedSets.reduce(
    (total, set) => total + getSetVolume(set),
    0,
  );
  const bodyweight = parseNumber(workout.bodyweightKg);
  const newRecords = await getNewRecords(workout);

  return {
    workoutId: workout.id ?? "",
    workoutName: workout.name.trim() || "Untitled Workout",
    date: workout.date,
    durationMinutes: calculateDurationMinutes(
      workout.date,
      workout.startTime,
      workout.endTime,
    ),
    exerciseCount: workout.exercises.filter((exercise) =>
      exercise.sets.some(isMeaningfulSet),
    ).length,
    completedSetCount: completedSets.length,
    totalVolumeKg: totalVolume > 0 ? Math.round(totalVolume * 10) / 10 : null,
    bodyweightKg: bodyweight,
    newRecords,
  };
}

async function getNewRecords(workout: ActiveWorkout) {
  try {
    const existingRecords = await getPersonalRecords(100);
    const currentRecords = buildWorkoutRecords(workout);
    return currentRecords
      .filter((record) => {
        const previous = existingRecords.find(
          (item) =>
            item.recordType === record.recordType &&
            (item.exerciseId
              ? item.exerciseId === record.exerciseId
              : normaliseName(item.exerciseName) ===
                normaliseName(record.exerciseName)),
        );

        return !previous || record.value > previous.value;
      })
      .slice(0, 5);
  } catch (error) {
    console.warn("Failed to detect workout records", error);
    return [];
  }
}

function buildWorkoutRecords(workout: ActiveWorkout) {
  const records: PersonalRecord[] = [];

  for (const exercise of workout.exercises) {
    const sets = exercise.sets.filter(isMeaningfulSet);
    const heaviest = getBestWeightSet(sets);
    const oneRepMax = getBestOneRepMaxSet(sets);
    const mostReps = getBestRepsSet(sets);
    const longestTime = getBestTimeSet(sets);
    const bestDistance = getBestDistanceSet(sets);
    const sessionVolume = sets.reduce(
      (total, set) => total + getSetVolume(set),
      0,
    );

    const heaviestKg = heaviest ? parseNumber(heaviest.kg) : null;
    const mostRepsValue = mostReps ? parseNumber(mostReps.reps) : null;
    const bestDistanceValue = bestDistance
      ? parseNumber(bestDistance.distance)
      : null;

    if (heaviestKg) {
      records.push(
        createRecord(workout, exercise, "heaviest_weight", heaviestKg, "kg"),
      );
    }
    if (oneRepMax) {
      records.push(
        createRecord(
          workout,
          exercise,
          "estimated_1rm",
          oneRepMax,
          "kg",
        ),
      );
    }
    if (mostRepsValue) {
      records.push(
        createRecord(workout, exercise, "most_reps", mostRepsValue, "reps"),
      );
    }
    if (longestTime) {
      records.push(
        createRecord(
          workout,
          exercise,
          "longest_time",
          longestTime,
          "sec",
        ),
      );
    }
    if (bestDistanceValue) {
      records.push(
        createRecord(
          workout,
          exercise,
          "best_distance",
          bestDistanceValue,
          "km",
        ),
      );
    }
    if (sessionVolume > 0) {
      records.push(
        createRecord(
          workout,
          exercise,
          "best_session_volume",
          sessionVolume,
          "volume",
        ),
      );
    }
  }

  return records;
}

function isMeaningfulSet(set: ActiveWorkoutSet) {
  return (
    Boolean(set.kg.trim()) ||
    Boolean(set.reps.trim()) ||
    Boolean((set.minutes ?? "").trim()) ||
    Boolean((set.seconds ?? "").trim()) ||
    Boolean(set.time.trim()) ||
    Boolean(set.distance.trim()) ||
    Boolean(set.notes.trim())
  );
}

function getSetVolume(set: ActiveWorkoutSet) {
  const kg = parseNumber(set.kg);
  const reps = parseNumber(set.reps);
  if (!kg || !reps) return 0;
  return kg * reps;
}

function getBestWeightSet(sets: ActiveWorkoutSet[]) {
  return sets
    .filter((set) => parseNumber(set.kg) !== null)
    .sort(
      (a, b) =>
        (parseNumber(b.kg) ?? 0) - (parseNumber(a.kg) ?? 0) ||
        (parseNumber(b.reps) ?? 0) - (parseNumber(a.reps) ?? 0),
    )[0];
}

function getBestOneRepMaxSet(sets: ActiveWorkoutSet[]) {
  const estimates = sets
    .map((set) => {
      const kg = parseNumber(set.kg);
      const reps = parseNumber(set.reps);
      if (!kg || !reps) return null;
      return kg * (1 + reps / 30);
    })
    .filter((value): value is number => value !== null);

  if (estimates.length === 0) return null;
  return Math.round(Math.max(...estimates) * 10) / 10;
}

function getBestRepsSet(sets: ActiveWorkoutSet[]) {
  return sets
    .filter((set) => parseNumber(set.reps) !== null)
    .sort((a, b) => (parseNumber(b.reps) ?? 0) - (parseNumber(a.reps) ?? 0))[0];
}

function getBestTimeSet(sets: ActiveWorkoutSet[]) {
  const values = sets
    .map(getSetDurationSeconds)
    .filter((value): value is number => value !== null && value > 0);

  if (values.length === 0) return null;
  return Math.max(...values);
}

function getBestDistanceSet(sets: ActiveWorkoutSet[]) {
  return sets
    .filter((set) => parseNumber(set.distance) !== null)
    .sort(
      (a, b) =>
        (parseNumber(b.distance) ?? 0) - (parseNumber(a.distance) ?? 0),
    )[0];
}

function createRecord(
  workout: ActiveWorkout,
  exercise: ActiveWorkoutExercise,
  recordType: PersonalRecord["recordType"],
  value: number,
  unit: PersonalRecord["unit"],
): PersonalRecord {
  return {
    id: `${workout.id ?? "workout"}:${exercise.id}:${recordType}`,
    exerciseId: exercise.exerciseId ?? null,
    exerciseName: exercise.name,
    recordType,
    value: Math.round(value * 10) / 10,
    unit,
    workoutId: workout.id ?? "",
    workoutName: workout.name.trim() || "Untitled Workout",
    date: workout.date,
  };
}

function getSetDurationSeconds(set: ActiveWorkoutSet) {
  const minutes = parseNumber(set.minutes ?? "");
  const seconds = parseNumber(set.seconds ?? "");
  if (minutes === null && seconds === null && set.time.trim()) {
    const [timeMinutes = "", timeSeconds = ""] = set.time.split(":");
    return (parseNumber(timeMinutes) ?? 0) * 60 + (parseNumber(timeSeconds) ?? 0);
  }
  if (minutes === null && seconds === null) return null;
  return (minutes ?? 0) * 60 + (seconds ?? 0);
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normaliseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
