import { getDatabase } from "@/db/database";
import { createId, nowIso } from "@/db/schema";

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
  routineId: string;
  startTime: string;
};

export type LoggedWorkout = {
  day: string;
  durationMinutes: number | null;
  exercises: string[];
  id: string;
  month: string;
  name: string;
  weekday: string;
};

type WorkoutRow = {
  date: string;
  durationMinutes: number | null;
  id: string;
  name: string;
};

type ExerciseSummaryRow = {
  name: string;
  setCount: number;
  workoutId: string;
};

export async function saveWorkout(input: WorkoutInput) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const workoutId = createId("workout");

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workouts
        (id, routineId, name, bodyweightKg, date, startTime, endTime, durationMinutes, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      workoutId,
      input.routineId,
      input.name,
      input.bodyweightKg,
      input.date,
      input.startTime,
      input.endTime,
      input.durationMinutes,
      input.notes,
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

export async function listLoggedWorkouts(): Promise<LoggedWorkout[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<WorkoutRow>(
    `SELECT id, name, date, durationMinutes
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
    name: workout.name,
    durationMinutes: workout.durationMinutes,
    ...formatLogDate(workout.date),
    exercises: summaries
      .filter((summary) => summary.workoutId === workout.id)
      .map((summary) => `${summary.setCount}x ${summary.name}`),
  }));
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
