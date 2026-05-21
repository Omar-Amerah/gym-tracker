import { getDatabase } from "@/db/database";
import { createId, nowIso } from "@/db/schema";

export type WorkoutStatus = "draft" | "completed";

export type WorkoutSetInput = {
  distance: number | null;
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
  exerciseType?: string | null;
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
  date: string;
  day: string;
  durationMinutes: number | null;
  exercises: string[];
  id: string;
  month: string;
  name: string;
  status: WorkoutStatus;
  weekday: string;
  year: string;
};

export type PreviousExerciseSet = {
  distance: number | null;
  kg: number | null;
  minutes: number | null;
  notes: string | null;
  reps: number | null;
  seconds: number | null;
  setOrder: number;
  setType: "warmup" | "normal" | "drop";
  time: string | null;
};

export type PreviousExercisePerformance = {
  date: string;
  exerciseName: string;
  notes: string | null;
  sets: PreviousExerciseSet[];
  workoutId: string;
  workoutName: string;
};

export type ExerciseHistorySet = {
  distance: number | null;
  id: string;
  kg: number | null;
  minutes: number | null;
  notes: string | null;
  reps: number | null;
  seconds: number | null;
  setOrder: number;
  setType: "warmup" | "normal" | "drop";
};

export type ExerciseHistoryEntry = {
  bodyweightKg: number | null;
  exerciseId: string | null;
  exerciseName: string;
  exerciseNotes: string | null;
  exerciseType: string | null;
  sets: ExerciseHistorySet[];
  startTime: string | null;
  workoutDate: string;
  workoutExerciseId: string;
  workoutId: string;
  workoutName: string;
};

type WorkoutRow = {
  bodyweightKg?: number | null;
  createdAt?: string;
  date: string;
  durationMinutes: number | null;
  endTime?: string | null;
  id: string;
  name: string;
  notes?: string | null;
  routineId?: string | null;
  status?: WorkoutStatus;
  startTime?: string | null;
  updatedAt?: string;
};

