import * as SQLite from "expo-sqlite";

import {
  DEFAULT_CATEGORIES,
  DEFAULT_EXERCISES,
  DEFAULT_ROUTINES,
} from "@/db/schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  return databasePromise;
}

async function openDatabase() {
  const db = await SQLite.openDatabaseAsync("gym-tracker.db");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await createSchema(db);
  await seedIfEmpty(db);
  return db;
}

async function createSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      exerciseType TEXT,
      singleArm TEXT,
      bodyweightMultiplier INTEGER DEFAULT 100,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      targetType TEXT NOT NULL,
      notes TEXT,
      sortOrder INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routineId TEXT NOT NULL,
      exerciseId TEXT,
      name TEXT NOT NULL,
      notes TEXT,
      warmUpSets INTEGER NOT NULL DEFAULT 0,
      workingSets INTEGER NOT NULL DEFAULT 3,
      sortOrder INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      routineId TEXT,
      name TEXT NOT NULL,
      bodyweightKg REAL,
      date TEXT NOT NULL,
      startTime TEXT,
      endTime TEXT,
      durationMinutes INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workoutId TEXT NOT NULL,
      routineExerciseId TEXT,
      exerciseId TEXT,
      exerciseType TEXT,
      name TEXT NOT NULL,
      notes TEXT,
      sortOrder INTEGER NOT NULL,
      isStarred INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (workoutId) REFERENCES workouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workoutExerciseId TEXT NOT NULL,
      setType TEXT NOT NULL CHECK (setType IN ('warmup', 'normal', 'drop')),
      setOrder INTEGER NOT NULL,
      distance REAL,
      kg REAL,
      reps INTEGER,
      minutes INTEGER,
      seconds INTEGER,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (workoutExerciseId) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category, name);
    CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routineId, sortOrder);
    CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workoutId, sortOrder);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(workoutExerciseId, setOrder);
  `);
  await migrateSchema(db);
}

async function migrateSchema(db: SQLite.SQLiteDatabase) {
  const workoutColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workouts)",
  );
  const hasStatus = workoutColumns.some((column) => column.name === "status");

  if (!hasStatus) {
    await db.execAsync(
      "ALTER TABLE workouts ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';",
    );
  }

  const workoutSetColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workout_sets)",
  );
  const hasDistance = workoutSetColumns.some(
    (column) => column.name === "distance",
  );

  if (!hasDistance) {
    await db.execAsync("ALTER TABLE workout_sets ADD COLUMN distance REAL;");
  }

  const workoutExerciseColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workout_exercises)",
  );
  const hasExerciseType = workoutExerciseColumns.some(
    (column) => column.name === "exerciseType",
  );

  if (!hasExerciseType) {
    await db.execAsync("ALTER TABLE workout_exercises ADD COLUMN exerciseType TEXT;");
  }

  await db.execAsync(`
    UPDATE workouts
    SET status = 'completed', updatedAt = datetime('now')
     WHERE id IN (
      SELECT stale_workouts.id
      FROM workouts stale_workouts
      WHERE stale_workouts.status = 'draft'
        AND stale_workouts.id != (
          SELECT active_workouts.id
          FROM workouts active_workouts
          WHERE active_workouts.status = 'draft'
          ORDER BY active_workouts.updatedAt DESC, active_workouts.createdAt DESC
          LIMIT 1
        )
        AND EXISTS (
          SELECT 1
          FROM workout_exercises
          WHERE workout_exercises.workoutId = stale_workouts.id
        )
    );

    DELETE FROM workouts
    WHERE id IN (
      SELECT stale_workouts.id
      FROM workouts stale_workouts
      WHERE stale_workouts.status = 'draft'
        AND stale_workouts.id != (
          SELECT active_workouts.id
          FROM workouts active_workouts
          WHERE active_workouts.status = 'draft'
          ORDER BY active_workouts.updatedAt DESC, active_workouts.createdAt DESC
          LIMIT 1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM workout_exercises
          WHERE workout_exercises.workoutId = stale_workouts.id
        )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_draft_workout
      ON workouts(status)
      WHERE status = 'draft';
  `);
}

export async function seedDefaultData({ force = false } = {}) {
  const db = await getDatabase();
  await seedIfEmpty(db, { force });
}

async function seedIfEmpty(
  db: SQLite.SQLiteDatabase,
  { force = false } = {},
) {
  const counts = await db.getFirstAsync<{
    categoryCount: number;
    exerciseCount: number;
    routineCount: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM categories) AS categoryCount,
      (SELECT COUNT(*) FROM exercises) AS exerciseCount,
      (SELECT COUNT(*) FROM routines) AS routineCount
  `);

  if (
    !force &&
    counts &&
    (counts.categoryCount > 0 || counts.exerciseCount > 0 || counts.routineCount > 0)
  ) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        "INSERT OR IGNORE INTO categories (id, name, createdAt) VALUES (?, ?, ?)",
        category.toLowerCase(),
        category,
        "2026-05-18T00:00:00.000Z",
      );
    }

    for (const exercise of DEFAULT_EXERCISES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises
          (id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        exercise.id,
        exercise.name,
        exercise.category,
        exercise.exerciseType,
        exercise.singleArm,
        exercise.bodyweightMultiplier,
        exercise.createdAt,
        exercise.updatedAt,
      );
    }

    for (const [index, routine] of DEFAULT_ROUTINES.entries()) {
      await db.runAsync(
        `INSERT OR IGNORE INTO routines
          (id, name, targetType, notes, sortOrder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        routine.id,
        routine.name,
        routine.targetType,
        routine.notes,
        index,
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:00.000Z",
      );

      for (const exercise of routine.exercises) {
        await db.runAsync(
          `INSERT OR IGNORE INTO routine_exercises
            (id, routineId, exerciseId, name, notes, warmUpSets, workingSets, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          exercise.id,
          exercise.routineId,
          exercise.exerciseId,
          exercise.name,
          exercise.notes,
          exercise.warmUpSets,
          exercise.workingSets,
          exercise.sortOrder,
          exercise.createdAt,
          exercise.updatedAt,
        );
      }
    }
  });
}
