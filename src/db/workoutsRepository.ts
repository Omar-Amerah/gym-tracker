import { getDatabase } from "@/db/database";
import { createId, nowIso } from "@/db/schema";

export type WorkoutStatus = "draft" | "completed";

export type WorkoutSetInput = {
  id: string;
  kg: number | null;
  minutes: number | null;
  notes: string;
  reps: number | null;
  seconds: number | null;
  type: "warmup" | "normal" | "drop";
};

export type WorkoutExerciseInput = {
  exerciseId?: string | null;
  id: string;
  isStarred: boolean;
  name: string;
  notes: string;
  routineExerciseId?: string | null;
  sets: WorkoutSetInput[];
};

export type WorkoutInput = {
  bodyweightKg: number | null;
  date: string;
  durationMinutes: number | null;
  endTime: string;
  exercises: WorkoutExerciseInput[];
  name: string;
  notes: string;
  routineId: string | null;
  status: WorkoutStatus;
  startTime: string;
};

export type SavedWorkout = {
  bodyweightKg: number | null;
  date: string;
  durationMinutes: number | null;
  endTime: string;
  exercises: (
    WorkoutExerciseInput & {
      sortOrder: number;
      sets: (WorkoutSetInput & { sortOrder: number })[];
    }
  )[];
  id: string;
  name: string;
  notes: string;
  routineId: string | null;
  status: WorkoutStatus;
  startTime: string;
};

export type LoggedWorkout = {
  day: string;
  durationMinutes: number | null;
  exercises: string[];
  id: string;
  month: string;
  name: string;
  status: WorkoutStatus;
  weekday: string;
};

export type PreviousExerciseSet = {
  kg: number | null;
  minutes: number | null;
  notes: string | null;
  reps: number | null;
  seconds: number | null;
  setOrder: number;
  setType: "warmup" | "normal" | "drop";
};

export type PreviousExercisePerformance = {
  date: string;
  exerciseName: string;
  notes: string | null;
  sets: PreviousExerciseSet[];
  workoutId: string;
  workoutName: string;
};

type WorkoutRow = {
  bodyweightKg?: number | null;
  date: string;
  durationMinutes: number | null;
  endTime?: string | null;
  id: string;
  name: string;
  notes?: string | null;
  routineId?: string | null;
  status?: WorkoutStatus;
  startTime?: string | null;
};

type SavedExerciseRow = {
  exerciseId: string | null;
  id: string;
  isStarred: number | null;
  name: string;
  notes: string | null;
  routineExerciseId: string | null;
  sortOrder: number;
};

type ExerciseSummaryRow = {
  name: string;
  setCount: number;
  workoutId: string;
};

type SavedSetRow = {
  id: string;
  kg: number | null;
  minutes: number | null;
  notes: string | null;
  reps: number | null;
  seconds: number | null;
  setOrder: number;
  setType: "warmup" | "normal" | "drop";
  workoutExerciseId: string;
};

type PreviousExerciseRow = {
  date: string;
  exerciseName: string;
  notes: string | null;
  workoutExerciseId: string;
  workoutId: string;
  workoutName: string;
};

export async function saveWorkout(input: WorkoutInput) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const workoutId = createId("workout");

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workouts
        (id, routineId, name, bodyweightKg, date, startTime, endTime, durationMinutes, notes, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      workoutId,
      input.routineId,
      input.name,
      input.bodyweightKg,
      input.date,
      input.startTime,
      input.endTime,
      input.durationMinutes,
      input.notes,
      input.status,
      timestamp,
      timestamp,
    );

    for (const [exerciseIndex, exercise] of input.exercises.entries()) {
      const workoutExerciseId = createId("workout-exercise");
      await db.runAsync(
        `INSERT INTO workout_exercises
          (id, workoutId, routineExerciseId, exerciseId, name, notes, sortOrder, isStarred, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        workoutExerciseId,
        workoutId,
        exercise.routineExerciseId ?? null,
        exercise.exerciseId ?? null,
        exercise.name,
        exercise.notes,
        exerciseIndex,
        exercise.isStarred ? 1 : 0,
        timestamp,
        timestamp,
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        await db.runAsync(
          `INSERT INTO workout_sets
            (id, workoutExerciseId, setType, setOrder, kg, reps, minutes, seconds, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          createId("workout-set"),
          workoutExerciseId,
          set.type,
          setIndex,
          set.kg,
          set.reps,
          set.minutes,
          set.seconds,
          set.notes,
          timestamp,
          timestamp,
        );
      }
    }
  });

  return workoutId;
}

