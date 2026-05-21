import { getDatabase } from "@/db/database";
import { nowIso } from "@/db/schema";
import type { Routine, RoutineExercise, TargetType } from "@/state/routines";

type RoutineRow = {
  id: string;
  name: string;
  targetType: TargetType;
  notes: string | null;
  sortOrder: number;
};

type RoutineExerciseRow = {
  exerciseType: string | null;
  id: string;
  routineId: string;
  exerciseId: string | null;
  name: string;
  notes: string | null;
  warmUpSets: number;
  workingSets: number;
  sortOrder: number;
};

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  const routines = await db.getAllAsync<RoutineRow>(
    "SELECT id, name, targetType, notes, sortOrder FROM routines ORDER BY sortOrder ASC, createdAt ASC",
  );
  const exercises = await db.getAllAsync<RoutineExerciseRow>(
    `SELECT re.id, re.routineId, re.exerciseId, COALESCE(e.name, re.name) AS name, re.notes, re.warmUpSets,
            re.workingSets, re.sortOrder, e.exerciseType
     FROM routine_exercises re
     LEFT JOIN exercises e ON e.id = re.exerciseId
     ORDER BY re.sortOrder ASC, re.createdAt ASC`,
  );

  return routines.map((routine) => ({
    id: routine.id,
    name: routine.name,
    targetType: routine.targetType,
    notes: routine.notes ?? "",
    exercises: exercises
      .filter((exercise) => exercise.routineId === routine.id)
      .map(mapRoutineExercise),
  }));
}

export async function createRoutineRecord(id: string, sortOrder: number) {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.runAsync(
    `INSERT INTO routines (id, name, targetType, notes, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    "New Routine",
    "Routine",
    "",
    sortOrder,
    timestamp,
    timestamp,
  );
}

export async function deleteRoutineRecord(id: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM routines WHERE id = ?", id);
}

export async function duplicateRoutineRecord(source: Routine, copyId: string, sortOrder: number) {
  const db = await getDatabase();
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO routines (id, name, targetType, notes, sortOrder, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      copyId,
      source.name,
      source.targetType,
      source.notes,
      sortOrder,
      timestamp,
      timestamp,
    );

    for (const [index, exercise] of source.exercises.entries()) {
      await db.runAsync(
        `INSERT INTO routine_exercises
          (id, routineId, exerciseId, name, notes, warmUpSets, workingSets, sortOrder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        exercise.id,
        copyId,
        exercise.exerciseId ?? null,
        exercise.name,
        exercise.notes,
        exercise.warmUpSets,
        exercise.workingSets,
        index,
        timestamp,
        timestamp,
      );
    }
  });
}

export async function updateRoutineRecord(
  id: string,
  patch: Partial<Pick<Routine, "name" | "notes" | "targetType">>,
) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const assignments: string[] = ["updatedAt = ?"];
  const params: (string | number)[] = [timestamp];

  if (patch.name !== undefined) {
    assignments.push("name = ?");
    params.push(patch.name);
  }

  if (patch.notes !== undefined) {
    assignments.push("notes = ?");
    params.push(patch.notes);
  }

  if (patch.targetType !== undefined) {
    assignments.push("targetType = ?");
    params.push(patch.targetType);
  }

  params.push(id);
  await db.runAsync(`UPDATE routines SET ${assignments.join(", ")} WHERE id = ?`, params);
}

export async function addRoutineExerciseRecord({
  exerciseId,
  id,
  name,
  routineId,
  sortOrder,
}: {
  exerciseId?: string | null;
  id: string;
  name: string;
  routineId: string;
  sortOrder: number;
}) {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.runAsync(
    `INSERT INTO routine_exercises
      (id, routineId, exerciseId, name, notes, warmUpSets, workingSets, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    routineId,
    exerciseId ?? null,
    name,
    "",
    0,
    3,
    sortOrder,
    timestamp,
    timestamp,
  );
}

export async function removeRoutineExerciseRecord(exerciseId: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM routine_exercises WHERE id = ?", exerciseId);
}

export async function updateRoutineExerciseRecord(
  exerciseId: string,
  patch: Partial<Pick<RoutineExercise, "notes" | "warmUpSets" | "workingSets">>,
) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const assignments: string[] = ["updatedAt = ?"];
  const params: (string | number)[] = [timestamp];

  if (patch.notes !== undefined) {
    assignments.push("notes = ?");
    params.push(patch.notes);
  }

  if (patch.warmUpSets !== undefined) {
    assignments.push("warmUpSets = ?");
    params.push(patch.warmUpSets);
  }

  if (patch.workingSets !== undefined) {
    assignments.push("workingSets = ?");
    params.push(patch.workingSets);
  }

  params.push(exerciseId);
  await db.runAsync(`UPDATE routine_exercises SET ${assignments.join(", ")} WHERE id = ?`, params);
}

export async function updateRoutineSortOrder(routineIds: string[]) {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const [index, id] of routineIds.entries()) {
      await db.runAsync(
        "UPDATE routines SET sortOrder = ?, updatedAt = ? WHERE id = ?",
        index,
        timestamp,
        id,
      );
    }
  });
}

export async function updateRoutineExerciseSortOrder(exerciseIds: string[]) {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const [index, id] of exerciseIds.entries()) {
      await db.runAsync(
        "UPDATE routine_exercises SET sortOrder = ?, updatedAt = ? WHERE id = ?",
        index,
        timestamp,
        id,
      );
    }
  });
}

function mapRoutineExercise(row: RoutineExerciseRow): RoutineExercise {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseType: row.exerciseType,
    name: row.name,
    notes: row.notes ?? "",
    warmUpSets: row.warmUpSets,
    workingSets: row.workingSets,
  };
}
