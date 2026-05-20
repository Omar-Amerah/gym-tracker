import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
  SetMetricField,
} from "./types";
import { getWorkoutSetFields, parseTimeValue } from "./workoutFieldRules";

export type WorkoutCompletionIssue = {
  exerciseId: string;
  field?: SetMetricField;
  setId: string;
};

export function getRequiredFieldsForExerciseType(
  exerciseType?: string | null,
): SetMetricField[] {
  return getWorkoutSetFields(exerciseType).map((fieldPlan) => fieldPlan.field);
}

export function isSetComplete(
  set: ActiveWorkoutSet,
  exerciseType?: string | null,
) {
  return getRequiredFieldsForExerciseType(exerciseType).every((field) =>
    hasSetFieldValue(set, field),
  );
}

export function getWorkoutCompletionIssues(
  workout: ActiveWorkout | null,
): WorkoutCompletionIssue[] {
  if (!workout || workout.status !== "draft") return [];
  if (!workout.exercises.some((exercise) => exercise.sets.length > 0)) {
    return [];
  }

  const workoutHasStarted = hasStartedWorkout(workout);
  const issues: WorkoutCompletionIssue[] = [];

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.type === "warmup") {
        if (workoutHasStarted && isSetCompletelyBlank(set, exercise)) {
          issues.push({ exerciseId: exercise.id, setId: set.id });
        }
        continue;
      }

      for (const field of getRequiredFieldsForExerciseType(
        exercise.exerciseType,
      )) {
        if (!hasSetFieldValue(set, field)) {
          issues.push({ exerciseId: exercise.id, field, setId: set.id });
        }
      }
    }
  }

  return issues;
}

export function isWorkoutIncomplete(workout: ActiveWorkout | null) {
  return getWorkoutCompletionIssues(workout).length > 0;
}

function hasStartedWorkout(workout: ActiveWorkout) {
  return workout.exercises.some((exercise) =>
    exercise.sets.some((set) => !isSetCompletelyBlank(set, exercise)),
  );
}

function isSetCompletelyBlank(
  set: ActiveWorkoutSet,
  exercise: ActiveWorkoutExercise,
) {
  return getWorkoutSetFields(exercise.exerciseType).every(
    (fieldPlan) => !hasSetFieldValue(set, fieldPlan.field),
  );
}

function hasSetFieldValue(set: ActiveWorkoutSet, field: SetMetricField) {
  if (field === "time") {
    const parsed = parseTimeValue(set.time);
    return Boolean(parsed.minutes.trim() || parsed.seconds.trim());
  }

  if (field === "minutes" || field === "seconds") {
    return Boolean((set.minutes ?? "").trim() || (set.seconds ?? "").trim());
  }

  return Boolean((set[field] ?? "").trim());
}