export async function updateWorkout(id: string, input: WorkoutInput) {
  const db = await getDatabase();
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE workouts
       SET routineId = ?, name = ?, bodyweightKg = ?, date = ?, startTime = ?,
           endTime = ?, durationMinutes = ?, notes = ?, status = ?, updatedAt = ?
       WHERE id = ?`,
      input.routineId,
      input.name,
      input.bodyweightKg,
      input.date,
      input.startTime,
      input.endTime,
      input.durationMinutes,
      input.notes,
      input.status,
      timestamp,
      id,
    );

    await db.runAsync(
      `DELETE FROM workout_sets
       WHERE workoutExerciseId IN (
         SELECT id FROM workout_exercises WHERE workoutId = ?
       )`,
      id,
    );
    await db.runAsync("DELETE FROM workout_exercises WHERE workoutId = ?", id);

    for (const [exerciseIndex, exercise] of input.exercises.entries()) {
      const workoutExerciseId = exercise.id || createId("workout-exercise");
      await db.runAsync(
        `INSERT INTO workout_exercises
          (id, workoutId, routineExerciseId, exerciseId, name, notes, sortOrder, isStarred, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        workoutExerciseId,
        id,
        exercise.routineExerciseId ?? null,
        exercise.exerciseId ?? null,
        exercise.name,
        exercise.notes,
        exerciseIndex,
        exercise.isStarred ? 1 : 0,
        timestamp,
        timestamp,
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        await db.runAsync(
          `INSERT INTO workout_sets
            (id, workoutExerciseId, setType, setOrder, kg, reps, minutes, seconds, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          set.id || createId("workout-set"),
          workoutExerciseId,
          set.type,
          setIndex,
          set.kg,
          set.reps,
          set.minutes,
          set.seconds,
          set.notes,
          timestamp,
          timestamp,
        );
      }
    }
  });
}

export async function getSavedWorkout(id: string): Promise<SavedWorkout | null> {
  const db = await getDatabase();
  const workout = await db.getFirstAsync<WorkoutRow>(
    `SELECT id, routineId, name, bodyweightKg, date, startTime, endTime, durationMinutes, notes, status
     FROM workouts
     WHERE id = ?`,
    id,
  );
  if (!workout) return null;

  const exercises = await db.getAllAsync<SavedExerciseRow>(
    `SELECT id, routineExerciseId, exerciseId, name, notes, sortOrder, isStarred
     FROM workout_exercises
     WHERE workoutId = ?
     ORDER BY sortOrder ASC`,
    id,
  );
  const sets = await db.getAllAsync<SavedSetRow>(
    `SELECT id, workoutExerciseId, setType, setOrder, kg, reps, minutes, seconds, notes
     FROM workout_sets
     WHERE workoutExerciseId IN (
       SELECT id FROM workout_exercises WHERE workoutId = ?
     )
     ORDER BY setOrder ASC`,
    id,
  );

  return {
    id: workout.id,
    routineId: workout.routineId ?? null,
    name: workout.name,
    bodyweightKg: workout.bodyweightKg ?? null,
    date: workout.date,
    startTime: workout.startTime ?? "",
    endTime: workout.endTime ?? "",
    durationMinutes: workout.durationMinutes,
    notes: workout.notes ?? "",
    status: workout.status ?? "completed",
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      routineExerciseId: exercise.routineExerciseId,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      notes: exercise.notes ?? "",
      sortOrder: exercise.sortOrder,
      isStarred: exercise.isStarred === 1,
      sets: sets
        .filter((set) => set.workoutExerciseId === exercise.id)
        .map((set) => ({
          id: set.id,
          type: set.setType,
          sortOrder: set.setOrder,
          kg: set.kg,
          reps: set.reps,
          minutes: set.minutes,
          seconds: set.seconds,
          notes: set.notes ?? "",
        })),
    })),
  };
}

export async function listLoggedWorkouts(): Promise<LoggedWorkout[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<WorkoutRow>(
    `SELECT id, name, date, durationMinutes, status
     FROM workouts
     ORDER BY createdAt DESC`,
  );

  if (workouts.length === 0) return [];

  const summaries = await db.getAllAsync<ExerciseSummaryRow>(
    `SELECT
        we.workoutId,
        we.name,
        SUM(CASE WHEN ws.setType != 'warmup' THEN 1 ELSE 0 END) AS setCount
      FROM workout_exercises we
      LEFT JOIN workout_sets ws ON ws.workoutExerciseId = we.id
      GROUP BY we.id
      ORDER BY we.sortOrder ASC`,
  );

  return workouts.map((workout) => ({
    id: workout.id,
    name: workout.name.trim() || "Untitled Workout",
    durationMinutes: workout.durationMinutes,
    status: workout.status ?? "completed",
    ...formatLogDate(workout.date),
    exercises: summaries
      .filter((summary) => summary.workoutId === workout.id)
      .map((summary) => `${summary.setCount}x ${summary.name}`),
  }));
}

export async function markWorkoutCompleted(id: string, input: WorkoutInput) {
  await updateWorkout(id, { ...input, status: "completed" });
}

export async function getLastExercisePerformance({
  exerciseId,
  exerciseName,
  excludeWorkoutId = null,
}: {
  exerciseId?: string | null;
  exerciseName: string;
  excludeWorkoutId?: string | null;
}): Promise<PreviousExercisePerformance | null> {
  const db = await getDatabase();
  const trimmedName = exerciseName.trim();
  if (!exerciseId && !trimmedName) return null;

  const excludedId = excludeWorkoutId ?? "";
  let exercise = exerciseId
    ? await db.getFirstAsync<PreviousExerciseRow>(
        `SELECT
           we.id AS workoutExerciseId,
           we.name AS exerciseName,
           we.notes AS notes,
           w.id AS workoutId,
           w.name AS workoutName,
           w.date AS date
         FROM workout_exercises we
         INNER JOIN workouts w ON w.id = we.workoutId
         WHERE we.exerciseId = ?
           AND (? = '' OR w.id != ?)
         ORDER BY w.createdAt DESC, we.sortOrder ASC
         LIMIT 1`,
        exerciseId,
        excludedId,
        excludedId,
      )
    : null;

  if (!exercise && trimmedName) {
    exercise = await db.getFirstAsync<PreviousExerciseRow>(
      `SELECT
         we.id AS workoutExerciseId,
         we.name AS exerciseName,
         we.notes AS notes,
         w.id AS workoutId,
         w.name AS workoutName,
         w.date AS date
       FROM workout_exercises we
       INNER JOIN workouts w ON w.id = we.workoutId
       WHERE LOWER(TRIM(we.name)) = LOWER(TRIM(?))
         AND (? = '' OR w.id != ?)
       ORDER BY w.createdAt DESC, we.sortOrder ASC
       LIMIT 1`,
      trimmedName,
      excludedId,
      excludedId,
    );
  }

  if (!exercise) return null;

  const sets = await db.getAllAsync<PreviousExerciseSet>(
    `SELECT
       setType,
       setOrder,
       kg,
       reps,
       minutes,
       seconds,
       notes
     FROM workout_sets
     WHERE workoutExerciseId = ?
     ORDER BY setOrder ASC`,
    exercise.workoutExerciseId,
  );

  return {
    workoutId: exercise.workoutId,
    workoutName: exercise.workoutName,
    date: exercise.date,
    exerciseName: exercise.exerciseName,
    notes: exercise.notes,
    sets,
  };
}

function formatLogDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const parsed =
    day && month && year ? new Date(year, month - 1, day) : new Date(value);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}