type SavedExerciseRow = {
  exerciseId: string | null;
  exerciseType: string | null;
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

type DraftWorkoutRow = WorkoutRow & {
  exerciseCount: number;
};

type SavedSetRow = {
  distance: number | null;
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

type ExerciseHistoryRow = {
  bodyweightKg: number | null;
  exerciseId: string | null;
  exerciseName: string;
  exerciseNotes: string | null;
  exerciseType: string | null;
  startTime: string | null;
  workoutDate: string;
  workoutExerciseId: string;
  workoutId: string;
  workoutName: string;
};

type ExerciseHistorySetRow = ExerciseHistorySet & {
  workoutExerciseId: string;
};

export async function saveWorkout(input: WorkoutInput) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const workoutId = createId("workout");
  let existingDraftId: string | null = null;

  await db.withTransactionAsync(async () => {
    if (input.status === "draft") {
      const activeDraft = await normaliseDraftWorkouts(db);
      if (activeDraft) {
        existingDraftId = activeDraft.id;
        return;
      }
    }

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
      const workoutExerciseId = exercise.id || createId("workout-exercise");
      await db.runAsync(
        `INSERT INTO workout_exercises
          (id, workoutId, routineExerciseId, exerciseId, exerciseType, name, notes, sortOrder, isStarred, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        workoutExerciseId,
        workoutId,
        exercise.routineExerciseId ?? null,
        exercise.exerciseId ?? null,
        exercise.exerciseType ?? null,
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
            (id, workoutExerciseId, setType, setOrder, distance, kg, reps, minutes, seconds, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          set.id || createId("workout-set"),
          workoutExerciseId,
          set.type,
          setIndex,
          set.distance,
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

  return existingDraftId ?? workoutId;
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
          (id, workoutId, routineExerciseId, exerciseId, exerciseType, name, notes, sortOrder, isStarred, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        workoutExerciseId,
        id,
        exercise.routineExerciseId ?? null,
        exercise.exerciseId ?? null,
        exercise.exerciseType ?? null,
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
            (id, workoutExerciseId, setType, setOrder, distance, kg, reps, minutes, seconds, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          set.id || createId("workout-set"),
          workoutExerciseId,
          set.type,
          setIndex,
          set.distance,
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

export async function deleteWorkout(id: string) {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM workout_sets
       WHERE workoutExerciseId IN (
         SELECT id FROM workout_exercises WHERE workoutId = ?
       )`,
      id,
    );
    await db.runAsync("DELETE FROM workout_exercises WHERE workoutId = ?", id);
    await db.runAsync("DELETE FROM workouts WHERE id = ?", id);
  });
}

export async function deleteDraftWorkout(workoutId: string) {
  const workout = await getSavedWorkout(workoutId);
  if (workout?.status !== "draft") return;

  await deleteWorkout(workoutId);
}

export async function getActiveDraftWorkout(): Promise<LoggedWorkout | null> {
  const db = await getDatabase();
  const activeDraft = await normaliseDraftWorkouts(db);
  if (!activeDraft) return null;

  const exercises = await getExerciseSummaries(db, [activeDraft.id]);

  return formatLoggedWorkout(activeDraft, exercises);
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
    `SELECT we.id, we.routineExerciseId, we.exerciseId,
            COALESCE(we.exerciseType, e.exerciseType, 'Strength: Weight, Reps') AS exerciseType,
            we.name, we.notes, we.sortOrder, we.isStarred
     FROM workout_exercises we
     LEFT JOIN exercises e ON e.id = we.exerciseId
     WHERE we.workoutId = ?
      ORDER BY we.sortOrder ASC`,
    id,
  );
  const sets = await db.getAllAsync<SavedSetRow>(
    `SELECT id, workoutExerciseId, setType, setOrder, distance, kg, reps, minutes, seconds, notes
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
      exerciseType: exercise.exerciseType,
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
          distance: set.distance,
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
  return listCompletedWorkouts();
}

export async function listCompletedWorkouts(): Promise<LoggedWorkout[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<WorkoutRow>(
    `SELECT id, name, date, durationMinutes, status
     FROM workouts
     WHERE status = 'completed'
     ORDER BY
       CASE
         WHEN instr(date, '/') > 0 THEN substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)
         ELSE date
       END DESC,
       startTime DESC,
       createdAt DESC`,
  );

  if (workouts.length === 0) return [];

  const summaries = await getExerciseSummaries(
    db,
    workouts.map((workout) => workout.id),
  );

  return workouts.map((workout) => formatLoggedWorkout(workout, summaries));
}

async function getExerciseSummaries(
  db: Awaited<ReturnType<typeof getDatabase>>,
  workoutIds: string[],
) {
  if (workoutIds.length === 0) return [];

  const placeholders = workoutIds.map(() => "?").join(", ");
  return db.getAllAsync<ExerciseSummaryRow>(
    `SELECT
        we.workoutId,
        we.name,
        SUM(CASE WHEN ws.setType != 'warmup' THEN 1 ELSE 0 END) AS setCount
      FROM workout_exercises we
      LEFT JOIN workout_sets ws ON ws.workoutExerciseId = we.id
      WHERE we.workoutId IN (${placeholders})
      GROUP BY we.id
      ORDER BY we.sortOrder ASC`,
    ...workoutIds,
  );
}

function formatLoggedWorkout(
  workout: WorkoutRow,
  summaries: ExerciseSummaryRow[],
): LoggedWorkout {
  return {
    id: workout.id,
    name: workout.name.trim() || "Untitled Workout",
    date: workout.date,
    durationMinutes: workout.durationMinutes,
    status: workout.status ?? "completed",
    ...formatLogDate(workout.date),
    exercises: summaries
      .filter((summary) => summary.workoutId === workout.id)
      .map((summary) => `${summary.setCount}x ${summary.name}`),
  };
}

async function normaliseDraftWorkouts(
  db: Awaited<ReturnType<typeof getDatabase>>,
) {
  const drafts = await db.getAllAsync<DraftWorkoutRow>(
    `SELECT
       w.id,
       w.routineId,
       w.name,
       w.bodyweightKg,
       w.date,
       w.startTime,
       w.endTime,
       w.durationMinutes,
       w.notes,
       w.status,
       w.createdAt,
       w.updatedAt,
       COUNT(we.id) AS exerciseCount
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workoutId = w.id
     WHERE w.status = 'draft'
     GROUP BY w.id
     ORDER BY w.updatedAt DESC, w.createdAt DESC`,
  );
  const [activeDraft, ...staleDrafts] = drafts;

  for (const staleDraft of staleDrafts) {
    if (staleDraft.exerciseCount > 0) {
      await db.runAsync(
        "UPDATE workouts SET status = 'completed', updatedAt = ? WHERE id = ?",
        nowIso(),
        staleDraft.id,
      );
    } else {
      await db.runAsync("DELETE FROM workouts WHERE id = ?", staleDraft.id);
    }
  }

  return activeDraft ?? null;
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
           AND w.status = 'completed'
           AND (? = '' OR w.id != ?)
         ORDER BY substr(w.date, 7, 4) || '-' || substr(w.date, 4, 2) || '-' || substr(w.date, 1, 2) DESC,
                  w.startTime DESC,
                  w.updatedAt DESC,
                  w.createdAt DESC,
                  we.sortOrder ASC
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
         AND w.status = 'completed'
         AND (? = '' OR w.id != ?)
       ORDER BY substr(w.date, 7, 4) || '-' || substr(w.date, 4, 2) || '-' || substr(w.date, 1, 2) DESC,
                w.startTime DESC,
                w.updatedAt DESC,
                w.createdAt DESC,
                we.sortOrder ASC
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
       distance,
       kg,
       reps,
       minutes,
       seconds,
       CASE
         WHEN minutes IS NULL AND seconds IS NULL THEN NULL
         ELSE COALESCE(minutes, 0) || ':' || printf('%02d', COALESCE(seconds, 0))
       END AS time,
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

export async function getExerciseHistory({
  exerciseId,
  exerciseName,
  limit = 30,
}: {
  exerciseId?: string | null;
  exerciseName: string;
  limit?: number;
}): Promise<ExerciseHistoryEntry[]> {
  const db = await getDatabase();
  const trimmedExerciseId = exerciseId?.trim() || null;
  const trimmedName = exerciseName.trim();
  if (!trimmedExerciseId && !trimmedName) return [];

  const resultLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const orderBy = `CASE
       WHEN instr(w.date, '/') > 0 THEN substr(w.date, 7, 4) || '-' || substr(w.date, 4, 2) || '-' || substr(w.date, 1, 2)
       ELSE w.date
     END DESC,
     w.startTime DESC,
     w.updatedAt DESC,
     w.createdAt DESC,
     we.sortOrder ASC`;

  let rows = trimmedExerciseId
    ? await db.getAllAsync<ExerciseHistoryRow>(
        `SELECT
           w.id AS workoutId,
           w.name AS workoutName,
           w.date AS workoutDate,
           w.startTime AS startTime,
           w.bodyweightKg AS bodyweightKg,
           we.id AS workoutExerciseId,
           we.exerciseId AS exerciseId,
           we.name AS exerciseName,
           COALESCE(we.exerciseType, e.exerciseType) AS exerciseType,
           we.notes AS exerciseNotes
         FROM workout_exercises we
         INNER JOIN workouts w ON w.id = we.workoutId
         LEFT JOIN exercises e ON e.id = we.exerciseId
         WHERE we.exerciseId = ?
           AND w.status = 'completed'
         ORDER BY ${orderBy}
         LIMIT ?`,
        trimmedExerciseId,
        resultLimit,
      )
    : [];

  if (rows.length === 0 && trimmedName) {
    rows = await db.getAllAsync<ExerciseHistoryRow>(
      `SELECT
         w.id AS workoutId,
         w.name AS workoutName,
         w.date AS workoutDate,
         w.startTime AS startTime,
         w.bodyweightKg AS bodyweightKg,
         we.id AS workoutExerciseId,
         we.exerciseId AS exerciseId,
         we.name AS exerciseName,
         COALESCE(we.exerciseType, e.exerciseType) AS exerciseType,
         we.notes AS exerciseNotes
       FROM workout_exercises we
       INNER JOIN workouts w ON w.id = we.workoutId
       LEFT JOIN exercises e ON e.id = we.exerciseId
       WHERE LOWER(TRIM(we.name)) = LOWER(TRIM(?))
         AND w.status = 'completed'
       ORDER BY ${orderBy}
       LIMIT ?`,
      trimmedName,
      resultLimit,
    );
  }

  if (rows.length === 0) return [];

  const workoutExerciseIds = rows.map((row) => row.workoutExerciseId);
  const placeholders = workoutExerciseIds.map(() => "?").join(", ");
  const sets = await db.getAllAsync<ExerciseHistorySetRow>(
    `SELECT
       id,
       workoutExerciseId,
       setType,
       setOrder,
       distance,
       kg,
       reps,
       minutes,
       seconds,
       notes
     FROM workout_sets
     WHERE workoutExerciseId IN (${placeholders})
     ORDER BY workoutExerciseId ASC, setOrder ASC`,
    ...workoutExerciseIds,
  );

  const setsByExercise = new Map<string, ExerciseHistorySet[]>();
  for (const set of sets) {
    const nextSet: ExerciseHistorySet = {
      id: set.id,
      setType: set.setType,
      setOrder: set.setOrder,
      distance: set.distance,
      kg: set.kg,
      reps: set.reps,
      minutes: set.minutes,
      seconds: set.seconds,
      notes: set.notes,
    };
    const currentSets = setsByExercise.get(set.workoutExerciseId) ?? [];
    currentSets.push(nextSet);
    setsByExercise.set(set.workoutExerciseId, currentSets);
  }

  return rows.map((row) => ({
    workoutId: row.workoutId,
    workoutName: row.workoutName.trim() || "Untitled Workout",
    workoutDate: row.workoutDate,
    startTime: row.startTime ?? null,
    bodyweightKg: row.bodyweightKg ?? null,
    workoutExerciseId: row.workoutExerciseId,
    exerciseId: row.exerciseId ?? null,
    exerciseName: row.exerciseName,
    exerciseType: row.exerciseType ?? null,
    exerciseNotes: row.exerciseNotes ?? null,
    sets: setsByExercise.get(row.workoutExerciseId) ?? [],
  }));
}

function formatLogDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const parsed =
    day && month && year ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      day: "--",
      month: "Unknown",
      weekday: "---",
      year: "Unknown Year",
    };
  }

  const date = parsed;

  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    year: date.getFullYear().toString(),
  };
}
